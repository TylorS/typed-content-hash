export const ensureRelative = (path: string) => (path.startsWith('.') || path.startsWith('/') ? path : './' + path)
