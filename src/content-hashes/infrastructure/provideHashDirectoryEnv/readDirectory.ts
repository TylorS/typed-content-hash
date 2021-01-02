import { chainResume, fromTask, mapResume, Resume, sync, toEnv } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { isSome, none, some } from 'fp-ts/Option'
import fs from 'fs'
import path from 'path'

import { Directory, FilePath } from '../../domain'
import { HashPluginManager } from './PluginManager'
import { zipResumes } from './zipResumes'

const resolve = (directory: Directory, pathLike: string) => path.resolve(Directory.unwrap(directory), pathLike)
const readdir = (directory: Directory) => toEnv(fromTask(() => fs.promises.readdir(Directory.unwrap(directory))))({})

const isFile = (pathLike: string) => fs.existsSync(pathLike) && fs.statSync(pathLike).isFile()
const isDirectory = (pathLike: string) => fs.existsSync(pathLike) && fs.statSync(pathLike).isDirectory()

export function readDirectory(directory: Directory, manager: HashPluginManager) {
  return pipe(
    directory,
    readAllFilesRecursively,
    chainResume((files) => zipResumes(files.map((file) => pipe(file, readDocumentWithManager(manager))))),
    mapResume((documents) => documents.filter(isSome).map((d) => d.value)),
  )
}

function readDocumentWithManager(manager: HashPluginManager) {
  return (file: FilePath) => {
    const plugin = manager.getPlugin(file)

    if (isSome(plugin)) {
      return mapResume(some, plugin.value.readDocument(file))
    }

    return sync(none)
  }
}

function readAllFilesRecursively(directory: Directory): Resume<readonly FilePath[]> {
  return pipe(
    directory,
    readdir,
    chainResume((relativePaths) => {
      const paths = relativePaths.map((path) => resolve(directory, path))
      const files = paths.filter(isFile).map(FilePath.wrap)
      const directories = paths.filter(isDirectory).map(Directory.wrap)

      return pipe(
        zipResumes(directories.map(readAllFilesRecursively)),
        mapResume((childFiles) => [...files, ...childFiles.flat()]),
      )
    }),
  )
}
