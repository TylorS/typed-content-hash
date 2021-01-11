import { Effect, EnvOf } from '@typed/fp'

import { DocumentRegistry, DocumentRegistryEnv } from '../model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const rewriteSourceMapUrls = op<() => Effect<LoggerEnv & DocumentRegistryEnv, DocumentRegistry>>()(
  'rewriteSourceMapUrls',
)()

export type RewriteSourceMapUrlsEnv = EnvOf<typeof rewriteSourceMapUrls>
