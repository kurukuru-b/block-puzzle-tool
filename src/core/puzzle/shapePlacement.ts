import type { GridBounds } from "../grid/GridBounds"
import { isInsideGrid } from "../grid/GridBounds"
import type { GridPos } from "../grid/GridPos"
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
