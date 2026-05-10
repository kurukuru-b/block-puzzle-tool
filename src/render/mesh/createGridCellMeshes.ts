import * as THREE from "three"
import type { GridBounds } from "../../core/grid/GridBounds"
import { gridToWorld } from "../scene/gridToWorld"

export function createGridCellMeshes(bounds: GridBounds): THREE.Group {
    const group = new THREE.Group()

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const edgesGeometry = new THREE.EdgesGeometry(geometry)
    const material = new THREE.LineBasicMaterial({
        color: 0x7f8794,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
    })

    for (let x = 0; x < bounds.width; x++) {
        for (let y = 0; y < bounds.height; y++) {
            for (let z = 0; z < bounds.depth; z++) {
                const line = new THREE.LineSegments(edgesGeometry, material)
                line.position.copy(gridToWorld({ x, y, z }, bounds))
                group.add(line)
            }
        }
    }

    return group
}
