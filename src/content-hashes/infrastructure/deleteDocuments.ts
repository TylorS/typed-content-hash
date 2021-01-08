import { doEffect, fromTask, map, Pure, zip } from '@typed/fp'
import { isSome } from 'fp-ts/Option'
import { promises } from 'fs'

import { Document, FilePath, getSourceMapPathFor } from '../domain'

export function deleteDocuments(documents: ReadonlyArray<Document>): Pure<void> {
  return doEffect(function* () {
    yield* zip(documents.map(deleteDocument))
  })
}

export function deleteDocument(document: Document) {
  const effects = [deleteFilePath(document.filePath)]

  if (isSome(document.sourceMap)) {
    const { proxy } = document.sourceMap.value
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    effects.push(deleteFilePath(sourceMapPath))

    if (isSome(proxy)) {
      effects.push(deleteDocument(proxy.value))
    }
  }

  if (isSome(document.dts)) {
    effects.push(deleteDocument(document.dts.value))
  }

  return map(() => void 0, zip(effects))
}

export function deleteFilePath(filePath: FilePath) {
  return fromTask(() => promises.unlink(FilePath.unwrap(filePath)))
}
