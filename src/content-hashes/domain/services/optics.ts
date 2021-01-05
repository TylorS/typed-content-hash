import { Lens, Optional } from 'monocle-ts'

import { Document, SourceMap } from '../model'

export const documentOptionalProp = Optional.fromOptionProp<Document>()
export const sourceMapOptionalProp = Optional.fromOptionProp<SourceMap>()
export const sourceMapLensProp = Lens.fromProp<SourceMap>()

export const sourceMapRaw = sourceMapLensProp('raw')
export const sourceMapProxy = sourceMapOptionalProp('proxy')

export const documentSourceMap = documentOptionalProp('sourceMap')
export const documentRawSourceMap = documentSourceMap.composeLens(sourceMapRaw)
export const documentSourceMapProxy = documentSourceMap.composeOptional(sourceMapProxy)
export const documentDts = documentOptionalProp('dts')
