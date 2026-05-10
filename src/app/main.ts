import "../style.css"

import * as THREE from "three"

import { createMainScene } from "../render/scene/createMainScene"
import { shapeDefinitions } from "../core/shape/shapeDefinitions"
import { createShapeMeshGroup } from "../render/shape/createShapeMeshGroup"
import { gridToWorld } from "../render/scene/gridToWorld"
import { DEFAULT_GRID_BOUNDS } from "../core/grid/GridBounds"
import {
  createShapeSelector,
  type PlacedShapeSummary,
} from "../ui/createShapeSelector"
import {
  rotateShapeCells,
  type RotationAxis,
  type ShapeRotation,
} from "../core/shape/rotateShapeCells"
import { createGridPointerController } from "../input/createGridPointerController"
import {
  findSupportedPlacementOrigin,
  getPlacedCellPositions,
  hasOverlappingCells,
  isShapeInsideGrid,
  isShapeSupported,
} from "../core/puzzle/shapePlacement"
import { gridPosKey, type GridPos } from "../core/grid/GridPos"
import type { PlacedShape } from "../core/puzzle/PlacedShape"

const mainScene = createMainScene()

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("App root not found")
}

type PlacedShapeRecord = PlacedShape & {
  id: string
  group: THREE.Group
}

let activeShapeGroup: THREE.Group | null = null
let selectedShapeId = ""
let selectedRotation: ShapeRotation = { x: 0, y: 0, z: 0 }
let previewOrigin: GridPos = { x: 0, y: 0, z: 0 }
let isPreviewVisible = true
let updatePositionControls: ((pos: GridPos) => void) | null = null
let updatePlacedShapes: ((shapes: PlacedShapeSummary[]) => void) | null = null
let updateSelectedPlacedShape: ((id: string | null) => void) | null = null
let updateSelectedShapeControl: ((shapeId: string) => void) | null = null
let updateShapeAvailability: ((shapeId: string, isAvailable: boolean) => void) | null = null
let selectedPlacedShapeId: string | null = null
let nextPlacedShapeId = 1
const placedShapes: PlacedShapeRecord[] = []
const occupiedCells = new Set<string>()

function renderSelectedShape() {
  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${selectedShapeId}`)
  }

  if (activeShapeGroup) {
    mainScene.scene.remove(activeShapeGroup)
    activeShapeGroup = null
  }

  if (!isPreviewVisible) {
    return
  }

  const rotatedCells = rotateShapeCells(shape.cells, selectedRotation)
  const isValidPlacement = isShapeInsideGrid(
    previewOrigin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && canUseSelectedShape() && !hasOverlappingCells(
    previewOrigin,
    rotatedCells,
    occupiedCells,
  ) && isShapeSupported(previewOrigin, rotatedCells, occupiedCells)

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
  selectedPlacedShapeId = null
  updateSelectedPlacedShape?.(selectedPlacedShapeId)
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
  if (!isPreviewVisible) {
    return false
  }

  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${selectedShapeId}`)
  }

  const rotatedCells = rotateShapeCells(shape.cells, selectedRotation)
  const isValidPlacement = isShapeInsideGrid(
    previewOrigin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && canUseSelectedShape() && !hasOverlappingCells(
    previewOrigin,
    rotatedCells,
    occupiedCells,
  ) && isShapeSupported(previewOrigin, rotatedCells, occupiedCells)

  if (!isValidPlacement) {
    renderSelectedShape()
    return false
  }

  const placedShapeId = `${selectedShapeId}-${nextPlacedShapeId}`
  nextPlacedShapeId += 1

  const placedGroup = createShapeMeshGroup({
    ...shape,
    cells: rotatedCells,
  })
  const worldPos = gridToWorld(previewOrigin, DEFAULT_GRID_BOUNDS)

  placedGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  placedGroup.userData.placedShapeId = placedShapeId
  placedGroup.traverse((object) => {
    object.userData.placedShapeId = placedShapeId
  })
  mainScene.scene.add(placedGroup)

  placedShapes.push({
    id: placedShapeId,
    shapeId: selectedShapeId,
    origin: { ...previewOrigin },
    rotation: { ...selectedRotation },
    group: placedGroup,
  })

  for (const pos of getPlacedCellPositions(previewOrigin, rotatedCells)) {
    occupiedCells.add(gridPosKey(pos))
  }

  refreshPlacedShapeState()
  selectNextAvailableShape()
  renderSelectedShape()

  return true
}

