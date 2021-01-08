import { pipe } from 'fp-ts/lib/function'
import { map } from 'fp-ts/lib/Option'

import { ContentHash, Document, FileExtension, FilePath } from '../model'

/**
 * Updated a Document to have a given content hash.
 */
export function replaceDocumentHash(document: Document, hash: ContentHash): Document {
  const ext = FileExtension.unwrap(document.fileExtension)
  const filePath = FilePath.wrap(FilePath.unwrap(document.filePath).replace(new RegExp(`${ext}$`), `.${hash}${ext}`))

  return {
    ...document,
    filePath,
    sourceMap: pipe(
      document.sourceMap,
      map((s) => ({
        ...s,
        proxy: pipe(
          s.proxy,
          map((p) => replaceDocumentHash(p, hash)),
        ),
      })),
    ),
    dts: pipe(
      document.dts,
      map((d) => replaceDocumentHash(d, hash)),
    ),
  }
}

export function replaceHash(filePath: FilePath, extension: FileExtension, hash: ContentHash) {
  const regex = new RegExp(`${extension}$`)

  return FilePath.wrap(FilePath.unwrap(filePath).replace(regex, `.${hash}${extension}`))
}
