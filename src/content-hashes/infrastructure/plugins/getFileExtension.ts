import { extname } from 'path'

export const getFileExtension = (filePath: string): string => {
  if (filePath.endsWith('.proxy.js')) {
    return `${getFileExtension(filePath.slice(0, -9))}.proxy.js`
  }

  if (filePath.endsWith('.map')) {
    return `${getFileExtension(filePath.slice(0, -4))}.map`
  }

  if (filePath.endsWith('.d.ts')) {
    return '.d.ts'
  }

  return extname(filePath)
}
