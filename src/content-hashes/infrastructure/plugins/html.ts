import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'

// TODO: overwrite rewriteDocumentHashes to update all hashes
export const htmlPlugin: HashPluginFactory<{}> = (directory, baseUrl): HashPlugin => {
  const base = createPlugin(directory, baseUrl, ['.html'])

  return {
    ...base,
  }
}
