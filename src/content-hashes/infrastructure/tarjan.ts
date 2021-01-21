export type DiGraph<A> = ReadonlyMap<A, ReadonlySet<A>>

export function tarjan<A>(graph: DiGraph<A>): ReadonlyArray<ReadonlyArray<A>> {
  const indices = new Map<A, number>()
  const lowlinks = new Map<A, number>()
  const onStack = new Set<A>()
  const stack: A[] = []
  const stronglyConnectedComponents: Array<ReadonlyArray<A>> = []

  let index = 0

  function strongConnect(v: A) {
    indices.set(v, index)
    lowlinks.set(v, index++)
    stack.push(v)
    onStack.add(v)

    const dependencies = graph.get(v)!

    for (const dependency of dependencies) {
      const hasNotBeenSeenBefore = !indices.has(dependency)

      if (hasNotBeenSeenBefore) {
        strongConnect(dependency)
      }

      if (hasNotBeenSeenBefore || onStack.has(dependency)) {
        const depIndex = hasNotBeenSeenBefore ? lowlinks.get(dependency)! : indices.get(dependency)!

        lowlinks.set(v, Math.min(lowlinks.get(v)!, depIndex))
      }
    }

    if (lowlinks.get(v)! === indices.get(v)) {
      const vertices = new Set<A>()

      let current: A | null = null
      while (v !== current) {
        current = stack.pop()!
        onStack.delete(current)
        vertices.add(current)
      }

      stronglyConnectedComponents.push(Array.from(vertices))
    }
  }

  for (const v of graph.keys()) {
    if (!indices.has(v)) {
      strongConnect(v)
    }
  }

  return stronglyConnectedComponents
}
