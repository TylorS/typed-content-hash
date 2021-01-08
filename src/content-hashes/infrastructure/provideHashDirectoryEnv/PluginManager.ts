import { isNone, none, Option, some } from 'fp-ts/lib/Option'

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
      for (const ext of plugin.fileExtensions) {
        const path = FilePath.unwrap(file)
        const extension = FileExtension.unwrap(ext)

        if (extension.startsWith('!') && path.endsWith(extension.slice(1))) {
          break
        }

        if (path.endsWith(extension)) {
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
