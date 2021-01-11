import b64Url from 'base64url'
import { createHash } from 'crypto'

export const sha512Hash = (contents: string) =>
  b64Url.fromBase64(createHash('sha512').update(contents).digest('base64'))
