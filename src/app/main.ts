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
import {
  createGridPointerController,
  type GridPointerHit,
} from "../input/createGridPointerController"
import {
  getPlacedCellPositions,
  hasOverlappingCells,
  isShapeInsideGrid,
  isShapeSupported,
} from "../core/puzzle/shapePlacement"
import {
  createPuzzleExport,
  parsePuzzleExport,
  type PuzzleExport,
  stringifyPuzzleExport,
} from "../core/puzzle/PuzzleExport"
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
let selectedShapeId: string | null = null
let selectedRotation: ShapeRotation = { x: 0, y: 0, z: 0 }
let previewOrigin: GridPos = { x: 0, y: 0, z: 0 }
let isPreviewVisible = true
let updatePositionControls: ((pos: GridPos) => void) | null = null
let updatePlacedShapes: ((shapes: PlacedShapeSummary[]) => void) | null = null
let updateSelectedPlacedShape: ((id: string | null) => void) | null = null
let updateSelectedShapeControl: ((shapeId: string | null) => void) | null = null
let updateShapeAvailability: ((shapeId: string, isAvailable: boolean) => void) | null = null
let selectedPlacedShapeId: string | null = null
let nextPlacedShapeId = 1
const placedShapes: PlacedShapeRecord[] = []
const occupiedCells = new Set<string>()

function renderSelectedShape() {
  if (activeShapeGroup) {
    mainScene.scene.remove(activeShapeGroup)
    activeShapeGroup = null
  }

  if (!selectedShapeId || selectedPlacedShapeId) {
    return
  }

  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${selectedShapeId}`)
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
  isPreviewVisible = true
  updateSelectedShapeControl?.(selectedShapeId)
  updateSelectedPlacedShape?.(selectedPlacedShapeId)
  updatePlacedShapeHighlights()
  renderSelectedShape()
}

function clearSelection() {
  selectedShapeId = null
  selectedPlacedShapeId = null
  isPreviewVisible = false
  updateSelectedShapeControl?.(selectedShapeId)
  updateSelectedPlacedShape?.(selectedPlacedShapeId)
  updatePlacedShapeHighlights()
  renderSelectedShape()
}

function rotateSelectedShape(axis: RotationAxis) {
  if (selectedPlacedShapeId) {
    rotateSelectedPlacedShape(axis)
    return
  }

  if (!selectedShapeId) {
    return
  }

  selectedRotation = {
    ...selectedRotation,
    [axis]: selectedRotation[axis] + 1,
  }

  renderSelectedShape()
}

function resetSelectedRotation() {
  if (selectedPlacedShapeId) {
    updateSelectedPlacedShapeTransform({ rotation: { x: 0, y: 0, z: 0 } })
    return
  }

  if (!selectedShapeId) {
    return
  }

  selectedRotation = { x: 0, y: 0, z: 0 }
  renderSelectedShape()
}

function placeSelectedShape(): boolean {
  if (!selectedShapeId || !isPreviewVisible) {
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

  addPlacedShape({
    shapeId: selectedShapeId,
    origin: { ...previewOrigin },
    rotation: { ...selectedRotation },
  })

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

  selectedShapeId = null
  selectedRotation = { ...placedShape.rotation }
  previewOrigin = { ...placedShape.origin }

  updatePositionControls?.(previewOrigin)
  updateSelectedShapeControl?.(selectedShapeId)
  renderSelectedShape()
}

function exportPuzzle(): string {
  const puzzle = createPuzzleExport(
    DEFAULT_GRID_BOUNDS,
    placedShapes.map((shape) => ({
      shapeId: shape.shapeId,
      origin: shape.origin,
      rotation: shape.rotation,
    })),
  )

  validateImportPuzzle(puzzle)
  validateSupportedPuzzle(puzzle)

  return stringifyPuzzleExport(puzzle)
}

function importPuzzle(source: string): { ok: boolean, message: string } {
  try {
    const puzzle = parsePuzzleExport(source)

    validateImportPuzzle(puzzle)
    clearPlacedShapes()

    for (const placedShape of puzzle.placedShapes) {
      addPlacedShape(placedShape)
    }

    clearSelection()
    updateSelectedPlacedShape?.(selectedPlacedShapeId)
    refreshPlacedShapeState()
    renderSelectedShape()

    return {
      ok: true,
      message: `Imported ${puzzle.placedShapes.length} shapes`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "importに失敗しました。",
    }
  }
}

function previewSelectedShapeAt(hits: GridPointerHit[], event?: PointerEvent) {
  if (!selectedShapeId || selectedPlacedShapeId) {
    return
  }

  const candidateOrigin = getFirstPreviewOrigin([
    ...getPlacedShapePointerHits(event),
    ...hits,
  ])

  if (!candidateOrigin) {
    isPreviewVisible = false
    renderSelectedShape()
    return
  }

  isPreviewVisible = true
  previewOrigin = candidateOrigin
  updatePositionControls?.(previewOrigin)
  renderSelectedShape()
}

function movePreviewOrigin(axis: "x" | "y" | "z", amount: number): GridPos {
  if (selectedPlacedShapeId) {
    const selectedPlacedShape = getSelectedPlacedShape()

    if (!selectedPlacedShape) {
      return previewOrigin
    }

    const nextOrigin = {
      ...selectedPlacedShape.origin,
      [axis]: clamp(selectedPlacedShape.origin[axis] + amount, 0, DEFAULT_GRID_BOUNDS[axisToSizeKey(axis)] - 1),
    }

    updateSelectedPlacedShapeTransform({ origin: nextOrigin })

    return getSelectedPlacedShape()?.origin ?? selectedPlacedShape.origin
  }

  if (!selectedShapeId) {
    return previewOrigin
  }

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
  selectedShapeId = null
  isPreviewVisible = false
  updateSelectedShapeControl?.(selectedShapeId)
  updateSelectedPlacedShape?.(selectedPlacedShapeId)
  renderSelectedShape()

  const placedShape = getSelectedPlacedShape()

  if (placedShape) {
    previewOrigin = { ...placedShape.origin }
    selectedRotation = { ...placedShape.rotation }
    updatePositionControls?.(previewOrigin)
  }

  updatePlacedShapeHighlights()
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

function addPlacedShape(placedShape: PlacedShape) {
  const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${placedShape.shapeId}`)
  }

  const rotatedCells = rotateShapeCells(shape.cells, placedShape.rotation)
  const placedShapeId = `${placedShape.shapeId}-${nextPlacedShapeId}`
  nextPlacedShapeId += 1

  const placedGroup = createShapeMeshGroup({
    ...shape,
    cells: rotatedCells,
  })
  const worldPos = gridToWorld(placedShape.origin, DEFAULT_GRID_BOUNDS)

  placedGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  placedGroup.userData.placedShapeId = placedShapeId
  placedGroup.traverse((object) => {
    object.userData.placedShapeId = placedShapeId
  })
  mainScene.scene.add(placedGroup)

  placedShapes.push({
    id: placedShapeId,
    shapeId: placedShape.shapeId,
    origin: { ...placedShape.origin },
    rotation: { ...placedShape.rotation },
    group: placedGroup,
  })

  for (const pos of getPlacedCellPositions(placedShape.origin, rotatedCells)) {
    occupiedCells.add(gridPosKey(pos))
  }
}

