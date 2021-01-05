import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, fromTask, map, Pure, zip } from '@typed/fp'
import { createHash } from 'crypto'
import { pipe } from 'fp-ts/function'
import { isSome, map as mapOption, none, some } from 'fp-ts/Option'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import MagicString from 'magic-string'
import { dirname, relative } from 'path'

import { applyOrigin } from '../../common/applyOrigin'
import {
  ContentHash,
  Directory,
  Document,
  FileContents,
  FileExtension,
  FilePath,
  getDtsPathFor,
  getProxyMapFor,
  getSourceMapPathFor,
  replaceDocumentHash,
  replaceHash,
  SourceMap,
} from '../../domain'
import { HashPlugin, HashPluginOptions } from '../provideHashDirectoryEnv'
import { rewriteDocumentContents } from './rewriteDocumentContents'
import { rewriteSourceMapUrl } from './rewriteSourceMapUrl'
import { trimHash } from './trimHash'

const dtsRegex = new RegExp(`.d.ts$`)

const readContents = (path: FilePath) => readFile(FilePath.unwrap(path)).then((b) => FileContents.wrap(b.toString()))
const ensureRelative = (path: string) => (path.startsWith('.') || path.startsWith('/') ? path : './' + path)

type ReadDoc = (file: FilePath, fileExtension?: FileExtension) => Pure<Document>

export function createPlugin(
  { directory, baseUrl, sourceMaps = false, dts = false }: HashPluginOptions,
  extensions: ReadonlyArray<string>,
): HashPlugin {
  const fileExtensions = extensions.map(FileExtension.wrap)

  const plugin: HashPlugin = {
    directory,
    extensions: fileExtensions,
    generateContentHashes: (document, hashLength = Infinity) =>
      Pure.fromIO(() => documentToContentHashes(document, hashLength)),

    // TO BE OVERIDDEN AS NEEDED

    // Extend readDocument to add support for reading dependencies
    readDocument: readDocument(fileExtensions, sourceMaps, dts),

    // Extend to provide any additional rewrites BEFORE hashing the current Document.
    // Will already handle rewriting all of your dependencies that should have Hashes.
    rewriteFileContent: (
      document,
      hashes, //
    ) => Pure.fromIO(() => rewriteFileContent(directory, baseUrl, document, hashes)),

    // Extend to provide any additional rewrites AFTER hashing the current document.
    // Will already rewrite your source map URLS with sourcemap support is enabled.
    rewriteDocumentHashes: (documents, hashes) =>
      Pure.fromIO(() => documents.map((doc) => rewriteDocumentHashes(doc, hashes, sourceMaps))), // HTML
  }

  return plugin
}

const readDocument = (
  extensions: readonly FileExtension[],
  shouldGetSourceMap = true,
  shouldGetDtsFile = true,
): ReadDoc => {
  return (
    filePath: FilePath,
    fileExtension: FileExtension = extensions.find((e) => FilePath.unwrap(filePath).endsWith(FileExtension.unwrap(e)))!,
  ): Pure<Document> =>
    doEffect(function* () {
      const sourceMapPath = getSourceMapPathFor(filePath)
      const dtsPath = getDtsPathFor(filePath)

      const [contents, sourceMap, dts] = yield* zip([
        fromTask(() => readContents(filePath)),
        shouldGetSourceMap && existsSync(FilePath.unwrap(sourceMapPath))
          ? map(some, getSourceMap(sourceMapPath, readDocument(extensions, false, false)))
          : Pure.of(none),
        shouldGetDtsFile && existsSync(FilePath.unwrap(dtsPath))
          ? map(some, readDocument(extensions, true, false)(dtsPath, FileExtension.wrap('.d.ts')))
          : Pure.of(none),
      ] as const)

      const document: Document = {
        filePath,
        fileExtension,
        contents,
        dependencies: [],
        sourceMap,
        dts,
      }

      return document
    })
}

function getSourceMap(path: FilePath, readDoc: ReadDoc): Pure<SourceMap> {
  const eff = doEffect(function* () {
    const proxyPath = getProxyMapFor(path)
    const [contents, proxy] = yield* zip([
      fromTask(() => readContents(path)),
      existsSync(FilePath.unwrap(proxyPath))
        ? map(some, readDoc(proxyPath, FileExtension.wrap('.js.map.proxy.js')))
        : Pure.of(none),
    ] as const)
    const rawSourceMap = JSON.parse(FileContents.unwrap(contents)) as RawSourceMap
    const sourceMap: SourceMap = {
      raw: rawSourceMap,
      proxy,
    }

    return sourceMap
  })

  return eff
}

const createShaHash = (contents: FileContents) =>
  ContentHash.wrap(createHash('sha512').update(FileContents.unwrap(contents)).digest('hex'))

const documentToContentHashes = (
  document: Document,
  hashLength: number,
  hash: ContentHash = createShaHash(document.contents),
): ReadonlyMap<FilePath, ContentHash> => {
  const trimmedHash = pipe(hash, trimHash(hashLength))

  let map = new Map([[document.filePath, trimmedHash]])

  if (isSome(document.sourceMap)) {
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    map.set(sourceMapPath, trimmedHash)

    if (isSome(document.sourceMap.value.proxy)) {
      map = new Map([...map, ...documentToContentHashes(document.sourceMap.value.proxy.value, hashLength, trimmedHash)])
    }
  }

  if (isSome(document.dts)) {
    map = new Map([...map, ...documentToContentHashes(document.dts.value, hashLength, trimmedHash)])
  }

  return map
}

const rewriteDependencies = (
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
  directory: Directory,
  baseUrl: string | undefined,
) => (ms: MagicString) => {
  for (const dep of document.dependencies) {
    const depHash = hashes.get(dep.filePath)

    if (depHash) {
      const hashedPath = replaceHash(dep.filePath, dep.fileExtension, depHash)
      const relativePath = ensureRelative(
        relative(dirname(FilePath.unwrap(document.filePath)), FilePath.unwrap(hashedPath)),
      )
      const pathToUse = baseUrl ? applyOrigin(directory, dep.filePath, baseUrl) : relativePath
      const replacementPath = dtsRegex.test(relativePath) ? relativePath.replace(dtsRegex, '') : pathToUse

      ms.overwrite(dep.position[0], dep.position[1], replacementPath)
    }
  }
}

const rewriteFileContent = (
  directory: Directory,
  baseUrl: string | undefined,
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Document => {
  const base = rewriteDocumentContents(document, rewriteDependencies(document, hashes, directory, baseUrl))
  const dts = pipe(
    document.dts,
    mapOption((d) => rewriteDocumentContents(d, rewriteDependencies(d, hashes, directory, baseUrl))),
  )

  return {
    ...base,
    dts,
  }
}

const rewriteDocumentHashes = (
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
  sourceMaps: boolean,
): Document => {
  const hash = hashes.get(document.filePath)

  if (!sourceMaps || !hash) {
    return document
  }

  const updated = replaceDocumentHash(document, hash)
  const base = rewriteDocumentContents(updated, (ms) =>
    rewriteSourceMapUrl(ms, updated.filePath, updated.fileExtension, hash),
  )
  const dts = pipe(
    updated.dts,
    mapOption((d) => rewriteDocumentContents(d, (ms) => rewriteSourceMapUrl(ms, d.filePath, d.fileExtension, hash))),
  )

  return { ...base, dts }
}
