import * as number from '@typed/fp/number'
import * as string from '@typed/fp/string'
import { struct } from 'fp-ts/Eq'

import { Dependency, Position } from '../domain/model'

export const dependencyEq = struct<Dependency>({
  specifier: string.Eq,
  filePath: string.Eq,
  fileExtension: string.Eq,
  position: struct<Position>({
    start: number.Eq,
    end: number.Eq,
  }),
})
