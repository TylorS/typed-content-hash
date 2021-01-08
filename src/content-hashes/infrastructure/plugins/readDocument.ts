import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, fromTask, map, Pure, zip } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { map as mapOption, none, some } from 'fp-ts/Option'
import { fst } from 'fp-ts/ReadonlyTuple'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { extname } from 'path'

import {
  Document,
  FileContents,
  FileExtension,
  FilePath,
  getDtsPathFor,
  getProxyMapFor,
  getSourceMapPathFor,
  Hashes,
  SourceMap,
} from '../../domain'

const readContents = (path: FilePath) => readFile(FilePath.unwrap(path)).then((b) => FileContents.wrap(b.toString()))

const getExtension = (extensions: readonly FileExtension[], filePath: FilePath) =>
  extensions.find((e) => FilePath.unwrap(filePath).endsWith(FileExtension.unwrap(e))) ??
  FileExtension.wrap(extname(FilePath.unwrap(filePath)))

type ReadDoc = (file: FilePath, fileExtension?: FileExtension) => Pure<readonly [Document, Hashes['hashes']]>

export const readDocument = (
  extensions: readonly FileExtension[],
  shouldGetSourceMap = true,
  shouldGetDtsFile = true,
): ReadDoc => {
  return (
    filePath: FilePath,
    fileExtension: FileExtension = getExtension(extensions, filePath),
  ): Pure<readonly [Document, Hashes['hashes']]> =>
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
        dts: pipe(dts, mapOption(fst)),
      }

      return [document, new Map()] as const
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
      proxy: pipe(proxy, mapOption(fst)),
    }

    return sourceMap
  })

  return eff
}
