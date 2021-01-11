import { Pure } from '@typed/fp'
import { Option } from 'fp-ts/lib/Option'

import { Document } from '../domain/model'

export interface HashPlugin {
  readonly readFilePath: (filePath: string) => Pure<Option<Document>>
}
