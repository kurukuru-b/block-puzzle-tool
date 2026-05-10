import type { GridBounds } from "../grid/GridBounds"
import { isInsideGrid } from "../grid/GridBounds"
import { gridPosKey, type GridPos } from "../grid/GridPos"
import type { LocalCellPos } from "../shape/ShapeDefinition"

export function getPlacedCellPositions(
  origin: GridPos,
  cells: LocalCellPos[],
): GridPos[] {
  return cells.map((cell) => ({
    x: origin.x + cell.x,
    y: origin.y + cell.y,
    z: origin.z + cell.z,
  }))
}

export function isShapeInsideGrid(
  origin: GridPos,
  cells: LocalCellPos[],
  bounds: GridBounds,
): boolean {
  return getPlacedCellPositions(origin, cells).every((pos) => (
    isInsideGrid(pos, bounds)
  ))
}

export function hasOverlappingCells(
  origin: GridPos,
  cells: LocalCellPos[],
  occupiedCells: Set<string>,
): boolean {
  return getPlacedCellPositions(origin, cells).some((pos) => (
    occupiedCells.has(gridPosKey(pos))
  ))
}

export function isShapeSupported(
  origin: GridPos,
  cells: LocalCellPos[],
  occupiedCells: Set<string>,
): boolean {
  return getPlacedCellPositions(origin, cells).some((pos) => (
    pos.y === 0 ||
    occupiedCells.has(gridPosKey({
      x: pos.x,
      y: pos.y - 1,
      z: pos.z,
    }))
  ))
}

export function findSupportedPlacementOrigin(
  target: GridPos,
  cells: LocalCellPos[],
  bounds: GridBounds,
  occupiedCells: Set<string>,
): GridPos | null {
  for (let y = 0; y < bounds.height; y += 1) {
    const origin = {
      x: target.x,
      y,
      z: target.z,
    }

    if (
      isShapeInsideGrid(origin, cells, bounds) &&
      !hasOverlappingCells(origin, cells, occupiedCells) &&
      isShapeSupported(origin, cells, occupiedCells)
    ) {
      return origin
    }
  }

  return null
}
