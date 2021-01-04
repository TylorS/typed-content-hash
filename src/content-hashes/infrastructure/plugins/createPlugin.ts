import remapping from '@ampproject/remapping'
import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, fromTask, map, Pure, zip } from '@typed/fp'
import { createHash } from 'crypto'
import { pipe } from 'fp-ts/function'
import { fold, isSome, map as mapOption, none, some } from 'fp-ts/Option'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import MagicString from 'magic-string'
import { basename, dirname, relative } from 'path'

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
import { rewriteSourceMapUrl } from './rewriteSourceMapUrl'
import { trimHash } from './trimHash'

const dtsRegex = new RegExp(`.d.ts$`)

const readContents = (path: FilePath) => readFile(FilePath.unwrap(path)).then((b) => FileContents.wrap(b.toString()))

const ensureRelative = (path: string) => (path.startsWith('.') || path.startsWith('/') ? path : './' + path)

type ReadDoc = (file: FilePath, fileExtension?: FileExtension) => Pure<Document>

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
  // Trim hash to length
  hash = pipe(hash, trimHash(hashLength))

  let map = new Map([[document.filePath, hash]])

  if (isSome(document.sourceMap)) {
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    map.set(sourceMapPath, hash)

    if (isSome(document.sourceMap.value.proxy)) {
      map = new Map([...map, ...documentToContentHashes(document.sourceMap.value.proxy.value, hashLength, hash)])
    }
  }

  if (isSome(document.dts)) {
    map = new Map([...map, ...documentToContentHashes(document.dts.value, hashLength, hash)])
  }

  return map
}

const rewriteFileContent = (
  directory: Directory,
  baseUrl: string | undefined,
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Document => {
  const file = FilePath.unwrap(document.filePath)
  const contents = FileContents.unwrap(document.contents)
  const ms = new MagicString(contents, {
    filename: file,
    indentExclusionRanges: [],
  })

  for (const dep of document.dependencies) {
    const depHash = hashes.get(dep.filePath)

    if (depHash) {
      const path = replaceHash(dep.filePath, dep.fileExtension, depHash)
      const absolutePath = baseUrl ? applyOrigin(directory, dep.filePath, baseUrl) : ''
      const relativePath = ensureRelative(relative(dirname(file), FilePath.unwrap(path)))
      const replacement = dtsRegex.test(relativePath)
        ? relativePath.replace(dtsRegex, '')
        : baseUrl
        ? absolutePath
        : relativePath

      ms.overwrite(dep.position[0], dep.position[1], replacement)
    }
  }

  const updatedSourceMap = JSON.parse(
    ms.generateMap({ hires: true, file, source: ms.original, includeContent: true }).toString(),
  ) as RawSourceMap

  return {
    ...document,
    contents: FileContents.wrap(ms.toString()),
    sourceMap: pipe(
      document.sourceMap,
      fold(
        (): SourceMap => ({ raw: updatedSourceMap, proxy: none }),
        ({ raw, proxy }) => {
          const remapped = JSON.parse(remapping([updatedSourceMap, raw], () => null).toString()) as RawSourceMap

          return pipe(
            proxy,
            fold(
              (): SourceMap => ({ raw: { ...remapped, file }, proxy: none }),
              (proxyDoc) => ({
                raw: { ...remapped },
                proxy: some(rewriteFileContent(directory, baseUrl, proxyDoc, hashes)),
              }),
            ),
          )
        },
      ),
      some,
    ),
    dts: pipe(
      document.dts,
      fold(
        () => none,
        (doc) => some(rewriteFileContent(directory, baseUrl, doc, hashes)),
      ),
    ),
  }
}

const rewriteDocumentHashes = (
  directory: Directory,
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Document => {
  const hash = hashes.get(document.filePath)

  if (!hash) {
    return document
  }

  const hashed = replaceDocumentHash(document, hash)
  const updated: Document = {
    ...hashed,
    sourceMap: pipe(
      hashed.sourceMap,
      mapOption(({ raw, proxy }) =>
        pipe(
          proxy,
          fold(
            (): SourceMap => ({
              raw: { ...raw, file: pipe(hashed.filePath, getSourceMapPathFor, FilePath.unwrap, basename) },
              proxy,
            }),
            (proxyDoc) => ({
              raw: {
                ...raw,
                file: pipe(hashed.filePath, getSourceMapPathFor, getProxyMapFor, FilePath.unwrap, basename),
              },
              proxy: some(rewriteDocumentHashes(directory, proxyDoc, hashes)),
            }),
          ),
        ),
      ),
    ),
    dts: pipe(
      hashed.dts,
      fold(
        () => none,
        (doc) => some(rewriteDocumentHashes(directory, doc, hashes)),
      ),
    ),
  }

  const file = FilePath.unwrap(updated.filePath)
  const contents = FileContents.unwrap(updated.contents)
  const ms = new MagicString(contents, {
    filename: file,
    indentExclusionRanges: [],
  })

  // Rewrite or add the source map url
  rewriteSourceMapUrl(ms, document.filePath, document.fileExtension, hash)

  const updatedSourceMap = JSON.parse(
    ms.generateMap({ hires: true, file, source: ms.original, includeContent: true }).toString(),
  ) as RawSourceMap

  return {
    ...updated,
    contents: FileContents.wrap(ms.toString()),
    sourceMap: pipe(
      updated.sourceMap,
      fold(
        (): SourceMap => ({ raw: updatedSourceMap, proxy: none }),
        ({ raw, proxy }) => {
          const remapped = JSON.parse(remapping([updatedSourceMap, raw], () => null).toString()) as RawSourceMap

          return pipe(
            proxy,
            fold(
              (): SourceMap => ({ raw: { ...remapped, file }, proxy: none }),
              (proxyDoc) => ({
                raw: { ...remapped },
                proxy: some(rewriteDocumentHashes(directory, proxyDoc, hashes)),
              }),
            ),
          )
        },
      ),
      some,
    ),
    dts: pipe(
      updated.dts,
      fold(
        () => none,
        (doc) => some(rewriteDocumentHashes(directory, doc, hashes)),
      ),
    ),
  }
}

export function createPlugin({ directory, baseUrl }: HashPluginOptions, extensions: ReadonlyArray<string>): HashPlugin {
  const fileExtensions = extensions.map(FileExtension.wrap)

  const plugin: HashPlugin = {
    directory,
    extensions: fileExtensions,
    generateContentHashes: (document, hashLength = Infinity) =>
      Pure.fromIO(() => documentToContentHashes(document, hashLength)),

    // TO BE OVERIDDEN AS NEEDED
    readDocument: readDocument(fileExtensions, true, true),
    rewriteDocumentHashes: (documents, hashes) =>
      Pure.fromIO(() => documents.map((doc) => rewriteDocumentHashes(directory, doc, hashes))),
    rewriteFileContent: (document, hashes) =>
      Pure.fromIO(() => rewriteFileContent(directory, baseUrl, document, hashes)),
  }

  return plugin
}
