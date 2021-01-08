import base64url from 'base64url'
import { createHash } from 'crypto'
import { pipe } from 'fp-ts/function'
import { isSome } from 'fp-ts/Option'

import { ContentHash, Document, FileContents, FilePath, getSourceMapPathFor } from '../../domain'
import { trimHash } from './trimHash'

export const createShaHash = (contents: FileContents) =>
  ContentHash.wrap(base64url.fromBase64(createHash('sha512').update(FileContents.unwrap(contents)).digest('base64')))

export const documentToContentHashes = (
  document: Document,
  hashLength: number,
  hash: ContentHash = createShaHash(document.contents),
): ReadonlyMap<FilePath, ContentHash> => {
  const trimmedHash = pipe(hash, trimHash(hashLength))

  let map = new Map([[document.filePath, trimmedHash]])

  if (isSome(document.sourceMap)) {
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    map.set(sourceMapPath, trimmedHash)

    if (isSome(document.sourceMap.value.proxy)) {
      map = new Map([...map, ...documentToContentHashes(document.sourceMap.value.proxy.value, hashLength, trimmedHash)])
    }
  }

  if (isSome(document.dts)) {
    map = new Map([...map, ...documentToContentHashes(document.dts.value, hashLength, trimmedHash)])
  }

  return map
}
