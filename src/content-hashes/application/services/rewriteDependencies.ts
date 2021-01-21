import { Effect, EnvOf } from '@typed/fp'

import { Document } from '../../domain/model'
import { DocumentRegistry, DocumentRegistryEnv } from '../model'
import { op } from './common'
import { LoggerEnv } from './logging'

export const rewriteDependencies = op<
  (documents: ReadonlySet<Document>) => Effect<LoggerEnv & DocumentRegistryEnv, DocumentRegistry>
>()('rewriteDependencies')

export type RewriteDependenciesEnv = EnvOf<typeof rewriteDependencies>
