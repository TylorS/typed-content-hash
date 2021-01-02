import { Resume, sync } from '@typed/fp'
import { isSome } from 'fp-ts/lib/Option'
import { relative } from 'path'

import { AssetManifest, ContentHash, Directory, Document, FilePath, replaceHash } from '../../domain'

export const generateAssetManifest = (directory: Directory) => (
  documents: ReadonlyArray<Document>,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Resume<AssetManifest> => {
  const assetManifest: Record<string, string> = {}

  const addDocument = (document: Document, hash: ContentHash | undefined) => {
    const to = hash ? replaceHash(document, hash).filePath : document.filePath

    assetManifest[relative(Directory.unwrap(directory), FilePath.unwrap(document.filePath))] = relative(
      Directory.unwrap(directory),
      FilePath.unwrap(to),
    )

    return hash
  }

  for (const document of documents) {
    const hash = hashes.get(document.filePath)

    addDocument(document, hash)

    if (isSome(document.dts)) {
      addDocument(document.dts.value, hash)
    }
  }

  return sync(assetManifest)
}
