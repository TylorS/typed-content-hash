import { undisposable } from '@typed/fp/Disposable'
import { fromIO, provideAll, provideSome } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { run } from '@typed/fp/Resume'
import { pipe } from 'fp-ts/function'
import { isNone, isSome, none, Option, some } from 'fp-ts/Option'
import { posix } from 'path'
import { gray } from 'typed-colors'

import {
  DocumentRegistry,
  DocumentRegistryEnv,
  generateAssetManifest,
  hashDirectory,
  LoggerEnv,
  LogLevel,
  writeDocuments,
} from './application'
import { Document } from './domain/model'
import {
  createReadFilePath,
  fsReadDependencies,
  fsReadDirectory,
  fsWriteDocuments,
  generateAssetManfiestFromRegistry,
  HashPlugin,
  rewriteDependencies,
  RewriteDependenciesImplementationEnv,
  rewriteSourceMapUrls,
  sortDiGraph,
} from './infrastructure'
import { normalizeRegistry } from './infrastructure/normalizeRegistry'
import { getFileExtension } from './infrastructure/plugins/getFileExtension'

export type ContentHashOptions = {
  readonly directory: string
  readonly plugins: ReadonlyArray<HashPlugin>

  readonly assetManifest?: string
  readonly hashLength?: number
  readonly baseUrl?: string
  readonly documentRegistry?: DocumentRegistry
  readonly logLevel?: LogLevel
  readonly logPrefix?: string
  readonly registryFile?: string // Path to registry output
  readonly sourceMaps?: boolean
}

const DEFAULT_LOG_LEVEL = LogLevel.Error
const DEFAULT_LOG_PREFIX = gray(`[typed-content-hash]`)
const DEFAULT_HASH_LENGTH = Infinity
const DEFAULT_ASSET_MANIFEST = 'asset-manifest.json'

export function contentHashDirectory(options: ContentHashOptions): Promise<DocumentRegistry> {
  const {
    directory,
    plugins,
    logLevel = DEFAULT_LOG_LEVEL,
    logPrefix = DEFAULT_LOG_PREFIX,
    documentRegistry = new Map(),
    hashLength = DEFAULT_HASH_LENGTH,
    assetManifest = DEFAULT_ASSET_MANIFEST,
    baseUrl,
    registryFile = logLevel === LogLevel.Debug ? '_document_registry.json' : undefined,
    sourceMaps = true,
  } = options

  const readFilePath = createReadFilePath(plugins)
  const documentRegistryEnv: DocumentRegistryEnv = { documentRegistry }
  const loggerEnv: LoggerEnv = {
    logLevel,
    logPrefix,
    logger: (msg: string) =>
      fromIO(() => {
        console.log(msg)
      }),
  }

  const program = Do(function* (_) {
    const registry = yield* _(hashDirectory(directory))
    const assetManifiestJson = yield* _(generateAssetManifest(registry))
    const filePath = posix.resolve(directory, assetManifest)
    const assetManifiestDoc: Document = {
      filePath: filePath,
      fileExtension: getFileExtension(filePath),
      contents: JSON.stringify(assetManifiestJson, null, 2),
      contentHash: none,
      sourceMap: none,
      isBase64Encoded: false,
      dependencies: [],
    }
    const toWrite = new Map([...registry, [assetManifiestDoc.filePath, assetManifiestDoc]])

    if (registryFile) {
      const filePath = posix.resolve(directory, registryFile)

      toWrite.set(filePath, {
        filePath,
        fileExtension: getFileExtension(filePath),
        contents: JSON.stringify(normalizeRegistry(directory, registry), null, 2),
        contentHash: none,
        sourceMap: none,
        dependencies: [],
        isBase64Encoded: false,
      })
    }

    yield* _(writeDocuments(toWrite))

    return registry
  })

  const env = pipe(
    program,
    provideAll({
      ...documentRegistryEnv,
      ...loggerEnv,
      readDirectory: fsReadDirectory,
      readDependencies: (directory, doc) =>
        Do(function* (_) {
          const documents = yield* _(fsReadDependencies(directory, doc))

          if (sourceMaps) {
            return documents
          }

          return documents
            .map(removeSourceMaps)
            .filter(isSome)
            .map((o) => o.value)
        }),
      sortDocuments: sortDiGraph,
      readFilePath: (path) =>
        Do(function* (_) {
          const doc = yield* _(readFilePath(path))

          if (sourceMaps || isNone(doc)) {
            return doc
          }

          return removeSourceMaps(doc.value)
        }),
      rewriteSourceMapUrls: () => rewriteSourceMapUrls(hashLength, sourceMaps),
      rewriteDependencies: (...args) =>
        pipe(
          rewriteDependencies(...args),
          provideSome<RewriteDependenciesImplementationEnv>({
            hashLength,
            directory,
            baseUrl,
            sourceMaps,
          }),
        ),
      generateAssetManifest: (doc) => generateAssetManfiestFromRegistry(directory, doc, hashLength, baseUrl),
      writeDocuments: (docs) => fsWriteDocuments(docs, hashLength),
    }),
  )

  return new Promise((resolve) => run(undisposable(resolve))(env({})))
}

function removeSourceMaps(doc: Document): Option<Document> {
  if (doc.fileExtension.endsWith('.map')) {
    return none
  }

  return some({ ...doc, sourceMap: none })
}
