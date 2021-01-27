import { deepStrictEqual } from 'assert'

import { parseSrcSets } from './parseSrcSets'

describe('parseSrcSets', () => {
  describe('given a srcSet', () => {
    it('returns a parsed variant', () => {
      const srcSet = `/wp-content/uploads/flamingo4x.jpg 4025w,
  /wp-content/uploads/flamingo3x.jpg 3019w,
  /wp-content/uploads/flamingo2x.jpg 2013w,
  /wp-content/uploads/flamingo1x.jpg 1006w`

      const offset = 100
      const images = parseSrcSets(srcSet, offset)

      deepStrictEqual(images, [
        {
          url: '/wp-content/uploads/flamingo4x.jpg',
          position: {
            start: offset + 0,
            end: offset + 34,
          },
        },
        {
          url: '/wp-content/uploads/flamingo3x.jpg',
          position: {
            start: offset + 44,
            end: offset + 78,
          },
        },
        {
          url: '/wp-content/uploads/flamingo2x.jpg',
          position: {
            start: offset + 88,
            end: offset + 122,
          },
        },
        {
          url: '/wp-content/uploads/flamingo1x.jpg',
          position: {
            start: offset + 132,
            end: offset + 166,
          },
        },
      ])
    })
  })
})
