import MagicString from 'magic-string'
import { EOL } from 'os'
import { basename, extname } from 'path'

const innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/
const regex = RegExp(
  '(?:' +
    '/\\*' +
    '(?:\\s*\r?\n(?://)?)?' +
    '(?:' +
    innerRegex.source +
    ')' +
    '\\s*' +
    '\\*/' +
    '|' +
    '//(?:' +
    innerRegex.source +
    ')' +
    ')' +
    '\\s*',
)

export function rewriteSourceMapUrl(ms: MagicString, hashedPath: string) {
  const contents = ms.original
  const sourceMapUrl = getSourceMapUrl(contents)
  const textRange = getSourceMapTextRange(contents)
  const hashedUrl = basename(hashedPath)
  const ext = extname(hashedUrl)
  const hashedSourceMapUrl = (ext === '.css' ? cssTemplate(hashedUrl) : jsTemplate(hashedUrl)) + EOL

  if (!sourceMapUrl || !textRange) {
    ms.append(hashedSourceMapUrl)

    return
  }

  ms.overwrite(...textRange, hashedSourceMapUrl)
}

function cssTemplate(path: string) {
  return `/*# sourceMappingURL=${path} *`
}

function jsTemplate(path: string) {
  return `//# sourceMappingURL=${path}`
}

function getSourceMapUrl(code: string) {
  const match = code.match(regex)

  return match ? match[1] || match[2] || '' : null
}

function getSourceMapTextRange(code: string) {
  const match = code.match(regex)

  if (!match || !match.length || !match.index) {
    return null
  }

  const start = match.index

  return [start, start + match[0].length] as const
}
