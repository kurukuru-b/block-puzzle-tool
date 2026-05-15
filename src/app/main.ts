import "../style.css"

import * as THREE from "three"

import { createMainScene } from "../render/scene/createMainScene"
import { disposeObject3D } from "../render/scene/disposeObject3D"
import { shapeDefinitions } from "../core/shape/shapeDefinitions"
import { createShapeMeshGroup } from "../render/shape/createShapeMeshGroup"
import { gridToWorld } from "../render/scene/gridToWorld"
import { DEFAULT_GRID_BOUNDS } from "../core/grid/GridBounds"
import {
  type AppMode,
  createShapeSelector,
  type PlacedShapeSummary,
  type TimerMode,
  type ViewerPanelState,
} from "../ui/createShapeSelector"
import {
  formatDifficulty,
  type PuzzleDifficulty,
} from "../core/puzzle/PuzzleDifficulty"
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
import {
  createPuzzleLibraryStore,
  type PuzzleLibrary,
  type StoredPuzzle,
} from "./puzzleLibraryStore"
import { requirePasswordAccess } from "./passwordGate"
import {
  getShapeDisplayColor,
  type ShapeColorMode,
} from "./shapeAppearance"

await requirePasswordAccess()

const mainScene = createMainScene()
const editorAxisGuide = createEditorAxisGuide()

mainScene.scene.add(editorAxisGuide)

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("App root not found")
}

const selectedShapeActions = createSelectedShapeActions()

app.appendChild(selectedShapeActions.element)

type PlacedShapeRecord = PlacedShape & {
  id: string
  group: THREE.Group
}

type PlacedShapeSnapshot = PlacedShape[]

const puzzleLibraryStore = createPuzzleLibraryStore()
let activeShapeGroup: THREE.Group | null = null
let appMode: AppMode = "editor"
let viewerDifficulty: PuzzleDifficulty = "easy"
let viewerProblemIndex = 0
let viewerProblemSelected = false
let viewerColorEnabled = false
let shapeColorMode: ShapeColorMode = "new"
let timerMode: TimerMode = "down"
let timerRunning = false
let timerElapsedSeconds = 0
let countdownSeconds = 300
let timerIntervalId: number | null = null
let selectedShapeId: string | null = null
let selectedRotation: ShapeRotation = { x: 0, y: 0, z: 0 }
let previewOrigin: GridPos = { x: 0, y: 0, z: 0 }
let isPreviewVisible = true
let updatePositionControls: ((pos: GridPos) => void) | null = null
let updatePlacedShapes: ((shapes: PlacedShapeSummary[]) => void) | null = null
let updateSelectedPlacedShape: ((id: string | null) => void) | null = null
let updateSelectedShapeControl: ((shapeId: string | null) => void) | null = null
let updateShapeAvailability: ((shapeId: string, isAvailable: boolean) => void) | null = null
let updateAppModeControl: ((mode: AppMode) => void) | null = null
let updateViewerStateControl: ((state: ViewerPanelState) => void) | null = null
let selectedPlacedShapeId: string | null = null
let nextPlacedShapeId = 1
let editorBoardSnapshotBeforeViewer: PlacedShapeSnapshot | null = null
const placedShapes: PlacedShapeRecord[] = []
const occupiedCells = new Set<string>()
const undoStack: PlacedShapeSnapshot[] = []
const redoStack: PlacedShapeSnapshot[] = []
const placedShapeRaycaster = new THREE.Raycaster()
const placedShapePointer = new THREE.Vector2()
let isApplyingHistory = false
const selectedShapeActionBox = new THREE.Box3()
const selectedShapeActionPos = new THREE.Vector3()

function createSelectedShapeActions() {
  const element = document.createElement("div")
  element.className = "selected-shape-actions"
  element.hidden = true

  const editButton = document.createElement("button")
  editButton.type = "button"
  editButton.textContent = "Edit"
  editButton.addEventListener("click", (event) => {
    event.stopPropagation()
    editSelectedPlacedShape()
  })
  element.appendChild(editButton)

  const deleteButton = document.createElement("button")
  deleteButton.type = "button"
  deleteButton.className = "danger-action-button"
  deleteButton.textContent = "Delete"
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation()
    deleteSelectedPlacedShape()
  })
  element.appendChild(deleteButton)

  element.addEventListener("pointerdown", (event) => event.stopPropagation())
  element.addEventListener("pointerup", (event) => event.stopPropagation())

  requestAnimationFrame(updateSelectedShapeActions)

  return {
    element,
  }

  function updateSelectedShapeActions() {
    positionSelectedShapeActions(element)
    requestAnimationFrame(updateSelectedShapeActions)
  }
}

