import { ask, doEffect, Pure } from '@typed/fp'

import { Document } from '../model'

export interface DeleteDocuments {
  readonly deleteDocuments: (documents: readonly Document[]) => Pure<void>
}

/**
 * Delete a list of documents from disk
 */
export const deleteDocuments = (documents: readonly Document[]) =>
  doEffect(function* () {
    const { deleteDocuments } = yield* ask<DeleteDocuments>()

    return yield* deleteDocuments(documents)
  })
