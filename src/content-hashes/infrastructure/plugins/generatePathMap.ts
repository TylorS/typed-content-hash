import { pipe } from 'fp-ts/function'
import { dirname, extname, relative, resolve } from 'path'

import { applyOrigin } from '../../common/applyOrigin'
import { ContentHash, Directory, FileExtension, FilePath, replaceHash } from '../../domain'

export function generatePathMap(
  buildDirectory: Directory,
  baseUrl: string | undefined,
  hashes: ReadonlyMap<FilePath, ContentHash>,
  filePath: FilePath,
): Record<string, string> {
  return Object.fromEntries(Array.from(hashes).flatMap(applyRemounts(buildDirectory, baseUrl, filePath)))
}

function applyRemounts(buildDirectory: Directory, baseUrl: string | undefined, path: FilePath) {
  return ([from, hash]: [FilePath, ContentHash]): ReadonlyArray<readonly [string, string]> => {
    const ext = pipe(from, FilePath.unwrap, extname, FileExtension.wrap)
    const to = applyOrigin(buildDirectory, replaceHash(from, ext, hash), baseUrl)
    const absolutePath = relative(Directory.unwrap(buildDirectory), FilePath.unwrap(from))
    const relativePath = relative(
      pipe(path, FilePath.unwrap, dirname),
      resolve(Directory.unwrap(buildDirectory), FilePath.unwrap(from)),
    )
    const baseUrls = [
      [ensureAbsolute(absolutePath), to],
      [ensureRelative(relativePath), to],
    ] as const

    // Relative paths to another directory can not omit relative path
    if (relativePath.startsWith('../')) {
      return baseUrls
    }

    return [...baseUrls, [stripRelative(relativePath), to]]
  }
}

function ensureAbsolute(path: string): string {
  if (path[0] === '/') {
    return path
  }

  return '/' + path
}

function ensureRelative(path: string): string {
  if (path[0] === '.') {
    return path
  }

  return './' + path
}

function stripRelative(path: string): string {
  if (path.startsWith('./')) {
    return path.slice(2)
  }

  if (path.startsWith('../')) {
    return path.slice(3)
  }

  return path
}
