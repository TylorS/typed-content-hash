import { fromEnv, Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../model'

export interface RewriteFileContent {
  readonly rewriteFileContent: (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>) => Resume<Document>
}

/**
 * Rewrite a document's file content with all of the computed hashes. If supported it must update sourceMaps
 */
export const rewriteFileContent = (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>) =>
  fromEnv((e: RewriteFileContent) => e.rewriteFileContent(document, hashes))
