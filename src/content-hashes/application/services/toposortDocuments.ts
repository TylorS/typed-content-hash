import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { Document } from '../../domain/model'
import { LoggerEnv } from './logging'

export const sortDocuments = op<
  (documents: readonly Document[]) => Env<LoggerEnv, ReadonlyArray<ReadonlyArray<Document>>>
>()('sortDocuments')

export type SortDocumentsEnv = RequirementsOf<typeof sortDocuments>
