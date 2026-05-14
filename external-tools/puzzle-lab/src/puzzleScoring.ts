import { gridPosKey, type GridPos } from "../../../src/core/grid/GridPos"
import type { PlacedShape } from "../../../src/core/puzzle/PlacedShape"
import { getPlacedCellPositions } from "../../../src/core/puzzle/shapePlacement"
import { rotateShapeCells } from "../../../src/core/shape/rotateShapeCells"
import { shapeDefinitions } from "../../../src/core/shape/shapeDefinitions"

export type PuzzleMetrics = {
  cellCount: number
  pieceCount: number
  crossContacts: number
  verticalContacts: number
  baseCount: number
  baseFootprint: number
  footprint: number
  levels: number
  maxY: number
  dx: number
  dz: number
  volume: number
  density: number
  centerPenalty: number
  symmetry: number
  heightVariance: number
  connectedness: number
}

export type PuzzleScore = {
  cohesion: number
  stability: number
  artistry: number
  overall: number
}

export type PuzzleScoreThresholds = {
  cohesion: number
  stability: number
  artistry: number
}

export function scorePuzzle(placedShapes: PlacedShape[]): {
  metrics: PuzzleMetrics
  scores: PuzzleScore
} {
  const metrics = getMetrics(placedShapes)

  return {
    metrics,
    scores: {
      cohesion: scoreCohesion(metrics),
      stability: scoreStability(metrics),
      artistry: scoreArtistry(metrics),
      overall: scoreOverall(metrics),
    },
  }
}

export function meetsScoreThresholds(
  scores: PuzzleScore,
  thresholds: PuzzleScoreThresholds,
): boolean {
  return scores.cohesion >= thresholds.cohesion &&
    scores.stability >= thresholds.stability &&
    scores.artistry >= thresholds.artistry
}

export function getMetrics(placedShapes: PlacedShape[]): PuzzleMetrics {
  const cells = getCellPositions(placedShapes)
  const cellKeys = new Set(cells.map(gridPosKey))
  const ownerByCell = new Map<string, string>()

  for (const placedShape of placedShapes) {
    for (const pos of getCellPositions([placedShape])) {
      ownerByCell.set(gridPosKey(pos), placedShape.shapeId)
    }
  }

  const xs = cells.map((cell) => cell.x)
  const ys = cells.map((cell) => cell.y)
  const zs = cells.map((cell) => cell.z)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  let crossContacts = 0
  let verticalContacts = 0

  for (const cell of cells) {
    for (const neighbor of [
      { x: cell.x + 1, y: cell.y, z: cell.z },
      { x: cell.x, y: cell.y + 1, z: cell.z },
      { x: cell.x, y: cell.y, z: cell.z + 1 },
    ]) {
      const neighborKey = gridPosKey(neighbor)

      if (!cellKeys.has(neighborKey)) {
        continue
      }

      if (ownerByCell.get(neighborKey) !== cell.shapeId) {
        crossContacts += 1
      }

      if (neighbor.y !== cell.y) {
        verticalContacts += 1
      }
    }
  }

  const baseCells = cells.filter((cell) => cell.y === 0)
  const footprint = new Set(cells.map((cell) => `${cell.x},${cell.z}`))
  const baseFootprint = new Set(baseCells.map((cell) => `${cell.x},${cell.z}`))
  const levels = new Set(cells.map((cell) => cell.y))
  const columns = new Map<string, number>()

  for (const cell of cells) {
    const key = `${cell.x},${cell.z}`
    columns.set(key, Math.max(columns.get(key) ?? 0, cell.y + 1))
  }

  const columnHeights = [...columns.values()]
  const averageHeight = columnHeights.reduce((sum, height) => sum + height, 0) /
    columnHeights.length
  const heightVariance = columnHeights.reduce(
    (sum, height) => sum + Math.abs(height - averageHeight),
    0,
  ) / columnHeights.length
  const centerPenalty = cells.reduce(
    (sum, cell) => sum + Math.abs(cell.x - 2) + Math.abs(cell.z - 2),
    0,
  ) / cells.length
  const mirrorX = cells.filter((cell) => cellKeys.has(gridPosKey({
    x: 4 - cell.x,
    y: cell.y,
    z: cell.z,
  }))).length / cells.length
  const mirrorZ = cells.filter((cell) => cellKeys.has(gridPosKey({
    x: cell.x,
    y: cell.y,
    z: 4 - cell.z,
  }))).length / cells.length
  const mirrorBoth = cells.filter((cell) => cellKeys.has(gridPosKey({
    x: 4 - cell.x,
    y: cell.y,
    z: 4 - cell.z,
  }))).length / cells.length
  const volume = (maxX - minX + 1) * (maxY + 1) * (maxZ - minZ + 1)

  return {
    cellCount: cells.length,
    pieceCount: placedShapes.length,
    crossContacts,
    verticalContacts,
    baseCount: baseCells.length,
    baseFootprint: baseFootprint.size,
    footprint: footprint.size,
    levels: levels.size,
    maxY,
    dx: maxX - minX + 1,
    dz: maxZ - minZ + 1,
    volume,
    density: cells.length / volume,
    centerPenalty,
    symmetry: Math.max(mirrorX, mirrorZ, mirrorBoth * 0.95),
    heightVariance,
    connectedness: getConnectedness(cells),
  }
}

