import { pipe } from 'fp-ts/function'
import { chain, fromNullable, of, Option } from 'fp-ts/Option'

import { DocumentRegistry } from '../../application/model'
import { Document, DocumentHash } from '../../domain/model'

export const getContentHash = (document: Document, registry: DocumentRegistry, hashLength: number): Option<string> =>
  pipe(
    document.contentHash,
    chain((hash: DocumentHash) => {
      switch (hash.type) {
        case 'hash':
          return of(hash.hash.slice(0, hashLength))
        case 'hashFor':
          return pipe(
            registry.get(hash.filePath),
            fromNullable,
            chain((d) => getContentHash(d, registry, hashLength)),
          )
      }
    }),
  )
