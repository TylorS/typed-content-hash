import { Pure } from '@typed/fp'

import { FileExtension } from '../../domain'
import { HashPlugin, HashPluginOptions } from '../provideHashDirectoryEnv'
import { documentToContentHashes } from './documentToContentHashes'
import { readDocument } from './readDocument'
import { rewriteDocumentHashes } from './rewriteDocumentHashes'
import { rewriteFileContent } from './rewriteFileContent'

export function createPlugin(
  { directory, hashLength, baseUrl, sourceMaps = false, dts = false }: HashPluginOptions,
  extensions: ReadonlyArray<string>,
): HashPlugin {
  const fileExtensions = extensions.map(FileExtension.wrap)

  const plugin: HashPlugin = {
    directory,
    hashLength,
    fileExtensions,
    generateContentHashes: (document) => Pure.fromIO(() => documentToContentHashes(document, hashLength)),

    // TO BE OVERIDDEN AS NEEDED

    // Extend readDocument to add support for reading dependencies. Dependencies will be automatically rewritten
    // for you by rewriteFileContent and sourceMaps will reflect those changes.
    readDocument: readDocument(fileExtensions, sourceMaps, dts),

    // Extend to provide any additional rewrites BEFORE hashing the current Document.
    // Will already handle rewriting all of your dependencies that should have Hashes.
    rewriteFileContent: (
      document,
      hashes, //
    ) => Pure.fromIO(() => rewriteFileContent(directory, baseUrl, document, hashes)),

    // Extend to provide any additional rewrites AFTER hashing been entirely completed.
    // Will already rewrite your source map URLS when source map support is enabled.
    rewriteDocumentHashes: (documents, hashes) =>
      Pure.fromIO(() => documents.map((doc) => rewriteDocumentHashes(doc, hashes, sourceMaps))), // HTML
  }

  return plugin
}
