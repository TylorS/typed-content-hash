import { pipe } from 'fp-ts/lib/function'
import { map } from 'fp-ts/lib/Option'
import MagicString from 'magic-string'
import { dirname, relative } from 'path'

import { applyOrigin } from '../../common/applyOrigin'
import { ContentHash, Directory, Document, FilePath, replaceHash } from '../../domain'
import { rewriteDocumentContents } from './rewriteDocumentContents'

const dtsRegex = new RegExp(`.d.ts$`)

const ensureRelative = (path: string) => (path.startsWith('.') || path.startsWith('/') ? path : './' + path)

const rewriteDependencies = (
  hashes: ReadonlyMap<FilePath, ContentHash>,
  directory: Directory,
  baseUrl: string | undefined,
) => (document: Document, ms: MagicString) => {
  for (const dep of document.dependencies) {
    const depHash = hashes.get(dep.filePath)

    if (depHash) {
      const hashedPath = replaceHash(dep.filePath, dep.fileExtension, depHash)
      const relativePath = ensureRelative(
        relative(dirname(FilePath.unwrap(document.filePath)), FilePath.unwrap(hashedPath)),
      )
      const pathToUse = baseUrl ? applyOrigin(directory, dep.filePath, baseUrl) : relativePath
      const replacementPath = dtsRegex.test(relativePath) ? relativePath.replace(dtsRegex, '') : pathToUse

      ms.overwrite(dep.position[0], dep.position[1], replacementPath)
    }
  }
}

export const rewriteFileContent = (
  directory: Directory,
  baseUrl: string | undefined,
  document: Document,
  hashes: ReadonlyMap<FilePath, ContentHash>,
): Document => {
  const base = rewriteDocumentContents(document, rewriteDependencies(hashes, directory, baseUrl))
  const dts = pipe(
    document.dts,
    map((d) => rewriteDocumentContents(d, rewriteDependencies(hashes, directory, baseUrl))),
  )

  return {
    ...base,
    dts,
  }
}
