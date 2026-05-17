import { DEFAULT_GRID_BOUNDS } from "../../../src/core/grid/GridBounds"
import { gridPosKey, type GridPos } from "../../../src/core/grid/GridPos"
import {
  formatDifficulty,
  isPuzzleDifficulty,
  type PuzzleDifficulty,
} from "../../../src/core/puzzle/PuzzleDifficulty"
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
  type SupabasePuzzleRow,
} from "./supabaseRest"
import { getPuzzleCellKeys, validatePuzzleExport } from "./puzzleValidation"
import {
  meetsScoreThresholds,
  scorePuzzle,
  type PuzzleMetrics,
  type PuzzleScore,
  type PuzzleScoreThresholds,
} from "./puzzleScoring"

type ShapeVariant = {
  shapeId: string
  rotation: ShapeRotation
  cells: LocalCellPos[]
}

type PuzzleSpec = {
  difficulty: PuzzleDifficulty
  title: string
  label: string
  pieces: number[]
  minBase: number
  minBaseFootprint: number
  minFootprint: number
  minLevels: number
  maxLevels?: number
  attempts: number
  thresholds: PuzzleScoreThresholds
}

type GeneratorOptions = {
  dryRun: boolean
  attemptsMultiplier: number
  thresholds: Partial<PuzzleScoreThresholds>
  difficulty?: PuzzleDifficulty
  count?: number
}

type Candidate = {
  placedShapes: PlacedShape[]
  metrics: PuzzleMetrics
  scores: PuzzleScore
  signature: string
}

const titlePrefix = getTitlePrefix()
const options = getGeneratorOptions()

const profiles: Array<Omit<PuzzleSpec, "title">> = [
  {
    difficulty: "beginner",
    label: "Little Steps",
    pieces: [2],
    minBase: 4,
    minBaseFootprint: 4,
    minFootprint: 4,
    minLevels: 1,
    maxLevels: 3,
    attempts: 1800,
    thresholds: createThresholds({ cohesion: 42, stability: 70, artistry: 20 }),
  },
  {
    difficulty: "beginner",
    label: "First Tower",
    pieces: [2],
    minBase: 5,
    minBaseFootprint: 4,
    minFootprint: 5,
    minLevels: 2,
    maxLevels: 3,
    attempts: 1800,
    thresholds: createThresholds({ cohesion: 44, stability: 70, artistry: 22 }),
  },
  {
    difficulty: "easy",
    label: "Pocket Bridge",
    pieces: [3],
    minBase: 5,
    minBaseFootprint: 4,
    minFootprint: 5,
    minLevels: 2,
    maxLevels: 4,
    attempts: 2400,
    thresholds: createThresholds({ cohesion: 48, stability: 66, artistry: 28 }),
  },
  {
    difficulty: "easy",
    label: "Clear Corner",
    pieces: [4],
    minBase: 6,
    minBaseFootprint: 5,
    minFootprint: 6,
    minLevels: 2,
    maxLevels: 3,
    attempts: 3000,
    thresholds: createThresholds({ cohesion: 53, stability: 70, artistry: 30 }),
  },
  {
    difficulty: "normal",
    label: "Steady Cross",
    pieces: [4, 5],
    minBase: 6,
    minBaseFootprint: 5,
    minFootprint: 7,
    minLevels: 2,
    maxLevels: 4,
    attempts: 3000,
    thresholds: createThresholds({ cohesion: 54, stability: 64, artistry: 34 }),
  },
  {
    difficulty: "normal",
    label: "Simple Spire",
    pieces: [6],
    minBase: 8,
    minBaseFootprint: 7,
    minFootprint: 8,
    minLevels: 3,
    maxLevels: 4,
    attempts: 4200,
    thresholds: createThresholds({ cohesion: 60, stability: 70, artistry: 36 }),
  },
  {
    difficulty: "hard",
    label: "Folded Keep",
    pieces: [5, 6],
    minBase: 8,
    minBaseFootprint: 6,
    minFootprint: 8,
    minLevels: 3,
    attempts: 4200,
    thresholds: createThresholds({ cohesion: 58, stability: 62, artistry: 40 }),
  },
  {
    difficulty: "hard",
    label: "Clean Labyrinth",
    pieces: [7],
    minBase: 9,
    minBaseFootprint: 7,
    minFootprint: 10,
    minLevels: 3,
    attempts: 5200,
    thresholds: createThresholds({ cohesion: 64, stability: 68, artistry: 42 }),
  },
  {
    difficulty: "expert",
    label: "Impossible Garden",
    pieces: [7, 8],
    minBase: 9,
    minBaseFootprint: 7,
    minFootprint: 10,
    minLevels: 4,
    attempts: 4600,
    thresholds: createThresholds({ cohesion: 61, stability: 61, artistry: 48 }),
  },
  {
    difficulty: "expert",
    label: "Glass Cathedral",
    pieces: [8, 9],
    minBase: 10,
    minBaseFootprint: 7,
    minFootprint: 11,
    minLevels: 4,
    attempts: 5600,
    thresholds: createThresholds({ cohesion: 64, stability: 62, artistry: 50 }),
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
  const nextOrderIndexByDifficulty = getNextOrderIndexByDifficulty(existingRows)
  const specs = createSpecs(existingRows)
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
      order_index: nextOrderIndexByDifficulty.get(spec.difficulty) ?? 0,
      is_published: true,
      grid: puzzle.grid,
      placed_shapes: puzzle.placedShapes,
    })
    nextOrderIndexByDifficulty.set(
      spec.difficulty,
      (nextOrderIndexByDifficulty.get(spec.difficulty) ?? 0) + 1,
    )

    console.log(formatCandidate(spec.title, candidate))
  }

  if (options.dryRun) {
    console.log(`Dry run only. Generated ${rows.length} puzzle(s), inserted 0.`)
    return
  }

  await client.insertPuzzles(rows)

  console.log(`Inserted ${rows.length} puzzle(s).`)
}

