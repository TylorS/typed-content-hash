import { fromTask, mapResume, toEnv } from '@typed/fp'
import { isSome } from 'fp-ts/Option'
import { writeFile } from 'fs/promises'

import { Document, FileContents, FilePath, getSourceMapPathFor } from '../domain'
import { zipResumes } from './provideHashDirectoryEnv/zipResumes'

export function writeDocuments(documents: ReadonlyArray<Document>) {
  return mapResume(() => void 0, zipResumes(documents.map(writeDocument)))
}

export function writeDocument(document: Document) {
  const resumes = [writeFileContents(document.filePath, document.contents)]

  if (isSome(document.sourceMap)) {
    const { raw, proxy } = document.sourceMap.value
    const sourceMapPath = getSourceMapPathFor(document.filePath)

    resumes.push(writeFileContents(sourceMapPath, FileContents.wrap(JSON.stringify(raw, null, 2))))

    if (isSome(proxy)) {
      resumes.push(writeDocument(proxy.value))
    }
  }

  if (isSome(document.dts)) {
    resumes.push(writeDocument(document.dts.value))
  }

  return mapResume(() => void 0, zipResumes(resumes))
}

export function writeFileContents(filePath: FilePath, contents: FileContents) {
  return toEnv(fromTask(() => writeFile(FilePath.unwrap(filePath), FileContents.unwrap(contents))))({})
}
