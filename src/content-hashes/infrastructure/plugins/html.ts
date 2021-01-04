import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'

// TODO: overwrite rewriteDocumentHashes to update all hashes
export const htmlPlugin: HashPluginFactory<{}> = (options): HashPlugin => {
  const base = createPlugin(options, ['.html'])

  return {
    ...base,
  }
}
