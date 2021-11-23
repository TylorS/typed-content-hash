import { Env, op, RequirementsOf } from '@typed/fp/Env'

import { Document } from '../../domain/model'
import { DocumentRegistry, DocumentRegistryEnv } from '../model'
import { LoggerEnv } from './logging'

export const rewriteDependencies = op<
  (documents: ReadonlyArray<Document>) => Env<LoggerEnv & DocumentRegistryEnv, DocumentRegistry>
>()('rewriteDependencies')

export type RewriteDependenciesEnv = RequirementsOf<typeof rewriteDependencies>
