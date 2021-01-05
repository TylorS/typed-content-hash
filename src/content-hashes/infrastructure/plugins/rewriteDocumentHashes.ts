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

  if (!sourceMaps || !hash) {
    return document
  }

  const updated = replaceDocumentHash(document, hash)
  const base = rewriteDocumentContents(updated, (ms) =>
    rewriteSourceMapUrl(ms, updated.filePath, updated.fileExtension, hash),
  )
  const dts = pipe(
    updated.dts,
    map((d) => rewriteDocumentContents(d, (ms) => rewriteSourceMapUrl(ms, d.filePath, d.fileExtension, hash))),
  )

  return { ...base, dts }
}
