import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { AssetManifest } from '../../domain/model'
import { DocumentRegistry } from '../model'
import { LoggerEnv } from './logging'

export const generateAssetManifest = op<(registry: DocumentRegistry) => Env<LoggerEnv, AssetManifest>>()(
  'generateAssetManifest',
)

export type GenerateAssetManifestEnv = RequirementsOf<typeof generateAssetManifest>
