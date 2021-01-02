import { AssetManifest, ContentHash, DocumentDiff, FilePath } from '../../domain'

export interface HashedDirectory extends DocumentDiff {
  readonly assetManifest: AssetManifest
  readonly hashes: ReadonlyMap<FilePath, ContentHash>
}
