import * as THREE from "three"

import type { ShapeDefinition } from "../../core/shape/ShapeDefinition"

const CELL_SIZE = 1

export function createShapeMeshGroup(
  shape: ShapeDefinition,
): THREE.Group {
  const group = new THREE.Group()

  for (const cell of shape.cells) {
    const geometry = new THREE.BoxGeometry(
      CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
    )

    const material = new THREE.MeshStandardMaterial({
      color: shape.color,
    })

    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(
      cell.x,
      cell.y,
      cell.z,
    )

    group.add(mesh)
  }

  return group
}