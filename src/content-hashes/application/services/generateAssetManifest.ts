import { Effect, EnvOf } from '@typed/fp'

import { AssetManifest } from '../../domain/model'
import { DocumentRegistry } from '../model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const generateAssetManifest = op<(registry: DocumentRegistry) => Effect<LoggerEnv, AssetManifest>>()(
  'generateAssetManifest',
)

export type GenerateAssetManifestEnv = EnvOf<typeof generateAssetManifest>
