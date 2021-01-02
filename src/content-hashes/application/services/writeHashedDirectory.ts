import { ask, doEffect, zip } from '@typed/fp'
import { none } from 'fp-ts/lib/Option'

import { deleteDocuments, Document, FileContents, FileExtension, FilePath, writeDocuments } from '../../domain'
import { HashedDirectory } from '../model'

export function writeHashedDirectory({ created, deleted, assetManifest }: HashedDirectory) {
  const eff = doEffect(function* () {
    const env = yield* ask<{ assetManifest: FilePath }>()
    const assetManifestDocument: Document = {
      filePath: env.assetManifest,
      fileExtension: FileExtension.wrap('.json'),
      contents: FileContents.wrap(JSON.stringify(assetManifest, null, 2)),
      dependencies: [],
      sourceMap: none,
      dts: none,
    }

    yield* zip([writeDocuments([...created, assetManifestDocument]), deleteDocuments(deleted)])
  })

  return eff
}
