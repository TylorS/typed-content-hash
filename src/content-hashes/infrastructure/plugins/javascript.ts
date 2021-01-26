import { deepEqualsEq, doEffect, isNotUndefined, map, memoize, Pure, zip } from '@typed/fp'
import builtinModules from 'builtin-modules'
import { Eq, eqString, getStructEq, getTupleEq } from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/function'
import { isSome, map as mapOption, none, some } from 'fp-ts/lib/Option'
import { getEq, uniq } from 'fp-ts/lib/ReadonlyArray'
import { basename, dirname } from 'path'
import { CompilerOptions, Project } from 'ts-morph'
import { red, yellow } from 'typed-colors'
import { getDefaultCompilerOptions, SyntaxKind } from 'typescript'

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

const resolvePath = memoize(
  getTupleEq(
    getStructEq({
      moduleSpecifier: eqString,
      directory: eqString,
      pathsResolver: deepEqualsEq as Eq<TsConfigPathsResolver>,
      extensions: getEq(eqString),
      mainFields: getEq(eqString),
    }),
  ),
)(resolvePathFromSourceFile)

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
    compilerOptions: { ...compilerOptions, allowJs: true },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    useInMemoryFileSystem: true,
  })

  const javascript: HashPlugin = {
    readFilePath: (filePath: string) =>
      doEffect(function* () {
        const ext = getFileExtension(filePath)

        if (!supportedExtensions.some((se) => ext.endsWith(se))) {
          yield* debug(`${red(`[JS]`)} Unsupported file extension ${filePath}`)

          return none
        }

        const shouldUseHashFor = multiSeparatedExtensions.some((se) => ext.endsWith(se))
        const isProxyJs = ext.endsWith('.proxy.js')

        yield* debug(`${yellow(`[JS]`)} Reading ${filePath}...`)

        const initial = yield* fsReadFile(filePath, { supportsSourceMaps: !isProxyJs, isBase64Encoded: false })
        const document = shouldUseHashFor
          ? getHashFor(initial, isProxyJs ? getProxyReplacementExt(ext) : '.js')
          : initial

        yield* debug(`${yellow(`[JS]`)} Finding dependencies ${filePath}...`)

        return some(yield* findDependencies(project, pathsResolver, mainFields, document))
      }),
  }

  return javascript
}

function findDependencies(
  project: Project,
  pathsResolver: TsConfigPathsResolver,
  mainFields: readonly string[],
  document: Document,
): Pure<Document> {
  const contents = document.contents
  const sourceFile = project.getSourceFile(document.filePath) || project.createSourceFile(document.filePath, contents)

  const sourceFilePath = sourceFile.getFilePath()
  const extension = getFileExtension(sourceFilePath)

  const standardStringLiterals = [
    ...sourceFile.getImportStringLiterals(),
    ...sourceFile
      .getExportDeclarations()
      .map((d) => d.getModuleSpecifier())
      .filter(isNotUndefined),
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
      const moduleSpecifier = useBaseName ? ensureRelative(basename(specifier)) : specifier

      if (specifiersToSkip.includes(moduleSpecifier)) {
        return Pure.of(none)
      }

      return pipe(
        resolvePath({
          moduleSpecifier,
          directory: dirname(sourceFilePath),
          pathsResolver,
          extensions: getExtensions(extension),
          mainFields,
        }),
        map(
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
    zip,
    map(
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
