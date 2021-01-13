import { ask, doEffect, Effect } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import MagicString from 'magic-string'
import { dirname, relative } from 'path'

import { DocumentRegistry, DocumentRegistryEnv } from '../application/model'
import { debug, LoggerEnv } from '../application/services/logging'
import { Document } from '../domain/model'
import { applyOrigin } from './applyOrigin'
import { ensureRelative } from './ensureRelative'
import { getHashedPath } from './hashes/getHashedPath'
import { rewriteDocumentContents } from './rewriteDocumentContents'

const dtsRegex = new RegExp(`.d.ts$`)

export type RewriteDependenciesImplementationEnv = {
  readonly directory: string
  readonly hashLength: number
  readonly baseUrl?: string
}

export const rewriteDependencies = (
  document: Document,
): Effect<DocumentRegistryEnv & LoggerEnv & RewriteDependenciesImplementationEnv, DocumentRegistry> =>
  doEffect(function* () {
    yield* debug(`Rewriting dependencies...`)

    const env = yield* ask<RewriteDependenciesImplementationEnv & DocumentRegistryEnv>()

    return yield* pipe(
      rewriteDocumentContents(
        document,
        rewriteDocumentDependencies(document, env.documentRegistry, env.directory, env.hashLength, env.baseUrl),
      ),
    )
  })

const rewriteDocumentDependencies = (
  document: Document,
  registry: DocumentRegistry,
  directory: string,
  hashLength: number,
  baseUrl: string | undefined,
) => (ms: MagicString) => {
  for (const dep of document.dependencies) {
    const depDoc = registry.get(dep.filePath)!
    const hashedPath = getHashedPath(depDoc, registry, hashLength)

    if (hashedPath !== dep.filePath) {
      const relativePath = ensureRelative(relative(dirname(document.filePath), hashedPath))
      const pathToUse = baseUrl ? applyOrigin(directory, dep.filePath, baseUrl) : relativePath
      const replacementPath = dtsRegex.test(relativePath) ? relativePath.replace(dtsRegex, '') : pathToUse

      ms.overwrite(dep.position.start, dep.position.end, replacementPath)
    }
  }
}
