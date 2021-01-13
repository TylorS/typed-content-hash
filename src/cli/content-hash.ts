import { pipe } from 'fp-ts/lib/function'
import { getOrElse, map } from 'fp-ts/lib/Option'
import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getDefaultCompilerOptions } from 'typescript'
import yargs from 'yargs'

import { LogLevel } from '../content-hashes/application/services/logging'
import { contentHashDirectory } from '../content-hashes/contentHashDirectory'
import { createJavascriptPlugin } from '../content-hashes/infrastructure/plugins/javascript'
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
  .options('logLevel', {
    type: 'string',
    choices: ['debug', 'info', 'error'] as const,
    default: 'info',
  })
  .help().argv

function getLogLevel(option: string) {
  switch (option) {
    case 'debug':
      return LogLevel.Debug
    case 'error':
      return LogLevel.Error
    default:
      return LogLevel.Info
  }
}

const directory = resolve(process.cwd(), options.directory)

if (!existsSync(directory) || !statSync(directory).isDirectory()) {
  throw new Error(`Unable to find valid directory at ${directory}`)
}

const tsConfig = findTsConfig({ directory: process.cwd(), configFileName: options.tsConfig })

contentHashDirectory({
  directory,
  hashLength: options.hashLength ?? Infinity,
  assetManifest: resolve(directory, options.assetManifest),
  baseUrl: options.baseUrl,
  plugins: [
    createJavascriptPlugin({
      compilerOptions: pipe(
        tsConfig,
        map((t) => t.compilerOptions),
        getOrElse(getDefaultCompilerOptions),
      ),
    }),
  ],
  logLevel: getLogLevel(options.logLevel),
}).catch((error) => {
  console.error(error)

  process.exit(1)
})
