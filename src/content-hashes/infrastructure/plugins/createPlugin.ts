import remapping from '@ampproject/remapping'
import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, fromTask, map, Pure, Resume, sync, toEnv, zip } from '@typed/fp'
import { createHash } from 'crypto'
import { pipe } from 'fp-ts/lib/function'
import { fold, isSome, none, some } from 'fp-ts/Option'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import MagicString from 'magic-string'

import {
  ContentHash,
  Directory,
  Document,
  FileContents,
  FileExtension,
  FilePath,
  replaceHash,
  SourceMap,
} from '../../domain'
import { HashPlugin } from '../provideHashDirectoryEnv'
import { replaceFileHash } from './replaceFileHash'

const toResume = <A>(pure: Pure<A>): Resume<A> => toEnv(pure)({})
const readContents = (path: FilePath) => readFile(FilePath.unwrap(path)).then((b) => FileContents.wrap(b.toString()))

const jsRegex = /\.js$/

const getSourceMapPathFor = (path: FilePath) => FilePath.wrap(FilePath.unwrap(path) + '.map')
const getDtsPathFor = (path: FilePath) => FilePath.wrap(FilePath.unwrap(path).replace(jsRegex, '.d.ts'))
const getProxyMapFor = (path: FilePath) => FilePath.wrap(FilePath.unwrap(path) + '.proxy.js')

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

const defaultHash = (document: Document) =>
  ContentHash.wrap(createHash('sha512').update(FileContents.unwrap(document.contents)).digest('hex'))

const documentToContentHashes = (
  document: Document,
  hash: ContentHash = defaultHash(document),
): ReadonlyMap<FilePath, ContentHash> => {
  const map = new Map([[document.filePath, hash]])

  if (isSome(document.sourceMap)) {
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    map.set(sourceMapPath, hash)

    if (isSome(document.sourceMap.value.proxy)) {
      map.set(getProxyMapFor(sourceMapPath), hash)
    }
  }

  if (isSome(document.dts)) {
    return new Map([...map, ...documentToContentHashes(document.dts.value, hash)])
  }

  return map
}

const rewriteFileContent = (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>): Document => {
  const file = FilePath.unwrap(document.filePath)

  let ms = new MagicString(FileContents.unwrap(document.contents), {
    filename: file,
    indentExclusionRanges: [],
  })

  for (const dep of document.dependencies) {
    const depHash = hashes.get(dep.filePath)!
    const path = replaceFileHash(FilePath.unwrap(dep.filePath), ContentHash.unwrap(depHash))

    ms = ms.overwrite(dep.position[0], dep.position[1], path)
  }

  const updatedSourceMap = JSON.parse(
    ms.generateMap({ hires: true, file, source: ms.original, includeContent: true }).toString(),
  ) as RawSourceMap

  return {
    ...document,
    contents: FileContents.wrap(ms.toString()),
    sourceMap: some(
      pipe(
        document.sourceMap,
        fold(
          (): SourceMap => ({ raw: updatedSourceMap, proxy: none }),
          ({ raw, proxy }) => {
            const remapped = JSON.parse(remapping([updatedSourceMap, raw], () => null).toString()) as RawSourceMap

            return pipe(
              proxy,
              fold(
                () => ({ raw: remapped, proxy: none }),
                (proxyDoc) => ({ raw: remapped, proxy: some(rewriteFileContent(proxyDoc, hashes)) }),
              ),
            )
          },
        ),
      ),
    ),
    dts: pipe(
      document.dts,
      fold(
        () => none,
        (doc) => some(rewriteFileContent(doc, hashes)),
      ),
    ),
  }
}

const rewriteDocumentHashes = (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>) => {
  const hash = hashes.get(document.filePath)!

  return hash ? replaceHash(document, hash) : document
}

export function createPlugin(directory: Directory, extensions: ReadonlyArray<string>): HashPlugin {
  const fileExtensions = extensions.map(FileExtension.wrap)
  const read = readDocument(fileExtensions, true, true)

  const plugin: HashPlugin = {
    directory,
    extensions: fileExtensions,
    generateContentHashes: (document) => sync(documentToContentHashes(document)),
    // TO BE OVERIDDEN AS NEEDED
    readDocument: (path) => pipe(path, read, toResume),
    rewriteDocumentHashes: (documents, hashes) => sync(documents.map((doc) => rewriteDocumentHashes(doc, hashes))),
    rewriteFileContent: (document, hashes) => sync(rewriteFileContent(document, hashes)),
  }

  return plugin
}
