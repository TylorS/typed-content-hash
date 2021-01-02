import { createSchema } from '@typed/fp'
import { flow } from 'fp-ts/function'
import { some } from 'fp-ts/Option'
import { iso, Newtype } from 'newtype-ts'

export interface ContentHash extends Newtype<{ readonly ContentHash: unique symbol }, string> {}

export namespace ContentHash {
  export const { wrap, unwrap, get, reverseGet, to, from, modify } = iso<ContentHash>()

  export const schema = createSchema<ContentHash>((t) =>
    t.newtype<ContentHash>(t.string, flow(wrap, some), 'ContentHash'),
  )
}
