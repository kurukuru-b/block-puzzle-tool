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

export function rotateShapeCellsWithCore(
  cells: LocalCellPos[],
  rotation: ShapeRotation,
): { cells: LocalCellPos[], coreCell: LocalCellPos } {
  let rotatedCells = cells.map((cell) => ({ ...cell }))
  let coreCell = { x: 0, y: 0, z: 0 }

  for (const axis of ["x", "y", "z"] satisfies RotationAxis[]) {
    const turnCount = normalizeTurnCount(rotation[axis])

    for (let index = 0; index < turnCount; index += 1) {
      const nextCells = rotatedCells.map((cell) => rotateCell(cell, axis))
      const nextCoreCell = rotateCell(coreCell, axis)
      const offset = getNormalizeOffset(nextCells)

      rotatedCells = applyNormalizeOffset(nextCells, offset)
      coreCell = {
        x: nextCoreCell.x - offset.x,
        y: nextCoreCell.y - offset.y,
        z: nextCoreCell.z - offset.z,
      }
    }
  }

  return {
    cells: sortCells(rotatedCells),
    coreCell,
  }
}

export function rotateShapeAbsolute(
  cells: LocalCellPos[],
  rotation: ShapeRotation,
  axis: RotationAxis,
): ShapeRotation {
  const currentShape = rotateShapeCellsWithCore(cells, rotation)
  const nextCells = currentShape.cells.map((cell) => rotateCell(cell, axis))
  const nextCoreCell = rotateCell(currentShape.coreCell, axis)
  const offset = getNormalizeOffset(nextCells)
  const targetCells = applyNormalizeOffset(nextCells, offset)
  const targetCoreCell = {
    x: nextCoreCell.x - offset.x,
    y: nextCoreCell.y - offset.y,
    z: nextCoreCell.z - offset.z,
  }
  const targetKey = createCellSetKey(targetCells)

  for (let x = 0; x < 4; x += 1) {
    for (let y = 0; y < 4; y += 1) {
      for (let z = 0; z < 4; z += 1) {
        const candidate = { x, y, z }
        const candidateShape = rotateShapeCellsWithCore(cells, candidate)

        if (
          createCellSetKey(candidateShape.cells) === targetKey
          && candidateShape.coreCell.x === targetCoreCell.x
          && candidateShape.coreCell.y === targetCoreCell.y
          && candidateShape.coreCell.z === targetCoreCell.z
        ) {
          return candidate
        }
      }
    }
  }

  return {
    ...rotation,
    [axis]: rotation[axis] + 1,
  }
}

export function normalizeCells(cells: LocalCellPos[]): LocalCellPos[] {
  if (cells.length === 0) {
    return []
  }

  return applyNormalizeOffset(cells, getNormalizeOffset(cells))
}

function applyNormalizeOffset(
  cells: LocalCellPos[],
  offset: LocalCellPos,
): LocalCellPos[] {
  return cells.map((cell) => ({
    x: cell.x - offset.x,
    y: cell.y - offset.y,
    z: cell.z - offset.z,
  }))
}

function getNormalizeOffset(cells: LocalCellPos[]): LocalCellPos {
  return {
    x: Math.min(...cells.map((cell) => cell.x)),
    y: Math.min(...cells.map((cell) => cell.y)),
    z: Math.min(...cells.map((cell) => cell.z)),
  }
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

function createCellSetKey(cells: LocalCellPos[]): string {
  return sortCells(cells)
    .map((cell) => `${cell.x},${cell.y},${cell.z}`)
    .join("|")
}
