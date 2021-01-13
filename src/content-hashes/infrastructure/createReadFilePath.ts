import { doEffect, zip } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { isSome, none, option, some } from 'fp-ts/lib/Option'
import { isNonEmpty, uniq } from 'fp-ts/lib/ReadonlyArray'

import { debug } from '../application/services/logging'
import { Document } from '../domain/model'
import { dependencyEq } from './dependencyEq'
import { HashPlugin } from './HashPlugin'

const combineDocuments = (a: Document, b: Document): Document => ({
  ...a,
  contentHash: option.alt(a.contentHash, () => b.contentHash),
  sourceMap: option.alt(a.sourceMap, () => b.sourceMap),
  dependencies: pipe([...a.dependencies, ...b.dependencies], uniq(dependencyEq)),
})

export function createReadFilePath(plugins: readonly HashPlugin[]) {
  return function readFilePath(filePath: string) {
    const eff = doEffect(function* () {
      yield* debug(`Reading ${filePath}...`)

      const options = yield* zip(plugins.map((plugin) => pipe(filePath, plugin.readFilePath)))
      const documents = options.filter(isSome).map((o) => o.value)

      if (!isNonEmpty(documents)) {
        return none
      }

      return some(documents.slice(1).reduce(combineDocuments, documents[0]))
    })

    return eff
  }
}
