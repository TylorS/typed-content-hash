import { Effect, EnvOf } from '@typed/fp'
import { Option } from 'fp-ts/lib/Option'

import { Document } from '../../domain/model'
import { op } from './common'
import { LoggerEnv } from './logging'

/**
 * Read a filePath, including its dependencies. A None should be returned if the file path is not currently supported
 */
export const readFilePath = op<(filePath: string) => Effect<LoggerEnv, Option<Document>>>()('readFilePath')

export type ReadFilePathEnv = EnvOf<typeof readFilePath>
