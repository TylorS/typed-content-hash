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

export type ContentHashOptions = {
  readonly directory: string
  readonly assetManifest: string
  readonly hashLength: number
  readonly plugins: ReadonlyArray<HashPlugin>

  readonly baseUrl?: string
  readonly documentRegistry?: DocumentRegistry
  readonly logLevel?: LogLevel
  readonly logPrefix?: string
}

const DEFAULT_LOG_LEVEL = LogLevel.Error
const DEFAULT_LOG_PREFIX = gray(`[typed-content-hash]`)

export function contentHashDirectory(options: ContentHashOptions): Promise<DocumentRegistry> {
  const {
    directory,
    logLevel = DEFAULT_LOG_LEVEL,
    logPrefix = DEFAULT_LOG_PREFIX,
    documentRegistry = new Map(),
    hashLength,
    plugins,
    baseUrl,
  } = options

  const readFilePath = createReadFilePath(plugins)
  const documentRegistryEnv: DocumentRegistryEnv = { documentRegistry }
  const loggerEnv: LoggerEnv = { logLevel, logPrefix, logger: (msg: string) => pipe(msg, log, provideAll({ console })) }

  const program = doEffect(function* () {
    const registry = yield* hashDirectory(directory)
    const assetManifiest = yield* generateAssetManifest(registry)
    const assetManifiestDoc: Document = {
      filePath: resolve(directory, options.assetManifest),
      fileExtension: '.json',
      contents: JSON.stringify(assetManifiest, null, 2),
      contentHash: none,
      sourceMap: none,
      isBase64Encoded: false,
      dependencies: [],
    }

    yield* writeDocuments(new Map([...registry, [assetManifiestDoc.filePath, assetManifiestDoc]]))

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
