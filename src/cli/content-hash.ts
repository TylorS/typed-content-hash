import { pipe } from 'fp-ts/function'
import { getOrElse, map } from 'fp-ts/Option'
import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getDefaultCompilerOptions } from 'typescript'
import yargs from 'yargs'

import { defaultPlugins } from '../content-hashes/infrastructure/plugins'
import { rewriteDirectory } from '../content-hashes/rewriteDirectory'
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
  .options('hashLength', {
    alias: 'h',
    type: 'number',
  })
  .options('tsConfig', {
    type: 'string',
    default: 'tsconfig.json',
  })
  .options('baseUrl', {
    type: 'string',
  }).argv

const directory = resolve(process.cwd(), options.directory)

if (!existsSync(directory) || !statSync(directory).isDirectory()) {
  throw new Error(`Unable to find valid directory at ${directory}`)
}

const tsConfig = findTsConfig({ directory: process.cwd(), configFileName: options.tsConfig })

rewriteDirectory({
  directory: directory,
  plugins: defaultPlugins,
  hashLength: options.hashLength ?? Infinity,
  pluginEnv: {
    compilerOptions: pipe(
      tsConfig,
      map((t) => t.compilerOptions),
      getOrElse(getDefaultCompilerOptions),
    ),
  },
  assetManifest: resolve(directory, options.assetManifest),
  baseUrl: options.baseUrl,
})
