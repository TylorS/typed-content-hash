import { doEffect, Effect, fromTask, zip } from '@typed/fp'
import { promises, statSync } from 'fs'
import { join } from 'path'

import { debug, LoggerEnv } from '../application/services/logging'

const readdir = (directory: string) =>
  fromTask(() => promises.readdir(directory).then((paths) => paths.map((p) => join(directory, p))))

const isFile = (path: string) => statSync(path).isFile()
const isDirectory = (path: string) => statSync(path).isDirectory()

export const fsReadDirectory = (directory: string): Effect<LoggerEnv, readonly string[]> =>
  doEffect(function* () {
    yield* debug(`Reading Directory ${directory}...`)

    const paths = yield* readdir(directory)
    const files = paths.filter(isFile)
    const directories: ReadonlyArray<readonly string[]> = yield* zip(paths.filter(isDirectory).map(fsReadDirectory))

    return [...files, ...directories.flat()]
  })
