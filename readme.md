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
                                                             [string] [required]
      --assetManifest     Filename of asset manifest JSON
                                       [string] [default: "asset-manifest.json"]
  -h, --hashLength        Number of characters to slice from SHA-512 hash
                                                                        [number]
      --tsConfig          Relative path to tsconfig from CWD
                                             [string] [default: "tsconfig.json"]
      --baseUrl           Base URL to use when rewriting imports/exports[string]
      --logLevel  [string] [choices: "debug", "info", "error"] [default: "info"]
      --help              Show help                                    [boolean]
```

## API 

For the moment `contentHashDirectory` is the main API function you'd be interested in using. The CLI is a small wrapper around running just this function. 

There is a plugin API available to expand support to additional file extensions besides the default supported files. If you're interested in this take a look at `src/content-hashes/infrastructure/plugins` for examples of
the default plugins.

### contentHashDirectory :: ContentHashOptions -> Promise DocumentRegistry

#### Basic Example

```typescript
import { contentHashDirectory, createDefaultPlugins } from '@typed/content-hash'
import { join } from 'path'

async function main() {
  const registry: DocumentRegistry = await contentHashDirectory({ 
    directory: '/path/to/directory', 
    plugins: createDefaultPlugins({ buildDirectory: '/path/to/directory' })  
  })
}

main()
```

## Discussions

We've enabled [Github Discussions](https://github.com/TylorS/typed-content-hash/discussions) if you would ever like to reach out about anything related to the project!


## Related Projects

- [snowpack-plugin-hash](https://github.com/TylorS/snowpack-plugin-hash) - Uses library