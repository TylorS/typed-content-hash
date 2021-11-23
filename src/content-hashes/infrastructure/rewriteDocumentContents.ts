import remapping from '@ampproject/remapping'
import { ask } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { identity, pipe } from 'fp-ts/function'
import { isNone, match, none, some } from 'fp-ts/Option'
import MagicString from 'magic-string'
import { posix } from 'path'

import { DocumentRegistryEnv } from '../application/model'
import { Document, DocumentHash } from '../domain/model'
import { getFileExtension } from './plugins/getFileExtension'
import { sha512Hash } from './sha512Hash'

const sourceMapExt = '.map'
const proxyJsExt = '.proxy.js'

const rewriteContentHash = (document: Document) =>
  pipe(
    document.contentHash,
    match(
      () => document,
      (hash) => ({
        ...document,
        contentHash: some(
          hash.type === 'hash' ? ({ type: 'hash', hash: sha512Hash(document.contents) } as DocumentHash) : hash,
        ),
      }),
    ),
  )

const remapSourceMaps = (current: Document, updated: Document): Document => ({
  ...updated,
  contentHash: current.contentHash,
  contents: JSON.stringify(JSON.parse(remapping([updated.contents, current.contents], () => null).toString()), null, 2),
})

export function rewriteDocumentContents(
  document: Document,
  f: (magicString: MagicString) => void,
  sourceMaps: boolean,
  skipHashUpdate: boolean,
) {
  return Do(function* (_) {
    const { documentRegistry } = yield* _(ask<DocumentRegistryEnv>())

    const { filePath, contents, sourceMap, isBase64Encoded } = document
    const filename = posix.basename(filePath)
    const ext = getFileExtension(filename)

    // We don't rewrite source maps or base64 encoded documents
    if (ext.endsWith(sourceMapExt) || isBase64Encoded) {
      return documentRegistry
    }

    const magicString = new MagicString(contents, {
      filename,
      indentExclusionRanges: [],
    })

    f(magicString)

    const updatedContents = magicString.toString()
    const updatedDocument: Document = pipe(
      {
        ...document,
        contents: updatedContents,
      },
      skipHashUpdate ? identity : rewriteContentHash,
    )
    const updatedRegistry = new Map([...documentRegistry, [filePath, updatedDocument]])

    if (!sourceMaps || isNone(sourceMap) || ext.endsWith(proxyJsExt)) {
      return updatedRegistry
    }

    const sourceMapPath = sourceMap.value
    const updatedSourceMapContents = magicString
      .generateMap({ hires: true, file: filename, source: magicString.original, includeContent: true })
      .toString()
    const updatedSourceMap: Document = {
      filePath: sourceMapPath,
      fileExtension: document.fileExtension + sourceMapExt,
      contents: updatedSourceMapContents,
      contentHash: some({ type: 'hashFor', filePath: document.filePath }),
      dependencies: [],
      sourceMap: none,
      isBase64Encoded: false,
    }
    const currentSourceMap = documentRegistry.get(sourceMapPath)

    return new Map([
      ...updatedRegistry,
      [sourceMapPath, currentSourceMap ? remapSourceMaps(currentSourceMap, updatedSourceMap) : updatedSourceMap],
    ])
  })
}
