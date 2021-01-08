import { Resume, sync } from '@typed/fp'
import { contramap, eqString } from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/function'
import { difference } from 'fp-ts/ReadonlyArray'

import { ContentHash, Document, DocumentDiff, FilePath } from '../../domain'

const diff = pipe(
  eqString,
  contramap((d: Document) => FilePath.unwrap(d.filePath)),
  difference,
)

export const diffDocuments = (
  currentDocs: readonly Document[],
  updatedDocs: readonly Document[],
  _hashes: ReadonlyMap<FilePath, ContentHash>,
): Resume<DocumentDiff> => {
  const deleted = diff(currentDocs, updatedDocs)
  const created = diff(updatedDocs, currentDocs)
  const unchanged = diff(updatedDocs, [...deleted, ...created])

  for (const d of unchanged) {
    console.log(d.contents)
  }

  return sync({
    created: Array.from(created),
    deleted: Array.from(deleted),
    unchanged: Array.from(unchanged),
  })
}
