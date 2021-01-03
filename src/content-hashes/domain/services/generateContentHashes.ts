import { Effect, fromEnv, Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../model'

export interface GenerateContentHashes {
  readonly generateContentHashes: (document: Document, hashLength: number) => Resume<ReadonlyMap<FilePath, ContentHash>>
  readonly hashLength: number
}

/**
 * Generate a mapping of a Document's FilePath to those with the computed content hash
 */
export const generateContentHashes = (
  contents: Document,
): Effect<GenerateContentHashes, ReadonlyMap<FilePath, ContentHash>> =>
  fromEnv((e: GenerateContentHashes) => e.generateContentHashes(contents, e.hashLength))
