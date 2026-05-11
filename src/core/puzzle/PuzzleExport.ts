import type { GridBounds } from "../grid/GridBounds"
import type { PlacedShape } from "./PlacedShape"

export type PuzzleExport = {
  version: 1
  grid: GridBounds
  placedShapes: PlacedShape[]
}

export function createPuzzleExport(
  grid: GridBounds,
  placedShapes: PlacedShape[],
): PuzzleExport {
  return {
    version: 1,
    grid,
    placedShapes: placedShapes.map((shape) => ({
      shapeId: shape.shapeId,
      origin: { ...shape.origin },
      rotation: { ...shape.rotation },
    })),
  }
}

export function stringifyPuzzleExport(puzzle: PuzzleExport): string {
  return JSON.stringify(puzzle, null, 2)
}

export function parsePuzzleExport(source: string): PuzzleExport {
  let value: unknown

  try {
    value = JSON.parse(source)
  } catch {
    throw new Error("JSONとして読み取れませんでした。")
  }

  if (!isRecord(value)) {
    throw new Error("importデータはオブジェクトである必要があります。")
  }

  if (value.version !== 1) {
    throw new Error("対応していないexportバージョンです。")
  }

  if (!isGridBounds(value.grid)) {
    throw new Error("gridの形式が正しくありません。")
  }

  if (!Array.isArray(value.placedShapes)) {
    throw new Error("placedShapesの形式が正しくありません。")
  }

  return {
    version: 1,
    grid: value.grid,
    placedShapes: value.placedShapes.map((shape, index) => {
      if (!isPlacedShape(shape)) {
        throw new Error(`placedShapes[${index}]の形式が正しくありません。`)
      }

      return {
        shapeId: shape.shapeId,
        origin: { ...shape.origin },
        rotation: { ...shape.rotation },
      }
    }),
  }
}

function isGridBounds(value: unknown): value is GridBounds {
  return (
    isRecord(value) &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    isPositiveInteger(value.depth)
  )
}

function isPlacedShape(value: unknown): value is PlacedShape {
  return (
    isRecord(value) &&
    typeof value.shapeId === "string" &&
    isGridPos(value.origin) &&
    isRotation(value.rotation)
  )
}

function isGridPos(value: unknown): value is PlacedShape["origin"] {
  return (
    isRecord(value) &&
    isInteger(value.x) &&
    isInteger(value.y) &&
    isInteger(value.z)
  )
}

function isRotation(value: unknown): value is PlacedShape["rotation"] {
  return (
    isRecord(value) &&
    isInteger(value.x) &&
    isInteger(value.y) &&
    isInteger(value.z)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value)
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0
}
