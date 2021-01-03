import { doEffect, Effect, Envs, zip } from '@typed/fp'

import { info, LoggerEnv } from '../../common/logging'
import {
  ContentHash,
  diffDocuments,
  Document,
  FilePath,
  generateAssetManifest,
  generateContentHashes,
  readDirectory,
  rewriteDocumentHashes,
  rewriteFileContent,
  toposortDocuments,
} from '../../domain'
import { HashedDirectory } from '../model'

export type DocumentHashes = {
  readonly documents: ReadonlyArray<Document>
  readonly hashes: ReadonlyMap<FilePath, ContentHash>
}

export type HashDirectoryEnv = Envs<
  [
    typeof readDirectory,
    typeof rewriteFile,
    typeof rewriteDocumentHashes,
    typeof generateAssetManifest,
    typeof diffDocuments,
    LoggerEnv,
  ]
>

export const hashDirectory: Effect<HashDirectoryEnv, HashedDirectory> = doEffect(function* () {
  yield* info(`Reading Directory...`)
  const initialDocuments = toposortDocuments(yield* readDirectory)
  yield* info(`Generating content hashes...`)
  const { documents, hashes } = yield* reduce(rewriteFile, { documents: [], hashes: new Map() }, initialDocuments)
  yield* info(`Rewriting content hashes...`)
  const rewrittenDocuments = yield* rewriteDocumentHashes(documents, hashes)
  yield* info(`Generating asset manifest...`)
  const [{ unchanged, deleted, created }, assetManifest] = yield* zip([
    diffDocuments(initialDocuments, rewrittenDocuments, hashes),
    generateAssetManifest(initialDocuments, hashes),
  ] as const)

  return {
    assetManifest,
    created,
    deleted,
    hashes,
    unchanged,
  } as const
})

function* reduce<A, B, E>(f: (a: A, b: B) => Effect<E, A>, seed: A, values: readonly B[]) {
  let acc: A = seed

  for (const value of values) {
    acc = yield* f(acc, value)
  }

  return acc
}

function rewriteFile({ documents, hashes }: DocumentHashes, document: Document) {
  const eff = doEffect(function* () {
    const updated = yield* rewriteFileContent(document, hashes)
    const updatedHashes = yield* generateContentHashes(updated)
    const documentHashes: DocumentHashes = {
      documents: [...documents, updated],
      hashes: new Map([...hashes, ...updatedHashes]),
    }

    return documentHashes
  })

  return eff
}
