#! /usr/bin/env node

import { pipe } from 'fp-ts/function'
import { getOrElse, map } from 'fp-ts/Option'
import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getDefaultCompilerOptions } from 'typescript'
import yargs from 'yargs'

import { contentHashDirectory, createDefaultPlugins, LogLevel } from '../content-hashes'
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
  .options('registryFile', {
    type: 'string',
    description: 'Configure where to write Document Registry to JSON. Useful for debugging',
  })
  .options('sourceMaps', {
    type: 'boolean',
    default: true,
  })
  .options('mainFields', {
    type: 'array',
    default: ['module'],
    description: 'Configure package.json fields to look for dependencies',
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
  plugins: createDefaultPlugins({
    mainFields: options.mainFields,
    buildDirectory: directory,
    compilerOptions: pipe(
      tsConfig,
      map((t) => t.compilerOptions),
      getOrElse(getDefaultCompilerOptions),
    ),
  }),
  logLevel: getLogLevel(options.logLevel),
  registryFile: options.registryFile,
  sourceMaps: options.sourceMaps,
}).catch((error) => {
  console.error(error)

  process.exit(1)
})
