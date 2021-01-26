import {
  createCssPlugin,
  createHtmlPlugin,
  createJavascriptPlugin,
  CssPluginOptions,
  HashPlugin,
  HtmlPuginOptions,
  JavascriptPluginOptions,
} from './infrastructure'

export function createDefaultPlugins(
  options: JavascriptPluginOptions & CssPluginOptions & HtmlPuginOptions,
): readonly HashPlugin[] {
  return [createJavascriptPlugin(options), createCssPlugin(options), createHtmlPlugin(options)]
}
