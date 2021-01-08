import { doEffect, fromTask, map, zip } from '@typed/fp'
import { isSome } from 'fp-ts/lib/Option'
import { promises } from 'fs'

import { Document, FileContents, FilePath, getSourceMapPathFor } from '../domain'

export function writeDocuments(documents: ReadonlyArray<Document>) {
  return doEffect(function* () {
    yield* zip(documents.map(writeDocument))
  })
}

export function writeDocument(document: Document) {
  const effects = [writeFileContents(document.filePath, document.contents)]

  if (isSome(document.sourceMap)) {
    const { raw, proxy } = document.sourceMap.value
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    effects.push(writeFileContents(sourceMapPath, FileContents.wrap(JSON.stringify(raw, null, 2))))

    if (isSome(proxy)) {
      effects.push(writeDocument(proxy.value))
    }
  }

  if (isSome(document.dts)) {
    effects.push(writeDocument(document.dts.value))
  }

  return map(() => void 0, zip(effects))
}

export function writeFileContents(filePath: FilePath, contents: FileContents) {
  return fromTask(() => promises.writeFile(FilePath.unwrap(filePath), FileContents.unwrap(contents)))
}
