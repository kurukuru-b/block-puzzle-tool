import type { ShapeDefinition } from "../core/shape/ShapeDefinition"
import type { RotationAxis } from "../core/shape/rotateShapeCells"
import type { GridPos } from "../core/grid/GridPos"
import {
  getShapeDisplayColor,
  getShapeDisplayLabel,
  type ShapeColorMode,
} from "../app/shapeAppearance"
import {
  formatDifficulty,
  PUZZLE_DIFFICULTIES,
  type PuzzleDifficulty,
} from "../core/puzzle/PuzzleDifficulty"

type GridAxis = "x" | "y" | "z"
type MaybePromise<T> = T | Promise<T>

export type AppMode = "editor" | "viewer"

export type PlacedShapeSummary = {
  id: string
  shapeId: string
}

export type ImportPuzzleResult = {
  ok: boolean
  message: string
}

export type ViewerPuzzleSummary = {
  id: string
  title: string
}

export type ViewerHintShapeSummary = {
  shapeId: string
  label: string
  color: number
  isUsed: boolean
  isRevealed: boolean
}

type HintEntry = {
  id: number
  title: string
  text: string
  color?: number
  isError?: boolean
}

export type ViewerPanelState = {
  difficulty: PuzzleDifficulty
  problemIndex: number
  problemCount: number
  problemTitle: string
  selectedPuzzleId: string | null
  puzzles: ViewerPuzzleSummary[]
  colorEnabled: boolean
  timerText: string
  timerMode: TimerMode
  timerRunning: boolean
  countdownSeconds: number
  hintShapes: ViewerHintShapeSummary[]
}

export type TimerMode = "up" | "down"

type CreateShapeSelectorParams = {
  shapes: ShapeDefinition[]
  appVersion: string
  initialMode: AppMode
  initialViewerState: ViewerPanelState
  selectedShapeId: string | null
  initialPosition: GridPos
  initialShapeColorMode: ShapeColorMode
  initialCellEdgesEnabled: boolean
  initialCoreMarkerEnabled: boolean
  initialGridVisible: boolean
  initialFloorVisible: boolean
  onModeChange: (mode: AppMode) => void
  onToggleShapeColorMode: () => void
  onToggleCellEdges: () => void
  onToggleCoreMarker: () => void
  onToggleGrid: () => void
  onToggleFloor: () => void
  onSelect: (shapeId: string) => void
  onClearSelection: () => void
  onSelectPlacedShape: (placedShapeId: string) => void
  onSelectDifficulty: (difficulty: PuzzleDifficulty) => void
  onMoveProblem: (amount: number) => void
  onRandomProblem: () => void
  onRefreshPuzzles: () => MaybePromise<ImportPuzzleResult>
  onSelectProblem: (puzzleId: string) => void
  onClearViewerProblem: () => void
  onRenameProblem: (title: string) => MaybePromise<ImportPuzzleResult>
  onMoveProblemDifficulty: (difficulty: PuzzleDifficulty) => MaybePromise<ImportPuzzleResult>
  onReorderProblem: (amount: number) => MaybePromise<ImportPuzzleResult>
  onReorderProblemToIndex: (index: number) => MaybePromise<ImportPuzzleResult>
  onDeleteProblem: () => MaybePromise<ImportPuzzleResult>
  onToggleColor: () => void
  onToggleHintShape: (shapeId: string) => void
  onRevealHintCell: (pos: GridPos) => ImportPuzzleResult & { color?: number }
  onResetHints: () => void
  onStartHintCellPick: (
    onResult: (result: ImportPuzzleResult & { color?: number }) => void,
  ) => void
  onTimerStartStop: () => void
  onTimerReset: () => void
  onTimerModeChange: (mode: TimerMode) => void
  onCountdownSecondsChange: (seconds: number) => void
  onRotate: (axis: RotationAxis) => void
  onResetRotation: () => void
  onMovePosition: (axis: GridAxis, amount: number) => GridPos
  onPlaceShape: () => boolean
  onResetBoard: () => void
  onValidateBoard: () => ImportPuzzleResult
  onUndo: () => void
  onRedo: () => void
  onDeletePlacedShape: () => void
  onEditPlacedShape: () => void
  onExportPuzzle: () => string
  onImportPuzzle: (source: string) => ImportPuzzleResult
  onRegisterPuzzle: (difficulty: PuzzleDifficulty, title: string) => MaybePromise<ImportPuzzleResult>
}

type ShapeSelector = {
  element: HTMLElement
  setMode: (mode: AppMode) => void
  setViewerState: (state: ViewerPanelState) => void
  setPosition: (pos: GridPos) => void
  setSelectedShape: (shapeId: string | null) => void
  setPlacedShapes: (shapes: PlacedShapeSummary[]) => void
  setSelectedPlacedShape: (id: string | null) => void
  setShapeAvailability: (shapeId: string, isAvailable: boolean) => void
}

