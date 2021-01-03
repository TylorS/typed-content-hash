import MagicString from 'magic-string'
import { EOL } from 'os'
import { basename } from 'path'

import { ContentHash, FileExtension, FilePath, replaceHash } from '../../domain'

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

export function rewriteSourceMapUrl(ms: MagicString, filePath: FilePath, extension: FileExtension, hash: ContentHash) {
  const contents = ms.original
  const sourceMapUrl = getSourceMapUrl(contents)
  const textRange = getSourceMapTextRange(contents)
  const hashedUrl = basename(FilePath.unwrap(replaceHash(filePath, extension, hash)))
  const hashedSourceMapUrl = `//# sourceMappingURL=${hashedUrl}` + EOL

  if (!sourceMapUrl || !textRange) {
    ms.append(hashedSourceMapUrl)

    return
  }

  ms.overwrite(...textRange, hashedSourceMapUrl)
}
