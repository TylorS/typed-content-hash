import { chain, fromTask, map, Pure, zip } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { isSome, none, some } from 'fp-ts/lib/Option'
import { fst, snd } from 'fp-ts/lib/ReadonlyTuple'
import fs from 'fs'
import path from 'path'

import { ContentHash, Directory, Document, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'

const resolve = (directory: Directory, pathLike: string) => path.resolve(Directory.unwrap(directory), pathLike)
const readdir = (directory: Directory) => fromTask(() => fs.promises.readdir(Directory.unwrap(directory)))

const isFile = (pathLike: string) => fs.existsSync(pathLike) && fs.statSync(pathLike).isFile()
const isDirectory = (pathLike: string) => fs.existsSync(pathLike) && fs.statSync(pathLike).isDirectory()

const combineValues = (documents: ReadonlyArray<readonly [Document, ReadonlyMap<FilePath, ContentHash>]>) =>
  [
    documents.map(fst),
    documents.map(snd).reduce((a, b) => new Map([...a, ...b]), new Map<FilePath, ContentHash>()),
  ] as const

export function readDirectory(directory: Directory, manager: HashPluginManager) {
  return pipe(
    directory,
    readAllFilesRecursively,
    chain((files) => zip(files.map(readDocumentWithManager(manager)))),
    map((documents) => combineValues(documents.filter(isSome).map((d) => d.value))),
  )
}

function readDocumentWithManager(manager: HashPluginManager) {
  return (file: FilePath) => {
    const plugin = manager.getPlugin(file)

    if (isSome(plugin)) {
      return map(some, plugin.value.readDocument(file))
    }

    return Pure.of(none)
  }
}

function readAllFilesRecursively(directory: Directory): Pure<readonly FilePath[]> {
  return pipe(
    directory,
    readdir,
    chain((relativePaths) => {
      const paths = relativePaths.map((path) => resolve(directory, path))
      const files = paths.filter(isFile).map(FilePath.wrap)
      const directories = paths.filter(isDirectory).map(Directory.wrap)

      return pipe(
        zip(directories.map(readAllFilesRecursively)),
        map((childFiles) => [...files, ...childFiles.flat()]),
      )
    }),
  )
}
