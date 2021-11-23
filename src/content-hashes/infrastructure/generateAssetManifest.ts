import { Do } from '@typed/fp/FxEnv'
import { posix } from 'path'

import { DocumentRegistry } from '../application/model'
import { info } from '../application/services/logging'
import { AssetManifest } from '../domain/model'
import { applyOrigin } from './applyOrigin'
import { getHashedPath } from './hashes/getHashedPath'

export const generateAssetManfiestFromRegistry = (
  directory: string,
  registry: DocumentRegistry,
  hashLength: number,
  baseUrl?: string,
) =>
  Do(function* (_) {
    yield* _(info(`Generating Asset Manifest...`))

    const manifest: Record<string, string> = {}

    for (const document of registry.values()) {
      const from = document.filePath
      const to = getHashedPath(document, registry, hashLength)

      manifest[posix.relative(directory, from)] = baseUrl
        ? applyOrigin(directory, to, baseUrl)
        : posix.relative(directory, to)
    }

    return manifest as AssetManifest
  })
