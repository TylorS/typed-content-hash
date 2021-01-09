import { Effect } from '@typed/fp'

import { LoggerEnv } from '../../common/logging'
import { ContentHash, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

export function generateContentHashes(manager: HashPluginManager) {
  return (document: Document): Effect<LoggerEnv, ReadonlyMap<FilePath, ContentHash>> =>
    manager.getPluginOrThrow(document.filePath).generateContentHashes(document)
}
