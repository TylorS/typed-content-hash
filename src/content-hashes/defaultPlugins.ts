import {
  createCssPlugin,
  createHtmlPlugin,
  createJavascriptPlugin,
  HashPlugin,
  JavascriptPluginOptions,
} from './infrastructure'

export function createDefaultPlugins(options: JavascriptPluginOptions = {}): readonly HashPlugin[] {
  return [createJavascriptPlugin(options), createCssPlugin(), createHtmlPlugin()]
}
