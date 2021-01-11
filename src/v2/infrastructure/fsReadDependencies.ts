import { ask, doEffect, Effect, Pure, zip } from '@typed/fp'
import { existsSync } from 'fs'

import { DocumentRegistry, DocumentRegistryEnv } from '../application/model'
import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'
import { fsReadFile } from './fsReadFile'

const sourceMapExt = '.map'
const supportSourceMap = (path: string, registry: DocumentRegistry) => {
  const sourceMapPath = path + sourceMapExt

  return registry.has(sourceMapPath) || existsSync(sourceMapPath)
}

export const fsReadDependencies = (document: Document): Effect<LoggerEnv & DocumentRegistryEnv, readonly Document[]> =>
  doEffect(function* () {
    yield* debug(`Reading dependencies of ${document.filePath}...`)

    const { documentRegistry } = yield* ask<DocumentRegistryEnv>()
    const dependencies: ReadonlyArray<Document> = yield* zip(
      document.dependencies.map((d) =>
        documentRegistry.has(d.filePath)
          ? Pure.of(documentRegistry.get(d.filePath)!)
          : fsReadFile(d.filePath, {
              isBase64Encoded: true,
              supportsSourceMaps: supportSourceMap(d.filePath, documentRegistry),
            }),
      ),
    )

    return dependencies
  })
