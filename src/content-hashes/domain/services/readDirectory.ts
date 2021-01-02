import { fromEnv, Resume } from '@typed/fp'

import { Document } from '../model'

export interface ReadDirectory {
  readonly readDirectory: Resume<ReadonlyArray<Document>>
}

/**
 * Reads all the supported files from a given directory
 */
export const readDirectory = fromEnv((e: ReadDirectory) => e.readDirectory)
