import { fromTask, map, zip } from '@typed/fp'
import { constVoid } from 'fp-ts/lib/function'
import { promises } from 'fs'

import { DocumentRegistry } from '../application/model'
import { getHashedPath } from './hashes/getHashedPath'

const writeFile = (path: string, contents: string) => fromTask(() => promises.writeFile(path, contents))

export const fsWriteDocuments = (registry: DocumentRegistry) =>
  map(
    constVoid,
    zip(
      Array.from(registry.values()).map((document) => writeFile(getHashedPath(document, registry), document.contents)),
    ),
  )