function positionSelectedShapeActions(element: HTMLElement) {
  const selectedPlacedShape = getSelectedPlacedShape()

  if (appMode !== "editor" || !selectedPlacedShape) {
    element.hidden = true
    element.classList.remove("is-visible")
    return
  }

  selectedShapeActionBox.setFromObject(selectedPlacedShape.group)

  if (selectedShapeActionBox.isEmpty()) {
    element.hidden = true
    element.classList.remove("is-visible")
    return
  }

  selectedShapeActionBox.getCenter(selectedShapeActionPos)
  selectedShapeActionPos.y = selectedShapeActionBox.max.y + 0.34
  selectedShapeActionPos.project(mainScene.camera)

  if (
    selectedShapeActionPos.z < -1 ||
    selectedShapeActionPos.z > 1 ||
    Math.abs(selectedShapeActionPos.x) > 1.25 ||
    Math.abs(selectedShapeActionPos.y) > 1.25
  ) {
    element.hidden = true
    element.classList.remove("is-visible")
    return
  }

  const rect = mainScene.renderer.domElement.getBoundingClientRect()
  const x = rect.left + (selectedShapeActionPos.x * 0.5 + 0.5) * rect.width
  const y = rect.top + (-selectedShapeActionPos.y * 0.5 + 0.5) * rect.height

  element.style.left = `${x}px`
  element.style.top = `${y}px`
  element.hidden = false
  element.classList.add("is-visible")
}

function renderSelectedShape() {
  if (activeShapeGroup) {
    mainScene.scene.remove(activeShapeGroup)
    disposeObject3D(activeShapeGroup)
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
    color: isValidPlacement ? getShapeDisplayColor(shape, shapeColorMode) : 0xff3344,
    opacity: 0.58,
  })
  activeShapeGroup.add(createPreviewRotationGuide(rotatedCells))

  const worldPos = gridToWorld(
    previewOrigin,
    DEFAULT_GRID_BOUNDS,
  )

  activeShapeGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  mainScene.scene.add(activeShapeGroup)
}

function createPreviewRotationGuide(cells: Array<{ x: number, y: number, z: number }>): THREE.Group {
  const guide = new THREE.Group()
  const bounds = getLocalCellBounds(cells)
  const center = new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  )
  const radius = Math.max(
    bounds.maxX - bounds.minX + 1,
    bounds.maxY - bounds.minY + 1,
    bounds.maxZ - bounds.minZ + 1,
  ) * 0.62 + 0.42

  guide.add(createRotationRing("x", center, radius, 0xef4444))
  guide.add(createRotationRing("y", center, radius + 0.07, 0x22c55e))
  guide.add(createRotationRing("z", center, radius + 0.14, 0x2563eb))

  return guide
}

function createRotationRing(
  axis: "x" | "y" | "z",
  center: THREE.Vector3,
  radius: number,
  color: number,
): THREE.Group {
  const ring = new THREE.Group()
  const material = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.82,
    transparent: true,
    depthTest: false,
  })
  const geometry = new THREE.TorusGeometry(radius, 0.025, 8, 64)
  const mesh = new THREE.Mesh(geometry, material)

  mesh.renderOrder = 4
  mesh.position.copy(center)

  if (axis === "x") {
    mesh.rotation.y = Math.PI / 2
  } else if (axis === "y") {
    mesh.rotation.x = Math.PI / 2
  }

  ring.add(mesh)

  const arrow = createRotationArrow(axis, center, radius, color)

  ring.add(arrow)

  return ring
}

function createRotationArrow(
  axis: "x" | "y" | "z",
  center: THREE.Vector3,
  radius: number,
  color: number,
): THREE.Mesh {
  const theta = Math.PI / 4
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.26, 16),
    new THREE.MeshBasicMaterial({
      color,
      opacity: 0.92,
      transparent: true,
      depthTest: false,
    }),
  )
  const position = new THREE.Vector3()
  const tangent = new THREE.Vector3()

  if (axis === "x") {
    position.set(center.x, center.y + Math.cos(theta) * radius, center.z + Math.sin(theta) * radius)
    tangent.set(0, -Math.sin(theta), Math.cos(theta))
  } else if (axis === "y") {
    position.set(center.x + Math.cos(theta) * radius, center.y, center.z + Math.sin(theta) * radius)
    tangent.set(Math.sin(theta), 0, -Math.cos(theta))
  } else {
    position.set(center.x + Math.cos(theta) * radius, center.y + Math.sin(theta) * radius, center.z)
    tangent.set(-Math.sin(theta), Math.cos(theta), 0)
  }

  cone.position.copy(position)
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent.normalize())
  cone.renderOrder = 5

  return cone
}