function getNextOrderIndexByDifficulty(
  rows: SupabasePuzzleRow[],
): Map<PuzzleDifficulty, number> {
  const result = new Map<PuzzleDifficulty, number>()

  for (const row of rows) {
    result.set(
      row.difficulty,
      Math.max(result.get(row.difficulty) ?? 0, row.order_index + 1),
    )
  }

  return result
}

function createSpecs(existingRows: SupabasePuzzleRow[]): PuzzleSpec[] {
  const availableProfiles = options.difficulty
    ? profiles.filter((profile) => profile.difficulty === options.difficulty)
    : profiles

  if (availableProfiles.length === 0) {
    throw new Error(`No generator profiles found for: ${String(options.difficulty)}`)
  }

  const titleCountsByDifficulty = getNextTitleCountByDifficulty(existingRows)
  const requestedCount = options.count ?? availableProfiles.length
  const result: PuzzleSpec[] = []

  for (let index = 0; index < requestedCount; index += 1) {
    const profile = options.count === undefined
      ? availableProfiles[index % availableProfiles.length]!
      : randomItem(availableProfiles)
    const nextTitleCount = titleCountsByDifficulty.get(profile.difficulty) ?? 1

    titleCountsByDifficulty.set(profile.difficulty, nextTitleCount + 1)
    result.push({
      ...profile,
      title: createTitle(profile, nextTitleCount),
    })
  }

  return result
}

