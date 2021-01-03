import { fromEnv, Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../model'

export interface DocumentDiff {
  readonly created: ReadonlyArray<Document>
  readonly deleted: ReadonlyArray<Document>
  readonly unchanged: ReadonlyArray<Document>
}

export interface DiffDocuments {
  readonly diffDocuments: (
    current: readonly Document[],
    updated: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ) => Resume<DocumentDiff>
}

/**
 * Given the current set of documents and the updated set, delete and write all required.
 */
export const diffDocuments = (
  current: readonly Document[],
  updated: readonly Document[],
  hashes: ReadonlyMap<FilePath, ContentHash>,
) => fromEnv((e: DiffDocuments) => e.diffDocuments(current, updated, hashes))
