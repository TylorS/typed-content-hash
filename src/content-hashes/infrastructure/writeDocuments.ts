import { fromTask, mapResume, toEnv } from '@typed/fp'
import { writeFile } from 'fs/promises'

import { Document, FileContents, FilePath } from '../domain'
import { zipResumes } from './provideHashDirectoryEnv/zipResumes'

export function writeDocuments(documents: ReadonlyArray<Document>) {
  return mapResume(() => void 0, zipResumes(documents.map(writeDocument)))
}

export function writeDocument(document: Document) {
  return toEnv(fromTask(() => writeFile(FilePath.unwrap(document.filePath), FileContents.unwrap(document.contents))))(
    {},
  )
}
