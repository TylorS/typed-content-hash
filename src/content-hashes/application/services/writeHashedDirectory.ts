import { ask, doEffect, zip } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { isSome, none } from 'fp-ts/lib/Option'
import { extname } from 'path'

import { info } from '../../common/logging'
import {
  deleteDocuments,
  Document,
  FileContents,
  FileExtension,
  FilePath,
  generateAssetManifest,
  getProxyMapFor,
  getSourceMapPathFor,
  Hashes,
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
        paths.push(getProxyMapFor(sourceMapPath))
      }
    }
  }

  addDoc(doc)

  if (isSome(doc.dts)) {
    addDoc(doc.dts.value)
  }

  return paths
}

export interface WrittenDirectory extends Hashes {
  readonly documents: ReadonlyArray<Document>
  readonly assetManifest: Document
}

export function writeHashedDirectory({ created, deleted, unchanged, hashes }: HashedDirectory) {
  const eff = doEffect(function* () {
    yield* info(`Hashing additional assets found...`)

    const deletedFilePaths = new Set(deleted.flatMap(getFilePaths))
    const unchangedFilePathsSupportHashes = new Map(unchanged.map((d) => [d.filePath, d.supportsHashes]))
    const filesToMove = Array.from(hashes.keys()).filter(
      (path) => !deletedFilePaths.has(path) && (unchangedFilePathsSupportHashes.get(path) ?? true),
    )
    const documentsToMove = yield* readFiles(filesToMove)
    const hashedDocumentsToMove = documentsToMove.map((d) => replaceDocumentHash(d, hashes.get(d.filePath)!))

    yield* info(`Generating asset manifest...`)

    const env = yield* ask<{ assetManifest: FilePath }>()
    const documentsToDelete = [...deleted, ...documentsToMove]
    const assetManifest = yield* generateAssetManifest(documentsToDelete, hashes)
    const assetManifestDocument: Document = {
      filePath: env.assetManifest,
      fileExtension: pipe(env.assetManifest, FilePath.unwrap, extname, FileExtension.wrap),
      contents: FileContents.wrap(JSON.stringify(assetManifest, null, 2)),
      dependencies: [],
      sourceMap: none,
      dts: none,
      supportsHashes: false,
    }

    yield* info(`Writing changes to disk...`)

    const documentsToWrite: ReadonlyArray<Document> = [
      ...hashedDocumentsToMove,
      ...created,
      ...unchanged,
      assetManifestDocument,
    ]

    yield* zip([writeDocuments(documentsToWrite), deleteDocuments(documentsToDelete)])

    const written: WrittenDirectory = {
      documents: documentsToWrite,
      hashes,
      assetManifest: assetManifestDocument,
    } as const

    return written
  })

  return eff
}
