import type { LocalCellPos } from "./ShapeDefinition"

export type RotationAxis = "x" | "y" | "z"

export type ShapeRotation = {
  x: number
  y: number
  z: number
}

export function rotateShapeCells(
  cells: LocalCellPos[],
  rotation: ShapeRotation,
): LocalCellPos[] {
  let rotatedCells = cells.map((cell) => ({ ...cell }))

  for (const axis of ["x", "y", "z"] satisfies RotationAxis[]) {
    const turnCount = normalizeTurnCount(rotation[axis])

    for (let index = 0; index < turnCount; index += 1) {
      rotatedCells = normalizeCells(
        rotatedCells.map((cell) => rotateCell(cell, axis)),
      )
    }
  }

  return sortCells(rotatedCells)
}

export function normalizeCells(cells: LocalCellPos[]): LocalCellPos[] {
  if (cells.length === 0) {
    return []
  }

  const minX = Math.min(...cells.map((cell) => cell.x))
  const minY = Math.min(...cells.map((cell) => cell.y))
  const minZ = Math.min(...cells.map((cell) => cell.z))

  return cells.map((cell) => ({
    x: cell.x - minX,
    y: cell.y - minY,
    z: cell.z - minZ,
  }))
}

function rotateCell(cell: LocalCellPos, axis: RotationAxis): LocalCellPos {
  switch (axis) {
    case "x":
      return {
        x: cell.x,
        y: -cell.z,
        z: cell.y,
      }
    case "y":
      return {
        x: cell.z,
        y: cell.y,
        z: -cell.x,
      }
    case "z":
      return {
        x: -cell.y,
        y: cell.x,
        z: cell.z,
      }
  }
}

function normalizeTurnCount(value: number): number {
  return ((value % 4) + 4) % 4
}

function sortCells(cells: LocalCellPos[]): LocalCellPos[] {
  return [...cells].sort((a, b) => {
    if (a.z !== b.z) {
      return a.z - b.z
    }

    if (a.y !== b.y) {
      return a.y - b.y
    }

    return a.x - b.x
  })
}
