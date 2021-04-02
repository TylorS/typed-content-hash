import { doEffect } from '@typed/fp'
import { isSome, none, some } from 'fp-ts/lib/Option'
import { getMonoid } from 'fp-ts/lib/ReadonlyArray'
import { foldMap, Tree } from 'fp-ts/lib/Tree'
import { dirname, extname, relative, resolve } from 'path'
import { red, yellow } from 'typed-colors'

import { debug } from '../../application/services/logging'
import { Dependency, Document, Position } from '../../domain/model'
import { ensureRelative } from '../ensureRelative'
import { fsReadFile } from '../fsReadFile'
import { HashPlugin } from '../HashPlugin'
import { MAIN_FIELDS } from './defaults'
import { getFileExtension } from './getFileExtension'
import { isExternalUrl } from './isExternalUrl'
import { parseSrcSets } from './parseSrcSets'
import { resolvePackage } from './resolvePackage'

export type HtmlAst = {
  readonly type: string
  readonly tagName: string
  readonly attributes: readonly HtmlAttribute[]
  readonly children?: readonly HtmlAst[]
  readonly content?: string
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
  readonly mainFields?: readonly string[]
}

export function createHtmlPlugin({ buildDirectory, mainFields = MAIN_FIELDS }: HtmlPuginOptions): HashPlugin {
  const html: HashPlugin = {
    readFilePath: (filePath) =>
      doEffect(function* () {
        const ext = getFileExtension(filePath)

        if (!supportedFileExtension.includes(ext)) {
          yield* debug(`${red(`[HTML]`)} Unsupported file extension ${filePath}`)

          return none
        }

        yield* debug(`${yellow(`[HTML]`)} Reading ${filePath}...`)
        const initial = yield* fsReadFile(filePath, { supportsSourceMaps: false, isBase64Encoded: false })
        yield* debug(`${yellow(`[HTML]`)} Finding Dependencies ${filePath}...`)

        const document: Document = findDependencies(initial, buildDirectory, mainFields)

        return some({ ...document, contentHash: none, sourceMap: none })
      }),
  }

  return html
}

function findDependencies(document: Document, buildDirectory: string, mainFields: readonly string[]) {
  const directory = dirname(document.filePath)
  const ast = parse(document.contents, { ...parseDefaults, includePositions: true })
  const dependencies = ast
    .map(astToTree)
    .flatMap(foldDependencies(isValidDependency(buildDirectory, directory, mainFields, document.contents)))

  return { ...document, dependencies }
}

function astToTree(ast: HtmlAst): Tree<HtmlAst> {
  return {
    value: ast,
    forest: (ast.children || []).map(astToTree),
  }
}

function isValidDependency(buildDirectory: string, directory: string, mainFields: readonly string[], contents: string) {
  return (ast: HtmlAst): readonly Dependency[] => {
    if (ast.type !== 'element') {
      return []
    }

    const tagName = ast.tagName.toLowerCase()

    if (tagName === 'template' && !!ast.children?.[0].content) {
      const child = ast.children[0]
      const start = child.position.start.index
      const content = child.content!
      const childAst = parse(content, { ...parseDefaults, includePositions: true })

      return childAst
        .map(astToTree)
        .flatMap(foldDependencies(isValidDependency(buildDirectory, directory, mainFields, content)))
        .map((d) => ({ ...d, position: { start: d.position.start + start, end: d.position.end + start } }))
    }

    if (!(tagName in searchMap)) {
      return []
    }

    const attributesToSearch = searchMap[tagName]

    return ast.attributes
      .filter(({ key }) => attributesToSearch.includes(key))
      .flatMap(getDependencies(buildDirectory, directory, mainFields, contents, ast))
  }
}

function getDependencies(
  buildDirectory: string,
  directory: string,
  mainFields: readonly string[],
  contents: string,
  ast: HtmlAst,
) {
  const { position } = ast
  const astStart = position.start.index
  const astEnd = position.end.index
  const sourceString = contents.slice(astStart, astEnd)
  const tagName = ast.tagName.toLowerCase()

  return (attr: HtmlAttribute): ReadonlyArray<Dependency> => {
    const attrStart = astStart + findSourceIndex(sourceString, attr)
    const attrEnd = attrStart + attr.value.length
    const isImgSrcSet = tagName === 'img' && attr.key === 'srcset'
    const resolved = isImgSrcSet
      ? parseSrcSets(attr.value, attrStart).map((s) =>
          resolveSpecifier(buildDirectory, directory, s.url, mainFields, s.position),
        )
      : [
          resolveSpecifier(buildDirectory, directory, attr.value, mainFields, {
            start: attrStart,
            end: attrEnd,
          }),
        ]

    return resolved.filter(isSome).map((o) => o.value)
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

function resolveSpecifier(
  buildDirectory: string,
  directory: string,
  specifier: string,
  mainFields: readonly string[],
  position: Position,
) {
  const relativeSpecifier = ensureRelativeSpecifier(specifier, buildDirectory, directory)
  const hasFileExtension = isFileExtension(extname(relativeSpecifier))

  if (isExternalUrl(relativeSpecifier)) {
    return none
  }

  try {
    const filePath = resolvePackage({
      moduleSpecifier: relativeSpecifier,
      directory,
      extensions: ['.js'],
      mainFields,
    })

    const dep: Dependency = {
      specifier,
      filePath,
      fileExtension: getFileExtension(filePath),
      position,
    }

    return some(dep)
  } catch (error) {
    // If we're really sure it is supposed to be a file, throw the error
    if (hasFileExtension) {
      throw error
    }

    return none
  }
}

function isFileExtension(ext: string): boolean {
  if (!ext.trim()) {
    return false
  }

  const n = Number.parseFloat(ext)

  if (!Number.isNaN(n)) {
    return false
  }

  return !ext.includes(' ')
}
