import { doEffect, Effect, Pure } from '@typed/fp'
import base64url from 'base64url'
import { createHash } from 'crypto'
import { pipe } from 'fp-ts/lib/function'
import { isSome } from 'fp-ts/lib/Option'

import { debug, LoggerEnv } from '../../common/logging'
import { ContentHash, Document, FileContents, FilePath, getSourceMapPathFor } from '../../domain'
import { trimHash } from './trimHash'

export const createShaHash = (contents: FileContents, hashLength = Infinity) =>
  ContentHash.wrap(
    base64url
      .fromBase64(createHash('sha512').update(FileContents.unwrap(contents)).digest('base64'))
      .slice(0, hashLength),
  )

export const documentToContentHashes = (
  document: Document,
  hashLength: number,
  hash: ContentHash = createShaHash(document.contents),
): Effect<LoggerEnv, ReadonlyMap<FilePath, ContentHash>> => {
  if (!document.supportsHashes) {
    return Pure.of(new Map())
  }

  const trimmedHash = pipe(hash, trimHash(hashLength))

  const eff = doEffect(function* () {
    yield* debug(`Generating content hashes for ${document.filePath}...`)

    let map = new Map([[document.filePath, trimmedHash]])

    if (isSome(document.sourceMap)) {
      const sourceMapPath = getSourceMapPathFor(document.filePath)

      map.set(sourceMapPath, trimmedHash)

      if (isSome(document.sourceMap.value.proxy)) {
        map = new Map([
          ...map,
          ...(yield* documentToContentHashes(document.sourceMap.value.proxy.value, hashLength, trimmedHash)),
        ])
      }
    }

    if (isSome(document.dts)) {
      map = new Map([...map, ...(yield* documentToContentHashes(document.dts.value, hashLength, trimmedHash))])
    }

    return map
  })

  return eff
}
