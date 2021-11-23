import { Env, fromTask, zip } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { promises, statSync } from 'fs'
import { posix } from 'path'

import { debug, LoggerEnv } from '../application/services/logging'

const readdir = (directory: string) =>
  fromTask(() => promises.readdir(directory).then((paths) => paths.map((p) => posix.join(directory, p))))

const isFile = (path: string) => statSync(path).isFile()
const isDirectory = (path: string) => statSync(path).isDirectory()

export const fsReadDirectory = (directory: string): Env<LoggerEnv, readonly string[]> =>
  Do(function* (_) {
    yield* _(debug(`Reading Directory ${directory}...`))

    const paths = yield* _(readdir(directory))
    const files = paths.filter(isFile)
    const directories: ReadonlyArray<readonly string[]> = yield* _(zip(paths.filter(isDirectory).map(fsReadDirectory)))

    return [...files, ...directories.flat()]
  })
