const NODE_COLOR = {
  spawn: '#6c9a5e',
  extract: '#c9a961',
  landmark: '#8c8a76',
}

function px(map, x, y) {
  const [, , vw, vh] = map.viewBox.split(' ').map(Number)
  return [(x / 100) * vw, (y / 100) * vh]
}

export default function MapView({ map, spawnId, extractId, route, onNodeClick }) {
  const [, , vw, vh] = map.viewBox.split(' ').map(Number)
  const nodesById = new Map(map.nodes.map((n) => [n.id, n]))

  const routeNodeIds = new Set(route?.path ?? [])
  const routePoints = (route?.path ?? []).map((id) => {
    const node = nodesById.get(id)
    return px(map, node.x, node.y)
  })
  const routePointsStr = routePoints.map(([x, y]) => `${x},${y}`).join(' ')

  const waypointStops = route?.legs?.map((leg) => leg.to).slice(0, -1) ?? []

  return (
    <svg viewBox={map.viewBox} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={vw} height={vh} fill="var(--bg-raised)" />

      {/* Optional real map background — drop a matching image into /public/maps/
          (see README) and it renders under the node graph. Silently absent otherwise. */}
      {map.image && <image href={map.image} x={0} y={0} width={vw} height={vh} preserveAspectRatio="xMidYMid slice" opacity={0.55} />}

      {/* base graph edges */}
      <g stroke="var(--border)" strokeWidth={1.5} opacity={0.6}>
        {map.edges.map((edge, i) => {
          const a = nodesById.get(edge.from)
          const b = nodesById.get(edge.to)
          if (!a || !b) return null
          const [ax, ay] = px(map, a.x, a.y)
          const [bx, by] = px(map, b.x, b.y)
          return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} />
        })}
      </g>

      {/* danger halos */}
      {map.nodes
        .filter((n) => n.danger >= 6)
        .map((n) => {
          const [x, y] = px(map, n.x, n.y)
          const r = 16 + n.danger * 2.2
          return (
            <circle
              key={`halo-${n.id}`}
              cx={x}
              cy={y}
              r={r}
              fill="var(--danger-glow)"
              stroke="var(--danger)"
              strokeOpacity={0.35}
              strokeWidth={1}
            />
          )
        })}

      {/* planned route */}
      {routePoints.length > 1 && <polyline className="route-path" points={routePointsStr} />}

      {/* numbered waypoint stops (spawn is 0, quest stops 1..n, extract last) */}
      {route &&
        [route.legs[0]?.from, ...waypointStops, route.legs.at(-1)?.to].filter(Boolean).map((id, i, arr) => {
          const node = nodesById.get(id)
          if (!node) return null
          const [x, y] = px(map, node.x, node.y)
          return (
            <g key={`stop-${id}-${i}`}>
              <circle cx={x} cy={y} r={13} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
              <text x={x} y={y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill="var(--accent)">
                {i}
              </text>
            </g>
          )
        })}

      {/* nodes */}
      {map.nodes.map((n) => {
        const [x, y] = px(map, n.x, n.y)
        const isSpawn = n.id === spawnId
        const isExtract = n.id === extractId
        const onRoute = routeNodeIds.has(n.id)
        const baseColor = NODE_COLOR[n.type] ?? '#8c8a76'
        const r = n.type === 'landmark' ? 5 : 7

        return (
          <g key={n.id} onClick={() => onNodeClick?.(n)} className="node-circle">
            <circle
              cx={x}
              cy={y}
              r={isSpawn || isExtract ? r + 3 : r}
              fill={baseColor}
              stroke={isSpawn || isExtract ? 'var(--accent)' : onRoute ? 'var(--accent)' : 'var(--bg)'}
              strokeWidth={isSpawn || isExtract ? 2.5 : 1}
              opacity={n.type === 'landmark' ? 0.85 : 1}
            />
            {n.requiredItem && (
              <text x={x} y={y - r - 6} textAnchor="middle" fontSize={9} fill="var(--danger-bright)">
                🔒
              </text>
            )}
            <text x={x} y={y + r + 11} textAnchor="middle" className="node-label">
              {n.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
