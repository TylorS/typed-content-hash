import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, fromTask, zip } from '@typed/fp'
import { getShow } from 'fp-ts/lib/ReadonlyMap'
import { showString } from 'fp-ts/lib/Show'
import { existsSync, promises } from 'fs'

import { DocumentRegistry } from '../application/model'
import { debug } from '../application/services/logging'
import { Document } from '../domain/model'
import { getHashedPath } from './hashes/getHashedPath'
import { replaceHash } from './hashes/replaceHash'

const writeFile = (path: string, contents: string) => fromTask(() => promises.writeFile(path, contents))
const rename = (from: string, to: string) => fromTask(() => promises.rename(from, to))
const unlinkFile = (path: string) => fromTask(() => promises.unlink(path))
const sourceMapExt = '.map'
const sourceMapExtRegex = new RegExp(`${sourceMapExt}$`)
const showRegistry = getShow(showString, { show: (d: Document) => JSON.stringify(d, null, 2) })

export const fsWriteDocuments = (registry: DocumentRegistry, hashLength: number) => {
  const eff = doEffect(function* () {
    yield* debug(`Writing registry: ${showRegistry.show(registry)}`)

    yield* zip(
      Array.from(registry.values()).map((document) =>
        doEffect(function* () {
          const hashedPath = getHashedPath(document, registry, hashLength)
          const pathChanged = document.filePath !== hashedPath

          if (hashedPath.endsWith(sourceMapExt) && pathChanged) {
            const raw = JSON.parse(document.contents) as RawSourceMap

            if (raw.file) {
              const extension = document.fileExtension.replace(sourceMapExtRegex, '')
              const parts = hashedPath.replace(new RegExp(`${document.fileExtension}$`), '').split(/\./g)
              const hash = parts[parts.length - 1]

              document = {
                ...document,
                contents: JSON.stringify({ ...raw, file: replaceHash(raw.file, extension, hash) }, null, 2),
              }
            }
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
