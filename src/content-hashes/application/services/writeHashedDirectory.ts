import { ask, doEffect, zip } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { isSome, none } from 'fp-ts/Option'
import { extname } from 'path'

import { info } from '../../common/logging'
import {
  deleteDocuments,
  Document,
  FileContents,
  FileExtension,
  FilePath,
  generateAssetManifest,
  getSourceMapPathFor,
  readFiles,
  replaceDocumentHash,
  writeDocuments,
} from '../../domain'
import { HashedDirectory } from '../model'

const getFilePaths = (doc: Document): readonly FilePath[] => {
  const paths: FilePath[] = []

  const addDoc = (doc: Document) => {
    paths.push(doc.filePath)

    if (isSome(doc.sourceMap)) {
      const sourceMapPath = getSourceMapPathFor(doc.filePath)

      paths.push(sourceMapPath)

      if (isSome(doc.sourceMap.value.proxy)) {
        paths.push(doc.sourceMap.value.proxy.value.filePath)
      }
    }
  }

  addDoc(doc)

  if (isSome(doc.dts)) {
    addDoc(doc.dts.value)
  }

  return paths
}

export function writeHashedDirectory({ created, deleted, unchanged, hashes }: HashedDirectory) {
  const eff = doEffect(function* () {
    const env = yield* ask<{ assetManifest: FilePath }>()

    yield* info(`Hashing additional assets found...`)
    const existingFilePaths = new Set([
      ...deleted.flatMap(getFilePaths),
      ...unchanged.flatMap(getFilePaths),
      ...created.flatMap(getFilePaths),
    ])
    const filesToMove = Array.from(hashes.keys()).filter((path) => !existingFilePaths.has(path))
    const documentsToMove = yield* readFiles(filesToMove)
    const hashedDocumentsToMove = documentsToMove.map((d) => replaceDocumentHash(d, hashes.get(d.filePath)!))

    yield* info(`Generating asset manifest...`)
    const assetManifest = yield* generateAssetManifest([...deleted, ...documentsToMove], hashes)
    const assetManifestDocument: Document = {
      filePath: env.assetManifest,
      fileExtension: pipe(env.assetManifest, FilePath.unwrap, extname, FileExtension.wrap),
      contents: FileContents.wrap(JSON.stringify(assetManifest, null, 2)),
      dependencies: [],
      sourceMap: none,
      dts: none,
    }

    yield* info(`Writing changes to disk...`)
    yield* zip([
      writeDocuments([...created, ...hashedDocumentsToMove, assetManifestDocument]),
      deleteDocuments([...deleted, ...documentsToMove]),
    ])
  })

  return eff
}
