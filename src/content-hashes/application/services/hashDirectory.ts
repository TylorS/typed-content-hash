import { ask, doEffect, Effect, Envs, zip } from '@typed/fp'

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
    { readonly hashLength: number },
  ]
>

export const hashDirectory: Effect<HashDirectoryEnv, HashedDirectory> = doEffect(function* () {
  const { hashLength } = yield* ask<{ hashLength: number }>()
  yield* info(`Reading Directory...`)
  const initialDocuments = toposortDocuments(yield* readDirectory)
  yield* info(`Generating content hashes...`)
  const { documents, hashes } = yield* reduce(
    (a: DocumentHashes, b) => rewriteFile(a, b, hashLength),
    { documents: [], hashes: new Map() },
    initialDocuments,
  )
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

function rewriteFile({ documents, hashes }: DocumentHashes, document: Document, hashLength: number) {
  const eff = doEffect(function* () {
    const updated = yield* rewriteFileContent(document, hashes, hashLength)
    const updatedHashes = yield* generateContentHashes(updated)
    const documentHashes: DocumentHashes = {
      documents: [...documents, updated],
      hashes: new Map([...hashes, ...updatedHashes]),
    }

    return documentHashes
  })

  return eff
}
