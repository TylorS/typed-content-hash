import { chain, execEffect } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import { map, toUndefined } from 'fp-ts/lib/Option'
import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'

import { Directory, FilePath, hashDirectory, writeHashedDirectory } from '../content-hashes'
import { deleteDocuments, provideHashDirectoryEnv, writeDocuments } from '../content-hashes/infrastructure'
import { defaultPlugins } from '../content-hashes/infrastructure/plugins'
import { findTsConfig } from './findTsConfig'

const options = yargs
  .options('directory', {
    alias: 'dir',
    type: 'string',
    demandOption: true,
  })
  .options('assetManifest', {
    type: 'string',
    default: 'asset-manifest.json',
  })
  .options('tsConfig', {
    type: 'string',
    default: 'tsconfig.json',
  }).argv

const resolvedDirectory = resolve(process.cwd(), options.directory)

if (!existsSync(resolvedDirectory) || !statSync(resolvedDirectory).isDirectory()) {
  throw new Error(`Unable to find valid directory at ${resolvedDirectory}`)
}

const directory = Directory.wrap(resolvedDirectory)
const tsConfig = findTsConfig({ directory: process.cwd(), configFileName: options.tsConfig })

pipe(
  hashDirectory,
  chain(writeHashedDirectory),
  provideHashDirectoryEnv(directory, defaultPlugins),
  execEffect({
    compilerOptions: pipe(
      tsConfig,
      map((t) => t.compilerOptions),
      toUndefined,
    ),
    assetManifest: FilePath.wrap(resolve(resolvedDirectory, options.assetManifest)),
    writeDocuments,
    deleteDocuments,
  }),
)
