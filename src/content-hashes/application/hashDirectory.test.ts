import { doEffect, execPure, log, provideAll, provideSome } from '@typed/fp'
import { deepStrictEqual } from 'assert'
import { pipe } from 'fp-ts/lib/function'
import { none, some } from 'fp-ts/lib/Option'
import { join } from 'path'

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
import { normalizeRegistry } from '../infrastructure/normalizeRegistry'
import { hashDirectory } from './hashDirectory'
import { DocumentRegistryEnv } from './model'
import { LoggerEnv, LogLevel } from './services'

const testDirectory = join(__dirname, '../../../test')

const expected = {
  'foo.d.ts': {
    filePath: 'foo.d.ts',
    fileExtension: '.d.ts',
    contents:
      "export declare const foo: () => 'foo'\n//# sourceMappingURL=foo.kyDx8gRaCgRSqofIkYsPrUHeGxIjORf93KcJDxgv4sN3HCVd9brbzDRYzcQvB_etbBlo-3dZZnjcpP4dhoJGeg.d.ts\n",
    contentHash: some({
      type: 'hashFor',
      filePath: 'foo.js',
    }),
    dependencies: [],
    sourceMap: some('foo.d.ts.map'),
    isBase64Encoded: false,
  },
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
  },
  'index.css': {
    filePath: 'index.css',
    fileExtension: '.css',
    contents:
      '.foo {\n  background-attachment: url(./test.SqTwlyhFaQu3dLbn19MVS9jrp91n34OyLW63Tz8YiaMhi3dSpANixMKC0uz-scQnXZO1dsrsuiZdc8kVKhh-Pw.svg);\n}\n/*# sourceMappingURL=index.lL-qU55pL5nMl5jIaKYR_5WVrlm6cqByE4ZXWGXVsebBxH3vLz4lq-TROR0_T3WS7XuqpzU7IY2HEHlT-ywc6A.css *\n',
    contentHash: some({
      type: 'hash',
      hash: 'lL-qU55pL5nMl5jIaKYR_5WVrlm6cqByE4ZXWGXVsebBxH3vLz4lq-TROR0_T3WS7XuqpzU7IY2HEHlT-ywc6A',
    }),
    dependencies: [
      {
        specifier: './test.svg',
        position: {
          start: 36,
          end: 46,
        },
        filePath: 'test.svg',
        fileExtension: '.svg',
      },
    ],
    sourceMap: some('index.css.map'),
    isBase64Encoded: false,
  },
  'index.d.ts': {
    filePath: 'index.d.ts',
    fileExtension: '.d.ts',
    contents:
      "import { foo } from './foo.kyDx8gRaCgRSqofIkYsPrUHeGxIjORf93KcJDxgv4sN3HCVd9brbzDRYzcQvB_etbBlo-3dZZnjcpP4dhoJGeg'\n\nexport declare function bar(): `${ReturnType<typeof foo>}bar`\n//# sourceMappingURL=index.BVnUKweCDXC-nBohT116nf-qOZk29lkIba_o5x93UNQqCDNWjsm2WCT9ELiO6x_-jNVWc_Pwxxbh1jLwTRFqTg.d.ts\n",
    contentHash: some({
      type: 'hashFor',
      filePath: 'index.js',
    }),
    dependencies: [
      {
        specifier: './foo',
        filePath: 'foo.d.ts',
        fileExtension: '.d.ts',
        position: {
          start: 21,
          end: 26,
        },
      },
    ],
    sourceMap: some('index.d.ts.map'),
    isBase64Encoded: false,
  },
  'index.html': {
    filePath: 'index.html',
    fileExtension: '.html',
    contents:
      '<!DOCTYPE html>\n<html>\n\n<head>\n  <title>Tapas</title>\n\n  <link href="./index.lL-qU55pL5nMl5jIaKYR_5WVrlm6cqByE4ZXWGXVsebBxH3vLz4lq-TROR0_T3WS7XuqpzU7IY2HEHlT-ywc6A.css" />\n</head>\n\n<body>\n  <div id="app"></div>\n\n  <script type="module" src="./index.BVnUKweCDXC-nBohT116nf-qOZk29lkIba_o5x93UNQqCDNWjsm2WCT9ELiO6x_-jNVWc_Pwxxbh1jLwTRFqTg.js"></script>\n</body>\n\n</html>\n',
    contentHash: none,
    dependencies: [
      {
        specifier: './index.css',
        filePath: 'index.css',
        fileExtension: '.css',
        position: {
          start: 69,
          end: 80,
        },
      },
      {
        specifier: './index.js',
        filePath: 'index.js',
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
      "import { foo } from './foo.kyDx8gRaCgRSqofIkYsPrUHeGxIjORf93KcJDxgv4sN3HCVd9brbzDRYzcQvB_etbBlo-3dZZnjcpP4dhoJGeg.js'\n\nexport function bar() {\n  return foo() + 'bar'\n}\n//# sourceMappingURL=index.BVnUKweCDXC-nBohT116nf-qOZk29lkIba_o5x93UNQqCDNWjsm2WCT9ELiO6x_-jNVWc_Pwxxbh1jLwTRFqTg.js\n",
    contentHash: some({
      type: 'hash',
      hash: 'BVnUKweCDXC-nBohT116nf-qOZk29lkIba_o5x93UNQqCDNWjsm2WCT9ELiO6x_-jNVWc_Pwxxbh1jLwTRFqTg',
    }),
    dependencies: [
      {
        specifier: './foo.js',
        filePath: 'foo.js',
        fileExtension: '.js',
        position: {
          start: 21,
          end: 29,
        },
      },
    ],
    sourceMap: some('index.js.map'),
    isBase64Encoded: false,
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
      '{\n  "version": 3,\n  "file": "index.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAQ,CAAC;AAC9B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACvB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACtB,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo.js\'export%20function%20bar()%20%7B%20%20return%20foo()%20+%20\'bar\'%7D"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo.js\'\\n\\nexport function bar() {\\n  return foo() + \'bar\'\\n}\\n"\n  ]\n}',
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
  'foo.d.ts.map': {
    filePath: 'foo.d.ts.map',
    fileExtension: '.d.ts.map',
    contents:
      '{\n  "version": 3,\n  "file": "foo.d.ts",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "export%20declare%20const%20foo:%20()%20=%3E%20\'foo\'"\n  ],\n  "sourcesContent": [\n    "export declare const foo: () => \'foo\'\\n"\n  ]\n}',
    contentHash: some({
      type: 'hashFor',
      filePath: 'foo.d.ts',
    }),
    dependencies: [],
    sourceMap: none,
    isBase64Encoded: false,
  },
  'index.d.ts.map': {
    filePath: 'index.d.ts.map',
    fileExtension: '.d.ts.map',
    contents:
      '{\n  "version": 3,\n  "file": "index.d.ts",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAA,CAAK,CAAC;AAC3B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo\'export%20declare%20function%20bar():%20%60$%7BReturnType%3Ctypeof%20foo%3E%7Dbar%60"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo\'\\n\\nexport declare function bar(): `${ReturnType<typeof foo>}bar`\\n"\n  ]\n}',
    contentHash: some({
      type: 'hashFor',
      filePath: 'index.d.ts',
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
        const registry = yield* hashDirectory(testDirectory)
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
