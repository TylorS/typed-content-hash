import { createRuntimeSchema } from '@typed/fp'
import { flow, pipe } from 'fp-ts/lib/function'
import { some } from 'fp-ts/lib/Option'
import { iso, Newtype } from 'newtype-ts'

export interface FileExtension extends Newtype<{ readonly FileExtension: unique symbol }, string> {}

export namespace FileExtension {
  export const { wrap, unwrap, get, reverseGet, to, from, modify } = iso<FileExtension>()

  export const schema = createRuntimeSchema<FileExtension>((t) =>
    t.newtype<FileExtension>(
      pipe(
        t.string,
        t.refine((s): s is string => s.startsWith('.'), 'FileExtension'),
      ),
      flow(wrap, some),
      'FileExtension',
    ),
  )
}
