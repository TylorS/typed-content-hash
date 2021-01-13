import { deepEqualsEq, doEffect, isNotUndefined, map, memoize, Pure, zip } from '@typed/fp'
import { eqString, getStructEq, getTupleEq } from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/function'
import { none, some } from 'fp-ts/lib/Option'
import { getEq } from 'fp-ts/lib/ReadonlyArray'
import { dirname, extname } from 'path'
import { CompilerOptions, Project } from 'ts-morph'
import { red, yellow } from 'typed-colors'
import { getDefaultCompilerOptions } from 'typescript'

import { debug } from '../../application/services/logging'
import { Dependency, Document } from '../../domain/model'
import { fsReadFile } from '../fsReadFile'
import { HashPlugin } from '../HashPlugin'
import { resolvePathFromSourceFile } from './resolvePathFromSourceFile'
import { createResolveTsConfigPaths, TsConfigPathsResolver } from './resolveTsConfigPaths'

const resolvePath = memoize(
  getTupleEq(
    getStructEq({
      moduleSpecifier: eqString,
      directory: eqString,
      pathsResolver: deepEqualsEq,
      extensions: getEq(eqString),
    }),
  ),
)(resolvePathFromSourceFile)

export type JavascriptPluginOptions = {
  readonly compilerOptions?: CompilerOptions
}

const multiSeparatedExtensions = ['.js.map.proxy.js', '.d.ts.map', '.js.map', '.d.ts']
const supportedExtensions = [...multiSeparatedExtensions, '.js', '.ts', '.jsx', '.tsx']

const getFileExtension = (filePath: string) => {
  for (const extension of multiSeparatedExtensions) {
    if (filePath.endsWith(extension)) {
      return extension
    }
  }

  return extname(filePath)
}

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
  '.js': ['.js'],
  '.js.map.proxy.js': ['.js.map', '.map', '.js'],
  '.d.ts': ['.d.ts', '.ts'],
}

const getExtensions = (extension: string) => {
  if (extension in EXTENSIONLESS_EXTENSIONS) {
    return EXTENSIONLESS_EXTENSIONS[extension]!
  }

  return [extension]
}

export const createJavascriptPlugin = (options: JavascriptPluginOptions): HashPlugin => {
  const { compilerOptions = getDefaultCompilerOptions() } = options
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

        if (supportedExtensions.includes(ext)) {
          yield* debug(`${red(`[JS]`)} Unsupported file extension ${filePath}`)

          return none
        }

        yield* debug(`${yellow(`[JS]`)} Reading ${filePath}...`)
        const initial = yield* fsReadFile(filePath, { supportsSourceMaps: true, isBase64Encoded: false })
        yield* debug(`${yellow(`[JS]`)} Finding dependencies ${filePath}...`)
        const document = yield* findDependencies(project, pathsResolver, initial)

        return some(document)
      }),
  }

  return javascript
}

function findDependencies(project: Project, pathsResolver: TsConfigPathsResolver, document: Document): Pure<Document> {
  const contents = document.contents
  const sourceFile = project.getSourceFile(document.filePath) || project.createSourceFile(document.filePath, contents)

  const sourceFilePath = sourceFile.getFilePath()
  const extension = getFileExtension(sourceFilePath)
  const stringLiterals = [
    ...sourceFile.getImportStringLiterals(),
    ...sourceFile
      .getExportDeclarations()
      .map((d) => d.getModuleSpecifier())
      .filter(isNotUndefined),
  ]

  return pipe(
    stringLiterals.map((literal) => {
      const specifier = stripSpecifier(literal.getText())

      return pipe(
        resolvePath({
          moduleSpecifier: specifier,
          directory: dirname(sourceFilePath),
          pathsResolver,
          extensions: getExtensions(extension),
        }),
        map(
          (filePath): Dependency => {
            const start = literal.getStart() + 1
            const end = literal.getEnd() - 1
            const dep: Dependency = {
              specifier,
              filePath,
              fileExtension: getFileExtension(filePath),
              position: { start, end },
            }

            return dep
          },
        ),
      )
    }),
    zip,
    map((dependencies): Document => ({ ...document, dependencies })),
  )
}