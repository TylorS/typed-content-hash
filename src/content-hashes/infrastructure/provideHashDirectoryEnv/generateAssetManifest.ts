import { Resume, sync } from '@typed/fp'
import { isSome } from 'fp-ts/lib/Option'
import { relative } from 'path'

import { AssetManifest, ContentHash, Directory, Document, FilePath, replaceDocumentHash } from '../../domain'

const sourceMapPostfix = '.map'
const sourceMapProxyPostfix = '.map.proxy.js'

export const generateAssetManifest = (directory: Directory) => (
  documents: ReadonlyArray<Document>,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Resume<AssetManifest> => {
  const assetManifest: Record<string, string> = {}

  const getRelative = (filePath: FilePath) => relative(Directory.unwrap(directory), FilePath.unwrap(filePath))

  const addDocument = (document: Document, hash: ContentHash | undefined) => {
    const from = getRelative(document.filePath)
    const to = getRelative(hash ? replaceDocumentHash(document, hash).filePath : document.filePath)

    assetManifest[from] = to

    if (isSome(document.sourceMap)) {
      assetManifest[from + sourceMapPostfix] = to + sourceMapPostfix

      if (isSome(document.sourceMap.value.proxy)) {
        assetManifest[from + sourceMapProxyPostfix] = to + sourceMapProxyPostfix
      }
    }
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
