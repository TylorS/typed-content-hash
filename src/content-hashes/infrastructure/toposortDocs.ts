import { doEffect, Effect } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { contramap, ordNumber, ordString } from 'fp-ts/lib/Ord'
import { sort, uniq } from 'fp-ts/lib/ReadonlyArray'
import toposort from 'toposort'

import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'

export const topoSortDocs = (documents: readonly Document[]): Effect<LoggerEnv, readonly Document[]> =>
  doEffect(function* () {
    yield* debug(`Topologically sorting documents...`)

    const edges = pipe(documents).flatMap((doc) =>
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
      uniq(
        pipe(
          ordString,
          contramap((d) => d.filePath),
        ),
      ),
    )
  })
