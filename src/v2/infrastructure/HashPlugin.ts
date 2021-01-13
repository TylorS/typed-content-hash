import { Effect } from '@typed/fp'
import { Option } from 'fp-ts/lib/Option'

import { LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'

export interface HashPlugin {
  readonly readFilePath: (filePath: string) => Effect<LoggerEnv, Option<Document>>
}
