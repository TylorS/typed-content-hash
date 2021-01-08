import { doEffect, execEffect } from '@typed/fp'
import { deepStrictEqual } from 'assert'
import { describe, it } from 'mocha'
import { join } from 'path'

import { ContentHash, Dependency, Directory, FileExtension, FilePath, Hashes, ModuleSpecifier } from '../../domain'
import { cssPlugin } from './css'

const testFixtures = join(__dirname, '__test_fixtures__')
const atRuleImport = join(testFixtures, 'atrule-import.css')
const urlImport = join(testFixtures, 'url-import.css')

export const test = describe(`cssPlugin`, () => {
  describe(`given HashPluginOptions`, () => {
    it(`returns a HashPlugin that parses @imports and url()s`, (done) => {
      const hashLength = 12
      const plugin = cssPlugin({ directory: Directory.wrap(testFixtures), hashLength }, {})

      const expectedAtRuleDeps: readonly Dependency[] = [
        {
          fileExtension: FileExtension.wrap('.css'),
          filePath: FilePath.wrap(join(testFixtures, 'url-import.css')),
          position: [9, 25],
          specifier: ModuleSpecifier.wrap('./url-import.css'),
        },
      ]
      const expectedUrlDeps: readonly Dependency[] = [
        {
          fileExtension: FileExtension.wrap('.svg'),
          filePath: FilePath.wrap(join(testFixtures, 'test.svg')),
          position: [36, 46],
          specifier: ModuleSpecifier.wrap('./test.svg'),
        },
      ]
      const expectedAtRuleHashes: Hashes['hashes'] = new Map()
      const expectedUrlHashes: Hashes['hashes'] = new Map([
        [
          expectedUrlDeps[0].filePath,
          ContentHash.wrap(
            'SqTwlyhFaQu3dLbn19MVS9jrp91n34OyLW63Tz8YiaMhi3dSpANixMKC0uz-scQnXZO1dsrsuiZdc8kVKhh-Pw'.slice(
              0,
              hashLength,
            ),
          ),
        ],
      ])

      const test = doEffect(function* () {
        try {
          const [atRuleDoc, atRuleHashes] = yield* plugin.readDocument(FilePath.wrap(atRuleImport))
          const [urlDoc, urlHashes] = yield* plugin.readDocument(FilePath.wrap(urlImport))

          deepStrictEqual(expectedAtRuleDeps, atRuleDoc.dependencies)
          deepStrictEqual(expectedAtRuleHashes, atRuleHashes)

          deepStrictEqual(expectedUrlDeps, urlDoc.dependencies)
          deepStrictEqual(expectedUrlHashes, urlHashes)

          done()
        } catch (error) {
          done(error)
        }
      })

      execEffect({}, test)
    })
  })
})