function getNextTitleCountByDifficulty(
  rows: SupabasePuzzleRow[],
): Map<PuzzleDifficulty, number> {
  const result = new Map<PuzzleDifficulty, number>()

  for (const row of rows) {
    const match = row.title.match(/^Codex\s+.+\s+#(\d+)$/)

    if (!match) {
      continue
    }

    result.set(
      row.difficulty,
      Math.max(result.get(row.difficulty) ?? 1, Number(match[1]) + 1),
    )
  }

  return result
}

function generateCandidate(spec: PuzzleSpec, usedSignatures: Set<string>): Candidate {
  const candidates: Candidate[] = []
  const attempts = Math.max(1, Math.round(spec.attempts * options.attemptsMultiplier))

  for (let index = 0; index < attempts; index += 1) {
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

    const result = scorePuzzle(placedShapes)

    if (!passesShapeFilters(result.metrics, spec)) {
      continue
    }

    if (!meetsScoreThresholds(result.scores, spec.thresholds)) {
      continue
    }

    candidates.push({
      placedShapes,
      metrics: result.metrics,
      scores: result.scores,
      signature: currentSignature,
    })
  }

  candidates.sort((a, b) => b.scores.overall - a.scores.overall)

  if (!candidates[0]) {
    throw new Error(
      `Could not generate puzzle: ${spec.title} ` +
      `(thresholds ${formatThresholds(spec.thresholds)}, attempts ${attempts})`,
    )
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

function passesShapeFilters(metrics: PuzzleMetrics, spec: PuzzleSpec): boolean {
  return metrics.baseCount >= spec.minBase &&
    metrics.baseFootprint >= spec.minBaseFootprint &&
    metrics.footprint >= spec.minFootprint &&
    metrics.levels >= spec.minLevels &&
    (spec.maxLevels === undefined || metrics.levels <= spec.maxLevels)
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

function createThresholds(defaults: PuzzleScoreThresholds): PuzzleScoreThresholds {
  return {
    cohesion: options.thresholds.cohesion ?? defaults.cohesion,
    stability: options.thresholds.stability ?? defaults.stability,
    artistry: options.thresholds.artistry ?? defaults.artistry,
  }
}

function getGeneratorOptions(): GeneratorOptions {
  const args = process.argv.slice(2)
  const difficulty = getDifficultyOption(args)

  return {
    dryRun: args.includes("--dry-run"),
    attemptsMultiplier: getNumberOption(args, "--attempts-multiplier", 1),
    difficulty,
    count: getPositiveIntegerOption(args, "--count"),
    thresholds: {
      cohesion: getThresholdOption(args, "--cohesion", "PUZZLE_LAB_MIN_COHESION"),
      stability: getThresholdOption(args, "--stability", "PUZZLE_LAB_MIN_STABILITY"),
      artistry: getThresholdOption(args, "--artistry", "PUZZLE_LAB_MIN_ARTISTRY"),
    },
  }
}

function getDifficultyOption(args: string[]): PuzzleDifficulty | undefined {
  const index = args.indexOf("--difficulty")

  if (index === -1) {
    return undefined
  }

  const rawValue = args[index + 1]

  if (!isPuzzleDifficulty(rawValue)) {
    throw new Error("--difficulty must be one of: beginner, easy, normal, hard, expert, challenge.")
  }

  if (rawValue === "challenge") {
    throw new Error("Challenge is intentionally excluded from AI generation.")
  }

  return rawValue
}

function getPositiveIntegerOption(args: string[], flagName: string): number | undefined {
  const value = getOptionalNumberOption(args, flagName)

  if (value === undefined) {
    return undefined
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${flagName} must be a positive integer.`)
  }

  return value
}

function getThresholdOption(
  args: string[],
  flagName: string,
  envName: string,
): number | undefined {
  const value = getOptionalNumberOption(args, flagName) ??
    parseOptionalNumber(process.env[envName])

  if (value === undefined) {
    return undefined
  }

  if (value < 0 || value > 100) {
    throw new Error(`${flagName} must be between 0 and 100.`)
  }

  return value
}

function getNumberOption(args: string[], flagName: string, fallback: number): number {
  return getOptionalNumberOption(args, flagName) ?? fallback
}

function getOptionalNumberOption(args: string[], flagName: string): number | undefined {
  const index = args.indexOf(flagName)

  if (index === -1) {
    return undefined
  }

  const rawValue = args[index + 1]
  const value = parseOptionalNumber(rawValue)

  if (value === undefined) {
    throw new Error(`${flagName} requires a numeric value.`)
  }

  return value
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}

function formatCandidate(title: string, candidate: Candidate): string {
  const metrics = candidate.metrics
  const scores = candidate.scores

  return [
    title,
    `overall=${scores.overall.toFixed(1)}`,
    `cohesion=${scores.cohesion.toFixed(1)}`,
    `stability=${scores.stability.toFixed(1)}`,
    `artistry=${scores.artistry.toFixed(1)}`,
    `pieces=${metrics.pieceCount}`,
    `cells=${metrics.cellCount}`,
    `base=${metrics.baseCount}/${metrics.baseFootprint}`,
    `levels=${metrics.levels}`,
    `contacts=${metrics.crossContacts}`,
  ].join(" | ")
}

function formatThresholds(thresholds: PuzzleScoreThresholds): string {
  return [
    `cohesion=${thresholds.cohesion}`,
    `stability=${thresholds.stability}`,
    `artistry=${thresholds.artistry}`,
  ].join(", ")
}

function getTitlePrefix(): string {
  const value = process.env.PUZZLE_LAB_TITLE_PREFIX?.trim()

  return value || "Codex Art"
}

function createTitle(profile: Omit<PuzzleSpec, "title">, index: number): string {
  const difficultyLabel = formatDifficulty(profile.difficulty)

  return `${titlePrefix} ${difficultyLabel} ${profile.label} #${index}`
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
