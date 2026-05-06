import * as THREE from "three"
import type { GridBounds } from "../../core/grid/GridBounds"
import type { GridPos } from "../../core/grid/GridPos"
import { gridToWorld } from "../scene/gridToWorld"

export function createBlockCellMesh(
    pos: GridPos,
    bounds: GridBounds,
    color: number
): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9)
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.1,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(gridToWorld(pos, bounds))

    return mesh
}