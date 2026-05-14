import { DEFAULT_GRID_BOUNDS } from "../../../src/core/grid/GridBounds"
import { gridPosKey, type GridPos } from "../../../src/core/grid/GridPos"
import type { PuzzleExport } from "../../../src/core/puzzle/PuzzleExport"
import type { PlacedShape } from "../../../src/core/puzzle/PlacedShape"
import {
  getPlacedCellPositions,
  isShapeInsideGrid,
} from "../../../src/core/puzzle/shapePlacement"
import type { LocalCellPos } from "../../../src/core/shape/ShapeDefinition"
import { rotateShapeCells, type ShapeRotation } from "../../../src/core/shape/rotateShapeCells"
import { shapeDefinitions } from "../../../src/core/shape/shapeDefinitions"
import { loadSupabaseEnv } from "./env"
import {
  createSupabaseClient,
  type PuzzleDifficulty,
  type SupabasePuzzleRow,
} from "./supabaseRest"
import { getPuzzleCellKeys, validatePuzzleExport } from "./puzzleValidation"

type ShapeVariant = {
  shapeId: string
  rotation: ShapeRotation
  cells: LocalCellPos[]
}

type PuzzleSpec = {
  difficulty: PuzzleDifficulty
  title: string
  pieces: number[]
  minBase: number
  minBaseFootprint: number
  minFootprint: number
  minLevels: number
  maxLevels?: number
  prefersTall?: boolean
  attempts: number
  minScore: number
}

type PuzzleMetrics = {
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
}

type Candidate = {
  placedShapes: PlacedShape[]
  metrics: PuzzleMetrics
  score: number
  signature: string
}

const titlePrefix = getTitlePrefix()

const specs: PuzzleSpec[] = [
  {
    difficulty: "easy",
    title: createTitle("Easy", 1),
    pieces: [3, 4],
    minBase: 5,
    minBaseFootprint: 4,
    minFootprint: 5,
    minLevels: 2,
    maxLevels: 4,
    attempts: 2400,
    minScore: 425,
  },
  {
    difficulty: "easy",
    title: createTitle("Easy", 2),
    pieces: [4],
    minBase: 6,
    minBaseFootprint: 5,
    minFootprint: 6,
    minLevels: 2,
    maxLevels: 4,
    attempts: 2400,
    minScore: 425,
  },
  {
    difficulty: "normal",
    title: createTitle("Normal", 1),
    pieces: [5],
    minBase: 7,
    minBaseFootprint: 6,
    minFootprint: 8,
    minLevels: 3,
    attempts: 3000,
    minScore: 450,
  },
  {
    difficulty: "normal",
    title: createTitle("Normal", 2),
    pieces: [5, 6],
    minBase: 8,
    minBaseFootprint: 6,
    minFootprint: 8,
    minLevels: 3,
    attempts: 3000,
    minScore: 460,
  },
  {
    difficulty: "hard",
    title: createTitle("Hard", 1),
    pieces: [6, 7],
    minBase: 8,
    minBaseFootprint: 6,
    minFootprint: 9,
    minLevels: 3,
    prefersTall: true,
    attempts: 4200,
    minScore: 520,
  },
  {
    difficulty: "hard",
    title: createTitle("Hard", 2),
    pieces: [7, 8],
    minBase: 9,
    minBaseFootprint: 7,
    minFootprint: 10,
    minLevels: 3,
    prefersTall: true,
    attempts: 4200,
    minScore: 530,
  },
  {
    difficulty: "challenge",
    title: createTitle("Challenge", 1),
    pieces: [8, 9],
    minBase: 10,
    minBaseFootprint: 7,
    minFootprint: 11,
    minLevels: 4,
    prefersTall: true,
    attempts: 4800,
    minScore: 550,
  },
  {
    difficulty: "challenge",
    title: createTitle("Challenge", 2),
    pieces: [9],
    minBase: 10,
    minBaseFootprint: 8,
    minFootprint: 12,
    minLevels: 4,
    prefersTall: true,
    attempts: 5200,
    minScore: 550,
  },
]

const variantsByShape = new Map<string, ShapeVariant[]>()

for (const shape of shapeDefinitions) {
  const variants: ShapeVariant[] = []
  const seen = new Set<string>()

  for (const rotation of getRotationStates()) {
    const cells = rotateShapeCells(shape.cells, rotation)
    const key = cells.map(gridPosKey).join("|")

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    variants.push({ shapeId: shape.id, rotation, cells })
  }

  variantsByShape.set(shape.id, variants)
}

