import { chain, Effect, fromEnv, sync } from '@typed/fp'
import { identity, pipe } from 'fp-ts/lib/function'

import { LoggerEnv } from '../../common/logging'
import { Document, Hashes } from '../model'

export interface ReadDirectory {
  readonly readDirectory: Effect<
    LoggerEnv,
    readonly [documents: ReadonlyArray<Document>, additionalHashes: Hashes['hashes']]
  >
}

/**
 * Reads all the supported files from a given directory
 */
export const readDirectory = pipe(
  fromEnv((e: ReadDirectory) => sync(e.readDirectory)),
  chain(identity),
)
