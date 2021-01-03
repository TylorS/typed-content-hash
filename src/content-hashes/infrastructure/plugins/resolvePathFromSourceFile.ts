import { async, Resume, sync } from '@typed/fp'
import { lazy } from '@typed/fp/Disposable/exports'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import resolve from 'resolve'

import { FilePath } from '../../domain'
import { TsConfigPathsResolver } from './resolveTsConfigPaths'

export type ResolvePathFromSourceFileOptions = {
  readonly moduleSpecifier: string
  readonly directory: string
  readonly pathsResolver: TsConfigPathsResolver
  readonly extensions: readonly string[]
}

const moduleDirectory = ['node_modules', '@types']

export function resolvePathFromSourceFile({
  moduleSpecifier,
  directory,
  pathsResolver,
  extensions,
}: ResolvePathFromSourceFileOptions): Resume<FilePath> {
  const match = pipe(moduleSpecifier, O.fromPredicate(pathsResolver.isInPaths), O.chain(pathsResolver.resolvePath))

  if (O.isSome(match)) {
    return sync(match.value)
  }

  return async((resume) => {
    const disposable = lazy()

    resolve(
      moduleSpecifier,
      {
        basedir: directory,
        moduleDirectory,
        extensions,
      },
      (err, resolved) => {
        if (!resolved || err) {
          throw err
        }

        disposable.addDisposable(resume(FilePath.wrap(resolved)))
      },
    )

    return disposable
  })
}