async function main() {
  const client = createSupabaseClient(loadSupabaseEnv())
  const existingRows = await client.fetchPuzzles()
  const existingTitles = new Set(existingRows.map((row) => row.title))
  const existingSignatures = new Set(
    existingRows.map((row) => signature(row.placed_shapes)),
  )
  const rows: SupabasePuzzleRow[] = []

  for (const spec of specs) {
    if (existingTitles.has(spec.title)) {
      console.log(`skip existing: ${spec.title}`)
      continue
    }

    const candidate = generateCandidate(spec, existingSignatures)
    const puzzle: PuzzleExport = {
      version: 1,
      grid: DEFAULT_GRID_BOUNDS,
      placedShapes: candidate.placedShapes,
    }

    validatePuzzleExport(puzzle)
    existingSignatures.add(candidate.signature)
    rows.push({
      id: `codex-art-${spec.difficulty}-${Date.now()}-${rows.length + 1}`,
      difficulty: spec.difficulty,
      title: spec.title,
      grid: puzzle.grid,
      placed_shapes: puzzle.placedShapes,
    })

    console.log(formatCandidate(spec.title, candidate))
  }

  await client.insertPuzzles(rows)

  console.log(`Inserted ${rows.length} puzzle(s).`)
}

function generateCandidate(spec: PuzzleSpec, usedSignatures: Set<string>): Candidate {
  const candidates: Candidate[] = []

  for (let index = 0; index < spec.attempts; index += 1) {
    const pieceCount = randomItem(spec.pieces)
    const placedShapes = buildPuzzle(pieceCount)

    if (!placedShapes) {
      continue
    }

    const puzzle: PuzzleExport = {
      version: 1,
      grid: DEFAULT_GRID_BOUNDS,
      placedShapes,
    }

    try {
      validatePuzzleExport(puzzle)
    } catch {
      continue
    }

    const currentSignature = signature(placedShapes)

    if (usedSignatures.has(currentSignature)) {
      continue
    }

    const metrics = getMetrics(placedShapes)
    const score = scoreCandidate(metrics, spec)

    if (score === null || score < spec.minScore) {
      continue
    }

    candidates.push({
      placedShapes,
      metrics,
      score,
      signature: currentSignature,
    })
  }

  candidates.sort((a, b) => b.score - a.score)

  if (!candidates[0]) {
    throw new Error(`Could not generate puzzle: ${spec.title}`)
  }

  return candidates[0]
}

function buildPuzzle(pieceCount: number): PlacedShape[] | null {
  const shapeIds = sample(shapeDefinitions.map((shape) => shape.id), pieceCount)
  const placedShapes: PlacedShape[] = []
  const occupiedCells = new Set<string>()

  for (const shapeId of shapeIds) {
    let placedShape: PlacedShape | null = null
    const existingCells = getCellPositions(placedShapes)

    for (const variant of shuffle(variantsByShape.get(shapeId) ?? [])) {
      for (const origin of getCandidateOrigins(variant, existingCells).slice(0, 180)) {
        const candidateCells = getPlacedCellPositions(origin, variant.cells)

        if (!canPlaceWithPhysicalSupport(candidateCells, occupiedCells)) {
          continue
        }

        placedShape = {
          shapeId,
          origin,
          rotation: variant.rotation,
        }
        break
      }

      if (placedShape) {
        break
      }
    }

    if (!placedShape) {
      return null
    }

    placedShapes.push(placedShape)

    for (const pos of getCellPositions([placedShape])) {
      occupiedCells.add(gridPosKey(pos))
    }
  }

  return placedShapes
}

function getCandidateOrigins(variant: ShapeVariant, existingCells: GridPos[]): GridPos[] {
  const origins: GridPos[] = []
  const existingCellKeys = new Set(existingCells.map(gridPosKey))

  if (existingCells.length === 0) {
    for (const cell of variant.cells) {
      for (let x = 0; x < DEFAULT_GRID_BOUNDS.width; x += 1) {
        for (let z = 0; z < DEFAULT_GRID_BOUNDS.depth; z += 1) {
          origins.push({ x: x - cell.x, y: -cell.y, z: z - cell.z })
        }
      }
    }

    return shuffle(origins)
  }

  for (const base of existingCells) {
    for (const target of [
      { x: base.x + 1, y: base.y, z: base.z },
      { x: base.x - 1, y: base.y, z: base.z },
      { x: base.x, y: base.y, z: base.z + 1 },
      { x: base.x, y: base.y, z: base.z - 1 },
      { x: base.x, y: base.y + 1, z: base.z },
    ]) {
      if (
        !isInsideBounds(target) ||
        existingCellKeys.has(gridPosKey(target))
      ) {
        continue
      }

      for (const cell of variant.cells) {
        origins.push({
          x: target.x - cell.x,
          y: target.y - cell.y,
          z: target.z - cell.z,
        })
      }
    }
  }

  return shuffle(origins)
}

