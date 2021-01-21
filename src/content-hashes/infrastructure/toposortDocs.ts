import { doEffect, Effect } from '@typed/fp'
import { contramap, eqString } from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/function'
import { isNone } from 'fp-ts/lib/Option'
import { contramap as contraOrd, ordNumber } from 'fp-ts/lib/Ord'
import { sort } from 'fp-ts/lib/ReadonlyArray'
import { map } from 'fp-ts/lib/ReadonlySet'

import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const scc = require('@rtsao/scc') as (digraph: DiGraph) => ReadonlyArray<Set<string>>

export type DiGraph = ReadonlyMap<string, ReadonlySet<string>>

const mapPaths = pipe(
  eqString,
  contramap((d: Document) => d.filePath),
  map,
)

const hashForLastOrd = pipe(
  ordNumber,
  // Ensure that files that require hashes are included first for those that do not but might be rewritten with them.
  contraOrd((d: Document) => (isNone(d.contentHash) ? 1 : d.contentHash.value.type === 'hashFor' ? 2 : 0)),
)

export const sortDiGraph = (documents: readonly Document[]): Effect<LoggerEnv, readonly ReadonlySet<Document>[]> =>
  doEffect(function* () {
    yield* debug(`Sorting documents...`)

    const components = pipe(documents, sort(hashForLastOrd), createDiGraph, scc)
    const docsByPath = new Map(documents.map((d) => [d.filePath, d] as const))

    return components.map(mapPaths((p: string) => docsByPath.get(p)!))
  })

function createDiGraph(documents: readonly Document[]): DiGraph {
  const graph = new Map<string, Set<string>>()

  for (const document of documents) {
    graph.set(document.filePath, new Set(document.dependencies.map((d) => d.filePath)))
  }

  return graph
}
