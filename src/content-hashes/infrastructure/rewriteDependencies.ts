import { ask, Env, useSome } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import base64url from 'base64url'
import { createHash } from 'crypto'
import { pipe } from 'fp-ts/function'
import { getOrElse, isSome, some } from 'fp-ts/Option'
import MagicString from 'magic-string'
import { posix } from 'path'

import { DocumentRegistry, DocumentRegistryEnv } from '../application/model'
import { debug, LoggerEnv } from '../application/services/logging'
import { Dependency, Document } from '../domain/model'
import { applyOrigin } from './applyOrigin'
import { ensureRelative } from './ensureRelative'
import { getContentHash, replaceHash } from './hashes'
import { getHashedPath } from './hashes/getHashedPath'
import { rewriteDocumentContents } from './rewriteDocumentContents'
import { sha512Hash } from './sha512Hash'

const dtsRegex = new RegExp(`.d.ts$`)

export type RewriteDependenciesImplementationEnv = {
  readonly directory: string
  readonly hashLength: number
  readonly sourceMaps: boolean
  readonly baseUrl?: string
}

export const rewriteDependencies = (
  documents: ReadonlyArray<Document>,
): Env<DocumentRegistryEnv & LoggerEnv & RewriteDependenciesImplementationEnv, DocumentRegistry> =>
  Do(function* (_) {
    const env = yield* _(ask<RewriteDependenciesImplementationEnv & DocumentRegistryEnv>())
    const computedHashes = computeContentHashes(documents, env.documentRegistry, env.hashLength)

    let documentRegistry = env.documentRegistry
    for (const document of documents) {
      const { filePath } = document

      yield* _(debug(`Rewriting dependencies ${filePath}...`))

      const hasComputedHash = computedHashes.has(filePath)
      const updatedDocument: Document = hasComputedHash
        ? { ...document, contentHash: some({ type: 'hash', hash: computedHashes.get(filePath)! }) }
        : document

      documentRegistry = yield* _(
        pipe(
          rewriteDocumentContents(
            updatedDocument,
            rewriteDocumentDependencies(updatedDocument, computedHashes, env),
            env.sourceMaps,
            hasComputedHash,
          ),
          useSome<DocumentRegistryEnv>({ documentRegistry }),
        ),
      )
    }

    return documentRegistry
  })

const rewriteDocumentDependencies = (
  document: Document,
  computedHashes: Map<string, string>,
  env: RewriteDependenciesImplementationEnv & DocumentRegistryEnv,
) => (ms: MagicString) => {
  for (const dep of document.dependencies) {
    const depDoc = env.documentRegistry.get(dep.filePath)

    if (depDoc) {
      ms.overwrite(
        dep.position.start,
        dep.position.end,
        determineReplacementPath({ document, depDoc, dep, computedHashes, ...env }),
      )
    }
  }
}

type ReplacementPathOptions = RewriteDependenciesImplementationEnv &
  DocumentRegistryEnv & {
    readonly document: Document
    readonly depDoc: Document
    readonly dep: Dependency
    readonly computedHashes: Map<string, string>
  }

function determineReplacementPath({
  document,
  depDoc,
  documentRegistry,
  hashLength,
  directory,
  dep,
  baseUrl,
  computedHashes,
}: ReplacementPathOptions) {
  const hashedPath = computedHashes.has(depDoc.filePath)
    ? replaceHash(depDoc.filePath, depDoc.fileExtension, computedHashes.get(depDoc.filePath)!.slice(0, hashLength))
    : getHashedPath(depDoc, documentRegistry, hashLength)
  const relativePath = ensureRelative(posix.relative(posix.dirname(document.filePath), hashedPath))
  const absolutePath = ensureAbsolute(posix.relative(directory, hashedPath))
  const pathToUse = baseUrl
    ? applyOrigin(directory, hashedPath, baseUrl)
    : dep.specifier.startsWith('/')
    ? absolutePath
    : relativePath
  const replacementPath = dtsRegex.test(pathToUse) ? pathToUse.replace(dtsRegex, '') : pathToUse

  return replacementPath
}

function ensureAbsolute(path: string) {
  if (path[0] !== '/') {
    return '/' + path
  }

  return path
}

function computeContentHashes(documents: ReadonlyArray<Document>, registry: DocumentRegistry, hashLength: number) {
  const computedHashes = new Map<string, string>()

  if (documents.length < 2) {
    return computedHashes
  }

  for (const document of documents) {
    if (isSome(document.contentHash) && document.contentHash.value.type == 'hash') {
      computedHashes.set(document.filePath, computeContentHash(document, registry, hashLength))
    }
  }

  return computedHashes
}

function computeContentHash(document: Document, registry: DocumentRegistry, hashLength: number) {
  const getHash = (d: Document) =>
    pipe(
      getContentHash(d, registry, hashLength),
      getOrElse(() => sha512Hash(d.contents)),
    )

  const computed = createHash('sha512')

  computed.update(getHash(document))

  const dependenciesForHashing = new Set(document.dependencies)
  for (const dep of dependenciesForHashing) {
    const depDoc = registry.get(dep.filePath)

    if (depDoc) {
      computed.update(getHash(depDoc))

      depDoc.dependencies.forEach((d) => dependenciesForHashing.add(d))
    }
  }

  return base64url.fromBase64(computed.digest('base64'))
}
