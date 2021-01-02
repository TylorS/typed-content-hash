import { Effect, fromEnv, Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../model'

export interface RewriteDocumentHashes {
  readonly rewriteDocumentHashes: (
    documents: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ) => Resume<readonly Document[]>
}

/**
 * Perform any additional import/export/etc rewrites required, e.g. <link href> or <script src>
 */
export const rewriteDocumentHashes = (
  documents: readonly Document[],
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Effect<RewriteDocumentHashes, readonly Document[]> =>
  fromEnv((e: RewriteDocumentHashes) => e.rewriteDocumentHashes(documents, hashes))
