import { chain, Effect, fromEnv, sync } from '@typed/fp'
import { identity } from 'fp-ts/lib/function'

import { LoggerEnv } from '../../common/logging'
import { ContentHash, Document, FilePath } from '../model'

export interface RewriteDocumentHashes {
  readonly rewriteDocumentHashes: (
    documents: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ) => Effect<LoggerEnv, readonly Document[]>
}

/**
 * Perform any additional import/export/etc rewrites required, e.g. <link href> or <script src>
 */
export const rewriteDocumentHashes = (
  documents: readonly Document[],
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Effect<RewriteDocumentHashes & LoggerEnv, readonly Document[]> =>
  chain(
    identity,
    fromEnv((e: RewriteDocumentHashes) => sync(e.rewriteDocumentHashes(documents, hashes))),
  )