function getLocalCellBounds(cells: Array<{ x: number, y: number, z: number }>) {
  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minY: Math.min(...cells.map((cell) => cell.y)),
    maxY: Math.max(...cells.map((cell) => cell.y)),
    minZ: Math.min(...cells.map((cell) => cell.z)),
    maxZ: Math.max(...cells.map((cell) => cell.z)),
  }
}

function setAppMode(mode: AppMode) {
  const previousMode = appMode

  if (previousMode === "editor" && mode === "viewer") {
    editorBoardSnapshotBeforeViewer = getPlacedShapeSnapshot()
  }

  appMode = mode
  editorAxisGuide.visible = appMode === "editor"
  updateAppModeControl?.(appMode)
  clearSelection()

  if (appMode === "viewer") {
    viewerColorEnabled = false
    timerMode = "down"
    resetTimer()
    clearViewerProblemSelection()
  } else {
    if (previousMode === "viewer" && editorBoardSnapshotBeforeViewer) {
      restorePlacedShapeSnapshot(editorBoardSnapshotBeforeViewer)
      editorBoardSnapshotBeforeViewer = null
    } else {
      rebuildAllPlacedShapeGroups()
    }
  }

  refreshViewerState()
}

function selectShape(shapeId: string) {
  if (appMode !== "editor") {
    return
  }

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
  if (appMode !== "editor") {
    return
  }

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
  if (appMode !== "editor") {
    return
  }

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
  if (appMode !== "editor") {
    return false
  }

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

  pushUndoState()
  addPlacedShape({
    shapeId: selectedShapeId,
    origin: { ...previewOrigin },
    rotation: { ...selectedRotation },
  })

  refreshPlacedShapeState()
  clearSelection()

  return true
}

function placeSelectedShapeAt(pos: GridPos): boolean {
  if (appMode !== "editor") {
    return false
  }

  previewOrigin = pos
  isPreviewVisible = true
  updatePositionControls?.(previewOrigin)
  renderSelectedShape()

  return placeSelectedShape()
}

function deleteSelectedPlacedShape() {
  if (appMode !== "editor") {
    return
  }

  if (!selectedPlacedShapeId) {
    return
  }

  pushUndoState()
  removePlacedShape(selectedPlacedShapeId)
  refreshPlacedShapeState()
  clearSelection()
}

