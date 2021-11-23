import { Env } from '@typed/fp/Env'
import { Option } from 'fp-ts/Option'

import { LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'

export interface HashPlugin {
  readonly readFilePath: (filePath: string) => Env<LoggerEnv, Option<Document>>
}
