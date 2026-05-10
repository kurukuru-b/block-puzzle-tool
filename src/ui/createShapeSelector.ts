import type { ShapeDefinition } from "../core/shape/ShapeDefinition"
import type { RotationAxis } from "../core/shape/rotateShapeCells"
import type { GridPos } from "../core/grid/GridPos"

type GridAxis = "x" | "y" | "z"

export type PlacedShapeSummary = {
  id: string
  shapeId: string
}

type CreateShapeSelectorParams = {
  shapes: ShapeDefinition[]
  selectedShapeId: string
  initialPosition: GridPos
  onSelect: (shapeId: string) => void
  onRotate: (axis: RotationAxis) => void
  onResetRotation: () => void
  onMovePosition: (axis: GridAxis, amount: number) => GridPos
  onPlaceShape: () => boolean
  onDeletePlacedShape: () => void
  onEditPlacedShape: () => void
  onToggleDragMode: () => boolean
}

type ShapeSelector = {
  element: HTMLElement
  setPosition: (pos: GridPos) => void
  setSelectedShape: (shapeId: string) => void
  setPlacedShapes: (shapes: PlacedShapeSummary[]) => void
  setSelectedPlacedShape: (id: string | null) => void
  setShapeAvailability: (shapeId: string, isAvailable: boolean) => void
  setDragMode: (isEnabled: boolean) => void
}

export function createShapeSelector({
  shapes,
  selectedShapeId,
  initialPosition,
  onSelect,
  onRotate,
  onResetRotation,
  onMovePosition,
  onPlaceShape,
  onDeletePlacedShape,
  onEditPlacedShape,
  onToggleDragMode,
}: CreateShapeSelectorParams): ShapeSelector {
  const panel = document.createElement("section")
  panel.className = "shape-selector"

  const title = document.createElement("h1")
  title.textContent = "Block Puzzle Tool"
  panel.appendChild(title)

  const shapeList = document.createElement("div")
  shapeList.className = "shape-list"
  panel.appendChild(shapeList)
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
  panel.appendChild(rotationControls)

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
  panel.appendChild(positionControls)

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
  panel.appendChild(actionControls)

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

  const dragButton = document.createElement("button")
  dragButton.type = "button"
  dragButton.className = "secondary-action-button drag-mode-button"
  dragButton.textContent = "Drag"
  dragButton.setAttribute("aria-pressed", "false")
  dragButton.addEventListener("click", () => {
    setDragMode(onToggleDragMode())
  })
  actionControls.appendChild(dragButton)

  const selectedControls = document.createElement("div")
  selectedControls.className = "selected-controls"
  panel.appendChild(selectedControls)

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
  panel.appendChild(placedList)

  setPosition(initialPosition)
  setPlacedShapes([])
  setSelectedPlacedShape(null)

  function setPosition(pos: GridPos) {
    for (const axis of ["x", "y", "z"] satisfies GridAxis[]) {
      positionValues.get(axis)!.textContent = String(pos[axis])
    }
  }

  return {
    element: panel,
    setPosition,
    setSelectedShape,
    setPlacedShapes,
    setSelectedPlacedShape,
    setShapeAvailability,
    setDragMode,
  }

  function setSelectedShape(shapeId: string) {
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
      placedList.appendChild(item)
    }
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

  function setDragMode(isEnabled: boolean) {
    dragButton.classList.toggle("is-active", isEnabled)
    dragButton.setAttribute("aria-pressed", String(isEnabled))
  }
}
