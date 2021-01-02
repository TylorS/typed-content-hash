import { fromTask, mapResume, toEnv } from '@typed/fp'
import { unlink } from 'fs/promises'

import { Document, FilePath } from '../domain'
import { zipResumes } from './provideHashDirectoryEnv/zipResumes'

export function deleteDocuments(documents: ReadonlyArray<Document>) {
  return mapResume(() => void 0, zipResumes(documents.map(deleteDocument)))
}

export function deleteDocument(document: Document) {
  return toEnv(fromTask(() => unlink(FilePath.unwrap(document.filePath))))({})
}
