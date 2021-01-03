import { fromTask, mapResume, Resume, toEnv } from '@typed/fp'
import { isSome } from 'fp-ts/Option'
import { unlink } from 'fs/promises'

import { Document, FilePath, getSourceMapPathFor } from '../domain'
import { zipResumes } from './provideHashDirectoryEnv/zipResumes'

export function deleteDocuments(documents: ReadonlyArray<Document>): Resume<void> {
  return mapResume(() => void 0, zipResumes(documents.map(deleteDocument)))
}

export function deleteDocument(document: Document) {
  const resumes = [deleteFilePath(document.filePath)]

  if (isSome(document.sourceMap)) {
    const { proxy } = document.sourceMap.value
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    resumes.push(deleteFilePath(sourceMapPath))

    if (isSome(proxy)) {
      resumes.push(deleteDocument(proxy.value))
    }
  }

  if (isSome(document.dts)) {
    resumes.push(deleteDocument(document.dts.value))
  }

  return mapResume(() => void 0, zipResumes(resumes))
}

export function deleteFilePath(filePath: FilePath) {
  return toEnv(fromTask(() => unlink(FilePath.unwrap(filePath))))({})
}
