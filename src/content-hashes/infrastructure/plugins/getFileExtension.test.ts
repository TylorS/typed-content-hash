import { deepStrictEqual } from 'assert'

import { getFileExtension } from './getFileExtension'

describe('getFileExtension', () => {
  it('returns the proper file extension', () => {
    deepStrictEqual(getFileExtension('foobar.js'), '.js')
    deepStrictEqual(getFileExtension('foobar.js.map'), '.js.map')
    deepStrictEqual(getFileExtension('foobar.js.map.proxy.js'), '.js.map.proxy.js')
    deepStrictEqual(getFileExtension('foobar.d.ts'), '.d.ts')
    deepStrictEqual(getFileExtension('foobar.d.ts.map'), '.d.ts.map')
    deepStrictEqual(getFileExtension('foobar.css.proxy.js'), '.css.proxy.js')
  })
})
