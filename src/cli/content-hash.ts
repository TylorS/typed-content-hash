import { pipe } from 'fp-ts/function'
import { getOrElse, map } from 'fp-ts/Option'
import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getDefaultCompilerOptions } from 'typescript'
import yargs from 'yargs'

import { defaultPlugins, rewriteDirectory } from '../content-hashes'
import { findTsConfig } from './findTsConfig'

const options = yargs
  .options('directory', {
    alias: 'dir',
    type: 'string',
    demandOption: true,
    description: 'The directory to apply content hashes',
  })
  .options('assetManifest', {
    type: 'string',
    default: 'asset-manifest.json',
    description: 'Filename of asset manifest JSON',
  })
  .options('hashLength', {
    alias: 'h',
    type: 'number',
    description: 'Number of characters to slice from SHA-512 hash',
  })
  .options('tsConfig', {
    type: 'string',
    default: 'tsconfig.json',
    description: 'Relative path to tsconfig from CWD',
  })
  .options('baseUrl', {
    type: 'string',
    description: 'Base URL to use when rewriting imports/exports',
  })
  .help().argv

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
