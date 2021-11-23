import { ask, Env, of, zip } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
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

export const fsReadDependencies = (
  directory: string,
  document: Document,
): Env<LoggerEnv & DocumentRegistryEnv, readonly Document[]> =>
  Do(function* (_) {
    yield* _(debug(`Reading dependencies of ${document.filePath}...`))

    const { documentRegistry } = yield* _(ask<DocumentRegistryEnv>())
    const dependenciesToLookFor = document.dependencies.filter((dep) => dep.filePath.startsWith(directory))
    const dependencies: ReadonlyArray<Document> = yield* _(
      zip(
        dependenciesToLookFor.map((d) =>
          documentRegistry.has(d.filePath)
            ? of(documentRegistry.get(d.filePath)!)
            : fsReadFile(d.filePath, {
                isBase64Encoded: true,
                supportsSourceMaps: supportSourceMap(d.filePath, documentRegistry),
              }),
        ),
      ),
    )

    return dependencies
  })
