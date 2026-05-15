import * as THREE from "three"

import type { ShapeDefinition } from "../../core/shape/ShapeDefinition"

const CELL_SIZE = 1

type CreateShapeMeshGroupOptions = {
  color?: number
  opacity?: number
  edgeColor?: number
  edgeOpacity?: number
  showEdges?: boolean
  showCoreMarker?: boolean
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
      color: options.edgeColor ?? 0xff2bd6,
      opacity: options.edgeOpacity ?? 0.95,
      transparent: true,
      depthTest: false,
    })
  const coreMarkerGeometry = options.showCoreMarker === false
    ? null
    : new THREE.SphereGeometry(0.12, 20, 12)
  const coreMarkerBackGeometry = options.showCoreMarker === false
    ? null
    : new THREE.SphereGeometry(0.18, 20, 12)
  const coreMarkerMaterial = options.showCoreMarker === false
    ? null
    : new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      depthTest: false,
    })
  const coreMarkerBackMaterial = options.showCoreMarker === false
    ? null
    : new THREE.MeshBasicMaterial({
      color: 0xffffff,
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
    if (
      cell.x === 0
      && cell.y === 0
      && cell.z === 0
      && coreMarkerGeometry
      && coreMarkerBackGeometry
      && coreMarkerMaterial
      && coreMarkerBackMaterial
    ) {
      const coreMarkerBack = new THREE.Mesh(
        coreMarkerBackGeometry,
        coreMarkerBackMaterial,
      )
      const coreMarker = new THREE.Mesh(coreMarkerGeometry, coreMarkerMaterial)

      coreMarkerBack.position.set(0.28, 0.28, 0.28)
      coreMarker.position.copy(coreMarkerBack.position)
      coreMarkerBack.renderOrder = 12
      coreMarker.renderOrder = 13
      mesh.add(coreMarkerBack, coreMarker)
    }
    group.add(mesh)
  }

  return group
}
