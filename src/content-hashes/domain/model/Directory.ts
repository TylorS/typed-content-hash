import { createRuntimeSchema } from '@typed/fp'
import { flow, pipe } from 'fp-ts/function'
import { some } from 'fp-ts/Option'
import { existsSync, statSync } from 'fs'
import { iso, Newtype } from 'newtype-ts'

export interface Directory extends Newtype<{ readonly Directory: unique symbol }, string> {}

export namespace Directory {
  export const { wrap, unwrap, get, reverseGet, to, from, modify } = iso<Directory>()

  export const schema = createRuntimeSchema<Directory>((t) =>
    t.newtype<Directory>(
      pipe(
        t.string,
        t.refine((s): s is string => existsSync(s) && statSync(s).isDirectory(), 'Directory'),
      ),
      flow(wrap, some),
      'Directory',
    ),
  )
}
