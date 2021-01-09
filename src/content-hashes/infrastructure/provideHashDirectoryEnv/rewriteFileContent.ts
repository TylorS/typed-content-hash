import { Effect } from '@typed/fp'

import { LoggerEnv } from '../../common/logging'
import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

export function rewriteFileContent(manager: HashPluginManager) {
  return (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>): Effect<LoggerEnv, Document> =>
    manager.getPluginOrThrow(document.filePath).rewriteFileContent(document, hashes)
}
