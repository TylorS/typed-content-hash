import { And, ask, doEffect, Provider, provideWith } from '@typed/fp'

import { HashDirectoryEnv } from '../../application'
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
  }
>

export function provideHashDirectoryEnv<Plugins extends ReadonlyArray<HashPluginFactory<any>>>(
  directory: Directory,
  plugins: Plugins,
): Provider<HashDirectoryEnv, HashPluginEnvs<Plugins>> {
  return provideWith(
    doEffect(function* () {
      const e = yield* ask<HashPluginEnvs<Plugins>>()
      const manager = new HashPluginManager(plugins.map((plugin) => plugin(directory, e)))
      const hashDirectoryEnv: HashDirectoryEnv = {
        readDirectory: readDirectory(directory, manager),
        rewriteFileContent: rewriteFileContent(manager),
        generateContentHashes: generateContentHashes(manager),
        rewriteDocumentHashes: rewriteDocumentHashes(manager),
        generateAssetManifest: generateAssetManifest(directory),
        diffDocuments,
      }

      return hashDirectoryEnv
    }),
  )
}