function scoreCohesion(metrics: PuzzleMetrics): number {
  const contacts = clamp01(metrics.crossContacts / Math.max(1, metrics.pieceCount * 2.3))
  const density = clamp01(1 - Math.abs(metrics.density - 0.56) / 0.5)
  const spanBalance = clamp01(1 - Math.abs(metrics.dx - metrics.dz) / 5)

  return toPercent(
    metrics.connectedness * 0.36 +
    contacts * 0.34 +
    density * 0.18 +
    spanBalance * 0.12,
  )
}

function scoreStability(metrics: PuzzleMetrics): number {
  const baseCoverage = clamp01(metrics.baseFootprint / Math.max(1, metrics.footprint * 0.58))
  const baseCells = clamp01(metrics.baseCount / Math.max(1, metrics.cellCount * 0.28))
  const center = clamp01(1 - metrics.centerPenalty / 3.5)
  const notTooTall = clamp01(1 - Math.max(0, metrics.maxY - 3) / 2)

  return toPercent(
    baseCoverage * 0.42 +
    baseCells * 0.24 +
    center * 0.22 +
    notTooTall * 0.12,
  )
}

function scoreArtistry(metrics: PuzzleMetrics): number {
  const symmetry = metrics.symmetry
  const rhythm = clamp01(metrics.heightVariance / 1.55)
  const verticalPresence = clamp01((metrics.levels - 1) / 4 + metrics.verticalContacts / 32)
  const composition = clamp01(1 - Math.abs(metrics.dx - metrics.dz) / 4.5)
  const center = clamp01(1 - metrics.centerPenalty / 3.8)

  return toPercent(
    symmetry * 0.32 +
    rhythm * 0.22 +
    verticalPresence * 0.22 +
    composition * 0.14 +
    center * 0.10,
  )
}

function scoreOverall(metrics: PuzzleMetrics): number {
  const scores = {
    cohesion: scoreCohesion(metrics),
    stability: scoreStability(metrics),
    artistry: scoreArtistry(metrics),
  }

  return scores.cohesion * 0.38 + scores.stability * 0.34 + scores.artistry * 0.28
}

function getConnectedness(cells: GridPos[]): number {
  if (cells.length === 0) {
    return 0
  }

  const cellKeys = new Set(cells.map(gridPosKey))
  const visited = new Set<string>()
  const queue = [cells[0]!]

  while (queue.length > 0) {
    const cell = queue.shift()!
    const key = gridPosKey(cell)

    if (visited.has(key)) {
      continue
    }

    visited.add(key)

    for (const neighbor of [
      { x: cell.x + 1, y: cell.y, z: cell.z },
      { x: cell.x - 1, y: cell.y, z: cell.z },
      { x: cell.x, y: cell.y + 1, z: cell.z },
      { x: cell.x, y: cell.y - 1, z: cell.z },
      { x: cell.x, y: cell.y, z: cell.z + 1 },
      { x: cell.x, y: cell.y, z: cell.z - 1 },
    ]) {
      const neighborKey = gridPosKey(neighbor)

      if (cellKeys.has(neighborKey) && !visited.has(neighborKey)) {
        queue.push(neighbor)
      }
    }
  }

  return visited.size / cells.length
}

function getCellPositions(placedShapes: PlacedShape[]): Array<GridPos & { shapeId: string }> {
  return placedShapes.flatMap((placedShape) => {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`Unknown shapeId: ${placedShape.shapeId}`)
    }

    return getPlacedCellPositions(
      placedShape.origin,
      rotateShapeCells(shape.cells, placedShape.rotation),
    ).map((pos) => ({ ...pos, shapeId: placedShape.shapeId }))
  })
}

function toPercent(value: number): number {
  return Math.round(clamp01(value) * 1000) / 10
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
