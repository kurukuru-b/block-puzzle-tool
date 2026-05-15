import * as THREE from "three"

import type { ShapeDefinition } from "../../core/shape/ShapeDefinition"

const CELL_SIZE = 1

type CreateShapeMeshGroupOptions = {
  color?: number
  opacity?: number
  edgeColor?: number
  edgeOpacity?: number
  showEdges?: boolean
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
  const edgeGeometry = options.showEdges === false
    ? null
    : new THREE.EdgesGeometry(geometry)
  const edgeMaterial = options.showEdges === false
    ? null
    : new THREE.LineBasicMaterial({
      color: options.edgeColor ?? 0x00d9ff,
      opacity: options.edgeOpacity ?? 0.95,
      transparent: true,
      depthTest: false,
    })

  for (const cell of shape.cells) {
    const mesh = new THREE.Mesh(geometry, material)
    const edges = edgeGeometry && edgeMaterial
      ? new THREE.LineSegments(edgeGeometry, edgeMaterial)
      : null

    mesh.position.set(
      cell.x,
      cell.y,
      cell.z,
    )

    if (edges) {
      edges.renderOrder = 8
      mesh.add(edges)
    }
    group.add(mesh)
  }

  return group
}
