import { createSchema } from '@typed/fp'
import { flow } from 'fp-ts/lib/function'
import { some } from 'fp-ts/lib/Option'
import { iso, Newtype } from 'newtype-ts'

export interface ModuleSpecifier extends Newtype<{ readonly ModuleSpecifier: unique symbol }, string> {}

export namespace ModuleSpecifier {
  export const { wrap, unwrap, get, reverseGet, to, from, modify } = iso<ModuleSpecifier>()

  export const schema = createSchema<ModuleSpecifier>((t) =>
    t.newtype<ModuleSpecifier>(t.string, flow(wrap, some), 'ModuleSpecifier'),
  )
}
