import { doEffect, Effect } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { isNone } from 'fp-ts/lib/Option'
import { contramap as contraOrd, ordNumber } from 'fp-ts/lib/Ord'
import { sort } from 'fp-ts/lib/ReadonlyArray'

import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'
import { DiGraph, tarjan } from './tarjan'

const sortDocuments = pipe(
  ordNumber,
  // Ensure that files that require hashes are included first for those that do not but might be rewritten with them.
  contraOrd((d: Document) => (isNone(d.contentHash) ? 1 : d.contentHash.value.type === 'hashFor' ? 2 : 0)),
  sort,
)

export const sortDiGraph = (
  documents: readonly Document[],
): Effect<LoggerEnv, ReadonlyArray<ReadonlyArray<Document>>> =>
  doEffect(function* () {
    yield* debug(`Sorting documents...`)

    const components = pipe(documents, sortDocuments, createDiGraph, tarjan)
    const docsByPath = new Map(documents.map((d) => [d.filePath, d] as const))

    return components.map((docs) => docs.map((p) => docsByPath.get(p)!))
  })

function createDiGraph(documents: readonly Document[]): DiGraph<string> {
  const graph = new Map<string, ReadonlySet<string>>()

  for (const document of documents) {
    graph.set(document.filePath, new Set(document.dependencies.map((d) => d.filePath)))
  }

  return graph
}
