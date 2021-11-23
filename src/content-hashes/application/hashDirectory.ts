import { ask, chainW, map, useSome, zip } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { Eq } from '@typed/fp/string'
import { contramap } from 'fp-ts/Eq'
import { pipe } from 'fp-ts/function'
import { isSome } from 'fp-ts/Option'
import { uniq } from 'fp-ts/ReadonlyArray'

import { Document } from '../domain/model'
import { DocumentRegistry, DocumentRegistryEnv } from './model'
import { info } from './services/logging'
import { readDependencies } from './services/readDependencies'
import { readDirectory } from './services/readDirectory'
import { readFilePath } from './services/readFilePath'
import { rewriteDependencies } from './services/rewriteDependencies'
import { rewriteSourceMapUrls } from './services/rewriteSourceMapUrls'
import { sortDocuments } from './services/toposortDocuments'

const uniqDocumentPaths = pipe(
  Eq,
  contramap((d: Document) => d.filePath),
  uniq,
)

export const hashDirectory = (directory: string) =>
  Do(function* (_) {
    const { documentRegistry: initialDocumentRegistry } = yield* _(ask<DocumentRegistryEnv>())

    yield* _(info(`Hashing Directory ${directory}...`))

    // Read all the documents we understand how to read dependencies from
    const supportedDocuments: readonly Document[] = yield* _(readDocuments(directory))
    const supportedDocumentRegistry: DocumentRegistry = new Map([
      ...initialDocumentRegistry,
      ...supportedDocuments.map((d) => [d.filePath, d] as const),
    ])

    // Gather any dependencies that we don't support directly through a plugin so they can get hashes too.
    const dependencies: readonly Document[] = yield* _(
      pipe(
        supportedDocuments.map((doc) => readDependencies(directory, doc)),
        zip,
        map((docs) => uniqDocumentPaths(docs.flat())),
        useSome({ documentRegistry: supportedDocumentRegistry }),
      ),
    )

    // Sort them all so we can rewrite hashes effectively
    const sortedDocuments = yield* _(
      sortDocuments([...supportedDocuments, ...dependencies.filter((d) => !supportedDocumentRegistry.has(d.filePath))]),
    )

    // Rewrite dependencies 1-by-1, recalculating file hashes incrementally to ensure cache-busting functionality.
    yield* _(info(`Rewriting Hashes...`))

    let documentRegistry: DocumentRegistry = new Map([
      ...supportedDocumentRegistry,
      ...dependencies.map((d) => [d.filePath, d] as const),
    ])

    for (const documents of sortedDocuments) {
      documentRegistry = yield* _(
        pipe(
          rewriteDependencies(documents),
          useSome<DocumentRegistryEnv>({ documentRegistry }),
        ),
      )
    }

    yield* _(info(`Remapping any source-map URLs...`))

    return yield* _(
      pipe(
        rewriteSourceMapUrls,
        useSome<DocumentRegistryEnv>({ documentRegistry }),
      ),
    )
  })

const readDocuments = (directory: string) =>
  pipe(
    readDirectory(directory),
    chainW((filePaths) => zip(filePaths.map(readFilePath))),
    map((options) => options.filter(isSome).map((o) => o.value)),
  )