function placeSelectedShapeAt(pos: GridPos): boolean {
  previewOrigin = pos
  isPreviewVisible = true
  updatePositionControls?.(previewOrigin)
  renderSelectedShape()

  return placeSelectedShape()
}

function deleteSelectedPlacedShape() {
  if (!selectedPlacedShapeId) {
    return
  }

  removePlacedShape(selectedPlacedShapeId)
  selectedPlacedShapeId = null
  updateSelectedPlacedShape?.(selectedPlacedShapeId)
  refreshPlacedShapeState()
  renderSelectedShape()
}

function editSelectedPlacedShape() {
  if (!selectedPlacedShapeId) {
    return
  }

  const placedShape = placedShapes.find((shape) => shape.id === selectedPlacedShapeId)

  if (!placedShape) {
    return
  }

  const { shapeId, origin, rotation } = placedShape

  removePlacedShape(selectedPlacedShapeId)
  selectedPlacedShapeId = null
  selectedShapeId = shapeId
  selectedRotation = { ...rotation }
  previewOrigin = { ...origin }

  updatePositionControls?.(previewOrigin)
  updateSelectedShapeControl?.(selectedShapeId)
  updateSelectedPlacedShape?.(selectedPlacedShapeId)
  refreshPlacedShapeState()
  renderSelectedShape()
}

function previewSelectedShapeAt(positions: GridPos[]) {
  const supportedOrigin = getFirstSupportedPreviewOrigin(positions)

  if (!supportedOrigin) {
    isPreviewVisible = false
    renderSelectedShape()
    return
  }

  isPreviewVisible = true
  previewOrigin = supportedOrigin
  updatePositionControls?.(previewOrigin)
  renderSelectedShape()
}

function movePreviewOrigin(axis: "x" | "y" | "z", amount: number): GridPos {
  previewOrigin = {
    ...previewOrigin,
    [axis]: clamp(previewOrigin[axis] + amount, 0, DEFAULT_GRID_BOUNDS[axisToSizeKey(axis)] - 1),
  }

  isPreviewVisible = true
  renderSelectedShape()
  updatePositionControls?.(previewOrigin)

  return previewOrigin
}

function selectPlacedShape(placedShapeId: string | null) {
  selectedPlacedShapeId = placedShapeId
  updateSelectedPlacedShape?.(selectedPlacedShapeId)

  for (const placedShape of placedShapes) {
    const isSelected = placedShape.id === selectedPlacedShapeId
    placedShape.group.scale.setScalar(isSelected ? 1.06 : 1)
  }
}

function removePlacedShape(placedShapeId: string) {
  const index = placedShapes.findIndex((shape) => shape.id === placedShapeId)

  if (index === -1) {
    return
  }

  const [placedShape] = placedShapes.splice(index, 1)

  mainScene.scene.remove(placedShape.group)
  rebuildOccupiedCells()
}

function refreshPlacedShapeState() {
  updatePlacedShapes?.(placedShapes.map((shape) => ({
    id: shape.id,
    shapeId: shape.shapeId,
  })))

  for (const shape of shapeDefinitions) {
    updateShapeAvailability?.(shape.id, !isShapePlaced(shape.id))
  }
}

