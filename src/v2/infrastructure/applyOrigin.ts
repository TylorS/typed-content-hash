import { relative } from 'path'
import { resolve } from 'url'

/**
 * Generates an absolute URL given the build directory you're working from,
 * the file you're trying to make a change within, the origin you'd like to use,
 * and the relative URL you have.
 */
export function applyOrigin(buildDirectory: string, file: string, origin: string): string {
  return resolve(origin, relative(buildDirectory, file))
}
