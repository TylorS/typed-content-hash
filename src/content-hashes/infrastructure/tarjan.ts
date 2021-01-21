export type DiGraph<A> = ReadonlyMap<A, ReadonlySet<A>>

export function tarjan<A>(graph: DiGraph<A>): ReadonlyArray<ReadonlyArray<A>> {
  const indices = new Map<A, number>()
  const lowlinks = new Map<A, number>()
  const onStack = new Set<A>()
  const stack: A[] = []
  const stronglyConnectedComponents: Array<ReadonlyArray<A>> = []

  let currentIndex = 0

  for (const v of graph.keys()) {
    if (!indices.has(v)) {
      strongConnect(v)
    }
  }

  function strongConnect(vertice: A) {
    indices.set(vertice, currentIndex)
    lowlinks.set(vertice, currentIndex)

    currentIndex++

    stack.push(vertice)
    onStack.add(vertice)

    const deps = graph.get(vertice)!
    const lowlink = lowlinks.get(vertice)!

    for (const dep of deps) {
      const hashIndex = indices.has(dep)
      const index = hashIndex ? indices.get(dep)! : lowlinks.get(dep)!

      if (hashIndex) {
        strongConnect(dep)
      }

      lowlinks.set(vertice, Math.min(lowlink, index))
    }

    if (lowlink === indices.get(vertice)) {
      const vertices = new Set<A>()

      let currentVertice: A | null = null
      while (vertice !== currentVertice) {
        currentVertice = stack.pop()!
        onStack.delete(currentVertice)
        vertices.add(currentVertice)
      }

      stronglyConnectedComponents.push(Array.from(vertices))
    }
  }

  return stronglyConnectedComponents
}
