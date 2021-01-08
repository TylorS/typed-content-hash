import { ask, doEffect, Pure, zip } from '@typed/fp'

import { Document, FilePath } from '../model'

export const readFiles = (paths: ReadonlyArray<FilePath>) => {
  return zip(paths.map(readFile))
}

export const readFile = (path: FilePath) => {
  const eff = doEffect(function* () {
    const { readFile } = yield* ask<{ readFile: (path: FilePath) => Pure<Document> }>()

    return yield* readFile(path)
  })

  return eff
}
