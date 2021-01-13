import { Document } from '../domain/model'

/**
 * A map of file-paths to the corresponding Document
 */
export interface DocumentRegistry extends ReadonlyMap<string, Document> {}

export interface DocumentRegistryEnv {
  readonly documentRegistry: DocumentRegistry
}
