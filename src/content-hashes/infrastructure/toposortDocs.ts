import { doEffect, Effect } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { contramap, ordNumber } from 'fp-ts/lib/Ord'
import { sort } from 'fp-ts/lib/ReadonlyArray'
import toposort from 'toposort'

import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'

export const topoSortDocs = (documents: readonly Document[]): Effect<LoggerEnv, readonly Document[]> =>
  doEffect(function* () {
    yield* debug(`Topologically sorting documents...`)

    const edges = documents.flatMap((doc) =>
      doc.dependencies.map((dep): [string, string] => [doc.filePath, dep.filePath]),
    )

    const filePaths = toposort(edges).reverse()

    return pipe(
      documents,
      pipe(
        ordNumber,
        contramap((d: Document) => filePaths.indexOf(d.filePath)),
        sort,
      ),
    )
  })
