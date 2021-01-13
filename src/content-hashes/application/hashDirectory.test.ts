import { doEffect, execPure, log, provideAll, provideSome } from '@typed/fp'
import { deepStrictEqual } from 'assert'
import { pipe } from 'fp-ts/lib/function'
import { map, none, some } from 'fp-ts/lib/Option'
import { join, relative } from 'path'

import {
  createReadFilePath,
  fsReadDependencies,
  fsReadDirectory,
  rewriteDependencies,
  RewriteDependenciesImplementationEnv,
  rewriteSourceMapUrls,
  topoSortDocs,
} from '..'
import { createDefaultPlugins } from '../defaultPlugins'
import { Document } from '../domain/model'
import { DocumentRegistryEnv, LoggerEnv } from '.'
import { hashDirectory } from './hashDirectory'
import { LogLevel } from './services'

const testDirectory = join(__dirname, '../../../test')

const expected = {
  'foo.js': {
    filePath: 'foo.js',
    fileExtension: '.js',
    contents:
      "export const foo = () => 'foo'\n//# sourceMappingURL=foo.kyDx8gRaCgRSqofIkYsPrUHeGxIjORf93KcJDxgv4sN3HCVd9brbzDRYzcQvB_etbBlo-3dZZnjcpP4dhoJGeg.js\n",
    contentHash: some({
      type: 'hash',
      hash: 'kyDx8gRaCgRSqofIkYsPrUHeGxIjORf93KcJDxgv4sN3HCVd9brbzDRYzcQvB_etbBlo-3dZZnjcpP4dhoJGeg',
    }),
    dependencies: [],
    sourceMap: some('foo.js.map'),
    isBase64Encoded: false,
    hash: {
      type: 'hash',
      hash: '9oJ8wwurnXXZEx6AlpmUvWM_EUjWO4Lontbgqu8VN1UeHCkFh575pmJopyjqLLtip4GXK7z8NeazAoCiuRWlkg',
    },
  },
  'index.css': {
    filePath: 'index.css',
    fileExtension: '.css',
    contents:
      '.foo {\n  background-attachment: url(./test.SqTwlyhFaQu3dLbn19MVS9jrp91n34OyLW63Tz8YiaMhi3dSpANixMKC0uz-scQnXZO1dsrsuiZdc8kVKhh-Pw.svg);\n}\n/*# sourceMappingURL=index._mi7T5MEesaq-PmkaxwZW6xWIS5Twut_7MYMXRVoDmwBBU6JJ19hukQ99D-1DAWFHwlELgjLCy_YMtl1peB7Pw.css *\n',
    contentHash: some({
      type: 'hash',
      hash: '_mi7T5MEesaq-PmkaxwZW6xWIS5Twut_7MYMXRVoDmwBBU6JJ19hukQ99D-1DAWFHwlELgjLCy_YMtl1peB7Pw',
    }),
    dependencies: [
      {
        specifier: './test.svg',
        position: {
          start: 36,
          end: 46,
        },
        filePath: '/Users/TylorSteinberger/code/tylors/typed-content-hash/test/test.svg',
        fileExtension: '.svg',
      },
    ],
    sourceMap: some('index.css.map'),
    isBase64Encoded: false,
    hash: {
      type: 'hash',
      hash: 'tvRsYdt6MrRal8_9TNM-0O4PRUX5P6c6Rky-PXJvDEvJ962m7CLI_WWr-AlYjNwAGiVwUuCov6Qza6lxDjLPNg',
    },
  },
  'index.html': {
    filePath: 'index.html',
    fileExtension: '.html',
    contents:
      '<!DOCTYPE html>\n<html>\n\n<head>\n  <title>Tapas</title>\n\n  <link href="./index._mi7T5MEesaq-PmkaxwZW6xWIS5Twut_7MYMXRVoDmwBBU6JJ19hukQ99D-1DAWFHwlELgjLCy_YMtl1peB7Pw.css" />\n</head>\n\n<body>\n  <div id="app"></div>\n\n  <script type="module" src="./index.2ufQOphc1z8bbjgoVmOupOqtDJc52l9oJ-w4gj7wAtfOqmJIl-cF-enkFkpYUAbrittPZ1SmWcLshnhvcTYLSA.js"></script>\n</body>\n\n</html>\n',
    contentHash: none,
    dependencies: [
      {
        specifier: './index.css',
        filePath: '/Users/TylorSteinberger/code/tylors/typed-content-hash/test/index.css',
        fileExtension: '.css',
        position: {
          start: 69,
          end: 80,
        },
      },
      {
        specifier: './index.js',
        filePath: '/Users/TylorSteinberger/code/tylors/typed-content-hash/test/index.js',
        fileExtension: '.js',
        position: {
          start: 154,
          end: 164,
        },
      },
    ],
    sourceMap: none,
    isBase64Encoded: false,
  },
  'index.js': {
    filePath: 'index.js',
    fileExtension: '.js',
    contents:
      "import { foo } from './foo.kyDx8gRaCgRSqofIkYsPrUHeGxIjORf93KcJDxgv4sN3HCVd9brbzDRYzcQvB_etbBlo-3dZZnjcpP4dhoJGeg.js'\n\n// eslint-disable-next-line no-undef\nconsole.log(foo())\n\n//# sourceMappingURL=index.2ufQOphc1z8bbjgoVmOupOqtDJc52l9oJ-w4gj7wAtfOqmJIl-cF-enkFkpYUAbrittPZ1SmWcLshnhvcTYLSA.js\n",
    contentHash: some({
      type: 'hash',
      hash: '2ufQOphc1z8bbjgoVmOupOqtDJc52l9oJ-w4gj7wAtfOqmJIl-cF-enkFkpYUAbrittPZ1SmWcLshnhvcTYLSA',
    }),
    dependencies: [
      {
        specifier: './foo.js',
        filePath: '/Users/TylorSteinberger/code/tylors/typed-content-hash/test/foo.js',
        fileExtension: '.js',
        position: {
          start: 21,
          end: 29,
        },
      },
    ],
    sourceMap: some('index.js.map'),
    isBase64Encoded: false,
    hash: {
      type: 'hash',
      hash: 'w6kiakJ6cwWmPdNjybrNNgGLN-2nx8h1Efqb54a2H97x6QP2BdMBYif91M52iKw1H__H3yd91ltWf7_BhZNv4g',
    },
  },
  'test.svg': {
    filePath: 'test.svg',
    fileExtension: '.svg',
    contents:
      'PHN2ZyBoZWlnaHQ9IjEwMCIgd2lkdGg9IjEwMCI+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0icmVkIiAvPgo8L3N2Zz4K',
    contentHash: some({
      type: 'hash',
      hash: 'SqTwlyhFaQu3dLbn19MVS9jrp91n34OyLW63Tz8YiaMhi3dSpANixMKC0uz-scQnXZO1dsrsuiZdc8kVKhh-Pw',
    }),
    dependencies: [],
    sourceMap: none,
    isBase64Encoded: true,
  },
  'foo.js.map': {
    filePath: 'foo.js.map',
    fileExtension: '.js.map',
    contents:
      '{\n  "version": 3,\n  "file": "foo.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "export%20const%20foo%20=%20()%20=%3E%20\'foo\'"\n  ],\n  "sourcesContent": [\n    "export const foo = () => \'foo\'\\n"\n  ]\n}',
    contentHash: some({
      type: 'hashFor',
      filePath: 'foo.js',
    }),
    dependencies: [],
    sourceMap: none,
    isBase64Encoded: false,
  },
  'index.js.map': {
    filePath: 'index.js.map',
    fileExtension: '.js.map',
    contents:
      '{\n  "version": 3,\n  "file": "index.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAQ,CAAC;AAC9B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACpC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AAClB;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo.js\'//%20eslint-disable-next-line%20no-undefconsole.log(foo())"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo.js\'\\n\\n// eslint-disable-next-line no-undef\\nconsole.log(foo())\\n\\n"\n  ]\n}',
    contentHash: some({
      type: 'hashFor',
      filePath: 'index.js',
    }),
    dependencies: [],
    sourceMap: none,
    isBase64Encoded: false,
  },
  'index.css.map': {
    filePath: 'index.css.map',
    fileExtension: '.css.map',
    contents:
      '{\n  "version": 3,\n  "file": "index.css",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACN,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAU,CAAC,CAAC;AACzC,CAAC;",\n  "names": [],\n  "sources": [\n    ".foo%20%7B%20%20background-attachment:%20url(./test.svg);%7D"\n  ],\n  "sourcesContent": [\n    ".foo {\\n  background-attachment: url(./test.svg);\\n}\\n"\n  ]\n}',
    contentHash: some({
      type: 'hashFor',
      filePath: 'index.css',
    }),
    dependencies: [],
    sourceMap: none,
    isBase64Encoded: false,
  },
}

