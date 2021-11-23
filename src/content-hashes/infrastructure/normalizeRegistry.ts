import { pipe } from 'fp-ts/function'
import { map } from 'fp-ts/Option'
import { posix } from 'path'

import { DocumentRegistry } from '../application'
import { Document } from '../domain/model'

export function normalizeRegistry(directory: string, registry: DocumentRegistry): Record<string, Document> {
  return Object.fromEntries(
    Array.from(registry).map(([path, doc]) => [posix.relative(directory, path), normalizeDoc(directory, doc)]),
  )
}

function normalizeDoc(directory: string, document: Document): Document {
  return {
    ...document,
    dependencies: document.dependencies.map((d) => ({ ...d, filePath: posix.relative(directory, d.filePath) })),
    filePath: posix.relative(directory, document.filePath),
    sourceMap: pipe(
      document.sourceMap,
      map((p) => posix.relative(directory, p)),
    ),
    contentHash: pipe(
      document.contentHash,
      map((hash) => (hash.type === 'hashFor' ? { ...hash, filePath: posix.relative(directory, hash.filePath) } : hash)),
    ),
  }
}
