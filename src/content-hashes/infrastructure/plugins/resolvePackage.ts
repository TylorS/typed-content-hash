import resolve from 'resolve'

import { getFileExtension } from './getFileExtension'

const moduleDirectory = ['node_modules', '@types']

export type ResolvePackageOptions = {
  readonly moduleSpecifier: string
  readonly directory: string
  readonly extensions: readonly string[]
}

export function resolvePackage(options: ResolvePackageOptions) {
  const { moduleSpecifier, directory, extensions } = options

  return resolve.sync(moduleSpecifier, {
    basedir: directory,
    moduleDirectory,
    extensions,
    packageIterator,
  })
}

const packageIterator = (request: string, _: string, defaultCanditates: () => string[]): string[] => {
  try {
    const defaults = defaultCanditates()
    const ext = getFileExtension(request)

    if (defaults.includes(ext)) {
      return defaults
    }

    // Attempt to add the current extension to those being looked up
    return [...defaultCanditates(), ext]
  } catch {
    return defaultCanditates()
  }
}
