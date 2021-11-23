import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { DocumentRegistry } from '../model'
import { LoggerEnv } from './logging'

export const writeDocuments = op<(documents: DocumentRegistry) => Env<LoggerEnv, void>>()('writeDocuments')

export type WriteDocumentsEnv = RequirementsOf<typeof writeDocuments>
