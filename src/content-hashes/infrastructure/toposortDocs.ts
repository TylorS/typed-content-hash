import { doEffect, Effect } from '@typed/fp'
import { DependencyMap, fromDependencyMap, getStronglyConnectedComponents } from '@typed/fp/DiGraph/exports'
import { pipe } from 'fp-ts/lib/function'
import { fromNullable, isNone } from 'fp-ts/lib/Option'
import { contramap as contraOrd, ordNumber } from 'fp-ts/lib/Ord'
import { compact, map, sort } from 'fp-ts/lib/ReadonlyArray'

import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'

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

    const docsByPath = new Map(documents.map((d) => [d.filePath, d] as const))

    return pipe(
      documents,
      sortDocuments,
      createDepMap,
      fromDependencyMap,
      getStronglyConnectedComponents,
      map((docs) => compact(docs.map((p) => fromNullable(docsByPath.get(p))))),
    )
  })

function createDepMap(documents: readonly Document[]): DependencyMap<string> {
  const graph = new Map<string, ReadonlyArray<string>>()

  for (const document of documents) {
    graph.set(document.filePath, Array.from(new Set(document.dependencies.map((d) => d.filePath))))
  }

  return graph
}
