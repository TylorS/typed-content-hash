import { cond, doEffect } from '@typed/fp'
import { Atrule, AtrulePrelude, CssNode, parse, Url, walk } from 'css-tree'
import { readFileSync } from 'fs'
import { basename, dirname, extname } from 'path'
import resolve from 'resolve'

import {
  ContentHash,
  Dependency,
  Document,
  FileContents,
  FileExtension,
  FilePath,
  Hashes,
  ModuleSpecifier,
} from '../../domain'
import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'
import { createShaHash } from './documentToContentHashes'

export type NonNullableKeys<A, Keys extends keyof A> = Readonly<Omit<A, Keys>> &
  { readonly [K in Keys]-?: NonNullable<A[K]> }

export const cssPlugin: HashPluginFactory<{}> = (options): HashPlugin => {
  const base = createPlugin({ ...options, sourceMaps: true }, ['.css'])

  return {
    ...base,
    readDocument: createReadDocument(base),
  }
}

function createReadDocument(base: HashPlugin) {
  return function (path: FilePath) {
    const eff = doEffect(function* () {
      const [document, hashes] = yield* base.readDocument(path)

      return findDependencies(document, hashes)
    })

    return eff
  }
}

function findDependencies(
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): readonly [Document, Hashes['hashes']] {
  const filename = basename(FilePath.unwrap(document.filePath))
  const contents = FileContents.unwrap(document.contents)
  const ast = parse(contents, { filename, positions: true })
  const dependencies = new Set<Dependency>()
  const newHashes = new Map<FilePath, ContentHash>()

  const add = (deps: readonly Dependency[], hashes: ReadonlyMap<FilePath, ContentHash>) => {
    deps.forEach((d) => dependencies.add(d))
    hashes.forEach((v, k) => newHashes.set(k, v))
  }

  walk(ast, (node) =>
    cond(
      [
        cond.create(isAtRule, (node) => add(...parseAtRule(document.filePath, node))),
        cond.create(isUrl, (node) => add(...parseUrl(document.filePath, node))),
      ],
      node,
    ),
  )

  return [{ ...document, dependencies: Array.from(dependencies) }, new Map([...hashes, ...newHashes])] as const
}

type SpecifierPosition = { specifier: string; position: Dependency['position'] }

const isAtRule = (node: CssNode): node is NonNullableKeys<Atrule, 'loc'> => node.type === 'Atrule' && !!node.loc
const isUrl = (node: CssNode): node is NonNullableKeys<Url, 'loc'> => node.type === 'Url' && !!node.loc

const findAtRuleSpecifier = (rule: NonNullableKeys<Atrule, 'loc'>): SpecifierPosition | null => {
  if (rule.name === 'import' && rule.prelude && rule.prelude.type === 'AtrulePrelude') {
    const specifierNode = (rule.prelude as AtrulePrelude).children.first()

    if (specifierNode && specifierNode.type === 'String') {
      const { start, end } = specifierNode.loc!

      return {
        specifier: specifierNode.value.slice(1, -1),
        position: [start.offset + 1, end.offset - 1],
      }
    }
  }

  if (rule.name === 'import' && rule.prelude && rule.prelude.type === 'Raw') {
    const specifierNode = rule.prelude

    const { start, end } = specifierNode.loc!

    return {
      specifier: specifierNode.value,
      position: [start.offset, end.offset],
    }
  }

  return null
}

const parseAtRule = (filePath: FilePath, rule: NonNullableKeys<Atrule, 'loc'>) => {
  const dependencies: Dependency[] = []
  const hashes = new Map<FilePath, ContentHash>()
  const specifier = findAtRuleSpecifier(rule)

  addDependency(filePath, dependencies, hashes, specifier)

  return [dependencies, hashes] as const
}

const findUrlSpecifier = (url: NonNullableKeys<Url, 'loc'>): SpecifierPosition | null => {
  const specifierNode = url.value

  if (specifierNode.type === 'String') {
    const { start, end } = specifierNode.loc!

    return {
      specifier: specifierNode.value.slice(1, -1),
      position: [start.offset + 1, end.offset - 1],
    }
  }

  if (specifierNode.type === 'Raw') {
    const { start, end } = specifierNode.loc!

    return {
      specifier: specifierNode.value,
      position: [start.offset, end.offset],
    }
  }

  return null
}

const parseUrl = (filePath: FilePath, url: NonNullableKeys<Url, 'loc'>) => {
  const dependencies: Dependency[] = []
  const hashes = new Map<FilePath, ContentHash>()
  const specifier = findUrlSpecifier(url)

  addDependency(filePath, dependencies, hashes, specifier)

  return [dependencies, hashes] as const
}

function addDependency(
  filePath: FilePath,
  dependencies: Dependency[],
  hashes: Map<FilePath, ContentHash>,
  specifier: SpecifierPosition | null,
) {
  if (specifier) {
    try {
      const depPath = resolve.sync(specifier.specifier, {
        basedir: dirname(FilePath.unwrap(filePath)),
        packageIterator: (request, _, defaultCanditates) => {
          try {
            return [extname(request), ...defaultCanditates()]
          } catch {
            return defaultCanditates()
          }
        },
        extensions: ['.css', '.png', '.svg', '.jpg', '.jpeg', '.*'],
      })
      const ext = extname(depPath)

      // Create hashes of these files too, they'll be moved later.
      if (ext !== '.css') {
        hashes.set(FilePath.wrap(depPath), createShaHash(FileContents.wrap(readFileSync(depPath).toString('base64'))))
      }

      dependencies.push({
        specifier: ModuleSpecifier.wrap(specifier.specifier),
        filePath: FilePath.wrap(depPath),
        fileExtension: FileExtension.wrap(ext),
        position: specifier.position,
      })
    } catch (error) {
      console.info(`Unable to resolve specifier ${specifier.specifier} from ${filePath}`)
      console.error(error)
    }
  }
}
