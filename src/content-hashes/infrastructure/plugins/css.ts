import { cond, doEffect } from '@typed/fp'
import { Atrule, CssNode, parse, Url, walk } from 'css-tree'
import { none, some } from 'fp-ts/lib/Option'
import { basename, dirname } from 'path'
import { red, yellow } from 'typed-colors'

import { debug } from '../../application/services/logging'
import { Dependency, Document } from '../../domain/model'
import { fsReadFile } from '../fsReadFile'
import { getHashFor } from '../hashes/getHashFor'
import { HashPlugin } from '../HashPlugin'
import { getFileExtension } from './getFileExtension'
import { resolvePackage } from './resolvePackage'

export type NonNullableKeys<A, Keys extends keyof A> = Readonly<Omit<A, Keys>> &
  { readonly [K in Keys]-?: NonNullable<A[K]> }

const supportedExtensions = ['.css.map', '.css']
const sourceMapExt = '.map'

export function createCssPlugin(): HashPlugin {
  const css: HashPlugin = {
    readFilePath: (filePath) =>
      doEffect(function* () {
        const ext = getFileExtension(filePath)

        if (!supportedExtensions.includes(ext)) {
          yield* debug(`${red(`[CSS]`)} Unsupported file extension ${filePath}`)

          return none
        }

        yield* debug(`${yellow(`[CSS]`)} Reading ${filePath}...`)
        const initial = yield* fsReadFile(filePath, { supportsSourceMaps: true, isBase64Encoded: false })

        // Map files should just get setup with appropriate hashes
        if (ext === sourceMapExt) {
          return some(getHashFor(initial, '.css'))
        }

        yield* debug(`${yellow(`[CSS]`)} Finding dependencies ${filePath}...`)

        return some(findDependencies(initial))
      }),
  }

  return css
}

function findDependencies(document: Document): Document {
  const filename = basename(document.filePath)
  const ast = parse(document.contents, { filename, positions: true })
  const dependencies = new Set<Dependency>()

  walk(ast, (node) =>
    cond(
      [
        cond.create(isAtRule, (node) => parseAtRule(document.filePath, node, dependencies)),
        cond.create(isUrl, (node) => parseUrl(document.filePath, node, dependencies)),
      ],
      node,
    ),
  )

  return { ...document, dependencies: Array.from(dependencies) }
}

const isAtRule = (node: CssNode): node is NonNullableKeys<Atrule, 'loc'> => node.type === 'Atrule' && !!node.loc
const isUrl = (node: CssNode): node is NonNullableKeys<Url, 'loc'> => node.type === 'Url' && !!node.loc

const findAtRuleSpecifier = (rule: NonNullableKeys<Atrule, 'loc'>): SpecifierPosition | null => {
  if (rule.name === 'import' && rule.prelude && rule.prelude.type === 'AtrulePrelude') {
    const specifierNode = rule.prelude.children.first()

    if (specifierNode && specifierNode.type === 'String') {
      const { start, end } = specifierNode.loc!

      return {
        specifier: specifierNode.value.slice(1, -1),
        position: { start: start.offset + 1, end: end.offset - 1 },
      }
    }
  }

  if (rule.name === 'import' && rule.prelude && rule.prelude.type === 'Raw') {
    const specifierNode = rule.prelude
    const { start, end } = specifierNode.loc!

    return {
      specifier: specifierNode.value,
      position: { start: start.offset, end: end.offset },
    }
  }

  return null
}

type SpecifierPosition = { specifier: string; position: Dependency['position'] }

const parseAtRule = (filePath: string, rule: NonNullableKeys<Atrule, 'loc'>, dependencies: Set<Dependency>) => {
  const specifier = findAtRuleSpecifier(rule)

  if (specifier) {
    const specifierFilePath = resolvePackage({
      directory: dirname(filePath),
      moduleSpecifier: specifier.specifier,
      extensions: supportedExtensions,
    })

    const dependency: Dependency = {
      ...specifier,
      filePath: specifierFilePath,
      fileExtension: getFileExtension(specifierFilePath),
    }

    dependencies.add(dependency)
  }
}

const parseUrl = (filePath: string, url: NonNullableKeys<Url, 'loc'>, dependencies: Set<Dependency>) => {
  const specifier = findUrlSpecifier(url)

  if (specifier) {
    const specifierFilePath = resolvePackage({
      directory: dirname(filePath),
      moduleSpecifier: specifier.specifier,
      extensions: supportedExtensions,
    })

    const dependency: Dependency = {
      ...specifier,
      filePath: specifierFilePath,
      fileExtension: getFileExtension(specifierFilePath),
    }

    dependencies.add(dependency)
  }
}

const findUrlSpecifier = (url: NonNullableKeys<Url, 'loc'>): SpecifierPosition | null => {
  const specifierNode = url.value

  if (specifierNode.type === 'String') {
    const { start, end } = specifierNode.loc!

    return {
      specifier: specifierNode.value.slice(1, -1),
      position: { start: start.offset + 1, end: end.offset - 1 },
    }
  }

  if (specifierNode.type === 'Raw') {
    const { start, end } = specifierNode.loc!

    return {
      specifier: specifierNode.value,
      position: { start: start.offset, end: end.offset },
    }
  }

  return null
}
