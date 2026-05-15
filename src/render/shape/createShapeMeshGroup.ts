import * as THREE from "three"

import type {
  LocalCellPos,
  ShapeDefinition,
} from "../../core/shape/ShapeDefinition"

const CELL_SIZE = 1

type CreateShapeMeshGroupOptions = {
  color?: number
  opacity?: number
  edgeColor?: number
  edgeOpacity?: number
  showEdges?: boolean
  showCoreMarker?: boolean
  coreCell?: LocalCellPos
  getCellColor?: (cell: LocalCellPos) => number | undefined
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
  const coreGlowGeometry = options.showCoreMarker === false
    ? null
    : new THREE.BoxGeometry(1.08, 1.08, 1.08)
  const coreGlowMaterial = options.showCoreMarker === false
    ? null
    : new THREE.MeshBasicMaterial({
      color: 0xfff1a8,
      opacity: 0.18,
      transparent: true,
      depthWrite: false,
    })
  const coreCell = options.coreCell ?? { x: 0, y: 0, z: 0 }

  for (const cell of shape.cells) {
    const cellColor = options.getCellColor?.(cell)
    const cellMaterial = cellColor === undefined
      ? material
      : material.clone()

    if (cellColor !== undefined) {
      cellMaterial.color.setHex(cellColor)
    }

    const mesh = new THREE.Mesh(geometry, cellMaterial)
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
      cell.x === coreCell.x
      && cell.y === coreCell.y
      && cell.z === coreCell.z
      && coreGlowGeometry
      && coreGlowMaterial
    ) {
      const coreGlow = new THREE.Mesh(coreGlowGeometry, coreGlowMaterial)

      coreGlow.renderOrder = 10
      coreGlow.onBeforeRender = () => {
        const pulse = (Math.sin(performance.now() * 0.006) + 1) / 2

        coreGlowMaterial.opacity = 0.12 + pulse * 0.24
      }
      mesh.add(coreGlow)
    }
    group.add(mesh)
  }

  return group
}
