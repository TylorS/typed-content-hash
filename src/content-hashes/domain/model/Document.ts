import { RawSourceMap } from '@ampproject/remapping/dist/types/types'
import { createRuntimeSchema, createSchema, RuntimeSchema } from '@typed/fp'
import { pipe } from 'fp-ts/function'
import { Option } from 'fp-ts/Option'

import { FileContents } from './FileContents'
import { FileExtension } from './FileExtension'
import { FilePath } from './FilePath'
import { ModuleSpecifier } from './ModuleSpecifier'

export interface Document {
  readonly filePath: FilePath
  readonly fileExtension: FileExtension
  readonly contents: FileContents
  readonly dependencies: ReadonlyArray<Dependency>
  readonly sourceMap: Option<SourceMap>
  readonly dts: Option<Document>
  readonly supportsHashes: boolean
}

export interface Dependency {
  readonly specifier: ModuleSpecifier
  readonly filePath: FilePath
  readonly fileExtension: FileExtension
  readonly position: readonly [start: number, end: number]
}

export interface SourceMap {
  readonly raw: RawSourceMap
  readonly proxy: Option<Document> // Snowpack uses JS files as a proxy for source maps so it can reload them as ES modules
}

export namespace SourceMap {
  const rawSourceMapSchema = createSchema<RawSourceMap>((t) =>
    pipe(
      t.type({
        file: t.string,
        mappings: t.string,
        names: t.array(t.string),
        sources: t.array(t.string),
        version: t.literal(3),
      }),
      t.intersect(
        t.partial({
          sourceRoot: t.string,
          sourcesContent: t.array(t.string),
        }),
      ),
    ),
  )

  export const schema = createRuntimeSchema<SourceMap>((t) =>
    t.type({
      raw: rawSourceMapSchema(t),
      proxy: t.option(t.lazy('Document', () => Document.schema(t))),
    }),
  )
}

export namespace Document {
  export const schema: RuntimeSchema<Document> = createRuntimeSchema<Document>((t) =>
    t.type({
      filePath: FilePath.schema(t),
      fileExtension: FileExtension.schema(t),
      contents: FileContents.schema(t),
      dependencies: t.array(
        t.type({
          specifier: ModuleSpecifier.schema(t),
          filePath: FilePath.schema(t),
          fileExtension: FileExtension.schema(t),
          position: t.tuple(t.number, t.number),
        }),
      ),
      sourceMap: t.option(SourceMap.schema(t)),
      dts: t.option(t.lazy('Document', () => Document.schema(t))),
      supportsHashes: t.boolean,
    }),
  )
}