function canPlaceWithPhysicalSupport(
  cells: GridPos[],
  occupiedCells: Set<string>,
): boolean {
  const ownCells = new Set(cells.map(gridPosKey))

  if (!isShapeInsideGrid({ x: 0, y: 0, z: 0 }, cells, DEFAULT_GRID_BOUNDS)) {
    return false
  }

  for (const cell of cells) {
    if (occupiedCells.has(gridPosKey(cell))) {
      return false
    }

    if (cell.y === 0) {
      continue
    }

    const belowKey = gridPosKey({
      x: cell.x,
      y: cell.y - 1,
      z: cell.z,
    })

    if (!occupiedCells.has(belowKey) && !ownCells.has(belowKey)) {
      return false
    }
  }

  return true
}

function scoreCandidate(metrics: PuzzleMetrics, spec: PuzzleSpec): number | null {
  if (
    metrics.baseCount < spec.minBase ||
    metrics.baseFootprint < spec.minBaseFootprint ||
    metrics.footprint < spec.minFootprint ||
    metrics.levels < spec.minLevels ||
    (spec.maxLevels !== undefined && metrics.levels > spec.maxLevels)
  ) {
    return null
  }

  const balancedSpan = 1 - Math.abs(metrics.dx - metrics.dz) / 5
  const baseComfort = Math.min(1, metrics.baseFootprint / Math.max(4, metrics.footprint * 0.55))
  const verticalPresence = Math.min(1, (metrics.levels - 1) / 4 + metrics.verticalContacts / 30)
  const cohesion = Math.min(1, metrics.crossContacts / Math.max(1, metrics.pieceCount * 2.1))
  const center = Math.max(0, 1 - metrics.centerPenalty / 3.4)
  const rhythm = Math.min(1, metrics.heightVariance / 1.6)
  const density = Math.max(0, 1 - Math.abs(metrics.density - 0.55))
  const tallBonus = spec.prefersTall ? Math.min(35, metrics.maxY * 9 + metrics.levels * 3) : 0
  const crowdPenalty = metrics.volume > 90 ? (metrics.volume - 90) * 0.8 : 0

  return (
    metrics.symmetry * 90 +
    balancedSpan * 45 +
    baseComfort * 55 +
    verticalPresence * 70 +
    cohesion * 62 +
    center * 50 +
    rhythm * 42 +
    density * 28 +
    metrics.crossContacts * 2.6 +
    metrics.verticalContacts * 1.5 +
    tallBonus -
    crowdPenalty
  )
}

function getMetrics(placedShapes: PlacedShape[]): PuzzleMetrics {
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
  const minY = Math.min(...ys)
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
  const volume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1)

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
  }
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

function signature(placedShapes: PlacedShape[]): string {
  return [...getPuzzleCellKeys(placedShapes)].sort().join("|")
}

function getRotationStates(): ShapeRotation[] {
  const rotations: ShapeRotation[] = []

  for (const x of [0, 1, 2, 3]) {
    for (const y of [0, 1, 2, 3]) {
      for (const z of [0, 1, 2, 3]) {
        rotations.push({ x, y, z })
      }
    }
  }

  return rotations
}

function isInsideBounds(pos: GridPos): boolean {
  return (
    pos.x >= 0 &&
    pos.x < DEFAULT_GRID_BOUNDS.width &&
    pos.y >= 0 &&
    pos.y < DEFAULT_GRID_BOUNDS.height &&
    pos.z >= 0 &&
    pos.z < DEFAULT_GRID_BOUNDS.depth
  )
}

function sample<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count)
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]!

    copy[index] = copy[swapIndex]!
    copy[swapIndex] = current
  }

  return copy
}

function formatCandidate(title: string, candidate: Candidate): string {
  const metrics = candidate.metrics

  return [
    title,
    `score=${candidate.score.toFixed(1)}`,
    `pieces=${metrics.pieceCount}`,
    `cells=${metrics.cellCount}`,
    `base=${metrics.baseCount}/${metrics.baseFootprint}`,
    `levels=${metrics.levels}`,
    `symmetry=${metrics.symmetry.toFixed(2)}`,
    `contacts=${metrics.crossContacts}`,
  ].join(" | ")
}

function getTitlePrefix(): string {
  const value = process.env.PUZZLE_LAB_TITLE_PREFIX?.trim()

  return value || "Codex Art"
}

function createTitle(difficultyLabel: string, index: number): string {
  return `${titlePrefix} ${difficultyLabel} ${index}`
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
