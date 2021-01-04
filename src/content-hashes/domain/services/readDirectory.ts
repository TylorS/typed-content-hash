import { chain, fromEnv, Pure, sync } from '@typed/fp'
import { identity, pipe } from 'fp-ts/function'

import { Document } from '../model'

export interface ReadDirectory {
  readonly readDirectory: Pure<ReadonlyArray<Document>>
}

/**
 * Reads all the supported files from a given directory
 */
export const readDirectory = pipe(
  fromEnv((e: ReadDirectory) => sync(e.readDirectory)),
  chain(identity),
)
