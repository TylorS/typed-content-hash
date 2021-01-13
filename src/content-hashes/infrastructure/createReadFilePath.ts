import { doEffect } from '@typed/fp'
import { isSome, none } from 'fp-ts/lib/Option'

import { debug } from '../application/services/logging'
import { HashPlugin } from './HashPlugin'

export function createReadFilePath(plugins: readonly HashPlugin[]) {
  return function readFilePath(filePath: string) {
    const eff = doEffect(function* () {
      yield* debug(`Reading ${filePath}...`)

      for (const plugin of plugins) {
        const document = yield* plugin.readFilePath(filePath)

        if (isSome(document)) {
          return document
        }
      }

      return none
    })

    return eff
  }
}
