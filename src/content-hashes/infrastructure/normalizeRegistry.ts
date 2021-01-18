import { pipe } from 'fp-ts/lib/function'
import { map } from 'fp-ts/lib/Option'
import { relative } from 'path'

import { DocumentRegistry } from '../application'
import { Document } from '../domain/model'

export function normalizeRegistry(directory: string, registry: DocumentRegistry): Record<string, Document> {
  return Object.fromEntries(
    Array.from(registry).map(([path, doc]) => [relative(directory, path), normalizeDoc(directory, doc)]),
  )
}

function normalizeDoc(directory: string, document: Document): Document {
  return {
    ...document,
    dependencies: document.dependencies.map((d) => ({ ...d, filePath: relative(directory, d.filePath) })),
    filePath: relative(directory, document.filePath),
    sourceMap: pipe(
      document.sourceMap,
      map((p) => relative(directory, p)),
    ),
    contentHash: pipe(
      document.contentHash,
      map((hash) => (hash.type === 'hashFor' ? { ...hash, filePath: relative(directory, hash.filePath) } : hash)),
    ),
  }
}
