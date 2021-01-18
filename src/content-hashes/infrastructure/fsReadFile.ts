import { doEffect, fromTask } from '@typed/fp'
import { none, some } from 'fp-ts/lib/Option'
import { promises } from 'fs'

import { debug } from '../application/services/logging'
import { Document } from '../domain/model'
import { getFileExtension } from './plugins/getFileExtension'
import { sha512Hash } from './sha512Hash'

export type ReadFileOptions = {
  readonly isBase64Encoded: boolean
  readonly supportsSourceMaps: boolean
}

const sourceMapExt = '.map'
const proxyJsExt = '.proxy.js'

export const fsReadFile = (filePath: string, options: ReadFileOptions) =>
  doEffect(function* () {
    yield* debug(`Reading file ${filePath}...`)

    const contents: string = yield* fromTask(() =>
      promises.readFile(filePath).then((b) => (options.isBase64Encoded ? b.toString('base64') : b.toString())),
    )
    const fileExtension = getFileExtension(filePath)
    const skipSourceMap =
      options.isBase64Encoded ||
      !options.supportsSourceMaps ||
      [sourceMapExt, proxyJsExt].some((ext) => fileExtension.endsWith(ext))

    const document: Document = {
      filePath,
      fileExtension,
      contents,
      contentHash: some({ type: 'hash', hash: sha512Hash(contents) }),
      dependencies: [],
      sourceMap: skipSourceMap ? none : some(filePath + sourceMapExt),
      isBase64Encoded: options.isBase64Encoded,
    }

    return document
  })
