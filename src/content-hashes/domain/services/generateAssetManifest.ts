import { fromEnv, Resume } from '@typed/fp'

import { ContentHash, Document, FilePath } from '../model'
import { AssetManifest } from '../model/AssetManifest'

export interface GenerateAssetManifest {
  readonly generateAssetManifest: (
    documents: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ) => Resume<AssetManifest>
}

/**
 * Generate asset manifest for all of the documents including the hashes that have been computed for them
 */
export const generateAssetManifest = (documents: readonly Document[], hashes: ReadonlyMap<FilePath, ContentHash>) =>
  fromEnv((e: GenerateAssetManifest) => e.generateAssetManifest(documents, hashes))