function editSelectedPlacedShape() {
  if (appMode !== "editor") {
    return
  }

  if (!selectedPlacedShapeId) {
    return
  }

  const placedShape = placedShapes.find((shape) => shape.id === selectedPlacedShapeId)

  if (!placedShape) {
    return
  }

  const { shapeId, origin, rotation } = placedShape

  pushUndoState()
  removePlacedShape(selectedPlacedShapeId)
  selectedPlacedShapeId = null
  selectedShapeId = shapeId
  selectedRotation = { ...rotation }
  previewOrigin = { ...origin }
  isPreviewVisible = true

  updateSelectedPlacedShape?.(selectedPlacedShapeId)
  updatePositionControls?.(previewOrigin)
  updateSelectedShapeControl?.(selectedShapeId)
  refreshPlacedShapeState()
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
    pushUndoState()
    clearPlacedShapes()

    for (const placedShape of puzzle.placedShapes) {
      addPlacedShape(placedShape)
    }

    clearSelection()
    updateSelectedPlacedShape?.(selectedPlacedShapeId)
    refreshPlacedShapeState()
    refreshViewerState()
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

async function registerPuzzle(
  difficulty: PuzzleDifficulty,
  requestedTitle: string,
): Promise<{ ok: boolean, message: string }> {
  try {
    if (placedShapes.length === 0) {
      throw new Error("登録できる配置がありません。")
    }

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

    const library = loadPuzzleLibrary()
    const nextNumber = library[difficulty].length + 1
    const title = requestedTitle.trim() || `${formatDifficulty(difficulty)} ${nextNumber}`
    const storedPuzzle: StoredPuzzle = {
      ...puzzle,
      id: `${difficulty}-${Date.now()}`,
      difficulty,
      title,
    }

    library[difficulty].push(storedPuzzle)

    savePuzzleLibrary(library)
    if (viewerDifficulty === difficulty) {
      viewerProblemIndex = library[difficulty].length - 1
    }
    refreshViewerState()

    const dbResult = await puzzleLibraryStore.upsertPuzzle(storedPuzzle)

    if (!dbResult.ok) {
      return {
        ok: false,
        message: `Registered locally. DB sync failed: ${dbResult.message}`,
      }
    }

    return {
      ok: true,
      message: puzzleLibraryStore.isRemoteConfigured()
        ? `Registered "${title}" to DB`
        : `Registered "${title}" locally`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "登録に失敗しました。",
    }
  }
}

function previewSelectedShapeAt(hits: GridPointerHit[], event?: PointerEvent) {
  if (appMode !== "editor" || !selectedShapeId || selectedPlacedShapeId) {
    return
  }

  const candidateOrigin = getFirstPlaceablePreviewOrigin([
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
  if (appMode !== "editor") {
    return previewOrigin
  }

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
  if (appMode !== "editor") {
    return
  }

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
  disposeObject3D(placedShape.group)
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
  }, {
    color: getPlacedShapeColor(shape),
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
    disposeObject3D(placedShape.group)
  }

  placedShapes.length = 0
  occupiedCells.clear()
  selectedPlacedShapeId = null
}

function resetEditorBoard() {
  if (appMode !== "editor" || placedShapes.length === 0) {
    return
  }

  pushUndoState()
  clearPlacedShapes()
  clearSelection()
  refreshPlacedShapeState()
  renderSelectedShape()
}

function undoEditorAction() {
  if (appMode !== "editor" || undoStack.length === 0) {
    return
  }

  redoStack.push(getPlacedShapeSnapshot())
  restorePlacedShapeSnapshot(undoStack.pop()!)
}

function redoEditorAction() {
  if (appMode !== "editor" || redoStack.length === 0) {
    return
  }

  undoStack.push(getPlacedShapeSnapshot())
  restorePlacedShapeSnapshot(redoStack.pop()!)
}

function pushUndoState() {
  if (isApplyingHistory) {
    return
  }

  undoStack.push(getPlacedShapeSnapshot())
  redoStack.length = 0
}

function getPlacedShapeSnapshot(): PlacedShapeSnapshot {
  return placedShapes.map((shape) => ({
    shapeId: shape.shapeId,
    origin: { ...shape.origin },
    rotation: { ...shape.rotation },
  }))
}

function restorePlacedShapeSnapshot(snapshot: PlacedShapeSnapshot) {
  isApplyingHistory = true
  clearPlacedShapes()

  for (const placedShape of snapshot) {
    addPlacedShape(placedShape)
  }

  clearSelection()
  refreshPlacedShapeState()
  renderSelectedShape()
  isApplyingHistory = false
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

function selectViewerDifficulty(difficulty: PuzzleDifficulty) {
  viewerDifficulty = difficulty
  viewerProblemIndex = 0
  clearViewerProblemSelection()
}

function moveViewerProblem(amount: number) {
  const puzzles = loadPuzzleLibrary()[viewerDifficulty]

  if (puzzles.length === 0) {
    viewerProblemIndex = 0
    viewerProblemSelected = false
    loadSelectedViewerPuzzle()
    refreshViewerState()
    return
  }

  viewerProblemIndex = (viewerProblemIndex + amount + puzzles.length) % puzzles.length
  viewerProblemSelected = true
  loadSelectedViewerPuzzle()
  refreshViewerState()
}

function selectRandomViewerProblem() {
  const puzzles = loadPuzzleLibrary()[viewerDifficulty]

  if (puzzles.length === 0) {
    viewerProblemIndex = 0
    viewerProblemSelected = false
    loadSelectedViewerPuzzle()
    refreshViewerState()
    return
  }

  if (puzzles.length === 1) {
    viewerProblemIndex = 0
    viewerProblemSelected = true
    loadSelectedViewerPuzzle()
    refreshViewerState()
    return
  }

  let nextIndex = Math.floor(Math.random() * puzzles.length)

  if (nextIndex === viewerProblemIndex) {
    nextIndex = (nextIndex + 1) % puzzles.length
  }

  viewerProblemIndex = nextIndex
  viewerProblemSelected = true
  loadSelectedViewerPuzzle()
  refreshViewerState()
}

function selectViewerProblem(puzzleId: string) {
  const puzzles = loadPuzzleLibrary()[viewerDifficulty]
  const index = puzzles.findIndex((puzzle) => puzzle.id === puzzleId)

  if (index === -1) {
    return
  }

  viewerProblemIndex = index
  viewerProblemSelected = true
  loadSelectedViewerPuzzle()
  refreshViewerState()
}

function clearViewerProblemSelection() {
  viewerProblemSelected = false
  clearPlacedShapes()
  refreshPlacedShapeState()
  refreshViewerState()
}

async function renameSelectedViewerProblem(title: string): Promise<{ ok: boolean, message: string }> {
  const nextTitle = title.trim()

  if (!nextTitle) {
    return {
      ok: false,
      message: "タイトルを入力してください。",
    }
  }

  const library = loadPuzzleLibrary()
  const puzzles = library[viewerDifficulty]
  const puzzle = puzzles[viewerProblemIndex]

  if (!viewerProblemSelected || !puzzle) {
    return {
      ok: false,
      message: "名前を変更する問題がありません。",
    }
  }

  puzzle.title = nextTitle
  savePuzzleLibrary(library)
  refreshViewerState()

  const dbResult = await puzzleLibraryStore.renamePuzzle(puzzle.id, nextTitle)

  if (!dbResult.ok) {
    return {
      ok: false,
      message: `Renamed locally. DB sync failed: ${dbResult.message}`,
    }
  }

  return {
    ok: true,
    message: puzzleLibraryStore.isRemoteConfigured() ? "Renamed in DB" : "Renamed locally",
  }
}

async function moveSelectedViewerProblemDifficulty(
  difficulty: PuzzleDifficulty,
): Promise<{ ok: boolean, message: string }> {
  if (!viewerProblemSelected) {
    return {
      ok: false,
      message: "移動する問題がありません。",
    }
  }

  if (difficulty === viewerDifficulty) {
    return {
      ok: false,
      message: "同じ難易度が選択されています。",
    }
  }

  const library = loadPuzzleLibrary()
  const currentPuzzles = library[viewerDifficulty]
  const puzzle = currentPuzzles[viewerProblemIndex]

  if (!puzzle) {
    return {
      ok: false,
      message: "移動する問題がありません。",
    }
  }

  currentPuzzles.splice(viewerProblemIndex, 1)
  const nextTitle = `${formatDifficulty(difficulty)} ${library[difficulty].length + 1}`
  const movedPuzzle: StoredPuzzle = {
    ...puzzle,
    difficulty,
    title: nextTitle,
  }

  library[difficulty].push(movedPuzzle)
  viewerDifficulty = difficulty
  viewerProblemIndex = library[difficulty].length - 1
  savePuzzleLibrary(library)
  loadSelectedViewerPuzzle()
  refreshViewerState()

  const dbResult = await puzzleLibraryStore.movePuzzle(
    movedPuzzle.id,
    difficulty,
    movedPuzzle.title,
  )

  if (!dbResult.ok) {
    return {
      ok: false,
      message: `Moved locally. DB sync failed: ${dbResult.message}`,
    }
  }

  return {
    ok: true,
    message: puzzleLibraryStore.isRemoteConfigured()
      ? `Moved to ${movedPuzzle.title} in DB`
      : `Moved to ${movedPuzzle.title} locally`,
  }
}

async function deleteSelectedViewerProblem(): Promise<{ ok: boolean, message: string }> {
  const library = loadPuzzleLibrary()
  const puzzles = library[viewerDifficulty]
  const puzzle = puzzles[viewerProblemIndex]

  if (!viewerProblemSelected || !puzzle) {
    return {
      ok: false,
      message: "削除する問題がありません。",
    }
  }

  puzzles.splice(viewerProblemIndex, 1)
  viewerProblemIndex = puzzles.length === 0
    ? 0
    : clamp(viewerProblemIndex, 0, puzzles.length - 1)
  savePuzzleLibrary(library)
  loadSelectedViewerPuzzle()
  refreshViewerState()

  const dbResult = await puzzleLibraryStore.deletePuzzle(puzzle.id)

  if (!dbResult.ok) {
    return {
      ok: false,
      message: `Deleted locally. DB sync failed: ${dbResult.message}`,
    }
  }

  return {
    ok: true,
    message: puzzleLibraryStore.isRemoteConfigured()
      ? `Deleted ${puzzle.title} from DB`
      : `Deleted ${puzzle.title} locally`,
  }
}

function toggleViewerColor() {
  viewerColorEnabled = !viewerColorEnabled
  rebuildAllPlacedShapeGroups()
  refreshViewerState()
}

function toggleShapeColorMode() {
  shapeColorMode = shapeColorMode === "new" ? "old" : "new"
  rebuildAllPlacedShapeGroups()
  renderSelectedShape()
}

function startStopTimer() {
  if (timerRunning) {
    stopTimer()
    refreshViewerState()
    return
  }

  timerRunning = true
  timerIntervalId = window.setInterval(tickTimer, 1000)
  refreshViewerState()
}

function stopTimer() {
  timerRunning = false

  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId)
    timerIntervalId = null
  }
}

function resetTimer() {
  stopTimer()
  timerElapsedSeconds = 0
  refreshViewerState()
}

function setTimerMode(mode: TimerMode) {
  timerMode = mode
  resetTimer()
}

function setCountdownSeconds(seconds: number) {
  countdownSeconds = clamp(seconds, 1, 9999)
  resetTimer()
}

function tickTimer() {
  timerElapsedSeconds += 1

  if (timerMode === "down" && timerElapsedSeconds >= countdownSeconds) {
    timerElapsedSeconds = countdownSeconds
    stopTimer()
    playTimerDoneSound()
  }

  refreshViewerState()
}

function playTimerDoneSound() {
  const AudioContextClass = window.AudioContext

  if (!AudioContextClass) {
    return
  }

  const audioContext = new AudioContextClass()
  const notes = [880, 1046, 1318, 1046]

  notes.forEach((frequency, index) => {
    const start = audioContext.currentTime + index * 0.18
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = "square"
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.42, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.16)
  })
}

