import { Pure } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

export function generateContentHashes(manager: HashPluginManager) {
  return (document: Document): Pure<ReadonlyMap<FilePath, ContentHash>> =>
    manager.getPluginOrThrow(document.filePath).generateContentHashes(document)
}
