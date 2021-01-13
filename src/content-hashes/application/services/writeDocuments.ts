import { Effect, EnvOf } from '@typed/fp'

import { DocumentRegistry } from '../model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const writeDocuments = op<(documents: DocumentRegistry) => Effect<LoggerEnv, void>>()('writeDocuments')

export type WriteDocumentsEnv = EnvOf<typeof writeDocuments>
