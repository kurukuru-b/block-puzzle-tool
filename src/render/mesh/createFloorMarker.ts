import * as THREE from "three"

import type { GridBounds } from "../../core/grid/GridBounds"

export function createFloorMarker(bounds: GridBounds): THREE.Group {
  const group = new THREE.Group()
  const width = bounds.width
  const depth = bounds.depth

  const floorGeometry = new THREE.PlaneGeometry(width, depth)
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    opacity: 0.28,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)

  floor.rotation.x = Math.PI / 2
  floor.position.y = -0.5
  group.add(floor)

  const dotGeometry = new THREE.CircleGeometry(0.08, 16)
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0x64748b,
    opacity: 0.42,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  for (let x = 0; x < bounds.width; x += 1) {
    for (let z = 0; z < bounds.depth; z += 1) {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial)

      dot.rotation.x = Math.PI / 2
      dot.position.set(
        x - (bounds.width - 1) / 2,
        -0.495,
        z - (bounds.depth - 1) / 2,
      )
      group.add(dot)
    }
  }

  return group
}
