import { Effect, EnvOf } from '@typed/fp'

import { Document } from '../../domain/model'
import { DocumentRegistryEnv } from '../model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const readDependencies = op<
  (document: Document) => Effect<LoggerEnv & DocumentRegistryEnv, readonly Document[]>
>()('readDependencies')

export type ReadDependenciesEnv = EnvOf<typeof readDependencies>
