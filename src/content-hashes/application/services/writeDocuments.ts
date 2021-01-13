import { EnvOf, Pure } from '@typed/fp'

import { DocumentRegistry } from '../model'
import { op } from './common'

export const writeDocuments = op<(documents: DocumentRegistry) => Pure<void>>()('writeDocuments')

export type WriteDocumentsEnv = EnvOf<typeof writeDocuments>