function rebuildOccupiedCells() {
  occupiedCells.clear()

  for (const placedShape of placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`Shape not found: ${placedShape.shapeId}`)
    }

    const rotatedCells = rotateShapeCells(shape.cells, placedShape.rotation)

    for (const pos of getPlacedCellPositions(placedShape.origin, rotatedCells)) {
      occupiedCells.add(gridPosKey(pos))
    }
  }
}

function canUseSelectedShape(): boolean {
  return !isShapePlaced(selectedShapeId)
}

function isShapePlaced(shapeId: string): boolean {
  return placedShapes.some((shape) => shape.shapeId === shapeId)
}

function selectNextAvailableShape() {
  const nextShape = shapeDefinitions.find((shape) => !isShapePlaced(shape.id))

  if (!nextShape) {
    return
  }

  selectedShapeId = nextShape.id
  selectedRotation = { x: 0, y: 0, z: 0 }
  updateSelectedShapeControl?.(selectedShapeId)
}

function getFirstSupportedPreviewOrigin(targets: GridPos[]): GridPos | null {
  for (const target of targets) {
    const supportedOrigin = getSupportedPreviewOrigin(target)

    if (supportedOrigin) {
      return supportedOrigin
    }
  }

  return null
}

function getSupportedPreviewOrigin(target: GridPos): GridPos | null {
  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape || !canUseSelectedShape()) {
    return null
  }

  return findSupportedPlacementOrigin(
    target,
    rotateShapeCells(shape.cells, selectedRotation),
    DEFAULT_GRID_BOUNDS,
    occupiedCells,
  )
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
  onDeletePlacedShape: deleteSelectedPlacedShape,
  onEditPlacedShape: editSelectedPlacedShape,
})

updatePositionControls = shapeSelector.setPosition
updatePlacedShapes = shapeSelector.setPlacedShapes
updateSelectedPlacedShape = shapeSelector.setSelectedPlacedShape
updateSelectedShapeControl = shapeSelector.setSelectedShape
updateShapeAvailability = shapeSelector.setShapeAvailability
app.appendChild(shapeSelector.element)

createGridPointerController({
  bounds: DEFAULT_GRID_BOUNDS,
  camera: mainScene.camera,
  domElement: mainScene.renderer.domElement,
  scene: mainScene.scene,
  onHoverCells: previewSelectedShapeAt,
  onTapCells: (positions) => {
    const supportedOrigin = getFirstSupportedPreviewOrigin(positions)

    if (supportedOrigin) {
      placeSelectedShapeAt(supportedOrigin)
    }
  },
  shouldHandleTap: (event) => getPlacedShapeIdAtPointer(event) === null,
})

createPlacedShapeSelectionController()

renderSelectedShape()
refreshPlacedShapeState()

function createPlacedShapeSelectionController() {
  let pointerDownPos: { x: number, y: number } | null = null

  mainScene.renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerDownPos = {
      x: event.clientX,
      y: event.clientY,
    }
  })

  mainScene.renderer.domElement.addEventListener("pointerup", (event) => {
    if (!pointerDownPos || getPointerDistance(pointerDownPos, event) > 8) {
      pointerDownPos = null
      return
    }

    pointerDownPos = null

    const placedShapeId = getPlacedShapeIdAtPointer(event)

    selectPlacedShape(placedShapeId)
  })
}

function getPlacedShapeIdAtPointer(event: PointerEvent): string | null {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const rect = mainScene.renderer.domElement.getBoundingClientRect()

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, mainScene.camera)

  const placedMeshes = placedShapes.flatMap((shape) => (
    shape.group.children
  ))
  const intersections = raycaster.intersectObjects(placedMeshes, false)
  const placedShapeId = intersections[0]?.object.userData.placedShapeId

  return typeof placedShapeId === "string" ? placedShapeId : null
}

function getPointerDistance(
  start: { x: number, y: number },
  end: PointerEvent,
): number {
  return Math.hypot(end.clientX - start.x, end.clientY - start.y)
}
