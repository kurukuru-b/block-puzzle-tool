import type { GridPos } from "./GridPos"

export type GridBounds = {
    readonly width: number
    readonly height: number
    readonly depth: number
}

export const DEFAULT_GRID_BOUNDS: GridBounds = {
    width: 5,
    height: 5,
    depth: 5,
}

export function isInsideGrid(pos: GridPos, bounds: GridBounds): boolean {
    return (
        pos.x >= 0 &&
        pos.x < bounds.width &&
        pos.y >= 0 &&
        pos.y < bounds.height &&
        pos.z >= 0 &&
        pos.z < bounds.depth
    )
}