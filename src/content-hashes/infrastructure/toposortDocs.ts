import { Env } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { pipe } from 'fp-ts/function'
import { Ord } from 'fp-ts/number'
import { fromNullable, isNone } from 'fp-ts/Option'
import { contramap as contraOrd } from 'fp-ts/Ord'
import { compact, map, sort } from 'fp-ts/ReadonlyArray'

import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'
import { DependencyMap, fromDependencyMap, getStronglyConnectedComponents } from './DiGraph'

const sortDocuments = pipe(
  Ord,
  // Ensure that files that require hashes are included first for those that do not but might be rewritten with them.
  contraOrd((d: Document) => (isNone(d.contentHash) ? 1 : d.contentHash.value.type === 'hashFor' ? 2 : 0)),
  sort,
)

export const sortDiGraph = (documents: readonly Document[]): Env<LoggerEnv, ReadonlyArray<ReadonlyArray<Document>>> =>
  Do(function* (_) {
    yield* _(debug(`Sorting documents...`))

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
