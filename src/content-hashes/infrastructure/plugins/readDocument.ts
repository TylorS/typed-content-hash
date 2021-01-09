import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { doEffect, Effect, fromTask, map, Pure, zip } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { map as mapOption, none, some } from 'fp-ts/lib/Option'
import { fst } from 'fp-ts/lib/ReadonlyTuple'
import { existsSync, promises } from 'fs'
import { extname, relative } from 'path'

import { debug, LoggerEnv } from '../../common/logging'
import {
  Directory,
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

const readContents = (path: FilePath) =>
  promises.readFile(FilePath.unwrap(path)).then((b) => FileContents.wrap(b.toString()))

const getExtension = (extensions: readonly FileExtension[], filePath: FilePath) =>
  extensions.find((e) => FilePath.unwrap(filePath).endsWith(FileExtension.unwrap(e))) ??
  FileExtension.wrap(extname(FilePath.unwrap(filePath)))

type ReadDoc = (
  file: FilePath,
  fileExtension?: FileExtension,
) => Effect<LoggerEnv, readonly [Document, Hashes['hashes']]>

export const readDocument = (
  directory: Directory,
  extensions: readonly FileExtension[],
  shouldGetSourceMap = true,
  shouldGetDtsFile = true,
  supportsHashes = true,
): ReadDoc => {
  return (
    filePath: FilePath,
    fileExtension: FileExtension = getExtension(extensions, filePath),
  ): Effect<LoggerEnv, readonly [Document, Hashes['hashes']]> =>
    doEffect(function* () {
      yield* debug(`Reading ${relative(Directory.unwrap(directory), FilePath.unwrap(filePath))}...`)

      const sourceMapPath = getSourceMapPathFor(filePath)
      const dtsPath = getDtsPathFor(filePath)
      const [contents, sourceMap, dts] = yield* zip([
        fromTask(() => readContents(filePath)),
        shouldGetSourceMap && existsSync(FilePath.unwrap(sourceMapPath))
          ? map(some, getSourceMap(sourceMapPath, readDocument(directory, extensions, false, false, supportsHashes)))
          : Pure.of(none),
        shouldGetDtsFile && existsSync(FilePath.unwrap(dtsPath))
          ? map(
              some,
              readDocument(directory, extensions, true, false, supportsHashes)(dtsPath, FileExtension.wrap('.d.ts')),
            )
          : Pure.of(none),
      ] as const)

      const document: Document = {
        filePath,
        fileExtension,
        contents,
        dependencies: [],
        sourceMap,
        dts: pipe(dts, mapOption(fst)),
        supportsHashes: supportsHashes,
      }

      return [document, new Map()] as const
    })
}

function getSourceMap(path: FilePath, readDoc: ReadDoc): Effect<LoggerEnv, SourceMap> {
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
