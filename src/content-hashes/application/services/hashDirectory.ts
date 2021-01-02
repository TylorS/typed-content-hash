import { doEffect, Effect, Envs, zip } from '@typed/fp'

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
  ]
>

export const hashDirectory: Effect<HashDirectoryEnv, HashedDirectory> = doEffect(function* () {
  const initialDocuments = toposortDocuments(yield* readDirectory)
  const { documents, hashes } = yield* reduce(rewriteFile, { documents: [], hashes: new Map() }, initialDocuments)
  const rewrittenDocuments = yield* rewriteDocumentHashes(documents, hashes)
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

    return {
      documents: [...documents, updated],
      hashes: new Map([...hashes, ...updatedHashes]),
    } as DocumentHashes
  })

  return eff
}
