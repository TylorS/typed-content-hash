import { chain, Effect, fromEnv, Pure, sync } from '@typed/fp'
import { identity } from 'fp-ts/function'

import { ContentHash, Document, FilePath } from '../model'

export interface RewriteDocumentHashes {
  readonly rewriteDocumentHashes: (
    documents: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ) => Pure<readonly Document[]>
}

/**
 * Perform any additional import/export/etc rewrites required, e.g. <link href> or <script src>
 */
export const rewriteDocumentHashes = (
  documents: readonly Document[],
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Effect<RewriteDocumentHashes, readonly Document[]> =>
  chain(
    identity,
    fromEnv((e: RewriteDocumentHashes) => sync(e.rewriteDocumentHashes(documents, hashes))),
  )