export function createShapeSelector({
  shapes,
  appVersion,
  initialMode,
  initialViewerState,
  selectedShapeId,
  initialPosition,
  initialShapeColorMode,
  initialCellEdgesEnabled,
  initialCoreMarkerEnabled,
  initialGridVisible,
  initialFloorVisible,
  onModeChange,
  onToggleShapeColorMode,
  onToggleCellEdges,
  onToggleCoreMarker,
  onToggleGrid,
  onToggleFloor,
  onSelect,
  onClearSelection,
  onSelectPlacedShape,
  onSelectDifficulty,
  onMoveProblem,
  onRandomProblem,
  onRefreshPuzzles,
  onSelectProblem,
  onClearViewerProblem,
  onRenameProblem,
  onMoveProblemDifficulty,
  onReorderProblem,
  onReorderProblemToIndex,
  onDeleteProblem,
  onToggleColor,
  onToggleHintShape,
  onRevealHintCell,
  onResetHints,
  onStartHintCellPick,
  onTimerStartStop,
  onTimerReset,
  onTimerModeChange,
  onCountdownSecondsChange,
  onRotate,
  onResetRotation,
  onMovePosition,
  onPlaceShape,
  onResetBoard,
  onValidateBoard,
  onUndo,
  onRedo,
  onDeletePlacedShape,
  onEditPlacedShape,
  onExportPuzzle,
  onImportPuzzle,
  onRegisterPuzzle,
}: CreateShapeSelectorParams): ShapeSelector {
  const root = document.createElement("div")
  root.className = "editor-panels"

  const uiToggleButton = document.createElement("button")
  uiToggleButton.type = "button"
  uiToggleButton.className = "ui-toggle-button"
  uiToggleButton.textContent = "Hide UI"
  uiToggleButton.setAttribute("aria-pressed", "false")
  uiToggleButton.addEventListener("click", () => {
    const isHidden = root.classList.toggle("is-ui-hidden")

    uiToggleButton.textContent = isHidden ? "Show UI" : "Hide UI"
    uiToggleButton.setAttribute("aria-pressed", String(isHidden))
  })
  root.appendChild(uiToggleButton)

  const timerOverlay = document.createElement("div")
  timerOverlay.className = "timer-overlay"

  const timerOverlayActions = document.createElement("div")
  timerOverlayActions.className = "timer-overlay-actions"
  timerOverlay.appendChild(timerOverlayActions)

  const timerOverlayButton = document.createElement("button")
  timerOverlayButton.type = "button"
  timerOverlayButton.className = "timer-overlay-button"
  timerOverlayButton.addEventListener("click", onTimerStartStop)
  timerOverlayActions.appendChild(timerOverlayButton)

  const timerOverlayResetButton = document.createElement("button")
  timerOverlayResetButton.type = "button"
  timerOverlayResetButton.className = "timer-overlay-button"
  timerOverlayResetButton.textContent = "Reset"
  timerOverlayResetButton.addEventListener("click", onTimerReset)
  timerOverlayActions.appendChild(timerOverlayResetButton)

  const timerOverlayExpandButton = document.createElement("button")
  timerOverlayExpandButton.type = "button"
  timerOverlayExpandButton.className = "timer-overlay-button timer-overlay-expand-button"
  timerOverlayExpandButton.textContent = "More"
  timerOverlayExpandButton.setAttribute("aria-expanded", "false")
  timerOverlayExpandButton.addEventListener("click", () => {
    const isExpanded = timerOverlay.classList.toggle("is-expanded")

    timerOverlayExpandButton.textContent = isExpanded ? "Less" : "More"
    timerOverlayExpandButton.setAttribute("aria-expanded", String(isExpanded))
  })
  timerOverlayActions.appendChild(timerOverlayExpandButton)

  const timerOverlayText = document.createElement("span")
  timerOverlayText.className = "timer-overlay-text"
  timerOverlay.appendChild(timerOverlayText)

  root.appendChild(timerOverlay)

  const hintOverlay = document.createElement("div")
  hintOverlay.className = "hint-overlay"
  root.appendChild(hintOverlay)

  const hintOverlayButton = document.createElement("button")
  hintOverlayButton.type = "button"
  hintOverlayButton.className = "hint-overlay-button"
  hintOverlayButton.textContent = "Hints"
  hintOverlayButton.setAttribute("aria-expanded", "false")
  hintOverlay.appendChild(hintOverlayButton)

  const hintMenu = document.createElement("div")
  hintMenu.className = "hint-menu"
  hintOverlay.appendChild(hintMenu)

  const hintMenuActions = document.createElement("div")
  hintMenuActions.className = "hint-menu-actions"
  hintMenu.appendChild(hintMenuActions)

  const hintMenuDetail = document.createElement("div")
  hintMenuDetail.className = "hint-menu-detail"
  hintMenu.appendChild(hintMenuDetail)

  hintOverlayButton.addEventListener("click", () => {
    const isOpen = hintOverlay.classList.toggle("is-open")

    hintOverlayButton.setAttribute("aria-expanded", String(isOpen))
  })

  const viewerProblemOverlay = document.createElement("div")
  viewerProblemOverlay.className = "viewer-problem-overlay"
  root.appendChild(viewerProblemOverlay)

  const viewerProblemOverlayIndex = document.createElement("span")
  viewerProblemOverlayIndex.className = "viewer-problem-overlay-index"
  viewerProblemOverlay.appendChild(viewerProblemOverlayIndex)

  const viewerProblemOverlayTitle = document.createElement("span")
  viewerProblemOverlayTitle.className = "viewer-problem-overlay-title"
  viewerProblemOverlay.appendChild(viewerProblemOverlayTitle)

  const hintResultPanel = document.createElement("section")
  hintResultPanel.className = "hint-result-panel"
  root.appendChild(hintResultPanel)

  const hintResultTitle = document.createElement("h2")
  hintResultTitle.textContent = "Hints"
  hintResultPanel.appendChild(hintResultTitle)

  const hintResetButton = document.createElement("button")
  hintResetButton.type = "button"
  hintResetButton.className = "secondary-action-button hint-reset-button"
  hintResetButton.textContent = "Reset"
  hintResetButton.addEventListener("click", () => {
    resetHintEntries({ syncBoard: true })
  })
  hintResultPanel.appendChild(hintResetButton)

  const hintResultBody = document.createElement("div")
  hintResultBody.className = "hint-result-body"
  hintResultPanel.appendChild(hintResultBody)

  const editorPanel = document.createElement("section")
  editorPanel.className = "shape-selector editor-panel"
  root.appendChild(editorPanel)

  const viewerPanel = document.createElement("section")
  viewerPanel.className = "shape-selector viewer-panel"
  root.appendChild(viewerPanel)
  let latestViewerState = initialViewerState
  let latestPlacedShapes: PlacedShapeSummary[] = []
  let problemListSignature = ""
  let shapeColorMode = initialShapeColorMode
  let cellEdgesEnabled = initialCellEdgesEnabled
  let coreMarkerEnabled = initialCoreMarkerEnabled
  let gridVisible = initialGridVisible
  let floorVisible = initialFloorVisible
  let activeHintMenuKey: string | null = null
  let nextHintEntryId = 1
  let hintEntries: HintEntry[] = []

  const editorHeader = createPanelHeader("TRI²CUBE App", appVersion)
  editorPanel.appendChild(editorHeader)

  const shapeColorModeButton = document.createElement("button")
  shapeColorModeButton.type = "button"
  shapeColorModeButton.className = "secondary-action-button color-mode-button"
  shapeColorModeButton.addEventListener("click", () => {
    shapeColorMode = shapeColorMode === "new" ? "old" : "new"
    updateShapeColorModeButton()
    updateShapeButtonAppearances()
    setPlacedShapes(latestPlacedShapes)
    onToggleShapeColorMode()
  })

  const cellEdgesButton = document.createElement("button")
  cellEdgesButton.type = "button"
  cellEdgesButton.className = "secondary-action-button cell-edges-button"
  cellEdgesButton.addEventListener("click", () => {
    cellEdgesEnabled = !cellEdgesEnabled
    updateCellEdgesButton()
    onToggleCellEdges()
  })

  const coreMarkerButton = document.createElement("button")
  coreMarkerButton.type = "button"
  coreMarkerButton.className = "secondary-action-button core-marker-button"
  coreMarkerButton.addEventListener("click", () => {
    coreMarkerEnabled = !coreMarkerEnabled
    updateCoreMarkerButton()
    onToggleCoreMarker()
  })

  const gridButton = document.createElement("button")
  gridButton.type = "button"
  gridButton.className = "secondary-action-button grid-toggle-button"
  gridButton.addEventListener("click", () => {
    gridVisible = !gridVisible
    updateGridButton()
    onToggleGrid()
  })

  const floorButton = document.createElement("button")
  floorButton.type = "button"
  floorButton.className = "secondary-action-button floor-toggle-button"
  floorButton.addEventListener("click", () => {
    floorVisible = !floorVisible
    updateFloorButton()
    onToggleFloor()
  })

  const colorButton = document.createElement("button")
  colorButton.type = "button"
  colorButton.className = "secondary-action-button color-toggle-button"
  colorButton.addEventListener("click", onToggleColor)

  const clearSelectionButton = document.createElement("button")
  clearSelectionButton.type = "button"
  clearSelectionButton.className = "secondary-action-button clear-selection-button"
  clearSelectionButton.textContent = "None"
  clearSelectionButton.setAttribute("aria-label", "Clear current selection")
  clearSelectionButton.addEventListener("click", () => {
    onClearSelection()
    setSelectedShape(null)
    setSelectedPlacedShape(null)
  })
  editorPanel.appendChild(clearSelectionButton)

  const shapeList = document.createElement("div")
  shapeList.className = "shape-list"
  editorPanel.appendChild(shapeList)
  const shapeButtons = new Map<string, HTMLButtonElement>()

  for (const shape of shapes) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "shape-button"
    button.dataset.shapeId = shape.id
    button.setAttribute("aria-label", `Select ${getShapeDisplayLabel(shape.id, shapeColorMode)} shape`)

    const swatch = document.createElement("span")
    swatch.className = "shape-swatch"
    swatch.style.backgroundColor = formatHexColor(getShapeDisplayColor(shape, shapeColorMode))
    button.appendChild(swatch)

    const label = document.createElement("span")
    label.textContent = getShapeDisplayLabel(shape.id, shapeColorMode)
    button.appendChild(label)

    if (shape.id === selectedShapeId) {
      button.classList.add("is-selected")
      button.setAttribute("aria-pressed", "true")
    } else {
      button.setAttribute("aria-pressed", "false")
    }

    button.addEventListener("click", () => {
      onSelect(shape.id)

      setSelectedShape(shape.id)
    })

    shapeList.appendChild(button)
    shapeButtons.set(shape.id, button)
  }

  updateShapeColorModeButton()
  updateCellEdgesButton()
  updateCoreMarkerButton()
  updateGridButton()
  updateFloorButton()

  const rotationControls = document.createElement("div")
  rotationControls.className = "rotation-controls"
  editorPanel.appendChild(rotationControls)

  for (const axis of ["x", "y", "z"] satisfies RotationAxis[]) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "rotation-button"
    button.textContent = axis.toUpperCase()
    button.setAttribute("aria-label", `Rotate shape around ${axis.toUpperCase()} axis`)
    button.addEventListener("click", () => onRotate(axis))
    rotationControls.appendChild(button)
  }

  const resetButton = document.createElement("button")
  resetButton.type = "button"
  resetButton.className = "rotation-button rotation-button-wide"
  resetButton.textContent = "Reset"
  resetButton.setAttribute("aria-label", "Reset shape rotation")
  resetButton.addEventListener("click", onResetRotation)
  rotationControls.appendChild(resetButton)

  const positionControls = document.createElement("div")
  positionControls.className = "position-controls"
  editorPanel.appendChild(positionControls)

  const positionValues = new Map<GridAxis, HTMLElement>()

  for (const axis of ["x", "y", "z"] satisfies GridAxis[]) {
    const row = document.createElement("div")
    row.className = "position-row"

    const label = document.createElement("span")
    label.className = "position-axis"
    label.textContent = axis.toUpperCase()
    row.appendChild(label)

    const decreaseButton = document.createElement("button")
    decreaseButton.type = "button"
    decreaseButton.className = "position-button"
    decreaseButton.textContent = "-"
    decreaseButton.setAttribute("aria-label", `Move ${axis.toUpperCase()} down`)
    row.appendChild(decreaseButton)

    const value = document.createElement("span")
    value.className = "position-value"
    value.textContent = String(initialPosition[axis])
    row.appendChild(value)
    positionValues.set(axis, value)

    const increaseButton = document.createElement("button")
    increaseButton.type = "button"
    increaseButton.className = "position-button"
    increaseButton.textContent = "+"
    increaseButton.setAttribute("aria-label", `Move ${axis.toUpperCase()} up`)
    row.appendChild(increaseButton)

    decreaseButton.addEventListener("click", () => {
      setPosition(onMovePosition(axis, -1))
    })

    increaseButton.addEventListener("click", () => {
      setPosition(onMovePosition(axis, 1))
    })

    positionControls.appendChild(row)
  }

  const actionControls = document.createElement("div")
  actionControls.className = "action-controls"
  editorPanel.appendChild(actionControls)

  const placeButton = document.createElement("button")
  placeButton.type = "button"
  placeButton.className = "place-button"
  placeButton.textContent = "Place"
  placeButton.setAttribute("aria-label", "Place current shape")
  placeButton.addEventListener("click", () => {
    placeButton.classList.toggle("is-rejected", !onPlaceShape())
  })
  actionControls.appendChild(placeButton)

  const placedCount = document.createElement("span")
  placedCount.className = "placed-count"
  actionControls.appendChild(placedCount)

  const boardControls = document.createElement("div")
  boardControls.className = "board-controls"
  editorPanel.appendChild(boardControls)

  const undoButton = document.createElement("button")
  undoButton.type = "button"
  undoButton.className = "secondary-action-button"
  undoButton.textContent = "Undo"
  undoButton.addEventListener("click", onUndo)
  boardControls.appendChild(undoButton)

  const redoButton = document.createElement("button")
  redoButton.type = "button"
  redoButton.className = "secondary-action-button"
  redoButton.textContent = "Redo"
  redoButton.addEventListener("click", onRedo)
  boardControls.appendChild(redoButton)

  const resetBoardButton = document.createElement("button")
  resetBoardButton.type = "button"
  resetBoardButton.className = "secondary-action-button danger-action-button"
  resetBoardButton.textContent = "Reset Board"
  resetBoardButton.addEventListener("click", onResetBoard)
  boardControls.appendChild(resetBoardButton)

  const validateBoardButton = document.createElement("button")
  validateBoardButton.type = "button"
  validateBoardButton.className = "secondary-action-button"
  validateBoardButton.textContent = "Check"
  boardControls.appendChild(validateBoardButton)

  const boardValidationStatus = document.createElement("span")
  boardValidationStatus.className = "board-validation-status"
  editorPanel.appendChild(boardValidationStatus)

  validateBoardButton.addEventListener("click", () => {
    const result = onValidateBoard()

    boardValidationStatus.textContent = result.message
    boardValidationStatus.classList.toggle("is-error", !result.ok)
  })

  const selectedControls = document.createElement("div")
  selectedControls.className = "selected-controls"
  editorPanel.appendChild(selectedControls)

  const selectedLabel = document.createElement("span")
  selectedLabel.className = "selected-label"
  selectedControls.appendChild(selectedLabel)

  const editButton = document.createElement("button")
  editButton.type = "button"
  editButton.className = "secondary-action-button"
  editButton.textContent = "Edit"
  editButton.addEventListener("click", onEditPlacedShape)
  selectedControls.appendChild(editButton)

  const deleteButton = document.createElement("button")
  deleteButton.type = "button"
  deleteButton.className = "secondary-action-button danger-action-button"
  deleteButton.textContent = "Delete"
  deleteButton.addEventListener("click", onDeletePlacedShape)
  selectedControls.appendChild(deleteButton)

  const placedList = document.createElement("div")
  placedList.className = "placed-list"
  editorPanel.appendChild(placedList)

  const viewerHeader = createPanelHeader("TRI²CUBE App", appVersion)
  viewerPanel.appendChild(viewerHeader)

  const clearViewerProblemButton = document.createElement("button")
  clearViewerProblemButton.type = "button"
  clearViewerProblemButton.className = "secondary-action-button clear-viewer-problem-button"
  clearViewerProblemButton.textContent = "None"
  clearViewerProblemButton.setAttribute("aria-label", "Clear selected viewer problem")
  clearViewerProblemButton.addEventListener("click", onClearViewerProblem)
  viewerPanel.appendChild(clearViewerProblemButton)

  const difficultyControls = document.createElement("div")
  difficultyControls.className = "difficulty-controls"
  viewerPanel.appendChild(difficultyControls)
  const difficultyButtons = new Map<PuzzleDifficulty, HTMLButtonElement>()

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "secondary-action-button difficulty-button"
    button.textContent = formatDifficulty(difficulty)
    button.addEventListener("click", () => onSelectDifficulty(difficulty))
    difficultyControls.appendChild(button)
    difficultyButtons.set(difficulty, button)
  }

  const problemControls = document.createElement("div")
  problemControls.className = "problem-controls"
  viewerPanel.appendChild(problemControls)

  const previousProblemButton = document.createElement("button")
  previousProblemButton.type = "button"
  previousProblemButton.className = "secondary-action-button"
  previousProblemButton.textContent = "-"
  previousProblemButton.setAttribute("aria-label", "Previous problem")
  previousProblemButton.addEventListener("click", () => onMoveProblem(-1))
  problemControls.appendChild(previousProblemButton)

  const problemLabel = document.createElement("span")
  problemLabel.className = "problem-label"
  problemControls.appendChild(problemLabel)

  const nextProblemButton = document.createElement("button")
  nextProblemButton.type = "button"
  nextProblemButton.className = "secondary-action-button"
  nextProblemButton.textContent = "+"
  nextProblemButton.setAttribute("aria-label", "Next problem")
  nextProblemButton.addEventListener("click", () => onMoveProblem(1))
  problemControls.appendChild(nextProblemButton)

  const randomProblemButton = document.createElement("button")
  randomProblemButton.type = "button"
  randomProblemButton.className = "secondary-action-button random-problem-button"
  randomProblemButton.textContent = "Random"
  randomProblemButton.setAttribute("aria-label", "Random problem")
  randomProblemButton.addEventListener("click", onRandomProblem)
  problemControls.appendChild(randomProblemButton)

  const refreshProblemButton = document.createElement("button")
  refreshProblemButton.type = "button"
  refreshProblemButton.className = "secondary-action-button refresh-problem-button"
  refreshProblemButton.textContent = "Reload"
  refreshProblemButton.setAttribute("aria-label", "Reload problems from database")
  refreshProblemButton.addEventListener("click", async () => {
    const result = await onRefreshPuzzles()

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  problemControls.appendChild(refreshProblemButton)

  const problemLookup = document.createElement("div")
  problemLookup.className = "problem-lookup"
  viewerPanel.appendChild(problemLookup)

  const problemNumberInput = document.createElement("input")
  problemNumberInput.type = "number"
  problemNumberInput.min = "1"
  problemNumberInput.step = "1"
  problemNumberInput.className = "problem-number-input"
  problemNumberInput.placeholder = "#"
  problemNumberInput.setAttribute("aria-label", "Problem number")
  problemLookup.appendChild(problemNumberInput)

  const problemNumberButton = document.createElement("button")
  problemNumberButton.type = "button"
  problemNumberButton.className = "secondary-action-button"
  problemNumberButton.textContent = "Go"
  problemNumberButton.addEventListener("click", selectProblemByNumber)
  problemLookup.appendChild(problemNumberButton)

  const problemSearchInput = document.createElement("input")
  problemSearchInput.type = "search"
  problemSearchInput.className = "problem-search-input"
  problemSearchInput.placeholder = "Search title"
  problemSearchInput.setAttribute("aria-label", "Search problem title")
  problemLookup.appendChild(problemSearchInput)

  const problemSearchButton = document.createElement("button")
  problemSearchButton.type = "button"
  problemSearchButton.className = "secondary-action-button"
  problemSearchButton.textContent = "Find"
  problemSearchButton.addEventListener("click", selectProblemByTitle)
  problemLookup.appendChild(problemSearchButton)

  problemNumberInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      selectProblemByNumber()
    }
  })

  problemSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      selectProblemByTitle()
    }
  })

  const problemTitle = document.createElement("span")
  problemTitle.className = "problem-title"
  viewerPanel.appendChild(problemTitle)

  const problemList = document.createElement("div")
  problemList.className = "problem-list"
  viewerPanel.appendChild(problemList)

  const problemManagement = document.createElement("div")
  problemManagement.className = "problem-management"
  viewerPanel.appendChild(problemManagement)

  const problemTitleInput = document.createElement("input")
  problemTitleInput.type = "text"
  problemTitleInput.className = "problem-title-input"
  problemTitleInput.placeholder = "Problem title"
  problemTitleInput.addEventListener("input", resetDeleteConfirmation)
  problemManagement.appendChild(problemTitleInput)

  const moveManagementRow = document.createElement("div")
  moveManagementRow.className = "problem-management-row problem-management-row-move"
  problemManagement.appendChild(moveManagementRow)

  const renameProblemButton = document.createElement("button")
  renameProblemButton.type = "button"
  renameProblemButton.className = "secondary-action-button"
  renameProblemButton.textContent = "Rename"
  renameProblemButton.addEventListener("click", async () => {
    resetDeleteConfirmation()
    const result = await onRenameProblem(problemTitleInput.value)

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  moveManagementRow.appendChild(renameProblemButton)

  const moveDifficultySelect = document.createElement("select")
  moveDifficultySelect.className = "problem-difficulty-select"
  moveDifficultySelect.setAttribute("aria-label", "Move problem difficulty")
  moveDifficultySelect.addEventListener("change", () => {
    resetDeleteConfirmation()
    updateMoveProblemButtonState()
  })
  moveManagementRow.appendChild(moveDifficultySelect)

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    const option = document.createElement("option")
    option.value = difficulty
    option.textContent = formatDifficulty(difficulty)
    moveDifficultySelect.appendChild(option)
  }

  const moveProblemButton = document.createElement("button")
  moveProblemButton.type = "button"
  moveProblemButton.className = "secondary-action-button"
  moveProblemButton.textContent = "Move"
  moveProblemButton.addEventListener("click", async () => {
    resetDeleteConfirmation()
    const result = await onMoveProblemDifficulty(moveDifficultySelect.value as PuzzleDifficulty)

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  moveManagementRow.appendChild(moveProblemButton)

  const reorderManagementRow = document.createElement("div")
  reorderManagementRow.className = "problem-management-row problem-management-row-reorder"
  problemManagement.appendChild(reorderManagementRow)

  const reorderUpButton = document.createElement("button")
  reorderUpButton.type = "button"
  reorderUpButton.className = "secondary-action-button"
  reorderUpButton.textContent = "Up"
  reorderUpButton.addEventListener("click", async () => {
    resetDeleteConfirmation()
    const result = await onReorderProblem(-1)

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  reorderManagementRow.appendChild(reorderUpButton)

  const reorderDownButton = document.createElement("button")
  reorderDownButton.type = "button"
  reorderDownButton.className = "secondary-action-button"
  reorderDownButton.textContent = "Down"
  reorderDownButton.addEventListener("click", async () => {
    resetDeleteConfirmation()
    const result = await onReorderProblem(1)

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  reorderManagementRow.appendChild(reorderDownButton)

  const reorderIndexInput = document.createElement("input")
  reorderIndexInput.type = "number"
  reorderIndexInput.min = "1"
  reorderIndexInput.step = "1"
  reorderIndexInput.className = "problem-number-input reorder-index-input"
  reorderIndexInput.placeholder = "Index"
  reorderIndexInput.setAttribute("aria-label", "Move selected problem to index")
  reorderManagementRow.appendChild(reorderIndexInput)

  const reorderIndexButton = document.createElement("button")
  reorderIndexButton.type = "button"
  reorderIndexButton.className = "secondary-action-button"
  reorderIndexButton.textContent = "Go"
  reorderIndexButton.addEventListener("click", async () => {
    resetDeleteConfirmation()
    const index = Number.parseInt(reorderIndexInput.value, 10)
    const result = await onReorderProblemToIndex(index)

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  reorderManagementRow.appendChild(reorderIndexButton)

  reorderIndexInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      reorderIndexButton.click()
    } else {
      resetDeleteConfirmation()
    }
  })

  const deleteProblemButton = document.createElement("button")
  deleteProblemButton.type = "button"
  deleteProblemButton.className = "secondary-action-button danger-action-button"
  deleteProblemButton.textContent = "Delete"
  let isDeleteConfirmationPending = false
  deleteProblemButton.addEventListener("click", async () => {
    if (!isDeleteConfirmationPending) {
      isDeleteConfirmationPending = true
      deleteProblemButton.textContent = "Are you sure?"
      deleteProblemButton.classList.add("is-confirming")
      return
    }

    const result = await onDeleteProblem()

    resetDeleteConfirmation()
    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  problemManagement.appendChild(deleteProblemButton)

  root.addEventListener("pointerdown", (event) => {
    if (event.target !== deleteProblemButton) {
      resetDeleteConfirmation()
    }
  })

  const problemStatus = document.createElement("span")
  problemStatus.className = "problem-status"
  viewerPanel.appendChild(problemStatus)

  const hintMenuButtons = [
    { key: "piece-count", label: "Piece count", action: renderHintPieceCount },
    { key: "used-pieces", label: "Used pieces", action: renderHintUsedPieces },
    { key: "check-piece", label: "Check piece", action: renderHintPieceCheck },
    { key: "reveal-piece", label: "Reveal piece", action: renderHintPieceReveal },
    { key: "cell-color", label: "Cell color", action: renderHintCellColor },
  ]
  const hintMenuButtonElements = new Map<string, HTMLButtonElement>()

  for (const item of hintMenuButtons) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "hint-menu-button"
    button.textContent = item.label
    button.addEventListener("click", () => {
      if (activeHintMenuKey === item.key) {
        closeHintMenuDetail()
        return
      }

      item.action(item.key)
    })
    hintMenuActions.appendChild(button)
    hintMenuButtonElements.set(item.key, button)
  }

  const timerPanel = document.createElement("div")
  timerPanel.className = "timer-panel"
  timerOverlay.appendChild(timerPanel)

  const timerLabel = document.createElement("span")
  timerLabel.className = "timer-label"
  timerPanel.appendChild(timerLabel)

  const timerModeControls = document.createElement("div")
  timerModeControls.className = "timer-mode-controls"
  timerPanel.appendChild(timerModeControls)
  const timerModeButtons = new Map<TimerMode, HTMLButtonElement>()

  for (const mode of ["up", "down"] satisfies TimerMode[]) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "secondary-action-button timer-mode-button"
    button.textContent = mode === "up" ? "Up" : "Down"
    button.addEventListener("click", () => onTimerModeChange(mode))
    timerModeControls.appendChild(button)
    timerModeButtons.set(mode, button)
  }

  const countdownRow = document.createElement("label")
  countdownRow.className = "countdown-row"
  timerPanel.appendChild(countdownRow)

  const countdownLabel = document.createElement("span")
  countdownLabel.textContent = "Countdown"
  countdownRow.appendChild(countdownLabel)

  const countdownInput = document.createElement("input")
  countdownInput.type = "number"
  countdownInput.min = "1"
  countdownInput.max = "999"
  countdownInput.step = "1"
  countdownInput.className = "countdown-input"
  countdownInput.addEventListener("change", () => {
    const seconds = Number.parseInt(countdownInput.value, 10)

    if (Number.isFinite(seconds) && seconds > 0) {
      onCountdownSecondsChange(seconds)
    }
  })
  countdownRow.appendChild(countdownInput)

  const countdownUnit = document.createElement("span")
  countdownUnit.textContent = "sec"
  countdownRow.appendChild(countdownUnit)

  const timerControls = document.createElement("div")
  timerControls.className = "timer-controls"
  timerPanel.appendChild(timerControls)

  const timerStartStopButton = document.createElement("button")
  timerStartStopButton.type = "button"
  timerStartStopButton.className = "secondary-action-button timer-action-button"
  timerStartStopButton.addEventListener("click", onTimerStartStop)
  timerControls.appendChild(timerStartStopButton)

  const timerResetButton = document.createElement("button")
  timerResetButton.type = "button"
  timerResetButton.className = "secondary-action-button timer-action-button"
  timerResetButton.textContent = "Reset"
  timerResetButton.addEventListener("click", onTimerReset)
  timerControls.appendChild(timerResetButton)

  const dataControls = document.createElement("section")
  dataControls.className = "export-controls data-panel"
  root.appendChild(dataControls)

  const modeControls = document.createElement("div")
  modeControls.className = "mode-controls"
  dataControls.appendChild(modeControls)

  const modeButtons = new Map<AppMode, HTMLButtonElement>()

  for (const mode of ["editor", "viewer"] satisfies AppMode[]) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "secondary-action-button mode-button"
    button.textContent = mode === "editor" ? "Editor" : "Viewer"
    button.addEventListener("click", () => onModeChange(mode))
    modeControls.appendChild(button)
    modeButtons.set(mode, button)
  }

  const visualSettings = document.createElement("div")
  visualSettings.className = "visual-settings"
  dataControls.appendChild(visualSettings)

  const visualSettingsLabel = document.createElement("span")
  visualSettingsLabel.className = "visual-settings-label"
  visualSettingsLabel.textContent = "Visual"
  visualSettings.appendChild(visualSettingsLabel)

  const visualSettingsButtons = document.createElement("div")
  visualSettingsButtons.className = "visual-settings-buttons"
  visualSettings.appendChild(visualSettingsButtons)
  visualSettingsButtons.append(
    shapeColorModeButton,
    colorButton,
    cellEdgesButton,
    coreMarkerButton,
    gridButton,
    floorButton,
  )

  const dataToolsToggleButton = document.createElement("button")
  dataToolsToggleButton.type = "button"
  dataToolsToggleButton.className = "secondary-action-button data-tools-toggle-button"
  dataToolsToggleButton.textContent = "Hide Tools"
  dataToolsToggleButton.setAttribute("aria-pressed", "false")
  dataControls.appendChild(dataToolsToggleButton)

  const dataTools = document.createElement("div")
  dataTools.className = "data-tools"
  dataControls.appendChild(dataTools)

  const dataActions = document.createElement("div")
  dataActions.className = "data-actions"
  dataTools.appendChild(dataActions)

  const importButton = document.createElement("button")
  importButton.type = "button"
  importButton.className = "secondary-action-button export-button"
  importButton.textContent = "Import"
  dataActions.appendChild(importButton)

  const exportButton = document.createElement("button")
  exportButton.type = "button"
  exportButton.className = "secondary-action-button export-button"
  exportButton.textContent = "Export"
  dataActions.appendChild(exportButton)

  const copyButton = document.createElement("button")
  copyButton.type = "button"
  copyButton.className = "secondary-action-button export-button"
  copyButton.textContent = "Copy"
  dataActions.appendChild(copyButton)

  const registerButton = document.createElement("button")
  registerButton.type = "button"
  registerButton.className = "secondary-action-button export-button"
  registerButton.textContent = "Register"
  dataActions.appendChild(registerButton)

  const registerChoices = document.createElement("div")
  registerChoices.className = "register-choices"
  dataTools.appendChild(registerChoices)

  const registerTitleInput = document.createElement("input")
  registerTitleInput.type = "text"
  registerTitleInput.className = "register-title-input"
  registerTitleInput.placeholder = "Problem title"
  registerTitleInput.setAttribute("aria-label", "Problem title for registration")
  registerChoices.appendChild(registerTitleInput)

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "secondary-action-button register-choice-button"
    button.textContent = formatDifficulty(difficulty)
    button.addEventListener("click", async () => {
      const result = await onRegisterPuzzle(difficulty, registerTitleInput.value)

      importStatus.textContent = result.message
      importStatus.classList.toggle("is-error", !result.ok)

      if (result.ok) {
        registerTitleInput.value = ""
        registerChoices.classList.remove("is-visible")
      }
    })
    registerChoices.appendChild(button)
  }

  const dataText = document.createElement("textarea")
  dataText.className = "export-output"
  dataText.spellcheck = false
  dataText.placeholder = "Exported puzzle JSON"
  dataTools.appendChild(dataText)

  const importStatus = document.createElement("span")
  importStatus.className = "import-status"
  dataTools.appendChild(importStatus)

  dataToolsToggleButton.addEventListener("click", () => {
    const isHidden = dataTools.classList.toggle("is-hidden")

    dataToolsToggleButton.textContent = isHidden ? "Show Tools" : "Hide Tools"
    dataToolsToggleButton.setAttribute("aria-pressed", String(isHidden))
  })

  exportButton.addEventListener("click", () => {
    try {
      dataText.value = onExportPuzzle()
      importStatus.textContent = "Exported"
      importStatus.classList.remove("is-error")
      dataText.focus()
      dataText.select()
    } catch (error) {
      importStatus.textContent = error instanceof Error ? error.message : "exportに失敗しました。"
      importStatus.classList.add("is-error")
    }
  })

  copyButton.addEventListener("click", async () => {
    if (!dataText.value.trim()) {
      try {
        dataText.value = onExportPuzzle()
      } catch (error) {
        importStatus.textContent = error instanceof Error ? error.message : "exportに失敗しました。"
        importStatus.classList.add("is-error")
        return
      }
    }

    try {
      await navigator.clipboard.writeText(dataText.value)
      importStatus.textContent = "Copied"
      importStatus.classList.remove("is-error")
    } catch {
      dataText.focus()
      dataText.select()

      if (document.execCommand("copy")) {
        importStatus.textContent = "Copied"
        importStatus.classList.remove("is-error")
        return
      }

      importStatus.textContent = "Copy failed. Text selected."
      importStatus.classList.add("is-error")
    }
  })

  importButton.addEventListener("click", () => {
    const result = onImportPuzzle(dataText.value)

    importStatus.textContent = result.message
    importStatus.classList.toggle("is-error", !result.ok)
  })

  registerButton.addEventListener("click", () => {
    const isVisible = registerChoices.classList.toggle("is-visible")

    if (isVisible) {
      registerTitleInput.focus()
    }

    importStatus.textContent = "Enter a title or choose a difficulty to auto-name."
    importStatus.classList.remove("is-error")
  })

  setMode(initialMode)
  setViewerState(initialViewerState)
  setPosition(initialPosition)
  setPlacedShapes([])
  setSelectedPlacedShape(null)

  function setPosition(pos: GridPos) {
    for (const axis of ["x", "y", "z"] satisfies GridAxis[]) {
      positionValues.get(axis)!.textContent = String(pos[axis])
    }
  }

  return {
    element: root,
    setMode,
    setViewerState,
    setPosition,
    setSelectedShape,
    setPlacedShapes,
    setSelectedPlacedShape,
    setShapeAvailability,
  }

  function setSelectedShape(shapeId: string | null) {
    placeButton.disabled = shapeId === null
    clearSelectionButton.classList.toggle("is-selected", shapeId === null)

    for (const item of shapeList.querySelectorAll<HTMLButtonElement>(".shape-button")) {
      const isSelected = item.dataset.shapeId === shapeId
      item.classList.toggle("is-selected", isSelected)
      item.setAttribute("aria-pressed", String(isSelected))
    }
  }

  function setPlacedShapes(shapes: PlacedShapeSummary[]) {
    latestPlacedShapes = shapes
    placedCount.textContent = `Placed ${shapes.length}`
    placedList.replaceChildren()

    if (shapes.length === 0) {
      const empty = document.createElement("span")
      empty.className = "placed-empty"
      empty.textContent = "No placed shapes"
      placedList.appendChild(empty)
      return
    }

    for (const shape of shapes) {
      const item = document.createElement("span")
      item.className = "placed-item"
      item.dataset.placedShapeId = shape.id
      item.textContent = getShapeDisplayLabel(shape.shapeId, shapeColorMode)
      item.addEventListener("click", () => onSelectPlacedShape(shape.id))
      placedList.appendChild(item)
    }
  }

  function setMode(mode: AppMode) {
    editorPanel.classList.toggle("is-visible", mode === "editor")
    viewerPanel.classList.toggle("is-visible", mode === "viewer")

    for (const [itemMode, button] of modeButtons) {
      const isSelected = itemMode === mode
      button.classList.toggle("is-selected", isSelected)
      button.setAttribute("aria-pressed", String(isSelected))
    }
  }

  function setViewerState(state: ViewerPanelState) {
    const previousPuzzleId = latestViewerState.selectedPuzzleId

    latestViewerState = state
    const hasSelectedProblem = state.selectedPuzzleId !== null

    if (previousPuzzleId !== state.selectedPuzzleId) {
      resetHintEntries({ syncBoard: false })
      closeHintMenuDetail()
    }

    for (const [difficulty, button] of difficultyButtons) {
      const isSelected = difficulty === state.difficulty
      button.classList.toggle("is-selected", isSelected)
      button.setAttribute("aria-pressed", String(isSelected))
    }

    problemLabel.textContent = state.problemCount === 0
      ? "No problems"
      : `${state.problemIndex + 1} / ${state.problemCount}`
    problemTitle.textContent = state.problemTitle
    viewerProblemOverlay.classList.toggle("is-visible", hasSelectedProblem)
    viewerProblemOverlayIndex.textContent = hasSelectedProblem
      ? `${formatDifficulty(state.difficulty)} ${state.problemIndex + 1} / ${state.problemCount}`
      : ""
    viewerProblemOverlayTitle.textContent = hasSelectedProblem
      ? state.problemTitle
      : ""
    previousProblemButton.disabled = state.problemCount <= 1
    nextProblemButton.disabled = state.problemCount <= 1
    randomProblemButton.disabled = state.problemCount === 0
    refreshProblemButton.disabled = false
    clearViewerProblemButton.disabled = state.selectedPuzzleId === null
    problemNumberInput.disabled = state.problemCount === 0
    problemNumberInput.max = String(Math.max(1, state.problemCount))
    problemNumberButton.disabled = state.problemCount === 0
    problemSearchInput.disabled = state.problemCount === 0
    problemSearchButton.disabled = state.problemCount === 0
    problemTitleInput.disabled = state.selectedPuzzleId === null
    renameProblemButton.disabled = state.selectedPuzzleId === null
    deleteProblemButton.disabled = state.selectedPuzzleId === null
    reorderUpButton.disabled = state.selectedPuzzleId === null || state.problemIndex <= 0
    reorderDownButton.disabled = state.selectedPuzzleId === null ||
      state.problemIndex >= state.problemCount - 1
    reorderIndexInput.disabled = state.selectedPuzzleId === null
    reorderIndexInput.max = String(Math.max(1, state.problemCount))
    reorderIndexButton.disabled = state.selectedPuzzleId === null

    if (document.activeElement !== problemTitleInput) {
      problemTitleInput.value = state.selectedPuzzleId ? state.problemTitle : ""
    }

    if (document.activeElement !== moveDifficultySelect) {
      moveDifficultySelect.value = state.difficulty
    }

    moveDifficultySelect.disabled = state.selectedPuzzleId === null
    updateMoveProblemButtonState()

    rebuildProblemListIfNeeded(state)

    colorButton.textContent = state.colorEnabled ? "Color On" : "Color Off"
    colorButton.classList.toggle("is-selected", state.colorEnabled)
    timerLabel.textContent = state.timerText
    timerOverlayText.textContent = state.timerText
    timerOverlayButton.textContent = state.timerRunning ? "Stop" : "Start"
    timerOverlayButton.setAttribute("aria-label", state.timerRunning ? "Stop timer" : "Start timer")
    timerOverlay.classList.toggle("is-running", state.timerRunning)
    timerPanel.classList.toggle("is-running", state.timerRunning)
    timerStartStopButton.textContent = state.timerRunning ? "Stop" : "Start"
    countdownInput.value = String(Math.max(1, state.countdownSeconds))
    countdownRow.classList.toggle("is-disabled", state.timerMode !== "down")
    countdownInput.disabled = state.timerMode !== "down" || state.timerRunning
    hintOverlayButton.disabled = state.selectedPuzzleId === null

    if (state.selectedPuzzleId === null) {
      hintOverlay.classList.remove("is-open")
      resetHintEntries({ syncBoard: false })
      closeHintMenuDetail()
    }

    for (const [mode, button] of timerModeButtons) {
      const isSelected = mode === state.timerMode
      button.classList.toggle("is-selected", isSelected)
      button.setAttribute("aria-pressed", String(isSelected))
    }

    registerButton.textContent = "Register"
  }

  function createPanelHeader(titleText: string, version: string): HTMLElement {
    const header = document.createElement("div")
    header.className = "panel-header"

    const title = document.createElement("h1")
    title.textContent = titleText
    header.appendChild(title)

    const versionBadge = document.createElement("span")
    versionBadge.className = "version-badge"
    versionBadge.textContent = `ver. ${version}`
    header.appendChild(versionBadge)

    return header
  }

  function renderHintPieceCount() {
    const usedShapes = getUsedHintShapes()

    closeHintMenuDetail()
    addHintEntry({
      title: "Piece count",
      text: `ピース数：${usedShapes.length}`,
    })
  }

  function renderHintUsedPieces() {
    const usedShapes = getUsedHintShapes()

    closeHintMenuDetail()
    addHintEntry({
      title: "Used pieces",
      text: usedShapes.length === 0
        ? "使用パーツ：none"
        : `使用パーツ：${usedShapes.map((shape) => shape.label).join(", ")}`,
    })
  }

  function renderHintPieceCheck(key: string) {
    openHintMenuDetail(key)
    appendHintMenuTitle("Check piece")
    appendHintShapeList(latestViewerState.hintShapes, hintMenuDetail, {
      onSelect: (shape) => {
        addHintEntry({
          title: "Check piece",
          text: `${shape.label}：${shape.isUsed ? "used" : "unused"}`,
          color: shape.color,
        })
      },
    })
  }

  function renderHintPieceReveal(key: string) {
    openHintMenuDetail(key)
    appendHintMenuTitle("Reveal piece")
    appendHintShapeList(getUsedHintShapes(), hintMenuDetail, { withToggle: true })
  }

  function renderHintCellColor(key: string) {
    openHintMenuDetail(key)
    appendHintMenuTitle("Cell Reveal")

    const tapButton = document.createElement("button")
    tapButton.type = "button"
    tapButton.className = "secondary-action-button hint-wide-button"
    tapButton.textContent = "Tap Cell"
    tapButton.addEventListener("click", () => {
      onStartHintCellPick((result) => {
        addHintCellEntry(result)
      })
    })
    hintMenuDetail.appendChild(tapButton)

    const manualLabel = document.createElement("span")
    manualLabel.className = "hint-title"
    manualLabel.textContent = "or X/Y/Z"
    hintMenuDetail.appendChild(manualLabel)

    const row = document.createElement("div")
    row.className = "hint-cell-row"
    hintMenuDetail.appendChild(row)
    const inputs = new Map<GridAxis, HTMLInputElement>()

    for (const axis of ["x", "y", "z"] satisfies GridAxis[]) {
      const input = document.createElement("input")
      input.type = "number"
      input.min = "0"
      input.max = "4"
      input.step = "1"
      input.className = "hint-cell-input"
      input.placeholder = axis.toUpperCase()
      input.setAttribute("aria-label", `Hint ${axis.toUpperCase()} coordinate`)
      row.appendChild(input)
      inputs.set(axis, input)
    }

    const button = document.createElement("button")
    button.type = "button"
    button.className = "secondary-action-button"
    button.textContent = "Check"
    row.appendChild(button)

    button.addEventListener("click", () => {
      const x = readHintCellInput(inputs, "x")
      const y = readHintCellInput(inputs, "y")
      const z = readHintCellInput(inputs, "z")
      const result = x === null || y === null || z === null
        ? { ok: false, message: "Enter X/Y/Z from 0 to 4." }
        : onRevealHintCell({ x, y, z })

      addHintCellEntry(result)
    })
  }

  function openHintMenuDetail(key: string) {
    activeHintMenuKey = key
    hintMenuDetail.replaceChildren()
    updateHintMenuButtonState()
  }

  function closeHintMenuDetail() {
    activeHintMenuKey = null
    hintMenuDetail.replaceChildren()
    updateHintMenuButtonState()
  }

  function updateHintMenuButtonState() {
    for (const [key, button] of hintMenuButtonElements) {
      const isSelected = key === activeHintMenuKey
      button.classList.toggle("is-selected", isSelected)
      button.setAttribute("aria-pressed", String(isSelected))
    }
  }

  function appendHintMenuTitle(title: string) {
    const item = document.createElement("span")
    item.className = "hint-title"
    item.textContent = title
    hintMenuDetail.appendChild(item)
  }

  function addHintEntry(entry: Omit<HintEntry, "id">) {
    hintEntries.push({
      id: nextHintEntryId,
      ...entry,
    })
    nextHintEntryId += 1
    renderHintEntries()
  }

  function addHintCellEntry(result: ImportPuzzleResult & { color?: number }) {
    addHintEntry({
      title: "Cell Reveal",
      text: result.message,
      color: result.color,
      isError: !result.ok,
    })
  }

  function resetHintEntries(options: { syncBoard: boolean }) {
    hintEntries = []
    hintResultBody.replaceChildren()
    hintResultPanel.classList.remove("is-visible")

    if (options.syncBoard) {
      onResetHints()
    }
  }

  function removeHintEntries(predicate: (entry: HintEntry) => boolean) {
    hintEntries = hintEntries.filter((entry) => !predicate(entry))
    renderHintEntries()
  }

  function renderHintEntries() {
    hintResultTitle.textContent = `Hints (${hintEntries.length})`
    hintResultBody.replaceChildren()
    hintResultPanel.classList.toggle("is-visible", hintEntries.length > 0)

    for (const entry of hintEntries) {
      const item = document.createElement("button")
      item.type = "button"
      item.className = "hint-entry"
      item.classList.toggle("is-error", entry.isError === true)
      item.setAttribute("aria-label", `Remove hint: ${entry.text}`)
      item.addEventListener("click", () => {
        hintEntries = hintEntries.filter((candidate) => candidate.id !== entry.id)
        renderHintEntries()
      })

      const swatch = document.createElement("span")
      swatch.className = "hint-cell-swatch"
      swatch.classList.toggle("is-visible", entry.color !== undefined)
      item.appendChild(swatch)

      if (entry.color !== undefined) {
        swatch.style.backgroundColor = formatHexColor(entry.color)
      }

      const text = document.createElement("span")
      text.textContent = entry.text
      item.appendChild(text)

      hintResultBody.appendChild(item)
    }
  }

  function appendHintShapeList(
    shapes: ViewerHintShapeSummary[],
    target: HTMLElement,
    options: {
      withToggle?: boolean
      onSelect?: (shape: ViewerHintShapeSummary) => void
    } = {},
  ) {
    const list = document.createElement("div")
    list.className = "hint-shape-list"
    target.appendChild(list)

    if (shapes.length === 0) {
      const empty = document.createElement("span")
      empty.className = "hint-empty"
      empty.textContent = "No matching pieces."
      list.appendChild(empty)
      return
    }

    for (const shape of shapes) {
      const row = document.createElement("div")
      row.className = "hint-shape-row"
      row.classList.toggle("is-unused", !shape.isUsed)

      const swatch = document.createElement("span")
      swatch.className = "hint-shape-swatch"
      swatch.style.backgroundColor = formatHexColor(shape.color)
      row.appendChild(swatch)

      const label = document.createElement("span")
      label.className = "hint-shape-label"
      label.textContent = shape.label
      row.appendChild(label)

      const usedLabel = document.createElement("span")
      usedLabel.className = "hint-shape-used"
      usedLabel.textContent = shape.isUsed ? "Used" : "Unused"
      row.appendChild(usedLabel)

      if (options.withToggle || options.onSelect) {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "secondary-action-button hint-shape-button"
        button.textContent = options.withToggle
          ? (shape.isRevealed ? "On" : "Off")
          : "Pick"
        button.disabled = options.withToggle === true && !shape.isUsed
        button.classList.toggle("is-selected", options.withToggle === true && shape.isRevealed)
        button.addEventListener("click", () => {
          if (options.withToggle) {
            const willReveal = !shape.isRevealed

            onToggleHintShape(shape.shapeId)

            if (willReveal) {
              addHintEntry({
                title: "Reveal piece",
                text: `${shape.label}：on`,
                color: shape.color,
              })
            } else {
              removeHintEntries((entry) => (
                entry.title === "Reveal piece" &&
                entry.text === `${shape.label}：on`
              ))
            }

            renderHintPieceReveal("reveal-piece")
            return
          }

          options.onSelect?.(shape)
        })
        row.appendChild(button)
      }

      list.appendChild(row)
    }
  }

  function getUsedHintShapes(): ViewerHintShapeSummary[] {
    return latestViewerState.hintShapes.filter((shape) => shape.isUsed)
  }

  function readHintCellInput(
    inputs: Map<GridAxis, HTMLInputElement>,
    axis: GridAxis,
  ): number | null {
    const input = inputs.get(axis)
    const value = Number.parseInt(input?.value ?? "", 10)

    if (!Number.isInteger(value) || value < 0 || value > 4) {
      return null
    }

    return value
  }

  function resetDeleteConfirmation() {
    isDeleteConfirmationPending = false
    deleteProblemButton.textContent = "Delete"
    deleteProblemButton.classList.remove("is-confirming")
  }

  function updateMoveProblemButtonState() {
    moveProblemButton.disabled = latestViewerState.selectedPuzzleId === null ||
      moveDifficultySelect.value === latestViewerState.difficulty
  }

  function rebuildProblemListIfNeeded(state: ViewerPanelState) {
    const nextSignature = getProblemListSignature(state)

    if (nextSignature === problemListSignature) {
      return
    }

    problemListSignature = nextSignature
    rebuildProblemList(state)
  }

  function selectProblemByNumber() {
    const problemNumber = Number.parseInt(problemNumberInput.value, 10)

    if (!Number.isInteger(problemNumber)) {
      setProblemLookupError("Enter a problem number.")
      return
    }

    const puzzle = latestViewerState.puzzles[problemNumber - 1]

    if (!puzzle) {
      setProblemLookupError(`Problem #${problemNumber} was not found.`)
      return
    }

    onSelectProblem(puzzle.id)
    setProblemLookupMessage(`Selected #${problemNumber}.`)
  }

  function selectProblemByTitle() {
    const query = problemSearchInput.value.trim().toLowerCase()

    if (!query) {
      setProblemLookupError("Enter a title search.")
      return
    }

    const index = latestViewerState.puzzles.findIndex((puzzle) =>
      puzzle.title.toLowerCase().includes(query)
    )

    if (index === -1) {
      setProblemLookupError(`No title matched "${problemSearchInput.value.trim()}".`)
      return
    }

    onSelectProblem(latestViewerState.puzzles[index]!.id)
    setProblemLookupMessage(`Selected #${index + 1}.`)
  }

  function setProblemLookupMessage(message: string) {
    problemStatus.textContent = message
    problemStatus.classList.remove("is-error")
  }

  function setProblemLookupError(message: string) {
    problemStatus.textContent = message
    problemStatus.classList.add("is-error")
  }

  function rebuildProblemList(state: ViewerPanelState) {
    const previousScrollTop = problemList.scrollTop
    problemList.replaceChildren()

    if (state.puzzles.length === 0) {
      const empty = document.createElement("span")
      empty.className = "problem-empty"
      empty.textContent = "No registered problems"
      problemList.appendChild(empty)
      problemList.scrollTop = previousScrollTop
      return
    }

    state.puzzles.forEach((puzzle, index) => {
      const item = document.createElement("button")
      item.type = "button"
      item.className = "problem-item"
      item.classList.toggle("is-selected", puzzle.id === state.selectedPuzzleId)
      item.setAttribute("aria-pressed", String(puzzle.id === state.selectedPuzzleId))
      item.addEventListener("click", () => {
        onSelectProblem(puzzle.id)
        problemStatus.textContent = ""
        problemStatus.classList.remove("is-error")
      })

      const number = document.createElement("span")
      number.className = "problem-item-number"
      number.textContent = String(index + 1)
      item.appendChild(number)

      const title = document.createElement("span")
      title.className = "problem-item-title"
      title.textContent = puzzle.title
      item.appendChild(title)

      problemList.appendChild(item)
    })

    problemList.scrollTop = previousScrollTop
  }

  function getProblemListSignature(state: ViewerPanelState): string {
    return [
      state.selectedPuzzleId ?? "",
      ...state.puzzles.map((puzzle) => `${puzzle.id}:${puzzle.title}`),
    ].join("|")
  }

  function setSelectedPlacedShape(id: string | null) {
    selectedControls.classList.toggle("is-visible", id !== null)
    selectedLabel.textContent = id ? `Selected ${id}` : ""

    for (const item of placedList.querySelectorAll<HTMLElement>(".placed-item")) {
      item.classList.toggle("is-selected", item.dataset.placedShapeId === id)
    }
  }

  function setShapeAvailability(shapeId: string, isAvailable: boolean) {
    const button = shapeButtons.get(shapeId)

    if (!button) {
      return
    }

    button.disabled = !isAvailable
    button.classList.toggle("is-unavailable", !isAvailable)
  }

  function updateShapeColorModeButton() {
    shapeColorModeButton.textContent = shapeColorMode === "new"
      ? "New Color"
      : "Old Color"
    shapeColorModeButton.setAttribute(
      "aria-label",
      shapeColorMode === "new" ? "Switch to old colors" : "Switch to new colors",
    )
  }

  function updateCellEdgesButton() {
    cellEdgesButton.textContent = cellEdgesEnabled
      ? "Edges On"
      : "Edges Off"
    cellEdgesButton.setAttribute(
      "aria-label",
      cellEdgesEnabled ? "Hide cell edges" : "Show cell edges",
    )
    cellEdgesButton.classList.toggle("is-selected", cellEdgesEnabled)
    cellEdgesButton.setAttribute("aria-pressed", String(cellEdgesEnabled))
  }

  function updateCoreMarkerButton() {
    coreMarkerButton.textContent = coreMarkerEnabled
      ? "Core On"
      : "Core Off"
    coreMarkerButton.setAttribute(
      "aria-label",
      coreMarkerEnabled ? "Hide core marker" : "Show core marker",
    )
    coreMarkerButton.classList.toggle("is-selected", coreMarkerEnabled)
    coreMarkerButton.setAttribute("aria-pressed", String(coreMarkerEnabled))
  }

  function updateGridButton() {
    gridButton.textContent = gridVisible ? "Grid On" : "Grid Off"
    gridButton.setAttribute(
      "aria-label",
      gridVisible ? "Hide grid" : "Show grid",
    )
    gridButton.classList.toggle("is-selected", gridVisible)
    gridButton.setAttribute("aria-pressed", String(gridVisible))
  }

  function updateFloorButton() {
    floorButton.textContent = floorVisible ? "Floor On" : "Floor Off"
    floorButton.setAttribute(
      "aria-label",
      floorVisible ? "Hide floor" : "Show floor",
    )
    floorButton.classList.toggle("is-selected", floorVisible)
    floorButton.setAttribute("aria-pressed", String(floorVisible))
  }

  function updateShapeButtonAppearances() {
    for (const shape of shapes) {
      const button = shapeButtons.get(shape.id)

      if (!button) {
        continue
      }

      const swatch = button.querySelector<HTMLElement>(".shape-swatch")
      const label = button.querySelector<HTMLElement>("span:last-child")

      button.setAttribute("aria-label", `Select ${getShapeDisplayLabel(shape.id, shapeColorMode)} shape`)

      if (swatch) {
        swatch.style.backgroundColor = formatHexColor(getShapeDisplayColor(shape, shapeColorMode))
      }

      if (label) {
        label.textContent = getShapeDisplayLabel(shape.id, shapeColorMode)
      }
    }
  }

  function formatHexColor(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`
  }
}
