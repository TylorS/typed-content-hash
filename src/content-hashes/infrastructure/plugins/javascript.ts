import { isNotUndefined, mapResume, Resume } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { map } from 'fp-ts/Option'
import { CompilerOptions, Project } from 'ts-morph'
import { getDefaultCompilerOptions } from 'typescript'

import { Dependency, Document, FilePath } from '../../domain'
import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'
import { resolvePathFromSourceFile } from './resolvePathFromSourceFile'
import { createResolveTsConfigPaths, TsConfigPathsResolver } from './resolveTsConfigPaths'

export type JavascriptPluginOptions = {
  readonly compilerOptions?: CompilerOptions
}

export const javascriptPlugin: HashPluginFactory<JavascriptPluginOptions> = (
  directory,
  { compilerOptions = getDefaultCompilerOptions() },
) => {
  const base = createPlugin(directory, ['.js'])
  const project = new Project({
    compilerOptions,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: false,
  })
  const pathsResolver = createResolveTsConfigPaths({ compilerOptions })

  return {
    ...base,
    readDocument: createReadDocument(base, project, pathsResolver),
  }
}

function createReadDocument(base: HashPlugin, project: Project, pathsResolver: TsConfigPathsResolver) {
  function findDependencies(document: Document): Document {
    const sourceFile =
      project.getSourceFile(FilePath.unwrap(document.filePath)) ||
      project.addSourceFileAtPath(FilePath.unwrap(document.filePath))

    const stringLiterals = [
      ...sourceFile.getImportStringLiterals(),
      ...sourceFile
        .getExportDeclarations()
        .flatMap((d) => d.getModuleSpecifier())
        .filter(isNotUndefined),
    ]
    const dependencies = stringLiterals.map(
      (literal): Dependency => ({
        filePath: resolvePathFromSourceFile({
          moduleSpecifier: literal.getText(),
          filePath: sourceFile.getFilePath(),
          pathsResolver,
        }),
        position: [literal.getStart(), literal.getEnd()],
      }),
    )

    return {
      ...document,
      dependencies,
    }
  }

  return function readDocument(path: FilePath): Resume<Document> {
    return pipe(
      path,
      base.readDocument,
      mapResume((document) => {
        const jsFile = findDependencies(document)
        const dtsFile = pipe(document.dts, map(findDependencies))

        return { ...jsFile, dts: dtsFile }
      }),
    )
  }
}
