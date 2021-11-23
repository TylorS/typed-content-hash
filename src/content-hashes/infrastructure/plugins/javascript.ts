import * as E from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import builtinModules from 'builtin-modules'
import { pipe } from 'fp-ts/function'
import { isSome, map as mapOption, none, some } from 'fp-ts/Option'
import { uniq } from 'fp-ts/ReadonlyArray'
import { posix } from 'path'
import { CompilerOptions as TsMorphCompilerOptions, Project, SourceFile, StringLiteral, SyntaxKind } from 'ts-morph'
import { red, yellow } from 'typed-colors'
import { CompilerOptions, getDefaultCompilerOptions } from 'typescript'

import { debug } from '../../application/services/logging'
import { Dependency, Document } from '../../domain/model'
import { dependencyEq } from '../dependencyEq'
import { ensureRelative } from '../ensureRelative'
import { fsReadFile } from '../fsReadFile'
import { getHashFor } from '../hashes/getHashFor'
import { HashPlugin } from '../HashPlugin'
import { MAIN_FIELDS } from './defaults'
import { getFileExtension } from './getFileExtension'
import { resolvePathFromSourceFile } from './resolvePathFromSourceFile'
import { createResolveTsConfigPaths, TsConfigPathsResolver } from './resolveTsConfigPaths'

const specifiersToSkip = [...builtinModules, 'tslib']

export type JavascriptPluginOptions = {
  readonly compilerOptions?: CompilerOptions
  readonly mainFields?: readonly string[]
}

const multiSeparatedExtensions = ['.proxy.js', '.d.ts.map', '.js.map', '.d.ts']
const simpleExtensions = ['.js', '.ts', '.jsx', '.tsx']
const supportedExtensions = [...multiSeparatedExtensions, ...simpleExtensions]

const quotes = [`'`, `"`]

const stripSpecifier = (s: string) => stripPrefix(stripPostfix(s))
const stripPrefix = (s: string) => (quotes.includes(s[0]) ? s.slice(1) : s)
const stripPostfix = (s: string) => {
  const length = s.length
  const lastIndex = length - 1
  const end = s[lastIndex]

  if (quotes.includes(end)) {
    return s.slice(0, lastIndex)
  }

  return s
}

const EXTENSIONLESS_EXTENSIONS: Record<string, readonly string[]> = {
  '.js': ['.js', '.jsx'],
  '.jsx': ['.jsx', '.js'],
  '.d.ts': ['.d.ts', '.ts', '.js'],
}

const getExtensions = (extension: string) => {
  if (extension in EXTENSIONLESS_EXTENSIONS) {
    return EXTENSIONLESS_EXTENSIONS[extension]!
  }

  return [extension]
}

const getProxyReplacementExt = (ext: string): string => {
  const base = ext.slice(0, -9)

  if (base.endsWith('.map')) {
    return base.slice(0, -4)
  }

  return base
}

export const createJavascriptPlugin = (options: JavascriptPluginOptions): HashPlugin => {
  const { compilerOptions = getDefaultCompilerOptions(), mainFields = MAIN_FIELDS } = options
  const pathsResolver = createResolveTsConfigPaths({ compilerOptions })
  const project = new Project({
    compilerOptions: {
      ...compilerOptions,
      allowJs: true,
    } as TsMorphCompilerOptions,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    useInMemoryFileSystem: true,
  })

  const javascript: HashPlugin = {
    readFilePath: (filePath: string) =>
      Do(function* (_) {
        const ext = getFileExtension(filePath)

        if (!supportedExtensions.some((se) => ext.endsWith(se))) {
          yield* _(debug(`${red(`[JS]`)} Unsupported file extension ${filePath}`))

          return none
        }

        const shouldUseHashFor = multiSeparatedExtensions.some((se) => ext.endsWith(se))
        const isProxyJs = ext.endsWith('.proxy.js')

        yield* _(debug(`${yellow(`[JS]`)} Reading ${filePath}...`))

        const initial = yield* _(fsReadFile(filePath, { supportsSourceMaps: !isProxyJs, isBase64Encoded: false }))
        const document = shouldUseHashFor
          ? getHashFor(initial, isProxyJs ? getProxyReplacementExt(ext) : '.js')
          : initial

        yield* _(debug(`${yellow(`[JS]`)} Finding dependencies ${filePath}...`))

        return some(yield* _(findDependencies(project, pathsResolver, mainFields, document)))
      }),
  }

  return javascript
}

