import { ask, doEffect, Effect, provideSome } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'

import { DocumentRegistry, DocumentRegistryEnv } from '../application/model'
import { debug, LoggerEnv } from '../application/services/logging'
import { getHashedPath } from './hashes/getHashedPath'
import { rewriteDocumentContents } from './rewriteDocumentContents'
import { rewriteSourceMapUrl } from './rewriteSourceMapUrl'

export const rewriteSourceMapUrls: Effect<DocumentRegistryEnv & LoggerEnv, DocumentRegistry> = doEffect(function* () {
  yield* debug(`Rewriting source-map URLs...`)

  const env = yield* ask<DocumentRegistryEnv>()

  let documentRegistry = env.documentRegistry

  for (const document of documentRegistry.values()) {
    documentRegistry = yield* pipe(
      rewriteDocumentContents(document, (ms) => rewriteSourceMapUrl(ms, getHashedPath(document, documentRegistry))),
      provideSome<DocumentRegistryEnv>({ documentRegistry }),
    )
  }

  return documentRegistry
})
