import { Do } from '@typed/fp/FxEnv'
import { Atrule, CssNode, parse, Url, walk } from 'css-tree'
import { none, some } from 'fp-ts/Option'
import { posix } from 'path'
import { red, yellow } from 'typed-colors'

import { debug } from '../../application/services/logging'
import { Dependency, Document } from '../../domain/model'
import { fsReadFile } from '../fsReadFile'
import { getHashFor } from '../hashes/getHashFor'
import { HashPlugin } from '../HashPlugin'
import { MAIN_FIELDS } from './defaults'
import { getFileExtension } from './getFileExtension'
import { isExternalUrl } from './isExternalUrl'
import { resolvePackage } from './resolvePackage'

export type NonNullableKeys<A, Keys extends keyof A> = Readonly<Omit<A, Keys>> &
  { readonly [K in Keys]-?: NonNullable<A[K]> }

const supportedExtensions = ['.css.map', '.css']
const sourceMapExt = '.map'

export type CssPluginOptions = {
  readonly mainFields?: readonly string[]
}

export function createCssPlugin({ mainFields = MAIN_FIELDS }: CssPluginOptions): HashPlugin {
  const css: HashPlugin = {
    readFilePath: (filePath) =>
      Do(function* (_) {
        const ext = getFileExtension(filePath)

        if (!supportedExtensions.includes(ext)) {
          yield* _(debug(`${red(`[CSS]`)} Unsupported file extension ${filePath}`))

          return none
        }

        yield* _(debug(`${yellow(`[CSS]`)} Reading ${filePath}...`))
        const initial = yield* _(fsReadFile(filePath, { supportsSourceMaps: true, isBase64Encoded: false }))

        // Map files should just get setup with appropriate hashes
        if (ext === sourceMapExt) {
          return some(getHashFor(initial, '.css'))
        }

        yield* _(debug(`${yellow(`[CSS]`)} Finding dependencies ${filePath}...`))

        return some(findDependencies(initial, mainFields))
      }),
  }

  return css
}

function findDependencies(document: Document, mainFields: readonly string[]): Document {
  const filename = posix.basename(document.filePath)
  const ast = parse(document.contents, { filename, positions: true })
  const dependencies = new Set<Dependency>()

  walk(ast, (node) => {
    if (isAtRule(node)) {
      return parseAtRule(document.filePath, node, dependencies, mainFields)
    }

    if (isUrl(node)) {
      return parseUrl(document.filePath, node, dependencies, mainFields)
    }

    return node
  })

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

const parseAtRule = (
  filePath: string,
  rule: NonNullableKeys<Atrule, 'loc'>,
  dependencies: Set<Dependency>,
  mainFields: readonly string[],
) => {
  const specifier = findAtRuleSpecifier(rule)

  if (specifier && !isExternalUrl(specifier.specifier)) {
    const specifierFilePath = resolvePackage({
      directory: posix.dirname(filePath),
      moduleSpecifier: specifier.specifier,
      extensions: supportedExtensions,
      mainFields,
    })

    const dependency: Dependency = {
      ...specifier,
      filePath: specifierFilePath,
      fileExtension: getFileExtension(specifierFilePath),
    }

    dependencies.add(dependency)
  }
}

const parseUrl = (
  filePath: string,
  url: NonNullableKeys<Url, 'loc'>,
  dependencies: Set<Dependency>,
  mainFields: readonly string[],
) => {
  const specifier = findUrlSpecifier(url)

  if (specifier && !isExternalUrl(specifier.specifier)) {
    const specifierFilePath = resolvePackage({
      directory: posix.dirname(filePath),
      moduleSpecifier: specifier.specifier,
      extensions: supportedExtensions,
      mainFields,
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
