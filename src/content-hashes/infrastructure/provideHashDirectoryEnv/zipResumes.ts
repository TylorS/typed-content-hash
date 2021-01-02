import { fromEnv, Resume, toEnv, zip } from '@typed/fp'

export const zipResumes = <A extends ReadonlyArray<Resume<any>>>(resumes: A) => {
  const effects = resumes.map((r) => fromEnv(() => r))
  const zipped = zip(effects)

  return toEnv(zipped)({}) as Resume<{ readonly [K in keyof A]: A[K] extends Resume<infer R> ? R : never }>
}
