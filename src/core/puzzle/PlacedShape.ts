import type { GridPos } from "../grid/GridPos"

export type RotationState = {
  x: number
  y: number
  z: number
}

export type PlacedShape = {
  shapeId: string
  origin: GridPos
  rotation: RotationState
}