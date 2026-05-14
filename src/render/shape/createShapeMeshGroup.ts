import * as THREE from "three"

import type { ShapeDefinition } from "../../core/shape/ShapeDefinition"

const CELL_SIZE = 1

type CreateShapeMeshGroupOptions = {
  color?: number
  opacity?: number
}

export function createShapeMeshGroup(
  shape: ShapeDefinition,
  options: CreateShapeMeshGroupOptions = {},
): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(
    CELL_SIZE,
    CELL_SIZE,
    CELL_SIZE,
  )
  const material = new THREE.MeshStandardMaterial({
    color: options.color ?? shape.color,
    opacity: options.opacity ?? 1,
    transparent: options.opacity !== undefined && options.opacity < 1,
  })

  for (const cell of shape.cells) {
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
