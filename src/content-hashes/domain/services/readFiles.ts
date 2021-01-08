import { ask, doEffect, Pure, zip } from '@typed/fp'
import { isSome, Option } from 'fp-ts/lib/Option'

import { Document, FilePath } from '../model'

export const readFiles = (paths: ReadonlyArray<FilePath>) => {
  return doEffect(function* () {
    const options = yield* zip(paths.map(readFile))

    return options.filter(isSome).map((o) => o.value)
  })
}

export const readFile = (path: FilePath) => {
  const eff = doEffect(function* () {
    const { readFile } = yield* ask<{ readFile: (path: FilePath) => Pure<Option<Document>> }>()

    return yield* readFile(path)
  })

  return eff
}
