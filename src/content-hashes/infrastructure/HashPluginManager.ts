import { ReadFilePathEnv } from '../application/services/readFilePath'

export interface HashPluginManager {
  readonly readFilePath: ReadFilePathEnv['readFilePath']
}
