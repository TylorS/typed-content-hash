import { chain, fromEnv, Pure, sync } from '@typed/fp'
import { identity } from 'fp-ts/function'

import { ContentHash, Document, FilePath } from '../model'

export interface RewriteFileContent {
  readonly rewriteFileContent: (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>) => Pure<Document>
}

/**
 * Rewrite a document's file content with all of the computed hashes. If supported it must update sourceMaps
 */
export const rewriteFileContent = (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>) =>
  chain(
    identity,
    fromEnv((e: RewriteFileContent) => sync(e.rewriteFileContent(document, hashes))),
  )
