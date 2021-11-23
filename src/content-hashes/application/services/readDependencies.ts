import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { Document } from '../../domain/model'
import { DocumentRegistryEnv } from '../model'
import { LoggerEnv } from './logging'

export const readDependencies = op<
  (directory: string, document: Document) => Env<LoggerEnv & DocumentRegistryEnv, readonly Document[]>
>()('readDependencies')

export type ReadDependenciesEnv = RequirementsOf<typeof readDependencies>
