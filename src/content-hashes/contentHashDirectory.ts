import { doEffect, log, provideAll, provideSome, toPromise } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { none } from 'fp-ts/lib/Option'
import { resolve } from 'path'
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
  topoSortDocs,
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
  } = options

  const readFilePath = createReadFilePath(plugins)
  const documentRegistryEnv: DocumentRegistryEnv = { documentRegistry }
  const loggerEnv: LoggerEnv = { logLevel, logPrefix, logger: (msg: string) => pipe(msg, log, provideAll({ console })) }

  const program = doEffect(function* () {
    const registry = yield* hashDirectory(directory)
    const assetManifiestJson = yield* generateAssetManifest(registry)
    const filePath = resolve(directory, assetManifest)
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
      const filePath = resolve(directory, registryFile)

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

    yield* writeDocuments(toWrite)

    return registry
  })

  return pipe(
    program,
    provideAll({
      ...documentRegistryEnv,
      ...loggerEnv,
      readDirectory: fsReadDirectory,
      readDependencies: fsReadDependencies,
      toposortDocuments: topoSortDocs,
      readFilePath,
      rewriteSourceMapUrls: () => rewriteSourceMapUrls(hashLength),
      rewriteDependencies: (doc) =>
        pipe(
          rewriteDependencies(doc),
          provideSome<RewriteDependenciesImplementationEnv>({
            hashLength,
            directory,
            baseUrl,
          }),
        ),
      generateAssetManifest: (doc) => generateAssetManfiestFromRegistry(directory, doc, hashLength, baseUrl),
      writeDocuments: (docs) => fsWriteDocuments(docs, hashLength),
    }),
    toPromise,
  )
}
