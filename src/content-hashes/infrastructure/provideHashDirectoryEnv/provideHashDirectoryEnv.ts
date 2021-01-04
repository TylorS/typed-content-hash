import { And, ask, doEffect, log, provideAll, Provider, provideWith } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { gray } from 'typed-colors'

import { HashDirectoryEnv } from '../../application'
import { LogLevel } from '../../common/logging'
import { Directory } from '../../domain'
import { diffDocuments } from './diffDocuments'
import { generateAssetManifest } from './generateAssetManifest'
import { generateContentHashes } from './generateContentHashes'
import { HashPluginFactory } from './HashPlugin'
import { HashPluginManager } from './PluginManager'
import { readDirectory } from './readDirectory'
import { rewriteDocumentHashes } from './rewriteDocumentHashes'
import { rewriteFileContent } from './rewriteFileContent'

export type HashPluginEnvs<Plugins extends ReadonlyArray<HashPluginFactory<{}>>> = And<
  {
    [K in keyof Plugins]: Plugins[K] extends HashPluginFactory<infer R> ? R : unknown
  },
  {}
>

export interface HashDirectryEnvOptions<Plugins extends ReadonlyArray<HashPluginFactory<any>>> {
  readonly directory: Directory
  readonly baseUrl?: string
  readonly plugins: Plugins
  readonly logLevel?: LogLevel
  readonly logPrefix?: string
  readonly hashLength?: number
}

export function provideHashDirectoryEnv<Plugins extends ReadonlyArray<HashPluginFactory<any>>>(
  options: HashDirectryEnvOptions<Plugins>,
): Provider<HashDirectoryEnv, HashPluginEnvs<Plugins>> {
  const { directory, baseUrl, plugins, logLevel = LogLevel.Info, logPrefix = '', hashLength = Infinity } = options

  return provideWith(
    doEffect(function* () {
      const env = yield* ask<HashPluginEnvs<Plugins>>()
      const manager = new HashPluginManager(plugins.map((plugin) => plugin({ directory, baseUrl }, env)))
      const hashDirectoryEnv: HashDirectoryEnv = {
        readDirectory: readDirectory(directory, manager),
        rewriteFileContent: rewriteFileContent(manager),
        generateContentHashes: generateContentHashes(manager, hashLength),
        rewriteDocumentHashes: rewriteDocumentHashes(manager),
        generateAssetManifest: generateAssetManifest(directory),
        diffDocuments,
        logLevel,
        logPrefix: logPrefix ? gray(logPrefix) : '',
        logger: (s) => pipe(s, log, provideAll({ console })),
        hashLength,
      }

      return hashDirectoryEnv
    }),
  )
}
