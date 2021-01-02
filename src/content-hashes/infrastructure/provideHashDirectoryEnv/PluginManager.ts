import { isNone, none, Option, some } from 'fp-ts/Option'

import { FileExtension, FilePath } from '../../domain'
import { HashPlugin } from './HashPlugin'

export class HashPluginManager {
  private pluginForPath = new Map<FilePath, HashPlugin>() // Cache plugin lookup

  constructor(public readonly plugins: readonly HashPlugin[]) {}

  public readonly getPlugin = (file: FilePath): Option<HashPlugin> => {
    if (this.pluginForPath.has(file)) {
      return some(this.pluginForPath.get(file)!)
    }

    // Attempt to match a plugin in the provided order
    for (const plugin of this.plugins) {
      for (const ext of plugin.extensions) {
        if (FilePath.unwrap(file).endsWith(FileExtension.unwrap(ext))) {
          this.pluginForPath.set(file, plugin)

          return some(plugin)
        }
      }
    }

    return none
  }

  public readonly getPluginOrThrow = (file: FilePath) => {
    const plugin = this.getPlugin(file)

    if (isNone(plugin)) {
      throw new Error(`Unable to find plugin for ${file}`)
    }

    return plugin.value
  }
}