function refreshViewerState() {
  updateViewerStateControl?.(getViewerPanelState())
}

function getViewerPanelState(): ViewerPanelState {
  const puzzles = loadPuzzleLibrary()[viewerDifficulty]
  const problemCount = puzzles.length
  const problemIndex = problemCount === 0 ? 0 : clamp(viewerProblemIndex, 0, problemCount - 1)
  const selectedPuzzle = problemCount === 0 || !viewerProblemSelected
    ? null
    : puzzles[problemIndex]

  return {
    difficulty: viewerDifficulty,
    problemIndex: selectedPuzzle ? problemIndex : 0,
    problemCount,
    problemTitle: selectedPuzzle?.title ?? (
      problemCount === 0 ? "No registered puzzle" : "No selected puzzle"
    ),
    selectedPuzzleId: selectedPuzzle?.id ?? null,
    puzzles: puzzles.map((puzzle) => ({
      id: puzzle.id,
      title: puzzle.title,
    })),
    colorEnabled: viewerColorEnabled,
    timerText: getTimerText(),
    timerMode,
    timerRunning,
    countdownSeconds,
  }
}

function getTimerText(): string {
  const seconds = timerMode === "down"
    ? Math.max(0, countdownSeconds - timerElapsedSeconds)
    : timerElapsedSeconds

  return formatSeconds(seconds)
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function loadSelectedViewerPuzzle() {
  const puzzles = loadPuzzleLibrary()[viewerDifficulty]

  if (puzzles.length === 0 || !viewerProblemSelected) {
    clearPlacedShapes()
    refreshPlacedShapeState()
    return
  }

  viewerProblemIndex = clamp(viewerProblemIndex, 0, puzzles.length - 1)
  clearPlacedShapes()

  for (const placedShape of puzzles[viewerProblemIndex].placedShapes) {
    addPlacedShape(placedShape)
  }

  refreshPlacedShapeState()
}

function loadPuzzleLibrary(): PuzzleLibrary {
  return puzzleLibraryStore.loadCached()
}

function savePuzzleLibrary(library: PuzzleLibrary) {
  puzzleLibraryStore.saveCached(library)
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

  const allowUnsupportedMove = Boolean(patch.origin && !patch.rotation)

  if (!isPlacedShapeTransformValid(
    nextPlacedShape,
    selectedPlacedShape.id,
    { requireSupport: !allowUnsupportedMove },
  )) {
    updatePositionControls?.(selectedPlacedShape.origin)
    return
  }

  pushUndoState()
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
  options: { requireSupport: boolean } = { requireSupport: true },
): boolean {
  const shape = shapeDefinitions.find((definition) => definition.id === placedShape.shapeId)

  if (!shape) {
    return false
  }

  const rotatedCells = rotateShapeCells(shape.cells, placedShape.rotation)
  const otherCells = getOccupiedCellsExcluding(excludedPlacedShapeId)

  const isInsideAndClear = isShapeInsideGrid(
    placedShape.origin,
    rotatedCells,
    DEFAULT_GRID_BOUNDS,
  ) && !hasOverlappingCells(
    placedShape.origin,
    rotatedCells,
    otherCells,
  )

  if (!isInsideAndClear) {
    return false
  }

  if (!options.requireSupport) {
    return true
  }

  return isShapeSupported(
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
  disposeObject3D(placedShape.group)

  const placedGroup = createShapeMeshGroup({
    ...shape,
    cells: rotateShapeCells(shape.cells, placedShape.rotation),
  }, {
    color: getPlacedShapeColor(shape),
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

function rebuildAllPlacedShapeGroups() {
  for (const placedShape of placedShapes) {
    rebuildPlacedShapeGroup(placedShape)
  }
}

function getPlacedShapeColor(shape: typeof shapeDefinitions[number]): number {
  if (appMode === "viewer" && !viewerColorEnabled) {
    return 0xd9dee8
  }

  return getShapeDisplayColor(shape, shapeColorMode)
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

function getFirstPlaceablePreviewOrigin(hits: GridPointerHit[]): GridPos | null {
  const seenOrigins = new Set<string>()

  for (const hit of hits) {
    const origin = getPreviewOrigin(hit)

    if (!origin) {
      continue
    }

    const originKey = gridPosKey(origin)

    if (seenOrigins.has(originKey)) {
      continue
    }

    seenOrigins.add(originKey)

    if (isPreviewOriginPlaceable(origin)) {
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

  if (hit.kind === "floor" || hit.kind === "grid") {
    return { ...hit.gridPos }
  }

  return {
    x: hit.gridPos.x + hit.normal.x,
    y: hit.gridPos.y + hit.normal.y,
    z: hit.gridPos.z + hit.normal.z,
  }
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

function createEditorAxisGuide(): THREE.Group {
  const group = new THREE.Group()
  const origin = new THREE.Vector3(-2, -2, -2)
  const axes = [
    { label: "X", color: 0xef4444, end: new THREE.Vector3(4, 0, 0) },
    { label: "Y", color: 0x22c55e, end: new THREE.Vector3(0, 4, 0) },
    { label: "Z", color: 0x3b82f6, end: new THREE.Vector3(0, 0, 4) },
  ]

  group.position.copy(origin)

  for (const axis of axes) {
    const material = new THREE.LineBasicMaterial({
      color: axis.color,
      linewidth: 2,
    })
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      axis.end,
    ])
    const line = new THREE.Line(geometry, material)
    const label = createAxisLabel(axis.label, axis.color)

    label.position.copy(axis.end)
    group.add(line, label)
  }

  return group
}

function createAxisLabel(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 96
  canvas.height = 96

  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Canvas context not available")
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = `#${color.toString(16).padStart(6, "0")}`
  context.beginPath()
  context.arc(48, 48, 30, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = "#ffffff"
  context.font = "700 42px sans-serif"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(text, 48, 50)

  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
  }))

  sprite.scale.setScalar(0.34)

  return sprite
}

if (shapeDefinitions.length === 0) {
  throw new Error("No shape definitions found")
}

const shapeSelector = createShapeSelector({
  shapes: shapeDefinitions,
  initialMode: appMode,
  initialViewerState: getViewerPanelState(),
  selectedShapeId,
  initialPosition: previewOrigin,
  initialShapeColorMode: shapeColorMode,
  onModeChange: setAppMode,
  onToggleShapeColorMode: toggleShapeColorMode,
  onSelect: selectShape,
  onClearSelection: clearSelection,
  onSelectPlacedShape: selectPlacedShape,
  onSelectDifficulty: selectViewerDifficulty,
  onMoveProblem: moveViewerProblem,
  onRandomProblem: selectRandomViewerProblem,
  onSelectProblem: selectViewerProblem,
  onClearViewerProblem: clearViewerProblemSelection,
  onRenameProblem: renameSelectedViewerProblem,
  onMoveProblemDifficulty: moveSelectedViewerProblemDifficulty,
  onDeleteProblem: deleteSelectedViewerProblem,
  onToggleColor: toggleViewerColor,
  onTimerStartStop: startStopTimer,
  onTimerReset: resetTimer,
  onTimerModeChange: setTimerMode,
  onCountdownSecondsChange: setCountdownSeconds,
  onRotate: rotateSelectedShape,
  onResetRotation: resetSelectedRotation,
  onMovePosition: movePreviewOrigin,
  onPlaceShape: placeSelectedShape,
  onResetBoard: resetEditorBoard,
  onUndo: undoEditorAction,
  onRedo: redoEditorAction,
  onDeletePlacedShape: deleteSelectedPlacedShape,
  onEditPlacedShape: editSelectedPlacedShape,
  onExportPuzzle: exportPuzzle,
  onImportPuzzle: importPuzzle,
  onRegisterPuzzle: registerPuzzle,
})

updateAppModeControl = shapeSelector.setMode
updateViewerStateControl = shapeSelector.setViewerState
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
    if (appMode !== "editor") {
      return
    }

    const candidateOrigin = getFirstPlaceablePreviewOrigin([
      ...getPlacedShapePointerHits(event),
      ...hits,
    ])

    if (candidateOrigin) {
      placeSelectedShapeAt(candidateOrigin)
    }
  },
})

createPlacedShapeSelectionController()
createEditorKeyboardController()

clearSelection()
refreshPlacedShapeState()
refreshViewerState()
void initializePuzzleLibrary()

async function initializePuzzleLibrary() {
  const result = await puzzleLibraryStore.syncFromRemote()

  if (!result.ok) {
    console.warn(result.message)
    return
  }

  if (appMode === "viewer") {
    loadSelectedViewerPuzzle()
  }

  refreshViewerState()
}

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

    const placedSurfaceOrigin = getFirstPlaceablePreviewOrigin(getPlacedShapePointerHits(event))

    if (placedSurfaceOrigin && isPreviewOriginPlaceable(placedSurfaceOrigin)) {
      return
    }

    const placedShapeId = getPlacedShapeIdAtPointer(event)

    selectPlacedShape(placedShapeId)
  })
}

