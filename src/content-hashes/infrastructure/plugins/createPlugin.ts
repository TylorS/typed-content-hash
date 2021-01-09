import { doEffect, zip } from '@typed/fp'
import { relative } from 'path'

import { debug } from '../../common/logging'
import { Directory, FileExtension, FilePath } from '../../domain'
import { HashPlugin, HashPluginOptions } from '../provideHashDirectoryEnv'
import { documentToContentHashes } from './documentToContentHashes'
import { readDocument } from './readDocument'
import { rewriteDocumentHashes } from './rewriteDocumentHashes'
import { rewriteFileContent } from './rewriteFileContent'

/**
 * Create a HashPlugin with most of the functionality you'll tend to need. If it does not provide all the features you require,
 * it is generally advised to override or extend the base plugin to layer the features atop of them.
 */
export function createPlugin(options: HashPluginOptions, extensions: ReadonlyArray<string>): HashPlugin {
  const { directory, hashLength, baseUrl, sourceMaps = false, dts = false, supportsHashes } = options
  const fileExtensions = extensions.map(FileExtension.wrap)

  const plugin: HashPlugin = {
    directory,
    hashLength,
    fileExtensions,

    // TO BE OVERIDDEN AS NEEDED

    generateContentHashes: (document) => documentToContentHashes(document, hashLength),

    // Extend readDocument to add support for reading dependencies. Dependencies will be automatically rewritten
    // for you by rewriteFileContent and sourceMaps will reflect those changes.
    readDocument: readDocument(directory, fileExtensions, sourceMaps, dts, supportsHashes),

    // Extend to provide any additional rewrites BEFORE hashing the current Document.
    // Will already handle rewriting all of your dependencies that should have Hashes.
    rewriteFileContent: (
      document,
      hashes, //
    ) =>
      doEffect(function* () {
        yield* debug(
          `Rewriting file content: ${relative(Directory.unwrap(directory), FilePath.unwrap(document.filePath))}...`,
        )

        return rewriteFileContent(directory, baseUrl, document, hashes)
      }),

    // Extend to provide any additional rewrites AFTER hashing been entirely completed.
    // Will already rewrite your source map URLS when source map support is enabled.
    rewriteDocumentHashes: (documents, hashes) =>
      zip(documents.map((doc) => rewriteDocumentHashes(directory, doc, hashes, sourceMaps))),
  }

  return plugin
}
