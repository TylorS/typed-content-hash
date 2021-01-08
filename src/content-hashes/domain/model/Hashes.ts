import { ContentHash } from './ContentHash'
import { FilePath } from './FilePath'

export interface Hashes {
  readonly hashes: ReadonlyMap<FilePath, ContentHash>
}
