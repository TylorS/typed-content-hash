import {
  createCssPlugin,
  createHtmlPlugin,
  createJavascriptPlugin,
  HashPlugin,
  HtmlPuginOptions,
  JavascriptPluginOptions,
} from './infrastructure'

export function createDefaultPlugins(options: JavascriptPluginOptions & HtmlPuginOptions): readonly HashPlugin[] {
  return [createJavascriptPlugin(options), createCssPlugin(), createHtmlPlugin(options)]
}
