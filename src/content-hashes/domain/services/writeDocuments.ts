import { chain, fromEnv, Pure, sync } from '@typed/fp'
import { identity } from 'fp-ts/function'

import { Document } from '../model'

export interface WriteDocuments {
  readonly writeDocuments: (documents: readonly Document[]) => Pure<void>
}

/**
 * Write a list of documents to disk
 */
export const writeDocuments = (documents: readonly Document[]) =>
  chain(
    identity,
    fromEnv((e: WriteDocuments) => sync(e.writeDocuments(documents))),
  )