function clearPlacedShapes() {
  for (const placedShape of placedShapes) {
    mainScene.scene.remove(placedShape.group)
  }

  placedShapes.length = 0
  occupiedCells.clear()
  selectedPlacedShapeId = null
}

function updatePlacedShapeHighlights() {
  for (const placedShape of placedShapes) {
    const isSelected = placedShape.id === selectedPlacedShapeId
    placedShape.group.scale.setScalar(isSelected ? 1.06 : 1)
  }
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
  if (!selectedShapeId) {
    return false
  }

  return !isShapePlaced(selectedShapeId)
}

function isShapePlaced(shapeId: string): boolean {
  return placedShapes.some((shape) => shape.shapeId === shapeId)
}

function selectNextAvailableShape() {
  const nextShape = shapeDefinitions.find((shape) => !isShapePlaced(shape.id))

  if (!nextShape) {
    clearSelection()
    return
  }

  selectedShapeId = nextShape.id
  selectedRotation = { x: 0, y: 0, z: 0 }
  updateSelectedShapeControl?.(selectedShapeId)
}

function validateImportPuzzle(puzzle: PuzzleExport) {
  if (
    puzzle.grid.width !== DEFAULT_GRID_BOUNDS.width ||
    puzzle.grid.height !== DEFAULT_GRID_BOUNDS.height ||
    puzzle.grid.depth !== DEFAULT_GRID_BOUNDS.depth
  ) {
    throw new Error("このエディタでは5x5x5のデータだけimportできます。")
  }

  const importedShapeIds = new Set<string>()
  const importedCells = new Set<string>()

  for (const placedShape of puzzle.placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`未定義のshapeIdです: ${placedShape.shapeId}`)
    }

    if (importedShapeIds.has(placedShape.shapeId)) {
      throw new Error(`同じshapeIdが複数含まれています: ${placedShape.shapeId}`)
    }

    importedShapeIds.add(placedShape.shapeId)

    const rotatedCells = rotateShapeCells(shape.cells, placedShape.rotation)

    if (!isShapeInsideGrid(placedShape.origin, rotatedCells, DEFAULT_GRID_BOUNDS)) {
      throw new Error(`枠外に出ているshapeがあります: ${placedShape.shapeId}`)
    }

    if (hasOverlappingCells(placedShape.origin, rotatedCells, importedCells)) {
      throw new Error(`セルが重なっているshapeがあります: ${placedShape.shapeId}`)
    }

    for (const pos of getPlacedCellPositions(placedShape.origin, rotatedCells)) {
      importedCells.add(gridPosKey(pos))
    }
  }
}

