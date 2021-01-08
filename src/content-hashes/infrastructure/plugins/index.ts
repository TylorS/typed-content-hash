import { cssPlugin } from './css'
import { htmlPlugin } from './html'
import { javascriptPlugin } from './javascript'

export * from './createPlugin'
export { cssPlugin, htmlPlugin, javascriptPlugin }

export const defaultPlugins = [cssPlugin, javascriptPlugin, htmlPlugin] as const
