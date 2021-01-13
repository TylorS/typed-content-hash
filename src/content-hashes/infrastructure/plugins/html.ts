import { doEffect } from '@typed/fp'
import { none, some } from 'fp-ts/lib/Option'
import { getMonoid } from 'fp-ts/lib/ReadonlyArray'
import { foldMap, Tree } from 'fp-ts/lib/Tree'
import { dirname, extname, relative, resolve } from 'path'
import { red, yellow } from 'typed-colors'

import { debug } from '../../application/services/logging'
import { Dependency, Document } from '../../domain/model'
import { ensureRelative } from '../ensureRelative'
import { fsReadFile } from '../fsReadFile'
import { HashPlugin } from '../HashPlugin'
import { resolvePackage } from './resolvePackage'

export type HtmlAst = {
  readonly type: string
  readonly tagName: string
  readonly attributes: readonly HtmlAttribute[]
  readonly children?: readonly HtmlAst[]
  readonly position: {
    readonly start: {
      readonly index: number
      readonly line: number
      readonly column: number
    }
    readonly end: {
      readonly index: number
      readonly line: number
      readonly column: number
    }
  }
}

export type HtmlAttribute = {
  readonly key: string
  readonly value: string
}

export type HtmlParseOptions = { readonly includePositions: true }

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parse, parseDefaults } = require('himalaya') as {
  parse: (html: string, options: HtmlParseOptions) => readonly HtmlAst[]
  parseDefaults: HtmlParseOptions
}
const supportedFileExtension = ['.html']

const foldDependencies = foldMap(getMonoid<Dependency>())

const searchMap: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'ping'],
  applet: ['archive', 'code', 'codebase', 'object', 'src'],
  area: ['href', 'ping'],
  audio: ['src'],
  base: ['href'],
  blockquote: ['cite'],
  body: ['background'],
  button: ['formaction'],
  del: ['cite'],
  embed: ['src'],
  form: ['action'],
  frame: ['longdesc', 'src'],
  head: ['profile'],
  html: ['manifest'],
  iframe: ['longdesc', 'src'],
  img: ['longdesc', 'src', 'srcset'],
  input: ['formaction', 'src'],
  ins: ['cite'],
  link: ['href'],
  menuitem: ['icon'],
  meta: ['content'],
  object: ['codebase', 'data'],
  q: ['cite'],
  script: ['src'],
  source: ['src', 'srcset'],
  table: ['background'],
  tbody: ['background'],
  td: ['background'],
  tfoot: ['background'],
  th: ['background'],
  thead: ['background'],
  tr: ['background'],
  track: ['src'],
  video: ['poster', 'src'],
} as const

export interface HtmlPuginOptions {
  readonly buildDirectory: string
}

export function createHtmlPlugin({ buildDirectory }: HtmlPuginOptions): HashPlugin {
  const html: HashPlugin = {
    readFilePath: (filePath) =>
      doEffect(function* () {
        const ext = extname(filePath)

        if (!supportedFileExtension.includes(ext)) {
          yield* debug(`${red(`[HTML]`)} Unsupported file extension ${filePath}`)

          return none
        }

        yield* debug(`${yellow(`[HTML]`)} Reading ${filePath}...`)
        const initial = yield* fsReadFile(filePath, { supportsSourceMaps: false, isBase64Encoded: false })
        yield* debug(`${yellow(`[HTML]`)} Finding Dependencies ${filePath}...`)

        const document: Document = findDependencies(initial, buildDirectory)

        return some({ ...document, contentHash: none, sourceMap: none })
      }),
  }

  return html
}

function findDependencies(document: Document, buildDirectory: string) {
  const directory = dirname(document.filePath)
  const ast = parse(document.contents, { ...parseDefaults, includePositions: true })
  const dependencies = ast
    .map(astToTree)
    .flatMap(foldDependencies(isValidDependency(buildDirectory, directory, document.contents)))

  return { ...document, dependencies }
}

function astToTree(ast: HtmlAst): Tree<HtmlAst> {
  return {
    value: ast,
    forest: (ast.children || []).map(astToTree),
  }
}

function isValidDependency(buildDirectory: string, directory: string, contents: string) {
  return (ast: HtmlAst): readonly Dependency[] => {
    if (ast.type !== 'element' || !(ast.tagName.toLowerCase() in searchMap)) {
      return []
    }

    const attributesToSearch = searchMap[ast.tagName.toLowerCase()]

    return ast.attributes
      .filter(({ key }) => attributesToSearch.includes(key))
      .map(getDependency(buildDirectory, directory, contents, ast))
  }
}

function getDependency(buildDirectory: string, directory: string, contents: string, ast: HtmlAst) {
  const { position } = ast
  const astStart = position.start.index
  const astEnd = position.end.index
  const sourceString = contents.slice(astStart, astEnd)

  return (attr: HtmlAttribute): Dependency => {
    const start = findSourceIndex(sourceString, attr)
    const end = start + attr.value.length
    const relativeSpecifier = ensureRelativeSpecifier(attr.value, buildDirectory, directory)
    const filePath = resolvePackage({ moduleSpecifier: relativeSpecifier, directory, extensions: ['.js'] })

    const dep: Dependency = {
      specifier: attr.value,
      filePath: filePath,
      fileExtension: extname(filePath),
      position: {
        start: start + astStart,
        end: end + astStart,
      },
    }

    return dep
  }
}

function findSourceIndex(source: string, attr: HtmlAttribute) {
  const woQuotesIndex = source.indexOf(formatNoQuotes(attr))

  if (woQuotesIndex > -1) {
    return woQuotesIndex + attr.key.length + 1 // + the equals
  }

  const singleQuotesIndex = source.indexOf(formatSingleQuotes(attr))

  if (singleQuotesIndex > -1) {
    return singleQuotesIndex + attr.key.length + 2 // + the equals and first quote
  }

  const doubleQuotesIndex = source.indexOf(formatDoubleQuotes(attr))

  if (doubleQuotesIndex > -1) {
    return doubleQuotesIndex + attr.key.length + 2
  }

  throw new Error(`Unable to find HTML attribute ${formatDoubleQuotes(attr)} in ${source}`)
}

function formatNoQuotes(attr: HtmlAttribute): string {
  return `${attr.key}=${attr.value}`
}

function formatSingleQuotes(attr: HtmlAttribute): string {
  return `${attr.key}='${attr.value}'`
}

function formatDoubleQuotes(attr: HtmlAttribute): string {
  return `${attr.key}="${attr.value}"`
}

function ensureRelativeSpecifier(specifier: string, buildDirectory: string, directory: string) {
  if (specifier.startsWith('/')) {
    return ensureRelative(relative(directory, resolve(buildDirectory, specifier.slice(1))))
  }

  return specifier
}
