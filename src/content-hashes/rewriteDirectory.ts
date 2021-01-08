import { chain, doEffect, execEffect, fromTask } from '@typed/fp'
import { Disposable } from '@typed/fp/Disposable/exports'
import { pipe } from 'fp-ts/function'
import { none } from 'fp-ts/lib/Option'
import { readFile } from 'fs/promises'
import { extname, resolve } from 'path'

import { hashDirectory, writeHashedDirectory } from './application'
import { Directory, Document, FileContents, FileExtension, FilePath } from './domain'
import {
  deleteDocuments,
  HashPluginEnvs,
  HashPluginFactory,
  provideHashDirectoryEnv,
  writeDocuments,
} from './infrastructure'

export type RewriteDirectoryOptions<Plugins extends ReadonlyArray<HashPluginFactory<any>>> = {
  readonly pluginEnv: HashPluginEnvs<Plugins>
  readonly directory: string
  readonly plugins: Plugins
  readonly hashLength: number
  readonly assetManifest: string
  readonly baseUrl?: string
}

export function rewriteDirectory<Plugins extends ReadonlyArray<HashPluginFactory<any>>>({
  directory,
  plugins,
  hashLength,
  assetManifest,
  baseUrl,
  pluginEnv,
}: RewriteDirectoryOptions<Plugins>): Disposable {
  return pipe(
    hashDirectory,
    chain(writeHashedDirectory),
    provideHashDirectoryEnv({
      directory: Directory.wrap(directory),
      baseUrl,
      plugins,
      hashLength,
    }),
    execEffect({
      ...pluginEnv,
      assetManifest: FilePath.wrap(resolve(directory, assetManifest)),
      writeDocuments,
      deleteDocuments,
      readFile: (filePath) =>
        doEffect(function* () {
          const contents = yield* fromTask(() => readFile(FilePath.unwrap(filePath)).then((b) => b.toString()))
          const document: Document = {
            filePath,
            contents: FileContents.wrap(contents),
            fileExtension: pipe(filePath, FilePath.unwrap, extname, FileExtension.wrap),
            dependencies: [],
            sourceMap: none,
            dts: none,
          }

          return document
        }),
    }),
  )
}
