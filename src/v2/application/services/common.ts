import { ArgsOf, asks, chain, Effect, EnvOf, Fn, ReturnOf } from '@typed/fp'
import { identity, pipe } from 'fp-ts/lib/function'

export const op = <F extends Fn<readonly any[], Effect<any, any>>>() => <K extends PropertyKey>(key: K) => (
  ...args: ArgsOf<F>
): Effect<Readonly<Record<K, F>> & EnvOf<F>, ReturnOf<F>> =>
  pipe(
    asks((e: Readonly<Record<K, F>>) => e[key](...args)),
    chain(identity),
  )
