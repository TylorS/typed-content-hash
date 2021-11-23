import { Eq } from 'fp-ts/Eq'
import { swap } from 'fp-ts/Tuple2'

import { DiGraph } from './DiGraph'
import { toDependencyMap } from './toDependencyMap'

export type DependentMap<A> = ReadonlyMap<A, ReadonlyArray<A>>

export function toDependentMap<A>(graph: DiGraph<A>, eq: Eq<A> = graph): DependentMap<A> {
  return toDependencyMap({ ...graph, edges: graph.edges.map(swap) }, eq)
}
