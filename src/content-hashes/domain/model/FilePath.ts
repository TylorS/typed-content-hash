import { createRuntimeSchema } from '@typed/fp'
import { flow, pipe } from 'fp-ts/lib/function'
import { some } from 'fp-ts/lib/Option'
import { existsSync, statSync } from 'fs'
import { iso, Newtype } from 'newtype-ts'

/**
 * An absolute path to a file
 */
export interface FilePath extends Newtype<{ readonly FilePath: unique symbol }, string> {}

export namespace FilePath {
  export const { wrap, unwrap, get, reverseGet, to, from, modify } = iso<FilePath>()

  export const schema = createRuntimeSchema<FilePath>((t) =>
    t.newtype<FilePath>(
      pipe(
        t.string,
        t.refine((s): s is string => existsSync(s) && statSync(s).isFile(), 'FilePath'),
      ),
      flow(wrap, some),
      'FilePath',
    ),
  )
}
