import { identity, pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import { dirname } from 'path'

import { FilePath } from '../../domain'
import { TsConfigPathsResolver } from './resolveTsConfigPaths'

export type ResolvePathFromSourceFileOptions = {
  readonly moduleSpecifier: string
  readonly filePath: string
  readonly pathsResolver: TsConfigPathsResolver
}

export function resolvePathFromSourceFile({
  moduleSpecifier,
  filePath,
  pathsResolver,
}: ResolvePathFromSourceFileOptions): FilePath {
  return pipe(
    moduleSpecifier,
    O.fromPredicate(pathsResolver.isInPaths),
    O.chain(pathsResolver.resolvePath),
    O.fold(() => FilePath.wrap(require.resolve(filePath, { paths: [dirname(filePath)] })), identity),
  )
}

export function preferEsModule(pkg: any): any {
  pkg.main = pkg.module || pkg['jsnext:main'] || pkg.main

  return pkg
}
