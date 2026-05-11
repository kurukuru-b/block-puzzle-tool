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
