import { Effect, EnvOf } from '@typed/fp'

import { op } from './common'
import { LoggerEnv } from './logging'

/**
 * Read all of the file paths in a directory
 */
export const readDirectory = op<(directory: string) => Effect<LoggerEnv, readonly string[]>>()('readDirectory')

export type ReadDirectoryEnv = EnvOf<typeof readDirectory>
