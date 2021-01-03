import { pipe } from 'fp-ts/function'
import { contramap, ordNumber } from 'fp-ts/Ord'
import { sort } from 'fp-ts/ReadonlyArray'
import toposort from 'toposort'

import { Document, FilePath } from '../model'

export function toposortDocuments(documents: ReadonlyArray<Document>): ReadonlyArray<Document> {
  const filePaths = toposort(
    documents.flatMap((doc) =>
      doc.dependencies.map((dep): [string, string] => [FilePath.unwrap(doc.filePath), FilePath.unwrap(dep.filePath)]),
    ),
  )
    .map(FilePath.wrap)
    .reverse()
  const ord = pipe(
    ordNumber,
    contramap((d: Document) => filePaths.indexOf(d.filePath)),
  )

  return pipe(documents, sort(ord))
}
