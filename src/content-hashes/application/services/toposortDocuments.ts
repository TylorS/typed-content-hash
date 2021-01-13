import { Effect, EnvOf } from '@typed/fp'

import { Document } from '../../domain/model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const toposortDocuments = op<(documents: readonly Document[]) => Effect<LoggerEnv, readonly Document[]>>()(
  'toposortDocuments',
)

export type ToposortDocumentsEnv = EnvOf<typeof toposortDocuments>
