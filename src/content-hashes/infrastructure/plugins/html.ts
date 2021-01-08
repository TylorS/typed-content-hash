import { doEffect, fromTask, zip } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import postHtml from 'posthtml'

import { ContentHash, Document, FileContents, FilePath } from '../../domain'
import { HashPlugin, HashPluginFactory, HashPluginOptions } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'
import { generatePathMap } from './generatePathMap'

// Issues with its Typescript Types
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rewritePaths = require('posthtml-rewrite-paths').default

const search = {
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
}
export const htmlPlugin: HashPluginFactory<{}> = (options): HashPlugin => {
  const base = createPlugin({ ...options, sourceMaps: false, dts: false, supportsHashes: false }, ['.html'])

  return {
    ...base,
    rewriteDocumentHashes: (documents, hashes) => zip(documents.map(rewriteHtmlHash(options, hashes))),
  }
}

function rewriteHtmlHash(options: HashPluginOptions, hashes: ReadonlyMap<FilePath, ContentHash>) {
  return (document: Document) => {
    return doEffect(function* () {
      const pathMap = generatePathMap(options.directory, options.baseUrl, hashes, document.filePath)
      const rewrite = postHtml([rewritePaths({ search, pathMap })])
      const { html } = yield* fromTask(() => pipe(document.contents, FileContents.unwrap, (a) => rewrite.process(a)))

      return {
        ...document,
        contents: FileContents.wrap(html),
        supportsHashes: false,
      }
    })
  }
}
