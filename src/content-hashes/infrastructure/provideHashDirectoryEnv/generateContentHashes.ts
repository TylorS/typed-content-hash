import { Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

export function generateContentHashes(manager: HashPluginManager, hashLength = Infinity) {
  return (document: Document): Resume<ReadonlyMap<FilePath, ContentHash>> =>
    manager.getPluginOrThrow(document.filePath).generateContentHashes(document, hashLength)
}
