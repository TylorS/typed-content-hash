import { Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

export function rewriteFileContent(manager: HashPluginManager) {
  return (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>, hashLength: number): Resume<Document> =>
    manager.getPluginOrThrow(document.filePath).rewriteFileContent(document, hashes, hashLength)
}
