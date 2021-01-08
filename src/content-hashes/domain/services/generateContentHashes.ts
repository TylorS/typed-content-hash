import { chain, Effect, fromEnv, Pure, sync } from '@typed/fp'
import { identity } from 'fp-ts/function'

import { ContentHash, Document, FilePath } from '../model'

export interface GenerateContentHashes {
  readonly generateContentHashes: (document: Document) => Pure<ReadonlyMap<FilePath, ContentHash>>
}

/**
 * Generate a mapping of a Document's FilePath to those with the computed content hash
 */
export const generateContentHashes = (
  contents: Document,
): Effect<GenerateContentHashes, ReadonlyMap<FilePath, ContentHash>> =>
  chain(
    identity,
    fromEnv((e: GenerateContentHashes) => sync(e.generateContentHashes(contents))),
  )
