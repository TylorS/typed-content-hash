import { chain, fromEnv, Pure, sync } from '@typed/fp'
import { identity, pipe } from 'fp-ts/lib/function'

import { FilePath, Hashes } from '../model'

export interface MoveFiles {
  readonly moveFiles: (filePath: ReadonlyArray<FilePath>, hashes: Hashes['hashes']) => Pure<void>
}

/**
 * Reads all the supported files from a given directory
 */
export const moveFiles = (filePath: ReadonlyArray<FilePath>, hashes: Hashes['hashes']) =>
  pipe(
    fromEnv((e: MoveFiles) => sync(e.moveFiles(filePath, hashes))),
    chain(identity),
  )
