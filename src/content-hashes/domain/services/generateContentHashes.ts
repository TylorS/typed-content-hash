import { chain, Effect, fromEnv, sync } from '@typed/fp'
import { identity } from 'fp-ts/lib/function'

import { LoggerEnv } from '../../common/logging'
import { ContentHash, Document, FilePath } from '../model'

export interface GenerateContentHashes {
  readonly generateContentHashes: (document: Document) => Effect<LoggerEnv, ReadonlyMap<FilePath, ContentHash>>
}

/**
 * Generate a mapping of a Document's FilePath to those with the computed content hash
 */
export const generateContentHashes = (
  contents: Document,
): Effect<GenerateContentHashes & LoggerEnv, ReadonlyMap<FilePath, ContentHash>> =>
  chain(
    identity,
    fromEnv((e: GenerateContentHashes) => sync(e.generateContentHashes(contents))),
  )
