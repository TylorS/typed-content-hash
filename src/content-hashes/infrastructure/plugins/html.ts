import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'

// TODO: overwrite rewriteDocumentHashes to update all hashes
// Must rewrite relative . and .. and without "." relative paths
// Must support baseUrl when configured
export const htmlPlugin: HashPluginFactory<{}> = (options): HashPlugin => {
  const base = createPlugin(options, ['.html'])

  return {
    ...base,
  }
}
