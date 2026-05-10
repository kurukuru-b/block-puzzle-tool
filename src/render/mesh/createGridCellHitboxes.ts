import * as THREE from "three"

import type { GridBounds } from "../../core/grid/GridBounds"
import type { GridPos } from "../../core/grid/GridPos"
import { gridToWorld } from "../scene/gridToWorld"

export type GridCellHitbox = THREE.Mesh & {
  userData: {
    gridPos: GridPos
  }
}

export function createGridCellHitboxes(bounds: GridBounds): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0,
    transparent: true,
    depthWrite: false,
  })

  for (let x = 0; x < bounds.width; x += 1) {
    for (let y = 0; y < bounds.height; y += 1) {
      for (let z = 0; z < bounds.depth; z += 1) {
        const hitbox = new THREE.Mesh(geometry, material) as unknown as GridCellHitbox
        hitbox.position.copy(gridToWorld({ x, y, z }, bounds))
        hitbox.userData.gridPos = { x, y, z }
        group.add(hitbox)
      }
    }
  }

  return group
}
