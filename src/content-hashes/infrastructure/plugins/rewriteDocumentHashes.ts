import { doEffect, Effect } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { map } from 'fp-ts/lib/Option'
import { relative } from 'path'

import { debug, LoggerEnv } from '../../common/logging'
import { ContentHash, Directory, Document, FilePath, replaceDocumentHash } from '../../domain'
import { rewriteDocumentContents } from './rewriteDocumentContents'
import { rewriteSourceMapUrl } from './rewriteSourceMapUrl'

export const rewriteDocumentHashes = (
  directory: Directory,
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
  sourceMaps: boolean,
): Effect<LoggerEnv, Document> => {
  return doEffect(function* () {
    const hash = hashes.get(document.filePath)

    if (!sourceMaps) {
      return document
    }

    const updated = document.supportsHashes && hash ? replaceDocumentHash(document, hash) : document

    yield* debug(
      `Rewriting document hashes: ${relative(Directory.unwrap(directory), FilePath.unwrap(updated.filePath))}...`,
    )

    const base = rewriteDocumentContents(updated, (document, ms) => rewriteSourceMapUrl(ms, document.filePath))
    const dts = pipe(
      updated.dts,
      map((d) => rewriteDocumentContents(d, (document, ms) => rewriteSourceMapUrl(ms, document.filePath))),
    )

    return { ...base, dts }
  })
}
