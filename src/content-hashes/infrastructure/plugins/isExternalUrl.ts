export const isExternalUrl = (path: string): boolean => {
  try {
    return !!new URL(path).href
  } catch {
    return false
  }
}
