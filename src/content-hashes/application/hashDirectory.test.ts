import { execWith, fromIO, provideSome, useSome } from '@typed/fp/Env'
import { Do } from '@typed/fp/FxEnv'
import { deepStrictEqual } from 'assert'
import { pipe } from 'fp-ts/function'
import { posix } from 'path'

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
import { ReadDependenciesEnv } from './services/readDependencies'
import { ReadDirectoryEnv } from './services/readDirectory'
import { ReadFilePathEnv } from './services/readFilePath'
import { RewriteDependenciesEnv } from './services/rewriteDependencies'
import { RewriteSourceMapUrlsEnv } from './services/rewriteSourceMapUrls'
import { SortDocumentsEnv } from './services/toposortDocuments'

const testDirectory = posix.join(__dirname, '../../../test')

const expected = {
  'bar.d.ts': {
    filePath: 'bar.d.ts',
    fileExtension: '.d.ts',
    contents:
      "import { foo } from './foo.9uiZ4EPEU-sB'\n\nexport declare const bar: typeof foo\n//# sourceMappingURL=bar.JQP4to4mhneh.d.ts.map\n",
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
      "import { foo } from './foo.9uiZ4EPEU-sB.js'\n\nexport const bar = () => foo()\n//# sourceMappingURL=bar.JQP4to4mhneh.js.map\n",
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
      "export declare const foo: () => 'foo'\nexport declare const foobar: () => string\n//# sourceMappingURL=foo.9uiZ4EPEU-sB.d.ts.map\n",
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
      "import { bar } from './bar.JQP4to4mhneh.js'\n\nexport const foo = () => 'foo'\nexport const foobar = () => foo() + bar()\n//# sourceMappingURL=foo.9uiZ4EPEU-sB.js.map\n",
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
      '.foo {\n  background-attachment: url(./test.SqTwlyhFaQu3.svg);\n}\n/*# sourceMappingURL=index.jPrPHrTrxlk1.css.map *\n',
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
      "import { foo } from './foo.9uiZ4EPEU-sB'\n\nexport declare function bar(): `${ReturnType<typeof foo>}bar`\n//# sourceMappingURL=index.MEc5qI_OWTs0.d.ts.map\n",
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
      '<!DOCTYPE html>\n<html>\n\n<head>\n  <title>Tapas</title>\n\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <link href="./index.jPrPHrTrxlk1.css" />\n</head>\n\n<body>\n  <div id="app">\n\n    <img srcset="./fake-image-x4.ooKWSSJ0apZX.png 4x,\n                 ./fake-image-x3.dnonbURMTOmA.png 3x,\n                 ./fake-image-x2.ng0eXyXAgxHn.png 2x,\n                 ./fake-image-x1.G6V284hJv-PY.png 1x" />\n\n    <template>\n      <img src="./template-image.MqBzdgoAuSgt.png" />\n    </template>\n  </div>\n\n  <script type="module" src="./index.MEc5qI_OWTs0.js"></script>\n</body>\n\n</html>\n',
    contentHash: {
      _tag: 'None',
    },
    dependencies: [
      {
        specifier: './index.css',
        filePath: 'index.css',
        fileExtension: '.css',
        position: {
          start: 142,
          end: 153,
        },
      },
      {
        specifier: './fake-image-x4.png',
        filePath: 'fake-image-x4.png',
        fileExtension: '.png',
        position: {
          start: 209,
          end: 228,
        },
      },
      {
        specifier: './fake-image-x3.png',
        filePath: 'fake-image-x3.png',
        fileExtension: '.png',
        position: {
          start: 250,
          end: 269,
        },
      },
      {
        specifier: './fake-image-x2.png',
        filePath: 'fake-image-x2.png',
        fileExtension: '.png',
        position: {
          start: 291,
          end: 310,
        },
      },
      {
        specifier: './fake-image-x1.png',
        filePath: 'fake-image-x1.png',
        fileExtension: '.png',
        position: {
          start: 332,
          end: 351,
        },
      },
      {
        fileExtension: '.png',
        filePath: 'template-image.png',
        position: {
          end: 411,
          start: 391,
        },
        specifier: './template-image.png',
      },
      {
        specifier: './index.js',
        filePath: 'index.js',
        fileExtension: '.js',
        position: {
          start: 471,
          end: 481,
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
      "import { foo } from './foo.9uiZ4EPEU-sB.js'\n\nexport function bar() {\n  return foo() + 'bar'\n}\n\n// eslint-disable-next-line no-undef\nnavigator.serviceWorker.register('./sw.L24XodW2kjLG.js')\n//# sourceMappingURL=index.MEc5qI_OWTs0.js.map\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'MEc5qI_OWTs0LyQo0UyaGfs0lf9aK1A-ar7D3blkeh3nLy089RAHuq9Ck7DbCnLXDRaMjjqniEVpLSMu_XBdHw',
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
      {
        specifier: './sw.js',
        filePath: 'sw.js',
        fileExtension: '.js',
        position: {
          start: 153,
          end: 160,
        },
      },
    ],
    sourceMap: {
      _tag: 'Some',
      value: 'index.js.map',
    },
    isBase64Encoded: false,
  },
  'standalone.tsx': {
    filePath: 'standalone.tsx',
    fileExtension: '.tsx',
    contents:
      "import * as React from 'react'\n\nexport function hello() {\n  return <span>world</span>\n}\n//# sourceMappingURL=standalone.vH8HkrOEKN9b.tsx.map\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'vH8HkrOEKN9bhWmZAgQ9seZYkqWJKhWHdcdZiXZMvxVEpf94jrz7n2EtzDT24LcXvl5HC6C5I2Qm8RHfXpTvGA',
      },
    },
    dependencies: [
      {
        specifier: 'react',
        filePath: '../node_modules/react/index.js',
        fileExtension: '.js',
        position: {
          start: 24,
          end: 29,
        },
      },
    ],
    sourceMap: {
      _tag: 'Some',
      value: 'standalone.tsx.map',
    },
    isBase64Encoded: false,
  },
  'sw.js': {
    filePath: 'sw.js',
    fileExtension: '.js',
    contents:
      "/* eslint-disable no-undef */\n\nself.addEventListener('fetch', function (event) {\n  event.respondWith(\n    caches.match(event.request).then(function (response) {\n      // Cache hit - return response\n      if (response) {\n        return response\n      }\n      return fetch(event.request)\n    }),\n  )\n})\n//# sourceMappingURL=sw.L24XodW2kjLG.js.map\n",
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'L24XodW2kjLGoVadRMl6opmCs0wCw1kHe6SARybth8tts0norWLz21yy5z1zyKkX0Obrubkq-d-kVu3bcFHh1g',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'Some',
      value: 'sw.js.map',
    },
    isBase64Encoded: false,
  },
  'template-image.png': {
    contentHash: {
      _tag: 'Some',
      value: {
        hash: 'MqBzdgoAuSgtLMGROZhTntRzB4ex3QR4NaQzK_TbfRrChHdwpEmkqYNt0dD1gm6Zq85TdGI6tL83hREBxp0aPA',
        type: 'hash',
      },
    },
    contents: 'dGVtcGxhdGUtaW1hZ2UK',
    dependencies: [],
    fileExtension: '.png',
    filePath: 'template-image.png',
    isBase64Encoded: true,
    sourceMap: {
      _tag: 'None',
    },
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
  'fake-image-x4.png': {
    filePath: 'fake-image-x4.png',
    fileExtension: '.png',
    contents: 'ZmFrZS1pbWFnZS00Cg==',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'ooKWSSJ0apZXZAsF68nKFwGT0sd1FK5WRHrXlocmwL4qHg_8cRwkVeTqPTGPxnLINsfj1QcTofOkTmzNKyrFHQ',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: true,
  },
  'fake-image-x3.png': {
    filePath: 'fake-image-x3.png',
    fileExtension: '.png',
    contents: 'ZmFrZS1pbWFnZS0zCg==',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'dnonbURMTOmAvCzGmAf_N2JmVrkUE_EMfRf3N5MmpuI0eVteIxa1XQgPT55I1ycVuoufyoTCwBxRFlkH7NmabQ',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: true,
  },
  'fake-image-x2.png': {
    filePath: 'fake-image-x2.png',
    fileExtension: '.png',
    contents: 'ZmFrZS1pbWFnZS0yCg==',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'ng0eXyXAgxHnX76c_PZEVlP50H_7jQ6kybXGBqSBcmGuumvOAOhkfWfwbZgsNqJxyrmKk2z9v40beg-atkqAFA',
      },
    },
    dependencies: [],
    sourceMap: {
      _tag: 'None',
    },
    isBase64Encoded: true,
  },
  'fake-image-x1.png': {
    filePath: 'fake-image-x1.png',
    fileExtension: '.png',
    contents: 'ZmFrZS1pbWFnZS0xCg==',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hash',
        hash: 'G6V284hJv-PYBFNLdmip8v3cCC1wJNXns45LPZXI0dcGmOHMuWhBY4y7dowjdal0K7AR2GpfqeeukNTt9k46Cg',
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
  'sw.js.map': {
    filePath: 'sw.js.map',
    fileExtension: '.js.map',
    contents:
      '{\n  "version": 3,\n  "file": "sw.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AAC7B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACjD,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACpB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AAC1D,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACpC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACrB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACvB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACP,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACjC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACP,CAAC,CAAC,CAAC;AACH,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "/*%20eslint-disable%20no-undef%20*/self.addEventListener(\'fetch\',%20function%20(event)%20%7B%20%20event.respondWith(%20%20%20%20caches.match(event.request).then(function%20(response)%20%7B%20%20%20%20%20%20//%20Cache%20hit%20-%20return%20response%20%20%20%20%20%20if%20(response)%20%7B%20%20%20%20%20%20%20%20return%20response%20%20%20%20%20%20%7D%20%20%20%20%20%20return%20fetch(event.request)%20%20%20%20%7D),%20%20)%7D)"\n  ],\n  "sourcesContent": [\n    "/* eslint-disable no-undef */\\n\\nself.addEventListener(\'fetch\', function (event) {\\n  event.respondWith(\\n    caches.match(event.request).then(function (response) {\\n      // Cache hit - return response\\n      if (response) {\\n        return response\\n      }\\n      return fetch(event.request)\\n    }),\\n  )\\n})\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'sw.js',
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
      '{\n  "version": 3,\n  "file": "index.js",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,qBAAQ,CAAC;AAC9B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACvB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACtB,CAAC;AACD;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACpC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,oBAAO,CAAC,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20%7B%20foo%20%7D%20from%20\'./foo.js\'export%20function%20bar()%20%7B%20%20return%20foo()%20+%20\'bar\'%7D//%20eslint-disable-next-line%20no-undefnavigator.serviceWorker.register(\'./sw.js\')"\n  ],\n  "sourcesContent": [\n    "import { foo } from \'./foo.js\'\\n\\nexport function bar() {\\n  return foo() + \'bar\'\\n}\\n\\n// eslint-disable-next-line no-undef\\nnavigator.serviceWorker.register(\'./sw.js\')\\n"\n  ]\n}',
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
  'standalone.tsx.map': {
    filePath: 'standalone.tsx.map',
    fileExtension: '.tsx.map',
    contents:
      '{\n  "version": 3,\n  "file": "standalone.tsx",\n  "mappings": "AAAA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AAC9B;AACA,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AACzB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;AAC3B,CAAC;",\n  "names": [],\n  "sources": [\n    "import%20*%20as%20React%20from%20\'react\'export%20function%20hello()%20%7B%20%20return%20%3Cspan%3Eworld%3C/span%3E%7D"\n  ],\n  "sourcesContent": [\n    "import * as React from \'react\'\\n\\nexport function hello() {\\n  return <span>world</span>\\n}\\n"\n  ]\n}',
    contentHash: {
      _tag: 'Some',
      value: {
        type: 'hashFor',
        filePath: 'standalone.tsx',
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

describe('hashDirectory', function () {
  this.timeout(5000)

  it('hashes a directory into a registry', function (done) {
    const test = Do(function* (_) {
      try {
        const registry = yield* _(hashDirectory(testDirectory))
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
      logger: (msg: string) =>
        fromIO(() => {
          console.log(msg)
        }),
    }
    const hashLength = 12

    pipe(
      test,
      provideSome<ReadFilePathEnv>({
        ...loggerEnv,
        readFilePath,
      }),
      provideSome<ReadDirectoryEnv>({
        ...loggerEnv,
        readDirectory: fsReadDirectory,
      }),
      provideSome<ReadDependenciesEnv>({
        ...documentRegistryEnv,
        ...loggerEnv,
        readDependencies: fsReadDependencies,
      }),
      provideSome<SortDocumentsEnv>({
        ...loggerEnv,
        sortDocuments: sortDiGraph,
      }),
      provideSome<RewriteSourceMapUrlsEnv>({
        ...documentRegistryEnv,
        ...loggerEnv,
        rewriteSourceMapUrls: () => rewriteSourceMapUrls(hashLength, true),
      }),
      provideSome<RewriteDependenciesEnv>({
        ...documentRegistryEnv,
        ...loggerEnv,
        rewriteDependencies: (documents) =>
          pipe(
            rewriteDependencies(documents),
            useSome<RewriteDependenciesImplementationEnv>({
              hashLength,
              directory: testDirectory,
              sourceMaps: true,
            }),
          ),
      }),
      execWith({}),
    )
  })
})
