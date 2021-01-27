import enhancedResolve from 'enhanced-resolve'
import resolve from 'resolve'

import { getFileExtension } from './getFileExtension'

const moduleDirectory = ['node_modules', '@types']

const enhancedResolveOptions = {
  fileSystem: require('fs'),
  useSyncFileSystemCalls: true,
  enforceExtension: false,
  modules: moduleDirectory,
}

export type ResolvePackageOptions = {
  readonly moduleSpecifier: string
  readonly directory: string
  readonly extensions: readonly string[]
  readonly mainFields: readonly string[]
}

export function resolvePackage(options: ResolvePackageOptions) {
  const { moduleSpecifier, directory, extensions, mainFields } = options

  try {
    return resolve.sync(moduleSpecifier, {
      basedir: directory,
      moduleDirectory,
      extensions,
      packageIterator,
    })
  } catch (err) {
    console.log('falling back to enhanced-resolve', moduleSpecifier)

    const resolver = enhancedResolve.ResolverFactory.createResolver({
      ...enhancedResolveOptions,
      mainFields: mainFields ? Array.from(mainFields) : void 0,
      extensions: Array.from(extensions),
    })

    const pkg = resolver.resolveSync({}, directory, moduleSpecifier)

    if (!pkg) {
      throw err
    }

    return pkg
  }
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