function validateSupportedPuzzle(puzzle: PuzzleExport) {
  const allCells = new Set<string>()

  for (const placedShape of puzzle.placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`未定義のshapeIdです: ${placedShape.shapeId}`)
    }

    for (const pos of getPlacedCellPositions(
      placedShape.origin,
      rotateShapeCells(shape.cells, placedShape.rotation),
    )) {
      allCells.add(gridPosKey(pos))
    }
  }

  for (const placedShape of puzzle.placedShapes) {
    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)!
    const ownCells = getPlacedCellPositions(
      placedShape.origin,
      rotateShapeCells(shape.cells, placedShape.rotation),
    )
    const otherCells = new Set(allCells)

    for (const pos of ownCells) {
      otherCells.delete(gridPosKey(pos))
    }

    if (!isShapeSupported(
      placedShape.origin,
      rotateShapeCells(shape.cells, placedShape.rotation),
      otherCells,
    )) {
      throw new Error(`接地していないshapeがあります: ${placedShape.shapeId}`)
    }
  }
}

function rotateSelectedPlacedShape(axis: RotationAxis) {
  const selectedPlacedShape = getSelectedPlacedShape()

  if (!selectedPlacedShape) {
    return
  }

  updateSelectedPlacedShapeTransform({
    rotation: {
      ...selectedPlacedShape.rotation,
      [axis]: selectedPlacedShape.rotation[axis] + 1,
    },
  })
}

function updateSelectedPlacedShapeTransform(
  patch: Partial<Pick<PlacedShape, "origin" | "rotation">>,
) {
  const selectedPlacedShape = getSelectedPlacedShape()

  if (!selectedPlacedShape) {
    return
  }

  const nextPlacedShape = {
    shapeId: selectedPlacedShape.shapeId,
    origin: patch.origin ?? selectedPlacedShape.origin,
    rotation: patch.rotation ?? selectedPlacedShape.rotation,
  }

  if (!isPlacedShapeTransformValid(nextPlacedShape, selectedPlacedShape.id)) {
    updatePositionControls?.(selectedPlacedShape.origin)
    return
  }

  selectedPlacedShape.origin = { ...nextPlacedShape.origin }
  selectedPlacedShape.rotation = { ...nextPlacedShape.rotation }
  rebuildPlacedShapeGroup(selectedPlacedShape)
  rebuildOccupiedCells()
  previewOrigin = { ...selectedPlacedShape.origin }
  selectedRotation = { ...selectedPlacedShape.rotation }
  updatePositionControls?.(selectedPlacedShape.origin)
}

