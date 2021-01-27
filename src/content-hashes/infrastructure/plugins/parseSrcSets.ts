import { Position } from '../../domain/model'

const commaRegex = /,/g
const spaceRegex = /\s/g

export type UrlPosition = {
  readonly url: string
  readonly position: Position
}

export function parseSrcSets(srcSet: string, start: number): readonly UrlPosition[] {
  return srcSet
    .split(commaRegex)
    .map((s) => s.trim())
    .map((part) => {
      const [url] = part.split(spaceRegex)
      const urlStart = srcSet.indexOf(url)
      const urlEnd = urlStart + url.length
      const set: UrlPosition = {
        url: url.trim(),
        position: {
          start: start + urlStart,
          end: start + urlEnd,
        },
      }

      return set
    })
}
