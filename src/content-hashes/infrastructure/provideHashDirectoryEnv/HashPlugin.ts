import { Resume } from '@typed/fp'

import {
  Directory,
  Document,
  FileExtension,
  FilePath,
  GenerateContentHashes,
  RewriteDocumentHashes,
  RewriteFileContent,
} from '../../domain'

export type HashPluginFactory<E> = (directory: Directory, baseUrl: string | undefined, env: E) => HashPlugin

export interface HashPlugin extends RewriteFileContent, GenerateContentHashes, RewriteDocumentHashes {
  // Directory HashPlugin is configured to work within
  readonly directory: Directory
  // Supported File Extensions
  readonly extensions: ReadonlyArray<FileExtension>
  // How to read documents of supported extensions
  readonly readDocument: (path: FilePath) => Resume<Document>
}
