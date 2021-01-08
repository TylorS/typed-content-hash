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

const HTTP_EQUIV = 'http-equiv'
const REFRESH = 'refresh'
const isHttpEquiv = ({ attrs }: { attrs: Record<string, string> }) =>
  HTTP_EQUIV in attrs && attrs[HTTP_EQUIV].toLowerCase() === REFRESH

const search = {
  '*': { itemtype: true },
  a: { href: true, ping: true },
  applet: { archive: true, code: true, codebase: true, object: true, src: true },
  area: { href: true, ping: true },
  audio: { src: true },
  base: { href: true },
  blockquote: { cite: true },
  body: { background: true },
  button: { formaction: true },
  del: { cite: true },
  embed: { src: true },
  form: { action: true },
  frame: { longdesc: true, src: true },
  head: { profile: true },
  html: { manifest: true },
  iframe: { longdesc: true, src: true },
  img: { longdesc: true, src: true, srcset: true },
  input: { formaction: true, src: true },
  ins: { cite: true },
  link: { href: true },
  menuitem: { icon: true },
  meta: { content: isHttpEquiv },
  object: { codebase: true, data: true },
  q: { cite: true },
  script: { src: true },
  source: { src: true, srcset: true },
  table: { background: true },
  tbody: { background: true },
  td: { background: true },
  tfoot: { background: true },
  th: { background: true },
  thead: { background: true },
  tr: { background: true },
  track: { src: true },
  video: { poster: true, src: true },
}

// TODO: overwrite rewriteDocumentHashes to update all hashes
export const htmlPlugin: HashPluginFactory<{}> = (options): HashPlugin => {
  const base = createPlugin(options, ['.html'])

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
      const { html } = yield* fromTask(() => pipe(document.contents, FileContents.unwrap, rewrite.process))

      return {
        ...document,
        contents: FileContents.wrap(html),
      }
    })
  }
}
