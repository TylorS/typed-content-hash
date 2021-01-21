import { Effect, EnvOf } from '@typed/fp'

import { Document } from '../../domain/model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const sortDocuments = op<
  (documents: readonly Document[]) => Effect<LoggerEnv, ReadonlyArray<ReadonlyArray<Document>>>
>()('sortDocuments')

export type SortDocumentsEnv = EnvOf<typeof sortDocuments>
