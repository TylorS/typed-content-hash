import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { LoggerEnv } from './logging'

/**
 * Read all of the file paths in a directory
 */
export const readDirectory = op<(directory: string) => Env<LoggerEnv, readonly string[]>>()('readDirectory')

export type ReadDirectoryEnv = RequirementsOf<typeof readDirectory>
