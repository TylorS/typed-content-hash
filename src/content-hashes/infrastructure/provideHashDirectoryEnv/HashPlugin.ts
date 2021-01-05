import { Pure } from '@typed/fp'

import {
  Directory,
  Document,
  FileExtension,
  FilePath,
  GenerateContentHashes,
  RewriteDocumentHashes,
  RewriteFileContent,
} from '../../domain'

export type HashPluginOptions = {
  readonly directory: Directory
  readonly baseUrl?: string | undefined
  readonly sourceMaps?: boolean
  readonly dts?: boolean
}

export type HashPluginFactory<E> = (options: HashPluginOptions, env: E) => HashPlugin

export interface HashPlugin
  extends RewriteFileContent,
    Omit<GenerateContentHashes, 'hashLength'>,
    RewriteDocumentHashes {
  // Directory HashPlugin is configured to work within
  readonly directory: Directory
  // Supported File Extensions
  readonly extensions: ReadonlyArray<FileExtension>
  // How to read documents of supported extensions
  readonly readDocument: (path: FilePath) => Pure<Document>
}
