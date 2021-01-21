import { bar } from './bar'

export const foo = () => 'foo'
export const foobar = () => foo() + bar()
