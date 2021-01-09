import { Effect, map, zip } from '@typed/fp'

import { LoggerEnv } from '../../common/logging'
import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

export function rewriteDocumentHashes(manager: HashPluginManager) {
  return (
    documents: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ): Effect<LoggerEnv, readonly Document[]> => {
    const plugins = Array.from(new Set(documents.map((d) => manager.getPluginOrThrow(d.filePath))))
    const documentsByPlugin = plugins.map(
      (plugin) => [plugin, documents.filter((d) => manager.getPluginOrThrow(d.filePath) === plugin)] as const,
    )

    return map(
      (xs) => xs.flat(),
      zip(documentsByPlugin.map(([plugin, documents]) => plugin.rewriteDocumentHashes(documents, hashes))),
    )
  }
}
