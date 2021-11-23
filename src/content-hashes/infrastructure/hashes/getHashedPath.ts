import { pipe } from 'fp-ts/function'
import { match } from 'fp-ts/Option'

import { DocumentRegistry } from '../../application/model'
import { Document } from '../../domain/model'
import { getContentHash } from './getContentHash'
import { replaceHash } from './replaceHash'

export const getHashedPath = (document: Document, registry: DocumentRegistry, hashLength: number): string =>
  pipe(
    getContentHash(document, registry, hashLength),
    match(
      () => document.filePath,
      (h) => replaceHash(document.filePath, document.fileExtension, h.slice(0, hashLength)),
    ),
  )
