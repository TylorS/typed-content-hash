import { ContentHash } from '../../domain'

export const trimHash = (length: number | undefined) => (hash: ContentHash) =>
  length === void 0 ? hash : ContentHash.wrap(ContentHash.unwrap(hash).slice(0, length))
