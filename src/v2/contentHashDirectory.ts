import { doEffect, EnvOf, log, provideAll, provideSome, toPromise } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { none } from 'fp-ts/lib/Option'
import { join } from 'path'
import { gray } from 'typed-colors'

import { hashDirectory } from './application/hashDirectory'
import { DocumentRegistry, DocumentRegistryEnv } from './application/model'
import { generateAssetManifest } from './application/services/generateAssetManifest'
import { LoggerEnv, LogLevel } from './application/services/logging'
import { writeDocuments } from './application/services/writeDocuments'
import { Document } from './domain/model'
import { createReadFilePath } from './infrastructure/createReadFilePath'
import { fsReadDependencies } from './infrastructure/fsReadDependencies'
import { fsReadDirectory } from './infrastructure/fsReadDirectory'
import { fsWriteDocuments } from './infrastructure/fsWriteDocuments'
import { generateAssetManfiestFromRegistry } from './infrastructure/generateAssetManifest'
import { HashPlugin } from './infrastructure/HashPlugin'
import { rewriteDependencies, RewriteDependenciesImplementationEnv } from './infrastructure/rewriteDependencies'
import { rewriteSourceMapUrls } from './infrastructure/rewriteSourceMapUrls'
import { topoSortDocs } from './infrastructure/toposortDocs'

export type ContentHashOptions = {
  readonly directory: string
  readonly plugins: ReadonlyArray<HashPlugin>
  readonly baseUrl?: string
  readonly logLevel?: LogLevel
  readonly logPrefix?: string
  readonly documentRegistry?: DocumentRegistry
  readonly hashLength: number
  readonly assetManifest: string
}

const DEFAULT_LOG_LEVEL = LogLevel.Error
const DEFAULT_LOG_PREFIX = gray(`[typed-content-hash]`)

export function contentHashDirectory(options: ContentHashOptions): Promise<DocumentRegistry> {
  const {
    directory,
    logLevel = DEFAULT_LOG_LEVEL,
    logPrefix = DEFAULT_LOG_PREFIX,
    documentRegistry = new Map(),
    plugins,
  } = options

  const readFilePath = createReadFilePath(plugins)
  const documentRegistryEnv: DocumentRegistryEnv = { documentRegistry }
  const loggerEnv: LoggerEnv = { logLevel, logPrefix, logger: (msg: string) => pipe(msg, log, provideAll({ console })) }

  const program = doEffect(function* () {
    const registry = yield* hashDirectory(directory)
    const assetManifiest = yield* generateAssetManifest(registry)
    const assetManifiestDoc: Document = {
      filePath: join(directory, options.assetManifest),
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

  const hashEnv: EnvOf<typeof hashDirectory> = {
    ...documentRegistryEnv,
    ...loggerEnv,
    readDirectory: fsReadDirectory,
    readDependencies: fsReadDependencies,
    toposortDocuments: topoSortDocs,
    readFilePath,
    rewriteSourceMapUrls: () => rewriteSourceMapUrls,
    rewriteDependencies: (doc) =>
      pipe(
        rewriteDependencies(doc),
        provideSome<RewriteDependenciesImplementationEnv>({ directory: options.directory, baseUrl: options.baseUrl }),
      ),
  }

  return pipe(
    program,
    provideSome(hashEnv),
    provideAll({
      generateAssetManifest: (doc) => generateAssetManfiestFromRegistry(options.directory, doc, options.baseUrl),
      writeDocuments: fsWriteDocuments,
    }),
    toPromise,
  )
}
