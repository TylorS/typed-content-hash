import { pipe } from 'fp-ts/lib/function'
import { fold } from 'fp-ts/lib/Option'

import { DocumentRegistry } from '../../application/model'
import { Document } from '../../domain/model'
import { getContentHash } from './getContentHash'
import { replaceHash } from './replaceHash'

export const getHashedPath = (document: Document, registry: DocumentRegistry): string =>
  pipe(
    getContentHash(document, registry),
    fold(
      () => document.filePath,
      (h) => replaceHash(document.filePath, document.fileExtension, h),
    ),
  )
