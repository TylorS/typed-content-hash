import { relative } from 'path'
import { resolve } from 'url'

import { Directory, FilePath } from '../domain'

/**
 * Generates an absolute URL given the build directory you're working from,
 * the file you're trying to make a change within, the origin you'd like to use,
 * and the relative URL you have.
 */
export function applyOrigin(buildDirectory: Directory, file: FilePath, origin: string): string {
  const relativePath = relative(Directory.unwrap(buildDirectory), FilePath.unwrap(file))

  return resolve(origin, relativePath)
}
