import { Env, op, RequirementsOf } from '@typed/fp/Env'
import { Option } from 'fp-ts/Option'

import { Document } from '../../domain/model'
import { LoggerEnv } from './logging'

/**
 * Read a filePath, including its dependencies. A None should be returned if the file path is not currently supported
 */
export const readFilePath = op<(filePath: string) => Env<LoggerEnv, Option<Document>>>()('readFilePath')

export type ReadFilePathEnv = RequirementsOf<typeof readFilePath>
