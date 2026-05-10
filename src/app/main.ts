import "../style.css"

import * as THREE from "three"

import { createMainScene } from "../render/scene/createMainScene"
import { shapeDefinitions } from "../core/shape/shapeDefinitions"
import { createShapeMeshGroup } from "../render/shape/createShapeMeshGroup"
import { gridToWorld } from "../render/scene/gridToWorld"
import { DEFAULT_GRID_BOUNDS } from "../core/grid/GridBounds"
import { createShapeSelector } from "../ui/createShapeSelector"
import {
  rotateShapeCells,
  type RotationAxis,
  type ShapeRotation,
} from "../core/shape/rotateShapeCells"
import { createGridPointerController } from "../input/createGridPointerController"
import {
  getPlacedCellPositions,
  hasOverlappingCells,
  isShapeInsideGrid,
} from "../core/puzzle/shapePlacement"
import { gridPosKey, type GridPos } from "../core/grid/GridPos"
import type { PlacedShape } from "../core/puzzle/PlacedShape"

const mainScene = createMainScene()

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("App root not found")
}

let activeShapeGroup: THREE.Group | null = null
let selectedShapeId = ""
let selectedRotation: ShapeRotation = { x: 0, y: 0, z: 0 }
let previewOrigin: GridPos = { x: 0, y: 0, z: 0 }
let updatePositionControls: ((pos: GridPos) => void) | null = null
let updatePlacedCount: ((count: number) => void) | null = null
const placedShapes: PlacedShape[] = []
const occupiedCells = new Set<string>()

function renderSelectedShape() {
  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${selectedShapeId}`)
  }

  if (activeShapeGroup) {
    mainScene.scene.remove(activeShapeGroup)
  }

  const rotatedCells = rotateShapeCells(shape.cells, selectedRotation)
  const isValidPlacement = isShapeInsideGrid(
    previewOrigin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && !hasOverlappingCells(previewOrigin, rotatedCells, occupiedCells)

  activeShapeGroup = createShapeMeshGroup({
    ...shape,
    cells: rotatedCells,
  }, {
    color: isValidPlacement ? shape.color : 0xff3344,
    opacity: 0.58,
  })

  const worldPos = gridToWorld(
    previewOrigin,
    DEFAULT_GRID_BOUNDS,
  )

  activeShapeGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  mainScene.scene.add(activeShapeGroup)
}

function selectShape(shapeId: string) {
  selectedShapeId = shapeId
  selectedRotation = { x: 0, y: 0, z: 0 }
  renderSelectedShape()
}

function rotateSelectedShape(axis: RotationAxis) {
  selectedRotation = {
    ...selectedRotation,
    [axis]: selectedRotation[axis] + 1,
  }

  renderSelectedShape()
}

function resetSelectedRotation() {
  selectedRotation = { x: 0, y: 0, z: 0 }
  renderSelectedShape()
}

function placeSelectedShape(): boolean {
  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${selectedShapeId}`)
  }

  const rotatedCells = rotateShapeCells(shape.cells, selectedRotation)
  const isValidPlacement = isShapeInsideGrid(
    previewOrigin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && !hasOverlappingCells(previewOrigin, rotatedCells, occupiedCells)

  if (!isValidPlacement) {
    renderSelectedShape()
    return false
  }

  placedShapes.push({
    shapeId: selectedShapeId,
    origin: { ...previewOrigin },
    rotation: { ...selectedRotation },
  })

  for (const pos of getPlacedCellPositions(previewOrigin, rotatedCells)) {
    occupiedCells.add(gridPosKey(pos))
  }

  const placedGroup = createShapeMeshGroup({
    ...shape,
    cells: rotatedCells,
  })
  const worldPos = gridToWorld(previewOrigin, DEFAULT_GRID_BOUNDS)

  placedGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  mainScene.scene.add(placedGroup)
  updatePlacedCount?.(placedShapes.length)
  renderSelectedShape()

  return true
}

function previewSelectedShapeAt(pos: GridPos | null) {
  if (!pos) {
    return
  }

  previewOrigin = pos
  updatePositionControls?.(previewOrigin)
  renderSelectedShape()
}

function movePreviewOrigin(axis: "x" | "y" | "z", amount: number): GridPos {
  previewOrigin = {
    ...previewOrigin,
    [axis]: clamp(previewOrigin[axis] + amount, 0, DEFAULT_GRID_BOUNDS[axisToSizeKey(axis)] - 1),
  }

  renderSelectedShape()
  updatePositionControls?.(previewOrigin)

  return previewOrigin
}

function axisToSizeKey(axis: "x" | "y" | "z"): "width" | "height" | "depth" {
  if (axis === "x") {
    return "width"
  }

  if (axis === "y") {
    return "height"
  }

  return "depth"
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const initialShape = shapeDefinitions[0]

if (!initialShape) {
  throw new Error("No shape definitions found")
}

selectedShapeId = initialShape.id

const shapeSelector = createShapeSelector({
  shapes: shapeDefinitions,
  selectedShapeId: initialShape.id,
  initialPosition: previewOrigin,
  onSelect: selectShape,
  onRotate: rotateSelectedShape,
  onResetRotation: resetSelectedRotation,
  onMovePosition: movePreviewOrigin,
  onPlaceShape: placeSelectedShape,
})

updatePositionControls = shapeSelector.setPosition
updatePlacedCount = shapeSelector.setPlacedCount
app.appendChild(shapeSelector.element)

createGridPointerController({
  bounds: DEFAULT_GRID_BOUNDS,
  camera: mainScene.camera,
  domElement: mainScene.renderer.domElement,
  scene: mainScene.scene,
  onHoverCell: previewSelectedShapeAt,
})

renderSelectedShape()
