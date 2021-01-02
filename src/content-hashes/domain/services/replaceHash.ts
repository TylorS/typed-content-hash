import { pipe } from 'fp-ts/function'
import { map } from 'fp-ts/Option'

import { ContentHash, Document, FileExtension, FilePath } from '../model'

/**
 * Updated a Document to have a given content hash.
 */
export function replaceHash(document: Document, hash: ContentHash): Document {
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
          map((p) => replaceHash(p, hash)),
        ),
      })),
    ),
    dts: pipe(
      document.dts,
      map((d) => replaceHash(d, hash)),
    ),
  }
}
