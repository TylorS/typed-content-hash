import { FilePath } from '../model'

const jsRegex = /\.js$/

export const getSourceMapPathFor = (path: FilePath) => FilePath.wrap(FilePath.unwrap(path) + '.map')
export const getDtsPathFor = (path: FilePath) => FilePath.wrap(FilePath.unwrap(path).replace(jsRegex, '.d.ts'))
export const getProxyMapFor = (path: FilePath) => FilePath.wrap(FilePath.unwrap(path) + '.proxy.js')
