import { doEffect, execPure, log, provideAll, provideSome } from '@typed/fp'
import { deepStrictEqual } from 'assert'
import { pipe } from 'fp-ts/lib/function'
import { join } from 'path'

import {
  createReadFilePath,
  fsReadDependencies,
  fsReadDirectory,
  rewriteDependencies,
  RewriteDependenciesImplementationEnv,
  rewriteSourceMapUrls,
  sortDiGraph,
} from '..'
import { createDefaultPlugins } from '../defaultPlugins'
import { normalizeRegistry } from '../infrastructure/normalizeRegistry'
import { hashDirectory } from './hashDirectory'
import { DocumentRegistryEnv } from './model'
import { LoggerEnv, LogLevel } from './services'

const testDirectory = join(__dirname, '../../../test')

const expected = {
  'bar.d.ts': {
    filePath: 'bar.d.ts',
    fileExtension: '.d.ts',
    contents:
      "import { foo } from './foo.9uiZ4EPEU-sB'\n\nexport declare const bar: typeof foo\n//# sourceMappingURL=bar.JQP4to4mhneh.d.ts\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'bar.js',
      },
    },
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
    sourceMap: {
      _tag: 'Some',
      value: 'bar.d.ts.map',
    },
    isBase64Encoded: false,
  },
  'bar.js': {
    filePath: 'bar.js',
    fileExtension: '.js',
    contents:
      "import { foo } from './foo.9uiZ4EPEU-sB.js'\n\nexport const bar = () => foo()\n//# sourceMappingURL=bar.JQP4to4mhneh.js\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'JQP4to4mhneh8az5Z3ZQHqEGSW3nSLk7P6NlfusBcMFYLmuSCDQPp2TdmJe_-kHp7mWUMs1CuYNWtPVWF9Y94g',
      },
    },
    dependencies: [
      {
        specifier: './foo',
        filePath: 'foo.js',
        fileExtension: '.js',
        position: {
          start: 21,
          end: 26,
        },
      },
    ],
    sourceMap: {
      _tag: 'Some',
      value: 'bar.js.map',
    },
    isBase64Encoded: false,
  },
  'foo.d.ts': {
    filePath: 'foo.d.ts',
    fileExtension: '.d.ts',
    contents:
      "export declare const foo: () => 'foo'\nexport declare const foobar: () => string\n//# sourceMappingURL=foo.9uiZ4EPEU-sB.d.ts\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'foo.js',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'Some',
      value: 'foo.d.ts.map',
    },
    isBase64Encoded: false,
  },
  'foo.js': {
    filePath: 'foo.js',
    fileExtension: '.js',
    contents:
      "import { bar } from './bar.JQP4to4mhneh.js'\n\nexport const foo = () => 'foo'\nexport const foobar = () => foo() + bar()\n//# sourceMappingURL=foo.9uiZ4EPEU-sB.js\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: '9uiZ4EPEU-sBLf49sPkvFtl5jy_L9JTx202dWTjEKZSS5dnS26X2pBp6hKJqLyJcwW3a2qthWmHGtI5wCdqLCw',
      },
    },
    dependencies: [
      {
        specifier: './bar',
        filePath: 'bar.js',
        fileExtension: '.js',
        position: {
          start: 21,
          end: 26,
        },
      },
    ],
    sourceMap: {
      _tag: 'Some',
      value: 'foo.js.map',
    },
    isBase64Encoded: false,
  },
  'index.css': {
    filePath: 'index.css',
    fileExtension: '.css',
    contents:
      '.foo {\n  background-attachment: url(./test.SqTwlyhFaQu3.svg);\n}\n/*# sourceMappingURL=index.jPrPHrTrxlk1.css *\n',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'jPrPHrTrxlk1PushPO9xric4YzenaGdt2J67ugWDjz2SkdNA_yqcNrBI-rjCp5EncRM1xWQ4scL99BzEOgkwag',
      },
    },
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
    sourceMap: {
      _tag: 'Some',
      value: 'index.css.map',
    },
    isBase64Encoded: false,
  },
  'index.d.ts': {
    filePath: 'index.d.ts',
    fileExtension: '.d.ts',
    contents:
      "import { foo } from './foo.9uiZ4EPEU-sB'\n\nexport declare function bar(): `${ReturnType<typeof foo>}bar`\n//# sourceMappingURL=index.NWkKj7N8Hd6f.d.ts\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'index.js',
      },
    },
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
    sourceMap: {
      _tag: 'Some',
      value: 'index.d.ts.map',
    },
    isBase64Encoded: false,
  },
  'index.html': {
    filePath: 'index.html',
    fileExtension: '.html',
    contents:
      '<!DOCTYPE html>\n<html>\n\n<head>\n  <title>Tapas</title>\n\n  <link href="./index.jPrPHrTrxlk1.css" />\n</head>\n\n<body>\n  <div id="app"></div>\n\n  <script type="module" src="./index.NWkKj7N8Hd6f.js"></script>\n</body>\n\n</html>\n',
    contentHash: {
      _tag: 'None',
    },
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
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'index.js': {
    filePath: 'index.js',
    fileExtension: '.js',
    contents:
      "import { foo } from './foo.9uiZ4EPEU-sB.js'\n\nexport function bar() {\n  return foo() + 'bar'\n}\n//# sourceMappingURL=index.NWkKj7N8Hd6f.js\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'NWkKj7N8Hd6fN4XUw7-F0c2AOjg-X2l56lDRiAowTPZfZ2IeLLmrTCUbbeUX2Ux-7mgwzOoVGRYxmyJFqNUEhA',
      },
    },
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
    sourceMap: {
      _tag: 'Some',
      value: 'index.js.map',
    },
    isBase64Encoded: false,
  },
  'test.svg': {
    filePath: 'test.svg',
    fileExtension: '.svg',
    contents:
      'PHN2ZyBoZWlnaHQ9IjEwMCIgd2lkdGg9IjEwMCI+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0icmVkIiAvPgo8L3N2Zz4K',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'SqTwlyhFaQu3dLbn19MVS9jrp91n34OyLW63Tz8YiaMhi3dSpANixMKC0uz-scQnXZO1dsrsuiZdc8kVKhh-Pw',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: true,
  },
  'foo.js.map': {
    filePath: 'foo.js.map',
    fileExtension: '.js.map',
    contents:
      '{\n  "version": 3,\n  "file": "foo.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,qBAAK,CAAC;AAC3B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AAC9B,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20bar%20%7D%20from%20\'./bar\'export%20const%20foo%20=%20()%20=%3E%20\'foo\'export%20const%20foobar%20=%20()%20=%3E%20foo()%20+%20bar()"\n  ],\n  "sourcesContent": [\n    "import { bar } from \'./bar\'\\n\\nexport const foo = () => \'foo\'\\nexport const foobar = () => foo() + bar()\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'foo.js',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'bar.js.map': {
    filePath: 'bar.js.map',
    fileExtension: '.js.map',
    contents:
      '{\n  "version": 3,\n  "file": "bar.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,qBAAK,CAAC;AAC3B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo\'export%20const%20bar%20=%20()%20=%3E%20foo()"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo\'\\n\\nexport const bar = () => foo()\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'bar.js',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'index.css.map': {
    filePath: 'index.css.map',
    fileExtension: '.css.map',
    contents:
      '{\n  "version": 3,\n  "file": "index.css",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACN,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,uBAAU,CAAC,CAAC;AACzC,CAAC;",\n  "names": [],\n  "sources": [\n    ".foo%20%7B%20%20background-attachment:%20url(./test.svg);%7D"\n  ],\n  "sourcesContent": [\n    ".foo {\\n  background-attachment: url(./test.svg);\\n}\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'index.css',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'index.js.map': {
    filePath: 'index.js.map',
    fileExtension: '.js.map',
    contents:
      '{\n  "version": 3,\n  "file": "index.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,qBAAQ,CAAC;AAC9B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACvB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACtB,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo.js\'export%20function%20bar()%20%7B%20%20return%20foo()%20+%20\'bar\'%7D"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo.js\'\\n\\nexport function bar() {\\n  return foo() + \'bar\'\\n}\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'index.js',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'foo.d.ts.map': {
    filePath: 'foo.d.ts.map',
    fileExtension: '.d.ts.map',
    contents:
      '{\n  "version": 3,\n  "file": "foo.d.ts",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACrC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "export%20declare%20const%20foo:%20()%20=%3E%20\'foo\'export%20declare%20const%20foobar:%20()%20=%3E%20string"\n  ],\n  "sourcesContent": [\n    "export declare const foo: () => \'foo\'\\nexport declare const foobar: () => string\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'foo.d.ts',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'bar.d.ts.map': {
    filePath: 'bar.d.ts.map',
    fileExtension: '.d.ts.map',
    contents:
      '{\n  "version": 3,\n  "file": "bar.d.ts",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,kBAAK,CAAC;AAC3B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo\'export%20declare%20const%20bar:%20typeof%20foo"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo\'\\n\\nexport declare const bar: typeof foo\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'bar.d.ts',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: false,
  },
  'index.d.ts.map': {
    filePath: 'index.d.ts.map',
    fileExtension: '.d.ts.map',
    contents:
      '{\n  "version": 3,\n  "file": "index.d.ts",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,kBAAK,CAAC;AAC3B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo\'export%20declare%20function%20bar():%20%60$%7BReturnType%3Ctypeof%20foo%3E%7Dbar%60"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo\'\\n\\nexport declare function bar(): `${ReturnType<typeof foo>}bar`\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'index.d.ts',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
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
    const hashLength = 12

    pipe(
      test,
      provideAll({
        ...documentRegistryEnv,
        ...loggerEnv,
        readFilePath,
        readDirectory: fsReadDirectory,
        readDependencies: fsReadDependencies,
        sortDocuments: sortDiGraph,
        rewriteSourceMapUrls: () => rewriteSourceMapUrls(hashLength, true),
        rewriteDependencies: (...args) =>
          pipe(
            rewriteDependencies(...args),
            provideSome<RewriteDependenciesImplementationEnv>({
              hashLength,
              directory: testDirectory,
              sourceMaps: true,
            }),
          ),
      }),
      execPure,
    )
  })
})
