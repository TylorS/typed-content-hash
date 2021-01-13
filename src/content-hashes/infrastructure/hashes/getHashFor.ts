import { some } from 'fp-ts/lib/Option'

import { Document } from '../../domain/model'

export function getHashFor(document: Document, replacementExt: string): Document {
  return {
    ...document,
    contentHash: some({
      type: 'hashFor',
      filePath: getHashForPath(document, replacementExt),
    }),
  }
}

export function getHashForPath({ filePath, fileExtension }: Document, replacementExt: string) {
  return filePath.replace(new RegExp(`${fileExtension}$`), replacementExt)
}