function isPlacedShapeTransformValid(
  placedShape: PlacedShape,
  excludedPlacedShapeId: string,
): boolean {
  const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

  if (!shape) {
    return false
  }

  const rotatedCells = rotateShapeCells(shape.cells, placedShape.rotation)
  const otherCells = getOccupiedCellsExcluding(excludedPlacedShapeId)

  return isShapeInsideGrid(
    placedShape.origin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && !hasOverlappingCells(
    placedShape.origin,
    rotatedCells,
    otherCells,
  ) && isShapeSupported(
    placedShape.origin,
    rotatedCells,
    otherCells,
  )
}

function rebuildPlacedShapeGroup(placedShape: PlacedShapeRecord) {
  const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${placedShape.shapeId}`)
  }

  mainScene.scene.remove(placedShape.group)

  const placedGroup = createShapeMeshGroup({
    ...shape,
    cells: rotateShapeCells(shape.cells, placedShape.rotation),
  })
  const worldPos = gridToWorld(placedShape.origin, DEFAULT_GRID_BOUNDS)

  placedGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  placedGroup.userData.placedShapeId = placedShape.id
  placedGroup.traverse((object) => {
    object.userData.placedShapeId = placedShape.id
  })

  placedShape.group = placedGroup
  mainScene.scene.add(placedGroup)
  updatePlacedShapeHighlights()
}

function getOccupiedCellsExcluding(excludedPlacedShapeId: string): Set<string> {
  const cells = new Set<string>()

  for (const placedShape of placedShapes) {
    if (placedShape.id === excludedPlacedShapeId) {
      continue
    }

    const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

    if (!shape) {
      throw new Error(`Shape not found: ${placedShape.shapeId}`)
    }

    for (const pos of getPlacedCellPositions(
      placedShape.origin,
      rotateShapeCells(shape.cells, placedShape.rotation),
    )) {
      cells.add(gridPosKey(pos))
    }
  }

  return cells
}

function getSelectedPlacedShape(): PlacedShapeRecord | null {
  if (!selectedPlacedShapeId) {
    return null
  }

  return placedShapes.find((shape) => shape.id === selectedPlacedShapeId) ?? null
}

function getFirstPreviewOrigin(hits: GridPointerHit[]): GridPos | null {
  for (const hit of hits) {
    const origin = getPreviewOrigin(hit)

    if (origin) {
      return origin
    }
  }

  return null
}

function getPreviewOrigin(hit: GridPointerHit): GridPos | null {
  if (!selectedShapeId) {
    return null
  }

  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape || !canUseSelectedShape()) {
    return null
  }

  const origin = {
    x: hit.gridPos.x + hit.normal.x,
    y: isFloorColumnHit(hit) ? 0 : hit.gridPos.y + hit.normal.y,
    z: hit.gridPos.z + hit.normal.z,
  }

  return origin
}

function isFloorColumnHit(hit: GridPointerHit): boolean {
  return hit.normal.x === 0 && hit.normal.y === 0 && hit.normal.z === 0
}

function isPreviewOriginPlaceable(origin: GridPos): boolean {
  const shape = shapeDefinitions.find((definition) => definition.id === selectedShapeId)

  if (!shape) {
    return false
  }

  const rotatedCells = rotateShapeCells(shape.cells, selectedRotation)

  return isShapeInsideGrid(
    origin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && canUseSelectedShape() && !hasOverlappingCells(
    origin,
    rotatedCells,
    occupiedCells,
  ) && isShapeSupported(origin, rotatedCells, occupiedCells)
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

if (shapeDefinitions.length === 0) {
  throw new Error("No shape definitions found")
}

const shapeSelector = createShapeSelector({
  shapes: shapeDefinitions,
  selectedShapeId,
  initialPosition: previewOrigin,
  onSelect: selectShape,
  onClearSelection: clearSelection,
  onSelectPlacedShape: selectPlacedShape,
  onRotate: rotateSelectedShape,
  onResetRotation: resetSelectedRotation,
  onMovePosition: movePreviewOrigin,
  onPlaceShape: placeSelectedShape,
  onDeletePlacedShape: deleteSelectedPlacedShape,
  onEditPlacedShape: editSelectedPlacedShape,
  onExportPuzzle: exportPuzzle,
  onImportPuzzle: importPuzzle,
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
  onHoverHits: previewSelectedShapeAt,
  onTapHits: (hits, event) => {
    const candidateOrigin = getFirstPreviewOrigin([
      ...getPlacedShapePointerHits(event),
      ...hits,
    ])

    if (candidateOrigin) {
      placeSelectedShapeAt(candidateOrigin)
    }
  },
})

createPlacedShapeSelectionController()

clearSelection()
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

    const placedSurfaceOrigin = getFirstPreviewOrigin(getPlacedShapePointerHits(event))

    if (placedSurfaceOrigin && isPreviewOriginPlaceable(placedSurfaceOrigin)) {
      return
    }

    const placedShapeId = getPlacedShapeIdAtPointer(event)

    selectPlacedShape(placedShapeId)
  })
}

function getPlacedShapePointerHits(event: PointerEvent | undefined): GridPointerHit[] {
  if (!event) {
    return []
  }

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

  return intersections.flatMap((intersection) => {
    const placedShapeId = intersection.object.userData.placedShapeId
    const placedShape = typeof placedShapeId === "string"
      ? placedShapes.find((shape) => shape.id === placedShapeId)
      : undefined
    const normal = intersection.face?.normal

    if (!placedShape || !normal) {
      return []
    }

    const mesh = intersection.object
    const localOffset = {
      x: Math.round(mesh.position.x),
      y: Math.round(mesh.position.y),
      z: Math.round(mesh.position.z),
    }

    return [{
      gridPos: {
        x: placedShape.origin.x + localOffset.x,
        y: placedShape.origin.y + localOffset.y,
        z: placedShape.origin.z + localOffset.z,
      },
      normal: {
        x: Math.round(normal.x),
        y: Math.round(normal.y),
        z: Math.round(normal.z),
      },
    }]
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
