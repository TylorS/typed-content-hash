import { Pure } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/lib/Option'

import { resolvePackage, ResolvePackageOptions } from './resolvePackage'
import { TsConfigPathsResolver } from './resolveTsConfigPaths'

export type ResolvePathFromSourceFileOptions = ResolvePackageOptions & {
  readonly pathsResolver: TsConfigPathsResolver
}

export function resolvePathFromSourceFile(options: ResolvePathFromSourceFileOptions): Pure<string> {
  const { moduleSpecifier, pathsResolver } = options
  const match = pipe(moduleSpecifier, O.fromPredicate(pathsResolver.isInPaths), O.chain(pathsResolver.resolvePath))

  if (O.isSome(match)) {
    return Pure.of(match.value)
  }

  return resolvePackage(options)
}
