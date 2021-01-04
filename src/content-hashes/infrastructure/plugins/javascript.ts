import { chainResume, deepEqualsEq, isNotUndefined, mapResume, memoize, Resume } from '@typed/fp'
import { eqString, getStructEq, getTupleEq } from 'fp-ts/Eq'
import { pipe } from 'fp-ts/function'
import { getEq } from 'fp-ts/lib/ReadonlyArray'
import { isNone, some } from 'fp-ts/Option'
import { dirname, extname } from 'path'
import { CompilerOptions, Project } from 'ts-morph'
import { getDefaultCompilerOptions } from 'typescript'

import { Dependency, Document, FileContents, FileExtension, FilePath } from '../../domain'
import { ModuleSpecifier } from '../../domain/model/ModuleSpecifier'
import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { zipResumes } from '../provideHashDirectoryEnv/zipResumes'
import { createPlugin } from './createPlugin'
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

// TODO: Support configuring these values?
const EXTENSIONS: Record<string, readonly string[]> = {
  '.js': ['.js', '.css', '.json'],
  '.js.map.proxy.js': ['.js.map', '.map', '.js'],
  '.d.ts': ['.d.ts', '.ts', '.json'],
}

const getExtensions = (extension: string) => {
  if (extension in EXTENSIONS) {
    return EXTENSIONS[extension]!
  }

  return [extension]
}

export const javascriptPlugin: HashPluginFactory<JavascriptPluginOptions> = (
  options,
  { compilerOptions = getDefaultCompilerOptions() },
) => {
  const base = createPlugin(options, ['.js'])
  const pathsResolver = createResolveTsConfigPaths({ compilerOptions })
  const project = new Project({
    compilerOptions: { ...compilerOptions, allowJs: true },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    useInMemoryFileSystem: true,
  })

  return {
    ...base,
    readDocument: createReadDocument(base, project, pathsResolver),
  }
}

function createReadDocument(base: HashPlugin, project: Project, pathsResolver: TsConfigPathsResolver) {
  function findDependencies(document: Document): Resume<Document> {
    const sourceFile =
      project.getSourceFile(FilePath.unwrap(document.filePath)) ||
      project.createSourceFile(FilePath.unwrap(document.filePath), FileContents.unwrap(document.contents))

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
          mapResume(
            (filePath): Dependency => {
              const dep: Dependency = {
                specifier: ModuleSpecifier.wrap(specifier),
                filePath,
                fileExtension: FileExtension.wrap(extension),
                position: [literal.getStart() + 1, literal.getEnd() - 1],
              }

              return dep
            },
          ),
        )
      }),
      zipResumes,
      mapResume((dependencies): Document => ({ ...document, dependencies })),
    )
  }

  function getDocumentDependencies(document: Document): Resume<Document> {
    if (isNone(document.dts)) {
      return findDependencies(document)
    }

    const jsFile = findDependencies(document)
    const dtsFile = findDependencies(document.dts.value)

    return pipe(
      zipResumes([jsFile, dtsFile]),
      mapResume(([js, dts]) => ({ ...js, dts: some(dts) })),
    )
  }

  return (path: FilePath): Resume<Document> => pipe(path, base.readDocument, chainResume(getDocumentDependencies))
}
