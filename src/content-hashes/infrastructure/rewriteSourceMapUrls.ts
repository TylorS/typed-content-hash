import { ask, Env, useSome } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { pipe } from 'fp-ts/function'
import { isSome } from 'fp-ts/Option'

import { DocumentRegistry, DocumentRegistryEnv } from '../application/model'
import { debug, LoggerEnv } from '../application/services/logging'
import { getHashedPath } from './hashes/getHashedPath'
import { rewriteDocumentContents } from './rewriteDocumentContents'
import { rewriteSourceMapUrl } from './rewriteSourceMapUrl'

export const rewriteSourceMapUrls = (
  hashLength: number,
  sourceMaps: boolean,
): Env<DocumentRegistryEnv & LoggerEnv, DocumentRegistry> =>
  Do(function* (_) {
    yield* _(debug(`Rewriting source-map URLs...`))

    const env = yield* _(ask<DocumentRegistryEnv>())

    let documentRegistry = env.documentRegistry

    for (const document of documentRegistry.values()) {
      if (isSome(document.sourceMap)) {
        documentRegistry = yield* _(
          pipe(
            rewriteDocumentContents(
              document,
              (ms) => rewriteSourceMapUrl(ms, getHashedPath(document, documentRegistry, hashLength)),
              sourceMaps,
              true,
            ),
            useSome<DocumentRegistryEnv>({ documentRegistry }),
          ),
        )
      }
    }

    return documentRegistry
  })
