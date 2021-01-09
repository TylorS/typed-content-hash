import { pipe } from 'fp-ts/lib/function'
import { dirname, extname, relative } from 'path'

import { applyOrigin } from '../../common/applyOrigin'
import { ContentHash, Directory, FileExtension, FilePath, replaceHash } from '../../domain'

const multiSeparatedExtensions = ['.js.map.proxy.js', '.d.ts.map', '.js.map', '.d.ts']

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
    const hashed = replaceHash(from, getFileExtension(from), hash)
    const absolutePath = relative(Directory.unwrap(buildDirectory), FilePath.unwrap(hashed))
    const absoluteTo = baseUrl ? applyOrigin(buildDirectory, hashed, baseUrl) : ensureAbsolute(absolutePath)
    const relativePath = relative(pipe(path, FilePath.unwrap, dirname), FilePath.unwrap(hashed))
    const relativeTo = baseUrl ? applyOrigin(buildDirectory, hashed, baseUrl) : ensureRelative(relativePath)

    const baseUrls = [
      [ensureAbsolute(absolutePath), absoluteTo],
      [ensureRelative(relativePath), relativeTo],
    ] as const

    // Relative paths to another directory can not omit relative path
    if (relativePath.startsWith('../')) {
      return baseUrls
    }

    return [...baseUrls, [stripRelative(relativePath), stripRelative(relativeTo)]]
  }
}

function ensureAbsolute(path: string): string {
  if (path[0] === '/') {
    return path
  }

  return '/' + path
}

function ensureRelative(path: string): string {
  if (path[0] === '.' || path[0] === '/') {
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

const getFileExtension = (filePath: FilePath): FileExtension => {
  const path = FilePath.unwrap(filePath)

  for (const extension of multiSeparatedExtensions) {
    if (path.endsWith(extension)) {
      return FileExtension.wrap(extension)
    }
  }

  return FileExtension.wrap(extname(path))
}
