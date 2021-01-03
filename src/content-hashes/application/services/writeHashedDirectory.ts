import { ask, doEffect, zip } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { none } from 'fp-ts/Option'
import { extname } from 'path'

import { info } from '../../common/logging'
import { deleteDocuments, Document, FileContents, FileExtension, FilePath, writeDocuments } from '../../domain'
import { HashedDirectory } from '../model'

export function writeHashedDirectory({ created, deleted, assetManifest }: HashedDirectory) {
  const eff = doEffect(function* () {
    const env = yield* ask<{ assetManifest: FilePath }>()
    const assetManifestDocument: Document = {
      filePath: env.assetManifest,
      fileExtension: pipe(env.assetManifest, FilePath.unwrap, extname, FileExtension.wrap),
      contents: FileContents.wrap(JSON.stringify(assetManifest, null, 2)),
      dependencies: [],
      sourceMap: none,
      dts: none,
    }

    yield* info(`Writing changes to disk...`)
    yield* zip([writeDocuments([...created, assetManifestDocument]), deleteDocuments(deleted)])
  })

  return eff
}