function createEditorKeyboardController() {
  window.addEventListener("keydown", (event) => {
    if (event.isComposing) {
      return
    }

    if (isTypingTarget(event.target)) {
      return
    }

    if (appMode !== "editor") {
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault()

      if (event.shiftKey) {
        redoEditorAction()
      } else {
        undoEditorAction()
      }

      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault()
      redoEditorAction()
      return
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return
    }

    if (handleEditorMovementKey(event)) {
      return
    }

    if (handleEditorRotationKey(event)) {
      return
    }

    if (
      event.key === "Delete" ||
      event.key === "Backspace" ||
      event.code === "KeyQ"
    ) {
      event.preventDefault()
      deleteSelectedPlacedShape()
      return
    }

    if (event.key.toLowerCase() === "e") {
      event.preventDefault()
      editSelectedPlacedShape()
    }
  })
}

function handleEditorMovementKey(event: KeyboardEvent): boolean {
  const movement = getEditorMovementForKey(event)

  if (!movement) {
    return false
  }

  if (!selectedShapeId && !selectedPlacedShapeId) {
    return false
  }

  event.preventDefault()
  movePreviewOrigin(movement.axis, movement.amount)

  return true
}

function handleEditorRotationKey(event: KeyboardEvent): boolean {
  const axis = getEditorRotationAxisForKey(event)

  if (!axis) {
    return false
  }

  if (!selectedShapeId && !selectedPlacedShapeId) {
    return false
  }

  event.preventDefault()
  rotateSelectedShape(axis)

  return true
}

