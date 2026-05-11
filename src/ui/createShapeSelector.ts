import type { ShapeDefinition } from "../core/shape/ShapeDefinition"
import type { RotationAxis } from "../core/shape/rotateShapeCells"
import type { GridPos } from "../core/grid/GridPos"

type GridAxis = "x" | "y" | "z"
type MaybePromise<T> = T | Promise<T>

export type AppMode = "editor" | "viewer"

export type PuzzleDifficulty = "easy" | "normal" | "hard" | "challenge"

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
}

export type TimerMode = "up" | "down"

type CreateShapeSelectorParams = {
  shapes: ShapeDefinition[]
  initialMode: AppMode
  initialViewerState: ViewerPanelState
  selectedShapeId: string | null
  initialPosition: GridPos
  onModeChange: (mode: AppMode) => void
  onSelect: (shapeId: string) => void
  onClearSelection: () => void
  onSelectPlacedShape: (placedShapeId: string) => void
  onSelectDifficulty: (difficulty: PuzzleDifficulty) => void
  onMoveProblem: (amount: number) => void
  onSelectProblem: (puzzleId: string) => void
  onRenameProblem: (title: string) => MaybePromise<ImportPuzzleResult>
  onDeleteProblem: () => MaybePromise<ImportPuzzleResult>
  onToggleColor: () => void
  onTimerStartStop: () => void
  onTimerReset: () => void
  onTimerModeChange: (mode: TimerMode) => void
  onCountdownSecondsChange: (seconds: number) => void
  onRotate: (axis: RotationAxis) => void
  onResetRotation: () => void
  onMovePosition: (axis: GridAxis, amount: number) => GridPos
  onPlaceShape: () => boolean
  onDeletePlacedShape: () => void
  onEditPlacedShape: () => void
  onExportPuzzle: () => string
  onImportPuzzle: (source: string) => ImportPuzzleResult
  onRegisterPuzzle: (difficulty: PuzzleDifficulty) => MaybePromise<ImportPuzzleResult>
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
  initialMode,
  initialViewerState,
  selectedShapeId,
  initialPosition,
  onModeChange,
  onSelect,
  onClearSelection,
  onSelectPlacedShape,
  onSelectDifficulty,
  onMoveProblem,
  onSelectProblem,
  onRenameProblem,
  onDeleteProblem,
  onToggleColor,
  onTimerStartStop,
  onTimerReset,
  onTimerModeChange,
  onCountdownSecondsChange,
  onRotate,
  onResetRotation,
  onMovePosition,
  onPlaceShape,
  onDeletePlacedShape,
  onEditPlacedShape,
  onExportPuzzle,
  onImportPuzzle,
  onRegisterPuzzle,
}: CreateShapeSelectorParams): ShapeSelector {
  const root = document.createElement("div")
  root.className = "editor-panels"

  const editorPanel = document.createElement("section")
  editorPanel.className = "shape-selector editor-panel"
  root.appendChild(editorPanel)

  const viewerPanel = document.createElement("section")
  viewerPanel.className = "shape-selector viewer-panel"
  root.appendChild(viewerPanel)

  const title = document.createElement("h1")
  title.textContent = "Block Puzzle Tool"
  editorPanel.appendChild(title)

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
    button.setAttribute("aria-label", `Select ${shape.id} shape`)

    const swatch = document.createElement("span")
    swatch.className = "shape-swatch"
    swatch.style.backgroundColor = `#${shape.color.toString(16).padStart(6, "0")}`
    button.appendChild(swatch)

    const label = document.createElement("span")
    label.textContent = shape.id
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

  const viewerTitle = document.createElement("h1")
  viewerTitle.textContent = "Viewer"
  viewerPanel.appendChild(viewerTitle)

  const difficultyControls = document.createElement("div")
  difficultyControls.className = "difficulty-controls"
  viewerPanel.appendChild(difficultyControls)
  const difficultyButtons = new Map<PuzzleDifficulty, HTMLButtonElement>()

  for (const difficulty of ["easy", "normal", "hard", "challenge"] satisfies PuzzleDifficulty[]) {
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
  problemManagement.appendChild(problemTitleInput)

  const renameProblemButton = document.createElement("button")
  renameProblemButton.type = "button"
  renameProblemButton.className = "secondary-action-button"
  renameProblemButton.textContent = "Rename"
  renameProblemButton.addEventListener("click", async () => {
    const result = await onRenameProblem(problemTitleInput.value)

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  problemManagement.appendChild(renameProblemButton)

  const deleteProblemButton = document.createElement("button")
  deleteProblemButton.type = "button"
  deleteProblemButton.className = "secondary-action-button danger-action-button"
  deleteProblemButton.textContent = "Delete"
  deleteProblemButton.addEventListener("click", async () => {
    const result = await onDeleteProblem()

    problemStatus.textContent = result.message
    problemStatus.classList.toggle("is-error", !result.ok)
  })
  problemManagement.appendChild(deleteProblemButton)

  const problemStatus = document.createElement("span")
  problemStatus.className = "problem-status"
  viewerPanel.appendChild(problemStatus)

  const viewerActions = document.createElement("div")
  viewerActions.className = "viewer-actions"
  viewerPanel.appendChild(viewerActions)

  const colorButton = document.createElement("button")
  colorButton.type = "button"
  colorButton.className = "secondary-action-button color-toggle-button"
  colorButton.addEventListener("click", onToggleColor)
  viewerActions.appendChild(colorButton)

  const timerPanel = document.createElement("div")
  timerPanel.className = "timer-panel"
  viewerPanel.appendChild(timerPanel)

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

  const dataActions = document.createElement("div")
  dataActions.className = "data-actions"
  dataControls.appendChild(dataActions)

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
  dataControls.appendChild(registerChoices)

  for (const difficulty of ["easy", "normal", "hard", "challenge"] satisfies PuzzleDifficulty[]) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "secondary-action-button register-choice-button"
    button.textContent = formatDifficulty(difficulty)
    button.addEventListener("click", async () => {
      const result = await onRegisterPuzzle(difficulty)

      importStatus.textContent = result.message
      importStatus.classList.toggle("is-error", !result.ok)
      registerChoices.classList.remove("is-visible")
    })
    registerChoices.appendChild(button)
  }

  const dataText = document.createElement("textarea")
  dataText.className = "export-output"
  dataText.spellcheck = false
  dataText.placeholder = "Exported puzzle JSON"
  dataControls.appendChild(dataText)

  const importStatus = document.createElement("span")
  importStatus.className = "import-status"
  dataControls.appendChild(importStatus)

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
    registerChoices.classList.toggle("is-visible")
    importStatus.textContent = "Choose a difficulty to register."
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
      item.textContent = shape.shapeId
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
    for (const [difficulty, button] of difficultyButtons) {
      const isSelected = difficulty === state.difficulty
      button.classList.toggle("is-selected", isSelected)
      button.setAttribute("aria-pressed", String(isSelected))
    }

    problemLabel.textContent = state.problemCount === 0
      ? "No problems"
      : `${state.problemIndex + 1} / ${state.problemCount}`
    problemTitle.textContent = state.problemTitle
    previousProblemButton.disabled = state.problemCount <= 1
    nextProblemButton.disabled = state.problemCount <= 1
    problemTitleInput.disabled = state.selectedPuzzleId === null
    renameProblemButton.disabled = state.selectedPuzzleId === null
    deleteProblemButton.disabled = state.selectedPuzzleId === null

    if (document.activeElement !== problemTitleInput) {
      problemTitleInput.value = state.selectedPuzzleId ? state.problemTitle : ""
    }

    rebuildProblemList(state)

    colorButton.textContent = state.colorEnabled ? "Color On" : "Color Off"
    colorButton.classList.toggle("is-selected", state.colorEnabled)
    timerLabel.textContent = state.timerText
    timerPanel.classList.toggle("is-running", state.timerRunning)
    timerStartStopButton.textContent = state.timerRunning ? "Stop" : "Start"
    countdownInput.value = String(Math.max(1, state.countdownSeconds))
    countdownRow.classList.toggle("is-disabled", state.timerMode !== "down")
    countdownInput.disabled = state.timerMode !== "down" || state.timerRunning

    for (const [mode, button] of timerModeButtons) {
      const isSelected = mode === state.timerMode
      button.classList.toggle("is-selected", isSelected)
      button.setAttribute("aria-pressed", String(isSelected))
    }

    registerButton.textContent = "Register"
  }

  function rebuildProblemList(state: ViewerPanelState) {
    problemList.replaceChildren()

    if (state.puzzles.length === 0) {
      const empty = document.createElement("span")
      empty.className = "problem-empty"
      empty.textContent = "No registered problems"
      problemList.appendChild(empty)
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
  }

  function formatDifficulty(difficulty: PuzzleDifficulty): string {
    return difficulty[0].toUpperCase() + difficulty.slice(1)
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
}
