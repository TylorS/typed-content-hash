import { constant, constFalse, pipe } from 'fp-ts/function'
import { fromNullable, none, Option } from 'fp-ts/Option'
import { createMatchPath } from 'tsconfig-paths'
import { CompilerOptions } from 'typescript'

const mainFields = ['module', 'jsnext:main', 'browser', 'main']
const PATH_STAR_REGEX = /\/?\*$/
const extensions = ['.js', '.jsx', '.ts', '.d.ts', '.d.ts.map', '.json']

export type TsConfigPathsResolver = {
  readonly resolvePath: (moduleSpecifier: string) => Option<string>
  readonly isInPaths: (moduleSpecifier: string) => boolean
}

export function createResolveTsConfigPaths({
  compilerOptions,
}: CreateResolveTsConfigPathsOptions): TsConfigPathsResolver {
  const { baseUrl, paths = {} } = compilerOptions
  const pathsKeys = Object.keys(paths)
  const pathsKeysWithoutStars = pathsKeys.map((key) => key.replace(PATH_STAR_REGEX, ''))
  const canMatchPath = baseUrl && pathsKeys.length > 0
  const matchPath = canMatchPath ? createMatchPath(baseUrl!, paths, Array.from(mainFields)) : null

  const resolvePath: (moduleSpecifier: string) => Option<string> = matchPath
    ? (specifier: string) => pipe(matchPath(specifier, undefined, undefined, extensions), fromNullable)
    : constant(none)

  const isInPaths = canMatchPath
    ? (moduleSpecifier: string): boolean => pathsKeysWithoutStars.some((x) => moduleSpecifier.startsWith(x))
    : constFalse

  return {
    resolvePath,
    isInPaths,
  }
}

export type CreateResolveTsConfigPathsOptions = {
  readonly compilerOptions: CompilerOptions
}
