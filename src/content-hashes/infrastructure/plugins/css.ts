import { HashPlugin, HashPluginFactory } from '../provideHashDirectoryEnv'
import { createPlugin } from './createPlugin'

// TODO: overwrite readDocument to include dependencies
// TODO: overwrite rewriteFileContent to update js/dts content with appropriate hashes, change filePath
export const cssPlugin: HashPluginFactory<{}> = (options): HashPlugin => {
  const base = createPlugin(options, ['.css.map', '.css'])

  return {
    ...base,
  }
}
