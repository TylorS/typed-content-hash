# @typed/content-hash

Rewrite a directory of static files with SHA-512 content hashes with first-class support for source maps and generate an asset manifest.

## Features 

- SHA-512 Content Hashes, with configurable length.
- [Topological Sort](https://www.npmjs.com/package/toposort)
  - Ensures long-term caching is safe.
- [TypeScript API](#API), with a simple plugin API.
- Generates Asset Manifest as JSON 
- Simple CLI
- [Generates](https://github.com/Rich-Harris/magic-string) and [remaps](https://github.com/ampproject/remapping) SourceMaps

## CLI

```sh
$ typed-content-hash --dir build

Options:
      --version           Show version number                          [boolean]
      --directory, --dir  The directory to apply content hashes
                                                             [string] [**required**]
      --assetManifest     Filename of asset manifest JSON
                                       [string] [default: "asset-manifest.json"]
  -h, --hashLength        Number of characters to slice from SHA-512 hash
                                                                        [number]
      --tsConfig          Relative path to tsconfig from CWD
                                             [string] [default: "tsconfig.json"]
      --baseUrl           Base URL to use when rewriting imports/exports[string]
      --help              Show help                                    [boolean]
```

## API 

For the moment `rewriteDirectory` is the main API function you'd be interested in using. The CLI is a small 
wrapper around running just this function.

> TODO: Write better documents :smile:

### rewriteDirectory :: RewriteDirectoryOptions -> Promise WrittenDirectory

```typescript
export function rewriteDirectory<Plugins extends ReadonlyArray<HashPluginFactory<any>>>(
  options: RewriteDirectoryOptions<Plugins>,
): Promise<WrittenDirectory> 

export type RewriteDirectoryOptions<Plugins extends ReadonlyArray<HashPluginFactory<any>>> = {
  readonly pluginEnv: HashPluginEnvs<Plugins>
  readonly directory: string
  readonly plugins: Plugins
  readonly hashLength: number
  readonly assetManifest: string
  readonly baseUrl?: string
  readonly logLevel?: LogLevel
  readonly logPrefix?: string
}

export type HashPluginFactory<E> = (options: HashPluginOptions, env: E) => HashPlugin

export interface HashPlugin extends RewriteFileContent, GenerateContentHashes, RewriteDocumentHashes {
  // Directory HashPlugin is configured to work within
  readonly directory: Directory
  // Configured HashLength max
  readonly hashLength: number
  // Supported File Extensions
  readonly fileExtensions: ReadonlyArray<FileExtension>
  // How to read documents of supported extensions
  readonly readDocument: (path: FilePath) => Pure<readonly [Document, Hashes['hashes']]>
}

export interface RewriteFileContent {
  readonly rewriteFileContent: (document: Document, hashes: ReadonlyMap<FilePath, ContentHash>) => Pure<Document>
}

export interface GenerateContentHashes {
  readonly generateContentHashes: (document: Document) => Pure<ReadonlyMap<FilePath, ContentHash>>
}


export interface RewriteDocumentHashes {
  readonly rewriteDocumentHashes: (
    documents: readonly Document[],
    hashes: ReadonlyMap<FilePath, ContentHash>,
  ) => Pure<readonly Document[]>
}
```

## Discussions

We've enabled [Github Discussions](https://github.com/TylorS/typed-content-hash/discussions) if you would ever like to reach out about anything related to the project!


## Related Projects

- [snowpack-plugin-hash](https://github.com/TylorS/snowpack-plugin-hash) - Uses library