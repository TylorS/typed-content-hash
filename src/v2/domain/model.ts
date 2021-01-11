import { Option } from 'fp-ts/lib/Option'

export interface Document {
  readonly filePath: string
  readonly fileExtension: string
  readonly contents: string
  readonly contentHash: Option<DocumentHash>
  readonly dependencies: readonly Dependency[]
  readonly sourceMap: Option<string> // Path to sourceMap
  readonly isBase64Encoded: boolean // Dependencies not otherwise supported will be loaded as a Document with contents as Base64
}

export interface Dependency {
  readonly specifier: string
  readonly filePath: string
  readonly position: Position
}

export interface Position {
  readonly start: number
  readonly end: number
}

export interface AssetManifest extends Readonly<Record<string, string>> {}

export type DocumentHash = HashFor | ContentHash

/**
 * Use this hash if a Document should be rewritten with another Document's content hash
 */
export type HashFor = {
  readonly type: 'hashFor'
  readonly filePath: string
}

/**
 * Use this hash if a Document should be rewritten with its own
 */
export type ContentHash = {
  readonly type: 'hash'
  readonly hash: string
}
