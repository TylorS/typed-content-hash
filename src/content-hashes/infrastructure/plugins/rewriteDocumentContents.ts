import remapping from '@ampproject/remapping'
import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { pipe } from 'fp-ts/function'
import { fold, none, some } from 'fp-ts/Option'
import MagicString from 'magic-string'
import { basename } from 'path'

import { Document, documentSourceMap, FileContents, FilePath, SourceMap } from '../../domain'

export function rewriteDocumentContents(document: Document, f: (ms: MagicString) => void): Document {
  const file = basename(FilePath.unwrap(document.filePath))
  const contents = FileContents.unwrap(document.contents)
  const ms = new MagicString(contents, {
    filename: file,
    indentExclusionRanges: [],
  })

  f(ms)

  const updatedSourceMap = JSON.parse(
    ms.generateMap({ hires: true, file, source: ms.original, includeContent: true }).toString(),
  ) as RawSourceMap

  const sourceMap: SourceMap = pipe(
    document,
    documentSourceMap.getOption,
    fold(
      (): SourceMap => ({ raw: updatedSourceMap, proxy: none }),
      ({ raw, proxy }) => {
        const remapped = JSON.parse(remapping([updatedSourceMap, raw], () => null).toString()) as RawSourceMap

        return pipe(
          proxy,
          fold(
            (): SourceMap => ({ raw: remapped, proxy: none }),
            (proxyDoc) => ({
              raw: remapped,
              proxy: some(rewriteDocumentContents(proxyDoc, f)),
            }),
          ),
        )
      },
    ),
  )

  return {
    ...document,
    contents: FileContents.wrap(ms.toString()),
    sourceMap: some(sourceMap),
  }
}
