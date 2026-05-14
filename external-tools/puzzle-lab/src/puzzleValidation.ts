import { DEFAULT_GRID_BOUNDS } from "../../../src/core/grid/GridBounds"
import { gridPosKey } from "../../../src/core/grid/GridPos"
import type { PuzzleExport } from "../../../src/core/puzzle/PuzzleExport"
import type { PlacedShape } from "../../../src/core/puzzle/PlacedShape"
import {
  getPlacedCellPositions,
  hasOverlappingCells,
  isShapeInsideGrid,
  isShapeSupported,
} from "../../../src/core/puzzle/shapePlacement"
import { rotateShapeCells } from "../../../src/core/shape/rotateShapeCells"
import { shapeDefinitions } from "../../../src/core/shape/shapeDefinitions"

export function validatePuzzleExport(puzzle: PuzzleExport) {
  if (
    puzzle.grid.width !== DEFAULT_GRID_BOUNDS.width ||
    puzzle.grid.height !== DEFAULT_GRID_BOUNDS.height ||
    puzzle.grid.depth !== DEFAULT_GRID_BOUNDS.depth
  ) {
    throw new Error("Only 5x5x5 puzzles are supported.")
  }

  const shapeIds = new Set<string>()
  const occupiedCells = new Set<string>()

  for (const placedShape of puzzle.placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`Unknown shapeId: ${placedShape.shapeId}`)
    }

    if (shapeIds.has(placedShape.shapeId)) {
      throw new Error(`Duplicate shapeId: ${placedShape.shapeId}`)
    }

    for (const value of [
      placedShape.rotation.x,
      placedShape.rotation.y,
      placedShape.rotation.z,
    ]) {
      if (!Number.isInteger(value) || value < 0 || value > 3) {
        throw new Error(`Rotation must be turn counts 0..3: ${placedShape.shapeId}`)
      }
    }

    shapeIds.add(placedShape.shapeId)

    const cells = rotateShapeCells(shape.cells, placedShape.rotation)

    if (!isShapeInsideGrid(placedShape.origin, cells, DEFAULT_GRID_BOUNDS)) {
      throw new Error(`Shape is outside grid: ${placedShape.shapeId}`)
    }

    if (hasOverlappingCells(placedShape.origin, cells, occupiedCells)) {
      throw new Error(`Shape overlaps another shape: ${placedShape.shapeId}`)
    }

    for (const pos of getPlacedCellPositions(placedShape.origin, cells)) {
      occupiedCells.add(gridPosKey(pos))
    }
  }

  for (const placedShape of puzzle.placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)!
    const cells = rotateShapeCells(shape.cells, placedShape.rotation)
    const ownCells = getPlacedCellPositions(placedShape.origin, cells)
    const otherCells = new Set(occupiedCells)

    for (const pos of ownCells) {
      otherCells.delete(gridPosKey(pos))
    }

    if (!isShapeSupported(placedShape.origin, cells, otherCells)) {
      throw new Error(`Shape is unsupported: ${placedShape.shapeId}`)
    }
  }
}

export function getPuzzleCellKeys(placedShapes: PlacedShape[]): Set<string> {
  const keys = new Set<string>()

  for (const placedShape of placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`Unknown shapeId: ${placedShape.shapeId}`)
    }

    for (const pos of getPlacedCellPositions(
      placedShape.origin,
      rotateShapeCells(shape.cells, placedShape.rotation),
    )) {
      keys.add(gridPosKey(pos))
    }
  }

  return keys
}