function getEditorMovementForKey(
  event: KeyboardEvent,
): { axis: "x" | "y" | "z", amount: number } | null {
  switch (event.code) {
    case "KeyA":
    case "ArrowLeft":
      return { axis: "x", amount: -1 }
    case "KeyD":
    case "ArrowRight":
      return { axis: "x", amount: 1 }
    case "KeyW":
    case "ArrowUp":
      return { axis: "z", amount: -1 }
    case "KeyS":
    case "ArrowDown":
      return { axis: "z", amount: 1 }
    case "Space":
      return { axis: "y", amount: 1 }
    case "ShiftLeft":
    case "ShiftRight":
      return { axis: "y", amount: -1 }
    default:
      return null
  }
}

function getEditorRotationAxisForKey(event: KeyboardEvent): RotationAxis | null {
  switch (event.code) {
    case "KeyR":
      return "x"
    case "KeyF":
      return "y"
    case "KeyV":
      return "z"
    default:
      return null
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
}

function getPlacedShapePointerHits(event: PointerEvent | undefined): GridPointerHit[] {
  if (!event) {
    return []
  }

  updatePlacedShapeRaycaster(event)

  const placedMeshes = placedShapes.flatMap((shape) => (
    shape.group.children
  ))
  const intersections = placedShapeRaycaster.intersectObjects(placedMeshes, false)

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
      kind: "surface",
    }]
  })
}

function getPlacedShapeIdAtPointer(event: PointerEvent): string | null {
  updatePlacedShapeRaycaster(event)

  const placedMeshes = placedShapes.flatMap((shape) => (
    shape.group.children
  ))
  const intersections = placedShapeRaycaster.intersectObjects(placedMeshes, false)
  const placedShapeId = intersections[0]?.object.userData.placedShapeId

  return typeof placedShapeId === "string" ? placedShapeId : null
}

function updatePlacedShapeRaycaster(event: PointerEvent) {
  const rect = mainScene.renderer.domElement.getBoundingClientRect()

  placedShapePointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  placedShapePointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  placedShapeRaycaster.setFromCamera(placedShapePointer, mainScene.camera)
}

function getPointerDistance(
  start: { x: number, y: number },
  end: PointerEvent,
): number {
  return Math.hypot(end.clientX - start.x, end.clientY - start.y)
}
