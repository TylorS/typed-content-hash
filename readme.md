# @typed/content-hash

Rewrite a directory of static files with SHA-512 content hashes with first-class support for source maps and generate an asset manifest.

## Features 

- SHA-512 Content Hashes, with configurable length.
- [Topological Sort](https://www.npmjs.com/package/toposort)
  - Ensures long-term caching is safe.
- [TypeScript API](#API), with a simple plugin API.
- Generates Asset Manifest as JSON 
- Simple CLI
- [Generates](https://github.com/Rich-Harris/magic-string) and remaps SourceMaps

## CLI

```sh
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

This is currently in flux until a proper v1. Follow the re-exports from `src/index.ts` for now or [open a discussion](#Discussions).

If you're looking for plugins you'll currently want to poke in `src/content-hashes/infrastructure/provideHashDirectoryEnv/HashPlugin.ts`

## Discussions

We've enabled [Github Discussions](https://github.com/TylorS/typed-content-hash/discussions) if you would ever like to reach out about anything related to the project!

## TODO

- [ ] Support Rewriting HTML links/scripts/etc