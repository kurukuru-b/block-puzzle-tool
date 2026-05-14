import type { ShapeDefinition } from "../core/shape/ShapeDefinition"

export type ShapeColorMode = "new" | "old"

const oldShapeAppearances: Record<string, { color: number, label: string }> = {
  gray: { color: 0x8A8A8A, label: "gray" },
  purple: { color: 0x9B6BFF, label: "purple" },
  orange: { color: 0xFF9F43, label: "orange" },
}

const newShapeAppearances: Record<string, { color: number, label: string }> = {
  gray: { color: 0x1F2933, label: "black" },
  purple: { color: 0xAEB6C2, label: "silver" },
  orange: { color: 0xFFFFFF, label: "white" },
}

export function getShapeDisplayColor(
  shape: ShapeDefinition,
  mode: ShapeColorMode,
): number {
  return getShapeAppearance(shape.id, mode)?.color ?? shape.color
}

export function getShapeDisplayLabel(
  shapeId: string,
  mode: ShapeColorMode,
): string {
  return getShapeAppearance(shapeId, mode)?.label ?? shapeId
}

function getShapeAppearance(
  shapeId: string,
  mode: ShapeColorMode,
): { color: number, label: string } | undefined {
  return mode === "old"
    ? oldShapeAppearances[shapeId]
    : newShapeAppearances[shapeId]
}
