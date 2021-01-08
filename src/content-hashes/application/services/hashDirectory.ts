import { doEffect, Effect, Envs } from '@typed/fp'

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
  const [initialDocuments, initialHashes] = yield* readDirectory
  yield* info(`Generating content hashes...`)
  const { documents, hashes } = yield* reduce(
    rewriteFile,
    { documents: [], hashes: initialHashes },
    toposortDocuments(initialDocuments),
  )
  yield* info(`Rewriting content hashes...`)
  const rewrittenDocuments = yield* rewriteDocumentHashes(documents, hashes)
  const { unchanged, deleted, created } = yield* diffDocuments(initialDocuments, rewrittenDocuments, hashes)

  return {
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
