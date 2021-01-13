export function replaceHash(filePath: string, extension: string, hash: string) {
  return filePath.replace(new RegExp(`${extension}$`), `.${hash}${extension}`)
}