describe('hashDirectory', () => {
  it('hashes a directory into a registry', (done) => {
    const test = doEffect(function* () {
      try {
        const registry = Object.fromEntries(yield* hashDirectory(testDirectory))
        const normalizedRegistry = normalizeRegistry(testDirectory, registry)

        deepStrictEqual(normalizedRegistry, expected)
        done()
      } catch (error) {
        done(error)
      }
    })

    const readFilePath = createReadFilePath(createDefaultPlugins({ buildDirectory: testDirectory }))
    const documentRegistryEnv: DocumentRegistryEnv = { documentRegistry: new Map() }
    const loggerEnv: LoggerEnv = {
      logLevel: LogLevel.Debug,
      logPrefix: 'test',
      logger: (msg: string) => pipe(msg, log, provideAll({ console })),
    }
    const hashLength = Infinity

    pipe(
      test,
      provideAll({
        ...documentRegistryEnv,
        ...loggerEnv,
        readFilePath,
        readDirectory: fsReadDirectory,
        readDependencies: fsReadDependencies,
        toposortDocuments: topoSortDocs,
        rewriteSourceMapUrls: () => rewriteSourceMapUrls(hashLength),
        rewriteDependencies: (doc) =>
          pipe(
            rewriteDependencies(doc),
            provideSome<RewriteDependenciesImplementationEnv>({
              hashLength,
              directory: testDirectory,
            }),
          ),
      }),
      execPure,
    )
  })
})

function normalizeRegistry(directory: string, registry: Record<string, Document>): Record<string, Document> {
  return Object.fromEntries(
    Object.entries(registry).map(([path, doc]) => [relative(directory, path), normalizeDoc(directory, doc)]),
  )
}

function normalizeDoc(directory: string, document: Document): Document {
  return {
    ...document,
    filePath: relative(directory, document.filePath),
    sourceMap: pipe(
      document.sourceMap,
      map((p) => relative(directory, p)),
    ),
    contentHash: pipe(
      document.contentHash,
      map((hash) => (hash.type === 'hashFor' ? { ...hash, filePath: relative(directory, hash.filePath) } : hash)),
    ),
  }
}
