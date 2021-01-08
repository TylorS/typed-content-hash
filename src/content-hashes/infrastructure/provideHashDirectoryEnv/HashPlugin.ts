import { Pure } from '@typed/fp'

import {
  Directory,
  Document,
  FileExtension,
  FilePath,
  GenerateContentHashes,
  Hashes,
  RewriteDocumentHashes,
  RewriteFileContent,
} from '../../domain'

export type HashPluginOptions = {
  readonly directory: Directory
  readonly hashLength: number
  readonly baseUrl?: string | undefined
  readonly sourceMaps?: boolean
  readonly dts?: boolean
}

export type HashPluginFactory<E> = (options: HashPluginOptions, env: E) => HashPlugin

export interface HashPlugin extends RewriteFileContent, GenerateContentHashes, RewriteDocumentHashes {
  // Directory HashPlugin is configured to work within
  readonly directory: Directory
  // Configured HashLength max
  readonly hashLength: number
  // Supported File Extensions
  readonly fileExtensions: ReadonlyArray<FileExtension>
  // How to read documents of supported extensions
  readonly readDocument: (path: FilePath) => Pure<readonly [Document, Hashes['hashes']]>
}
