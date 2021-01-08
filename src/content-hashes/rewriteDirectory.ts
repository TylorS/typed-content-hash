import { chain, doEffect, fromTask, provideAll, toPromise } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { none, some } from 'fp-ts/Option'
import { existsSync, promises } from 'fs'
import { extname, resolve } from 'path'

import { hashDirectory, writeHashedDirectory, WrittenDirectory } from './application'
import { LogLevel } from './common/logging'
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
  readonly logLevel?: LogLevel
  readonly logPrefix?: string
}

export function rewriteDirectory<Plugins extends ReadonlyArray<HashPluginFactory<any>>>(
  options: RewriteDirectoryOptions<Plugins>,
): Promise<WrittenDirectory> {
  const { directory, plugins, hashLength, assetManifest, baseUrl, pluginEnv, logLevel, logPrefix } = options

  return pipe(
    hashDirectory,
    chain(writeHashedDirectory),
    provideHashDirectoryEnv({
      directory: Directory.wrap(directory),
      baseUrl,
      plugins,
      hashLength,
      logLevel,
      logPrefix,
    }),
    provideAll({
      ...pluginEnv,
      assetManifest: FilePath.wrap(resolve(directory, assetManifest)),
      writeDocuments,
      deleteDocuments,
      readFile: (filePath) =>
        doEffect(function* () {
          if (!existsSync(FilePath.unwrap(filePath))) {
            return none
          }

          const contents = yield* fromTask(() => promises.readFile(FilePath.unwrap(filePath)).then((b) => b.toString()))
          const document: Document = {
            filePath,
            contents: FileContents.wrap(contents),
            fileExtension: pipe(filePath, FilePath.unwrap, extname, FileExtension.wrap),
            dependencies: [],
            sourceMap: none,
            dts: none,
            supportsHashes: true,
          }

          return some(document)
        }),
    }),
    toPromise,
  )
}
