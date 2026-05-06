import * as THREE from "three"
import type { GridBounds } from "../../core/grid/GridBounds"
import type { GridPos } from "../../core/grid/GridPos"

export function gridToWorld(pos: GridPos, bounds: GridBounds): THREE.Vector3 {
    return new THREE.Vector3(
        pos.x - (bounds.width - 1) / 2,
        pos.y - (bounds.height - 1) / 2,
        pos.z - (bounds.depth - 1) / 2
    )
}