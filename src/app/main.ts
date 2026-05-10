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
import { isShapeInsideGrid } from "../core/puzzle/shapePlacement"
import type { GridPos } from "../core/grid/GridPos"

const mainScene = createMainScene()

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("App root not found")
}

let activeShapeGroup: THREE.Group | null = null
let selectedShapeId = ""
let selectedRotation: ShapeRotation = { x: 0, y: 0, z: 0 }
let hoverGridPos: GridPos | null = null

function renderSelectedShape() {
  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${selectedShapeId}`)
  }

  if (activeShapeGroup) {
    mainScene.scene.remove(activeShapeGroup)
  }

  const rotatedCells = rotateShapeCells(shape.cells, selectedRotation)
  const origin = hoverGridPos ?? { x: 0, y: 0, z: 0 }
  const isPreview = hoverGridPos !== null
  const isValidPlacement = isShapeInsideGrid(
    origin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  )

  activeShapeGroup = createShapeMeshGroup({
    ...shape,
    cells: rotatedCells,
  }, {
    color: isValidPlacement ? shape.color : 0xff3344,
    opacity: isPreview ? 0.58 : 1,
  })

  const worldPos = gridToWorld(
    origin,
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

function previewSelectedShapeAt(pos: GridPos | null) {
  hoverGridPos = pos
  renderSelectedShape()
}

const initialShape = shapeDefinitions[0]

if (!initialShape) {
  throw new Error("No shape definitions found")
}

selectedShapeId = initialShape.id

app.appendChild(createShapeSelector({
  shapes: shapeDefinitions,
  selectedShapeId: initialShape.id,
  onSelect: selectShape,
  onRotate: rotateSelectedShape,
  onResetRotation: resetSelectedRotation,
}))

createGridPointerController({
  bounds: DEFAULT_GRID_BOUNDS,
  camera: mainScene.camera,
  domElement: mainScene.renderer.domElement,
  scene: mainScene.scene,
  onHoverCell: previewSelectedShapeAt,
})

renderSelectedShape()
