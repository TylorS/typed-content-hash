import { eqNumber, eqString, getStructEq } from 'fp-ts/lib/Eq'

import { Dependency, Position } from '../domain/model'

export const dependencyEq = getStructEq<Dependency>({
  specifier: eqString,
  filePath: eqString,
  fileExtension: eqString,
  position: getStructEq<Position>({
    start: eqNumber,
    end: eqNumber,
  }),
})
