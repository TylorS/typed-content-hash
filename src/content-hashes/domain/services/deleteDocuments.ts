import { fromEnv, Resume } from '@typed/fp'

import { Document } from '../model'

export interface DeleteDocuments {
  readonly deleteDocuments: (documents: readonly Document[]) => Resume<void>
}

/**
 * Delete a list of documents from disk
 */
export const deleteDocuments = (documents: readonly Document[]) =>
  fromEnv((e: DeleteDocuments) => e.deleteDocuments(documents))
