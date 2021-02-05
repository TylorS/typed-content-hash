import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, fromTask, zip } from '@typed/fp'
import { existsSync, promises } from 'fs'
import { basename } from 'path'

import { DocumentRegistry } from '../application/model'
import { debug, info } from '../application/services/logging'
import { Document } from '../domain/model'
import { getHashedPath } from './hashes/getHashedPath'
import { replaceHash } from './hashes/replaceHash'

const writeFile = (path: string, contents: string) => fromTask(() => promises.writeFile(path, contents))
const rename = (from: string, to: string) => fromTask(() => promises.rename(from, to))
const unlinkFile = (path: string) => fromTask(() => promises.unlink(path))
const sourceMapExt = '.map'
const sourceMapExtRegex = new RegExp(`${sourceMapExt}$`)

export const fsWriteDocuments = (registry: DocumentRegistry, hashLength: number) => {
  const eff = doEffect(function* () {
    yield* debug(`Writing registry...`)

    yield* zip(
      Array.from(registry.values()).map((document) =>
        doEffect(function* () {
          const hashedPath = getHashedPath(document, registry, hashLength)
          const pathChanged = document.filePath !== hashedPath

          if (hashedPath.endsWith(sourceMapExt) && pathChanged) {
            document = yield* tryToRewriteFilename(document, hashedPath)
          }

          if (!document.isBase64Encoded && pathChanged && existsSync(document.filePath)) {
            yield* unlinkFile(document.filePath)
          }

          if (!document.isBase64Encoded) {
            yield* writeFile(hashedPath, document.contents)
          }

          if (document.isBase64Encoded && pathChanged) {
            yield* rename(document.filePath, hashedPath)
          }
        }),
      ),
    )
  })

  return eff
}

function tryToRewriteFilename(document: Document, hashedPath: string) {
  return doEffect(function* () {
    try {
      const raw = JSON.parse(document.contents) as RawSourceMap

      const extension = document.fileExtension.replace(sourceMapExtRegex, '')
      const parts = hashedPath.replace(new RegExp(`${document.fileExtension}$`), '').split(/\./g)
      const hash = parts[parts.length - 1]

      return {
        ...document,
        contents: JSON.stringify({ ...raw, file: replaceHash(basename(document.filePath), extension, hash) }, null, 2),
      }
    } catch (error) {
      yield* info(`Unable to rewrite sourceMap file name for ${document.filePath}`)

      return document
    }
  })
}
