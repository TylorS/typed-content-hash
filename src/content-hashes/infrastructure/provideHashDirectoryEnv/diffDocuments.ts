import { Resume, sync } from '@typed/fp'

import { ContentHash, Document, DocumentDiff, FilePath } from '../../domain'

export const diffDocuments = (
  currentDocs: readonly Document[],
  updatedDocs: readonly Document[],
  _hashes: ReadonlyMap<FilePath, ContentHash>,
): Resume<DocumentDiff> => {
  const currentFilePaths = new Map(currentDocs.map((d) => [d.filePath, d] as const))
  const updatedFilePaths = new Map(updatedDocs.map((d) => [d.filePath, d] as const))

  const created = new Set<Document>()
  const deleted = new Set<Document>()
  const unchanged = new Set<Document>()

  for (const current of currentDocs) {
    const updated = updatedFilePaths.get(current.filePath)

    if (!updated) {
      deleted.add(current)

      continue
    }

    if (current.contents === updated.contents) {
      unchanged.add(current)
    }
  }

  for (const updated of updatedDocs) {
    if (!currentFilePaths.has(updated.filePath)) {
      created.add(updated)
    }
  }

  return sync({
    created: Array.from(created),
    deleted: Array.from(deleted),
    unchanged: Array.from(unchanged),
  })
}
