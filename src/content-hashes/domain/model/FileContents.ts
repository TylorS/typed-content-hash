import { createSchema } from '@typed/fp'
import { flow } from 'fp-ts/function'
import { some } from 'fp-ts/Option'
import { iso, Newtype } from 'newtype-ts'

export interface FileContents extends Newtype<{ readonly FileContents: unique symbol }, string> {}

export namespace FileContents {
  export const { wrap, unwrap, get, reverseGet, to, from, modify } = iso<FileContents>()

  export const schema = createSchema<FileContents>((t) =>
    t.newtype<FileContents>(t.string, flow(wrap, some), 'FileContents'),
  )
}
