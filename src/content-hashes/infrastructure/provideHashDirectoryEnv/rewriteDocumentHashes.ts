import { mapResume, Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'
import { zipResumes } from './zipResumes'

export function rewriteDocumentHashes(manager: HashPluginManager) {
  return (documents: readonly Document[], hashes: ReadonlyMap<FilePath, ContentHash>): Resume<readonly Document[]> => {
    const plugins = Array.from(new Set(documents.map((d) => manager.getPluginOrThrow(d.filePath))))
    const documentsByPlugin = plugins.map(
      (plugin) => [plugin, documents.filter((d) => manager.getPluginOrThrow(d.filePath) === plugin)] as const,
    )

    return mapResume(
      (xs) => xs.flat(),
      zipResumes(documentsByPlugin.map(([plugin, documents]) => plugin.rewriteDocumentHashes(documents, hashes))),
    )
  }
}
