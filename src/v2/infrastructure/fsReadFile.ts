import { doEffect, fromTask } from '@typed/fp'
import { none, some } from 'fp-ts/lib/Option'
import { promises } from 'fs'
import { extname } from 'path'

import { debug } from '../application/services/logging'
import { Document } from '../domain/model'
import { sha512Hash } from './sha512Hash'

export type ReadFileOptions = {
  readonly isBase64Encoded: boolean
  readonly supportsSourceMaps: boolean
}

const sourceMapExt = '.map'

export const fsReadFile = (filePath: string, options: ReadFileOptions) =>
  doEffect(function* () {
    yield* debug(`Reading file ${filePath}...`)

    const contents: string = yield* fromTask(() =>
      promises.readFile(filePath).then((b) => (options.isBase64Encoded ? b.toString('base64') : b.toString())),
    )
    const skipSourceMap = options.isBase64Encoded || !options.supportsSourceMaps

    const document: Document = {
      filePath,
      fileExtension: extname(filePath),
      contents,
      contentHash: some({ type: 'hash', hash: sha512Hash(contents) }),
      dependencies: [],
      sourceMap: skipSourceMap ? none : some(filePath + sourceMapExt),
      ...options,
    }

    return document
  })
