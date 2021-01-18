import { ask, chain, doEffect, map, useSome, zip } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { isSome } from 'fp-ts/lib/Option'
import { contramap, ordString } from 'fp-ts/lib/Ord'
import { uniq } from 'fp-ts/lib/ReadonlyArray'

import { Document } from '../domain/model'
import { DocumentRegistry, DocumentRegistryEnv } from './model'
import { info } from './services/logging'
import { readDependencies } from './services/readDependencies'
import { readDirectory } from './services/readDirectory'
import { readFilePath } from './services/readFilePath'
import { rewriteDependencies } from './services/rewriteDependencies'
import { rewriteSourceMapUrls } from './services/rewriteSourceMapUrls'
import { toposortDocuments } from './services/toposortDocuments'

const uniqDocumentPaths = pipe(
  ordString,
  contramap((d: Document) => d.filePath),
  uniq,
)

export const hashDirectory = (directory: string) =>
  doEffect(function* () {
    const { documentRegistry: initialDocumentRegistry } = yield* ask<DocumentRegistryEnv>()

    yield* info(`Hashing Directory ${directory}...`)

    // Read all the documents we understand how to read dependencies from
    const supportedDocuments: readonly Document[] = yield* readDocuments(directory)
    const supportedDocumentRegistry: DocumentRegistry = new Map([
      ...initialDocumentRegistry,
      ...supportedDocuments.map((d) => [d.filePath, d] as const),
    ])

    // Gather any dependencies that we don't support directly through a plugin so they can get hashes too.
    const dependencies: readonly Document[] = yield* pipe(
      supportedDocuments.map((doc) => readDependencies(directory, doc)),
      zip,
      map((docs) => uniqDocumentPaths(docs.flat())),
      useSome({ documentRegistry: supportedDocumentRegistry }),
    )

    // Sort them all so we can rewrite hashes effectively
    const documents: readonly Document[] = yield* toposortDocuments([
      ...supportedDocuments,
      ...dependencies.filter((d) => !supportedDocumentRegistry.has(d.filePath)),
    ])

    // Rewrite dependencies 1-by-1, recalculating file hashes incrementally to ensure cache-busting functionality.
    yield* info(`Rewriting Hashes...`)

    let documentRegistry: DocumentRegistry = new Map([
      ...supportedDocumentRegistry,
      ...dependencies.map((d) => [d.filePath, d] as const),
    ])

    for (const document of documents) {
      documentRegistry = yield* pipe(
        rewriteDependencies(document),
        useSome<DocumentRegistryEnv>({ documentRegistry }),
      )
    }

    yield* info(`Remapping any source-map URLs...`)

    return yield* pipe(
      rewriteSourceMapUrls,
      useSome<DocumentRegistryEnv>({ documentRegistry }),
    )
  })

const readDocuments = (directory: string) =>
  pipe(
    readDirectory(directory),
    chain((filePaths) => zip(filePaths.map(readFilePath))),
    map((options) => options.filter(isSome).map((o) => o.value)),
  )