function findDependencies(
  project: Project,
  pathsResolver: TsConfigPathsResolver,
  mainFields: readonly string[],
  document: Document,
): E.Env<unknown, Document> {
  const contents = document.contents
  const sourceFile = project.getSourceFile(document.filePath) || project.createSourceFile(document.filePath, contents)

  const sourceFilePath = sourceFile.getFilePath()
  const extension = getFileExtension(sourceFilePath)
  const hasServiceWorkerRegister = contents.includes('serviceWorker.register')

  const standardStringLiterals = [
    ...sourceFile.getImportStringLiterals(),
    ...sourceFile
      .getExportDeclarations()
      .map((d) => d.getModuleSpecifier())
      .filter((x): x is Exclude<typeof x, undefined> => x !== undefined),
    ...(hasServiceWorkerRegister ? findServiceWorkerRegister(sourceFile) : []),
  ]

  const absoluteStringLiterals = [
    ...(extension.endsWith('.proxy.js')
      ? sourceFile.getExportAssignments().flatMap((a) => a.getDescendantsOfKind(SyntaxKind.StringLiteral))
      : []),
  ]

  const stringLiterals = [
    ...standardStringLiterals.map((s) => [s, false] as const),
    ...absoluteStringLiterals.map((s) => [s, true] as const),
  ]

  return pipe(
    stringLiterals.map(([literal, useBaseName]) => {
      const specifier = stripSpecifier(literal.getText())
      const moduleSpecifier = useBaseName ? ensureRelative(posix.basename(specifier)) : specifier

      if (specifiersToSkip.includes(moduleSpecifier)) {
        return E.of(none)
      }

      return pipe(
        resolvePathFromSourceFile({
          moduleSpecifier,
          directory: posix.dirname(sourceFilePath),
          pathsResolver,
          extensions: getExtensions(extension),
          mainFields,
        }),
        E.map(
          mapOption((filePath) => {
            const start = literal.getStart() + 1
            const end = literal.getEnd() - 1
            const dep: Dependency = {
              specifier,
              filePath,
              fileExtension: getFileExtension(filePath),
              position: { start, end },
            }
            return dep
          }),
        ),
      )
    }),
    E.zip,
    E.map(
      (dependencies): Document => ({
        ...document,
        dependencies: pipe(
          dependencies.filter(isSome).map((o) => o.value),
          uniq(dependencyEq),
        ),
      }),
    ),
  )
}

function findServiceWorkerRegister(sourceFile: SourceFile) {
  const literals: StringLiteral[] = []

  const callExpressions = sourceFile.getStatements().flatMap((s) => s.getChildrenOfKind(SyntaxKind.CallExpression))

  callExpressions.forEach((callExpression) => {
    const firstAccess = callExpression.getFirstDescendantByKind(SyntaxKind.PropertyAccessExpression)
    const secondaryAccess = firstAccess?.getFirstDescendantByKind(SyntaxKind.PropertyAccessExpression)
    const firstIdentifier = firstAccess?.getLastChildByKind(SyntaxKind.Identifier)?.getText()
    const secondaryIdentifier = secondaryAccess
      ? secondaryAccess.getLastChildByKind(SyntaxKind.Identifier)?.getText()
      : firstAccess?.getFirstChildByKind(SyntaxKind.Identifier)?.getText()

    if (firstIdentifier === 'register' && secondaryIdentifier === 'serviceWorker') {
      literals.push(
        ...callExpression
          .getChildrenOfKind(SyntaxKind.SyntaxList)
          .flatMap((l) => l.getChildrenOfKind(SyntaxKind.StringLiteral)),
      )
    }
  })

  return literals
}
