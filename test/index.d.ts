import { foo } from './foo'

export declare function bar(): `${ReturnType<typeof foo>}bar`
