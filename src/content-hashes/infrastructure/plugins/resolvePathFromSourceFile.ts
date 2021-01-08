import { fromTask, Pure } from '@typed/fp'
import { pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/lib/Option'
import { extname } from 'path'
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
}: ResolvePathFromSourceFileOptions): Pure<FilePath> {
  const match = pipe(moduleSpecifier, O.fromPredicate(pathsResolver.isInPaths), O.chain(pathsResolver.resolvePath))

  if (O.isSome(match)) {
    return Pure.of(match.value)
  }

  return fromTask(
    () =>
      new Promise<FilePath>((res) =>
        resolve(
          moduleSpecifier,
          {
            basedir: directory,
            moduleDirectory,
            extensions,
            packageIterator: (request, _, defaultCanditates) => {
              try {
                // Attempt to add the current extension to those being looked up
                return [extname(request), ...defaultCanditates()]
              } catch {
                return defaultCanditates()
              }
            },
          },
          (err, resolved) => {
            if (!resolved || err) {
              throw err
            }

            res(FilePath.wrap(resolved))
          },
        ),
      ),
  )
}
