import { pipe } from 'fp-ts/function'
import { map } from 'fp-ts/Option'

import { ContentHash, Document, FilePath, replaceDocumentHash } from '../../domain'
import { rewriteDocumentContents } from './rewriteDocumentContents'
import { rewriteSourceMapUrl } from './rewriteSourceMapUrl'

export const rewriteDocumentHashes = (
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
  sourceMaps: boolean,
): Document => {
  const hash = hashes.get(document.filePath)

  if (!sourceMaps) {
    return document
  }

  const updated = document.supportsHashes && hash ? replaceDocumentHash(document, hash) : document
  const base = rewriteDocumentContents(updated, (document, ms) => rewriteSourceMapUrl(ms, document.filePath))
  const dts = pipe(
    updated.dts,
    map((d) => rewriteDocumentContents(d, (document, ms) => rewriteSourceMapUrl(ms, document.filePath))),
  )

  return { ...base, dts }
}
