import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { DocumentRegistry, DocumentRegistryEnv } from '../model'
import { LoggerEnv } from './logging'

export const rewriteSourceMapUrls = op<() => Env<LoggerEnv & DocumentRegistryEnv, DocumentRegistry>>()(
  'rewriteSourceMapUrls',
)()

export type RewriteSourceMapUrlsEnv = RequirementsOf<typeof rewriteSourceMapUrls>
