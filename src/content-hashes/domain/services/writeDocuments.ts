import { fromEnv, Resume } from '@typed/fp'

import { Document } from '../model'

export interface WriteDocuments {
  readonly writeDocuments: (documents: readonly Document[]) => Resume<void>
}

/**
 * Write a list of documents to disk
 */
export const writeDocuments = (documents: readonly Document[]) =>
  fromEnv((e: WriteDocuments) => e.writeDocuments(documents))
