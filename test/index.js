import { foo } from './foo.js'

export function bar() {
  return foo() + 'bar'
}

// eslint-disable-next-line no-undef
navigator.serviceWorker.register('./sw.js')
