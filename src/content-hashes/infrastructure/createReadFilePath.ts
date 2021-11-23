import { Do } from '@typed/fp/FxEnv'
import { isSome, none } from 'fp-ts/Option'

import { debug } from '../application/services/logging'
import { HashPlugin } from './HashPlugin'

export function createReadFilePath(plugins: readonly HashPlugin[]) {
  return function readFilePath(filePath: string) {
    const eff = Do(function* (_) {
      yield* _(debug(`Reading ${filePath}...`))

      for (const plugin of plugins) {
        const document = yield* _(plugin.readFilePath(filePath))

        if (isSome(document)) {
          return document
        }
      }

      return none
    })

    return eff
  }
}
