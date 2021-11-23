import { Env, fromIO, of } from '@typed/fp/Env'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

import { isExternalUrl } from './isExternalUrl'
import { resolvePackage, ResolvePackageOptions } from './resolvePackage'
import { TsConfigPathsResolver } from './resolveTsConfigPaths'

export type ResolvePathFromSourceFileOptions = ResolvePackageOptions & {
  readonly pathsResolver: TsConfigPathsResolver
}

export function resolvePathFromSourceFile(options: ResolvePathFromSourceFileOptions): Env<unknown, O.Option<string>> {
  const { moduleSpecifier, pathsResolver } = options
  const match = pipe(moduleSpecifier, O.fromPredicate(pathsResolver.isInPaths), O.chain(pathsResolver.resolvePath))

  if (O.isSome(match)) {
    return of(O.some(match.value))
  }

  if (isExternalUrl(moduleSpecifier)) {
    return of(O.none)
  }

  return fromIO(() => O.some(resolvePackage(options)))
}
