import { Directory } from '../../domain'
import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'

// TODO: overwrite rewriteDocumentHashes to update all hashes
export const htmlPlugin: HashPluginFactory<{}> = (directory: Directory): HashPlugin => {
  const base = createPlugin(directory, ['.html'])

  return {
    ...base,
  }
}
