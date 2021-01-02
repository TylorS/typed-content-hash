import { cssPlugin } from './css'
import { htmlPlugin } from './html'
import { javascriptPlugin } from './javascript'

export const defaultPlugins = [cssPlugin, htmlPlugin, javascriptPlugin] as const
