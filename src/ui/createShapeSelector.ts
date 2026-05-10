import type { ShapeDefinition } from "../core/shape/ShapeDefinition"
import type { RotationAxis } from "../core/shape/rotateShapeCells"
import type { GridPos } from "../core/grid/GridPos"

type GridAxis = "x" | "y" | "z"

type CreateShapeSelectorParams = {
  shapes: ShapeDefinition[]
  selectedShapeId: string
  initialPosition: GridPos
  onSelect: (shapeId: string) => void
  onRotate: (axis: RotationAxis) => void
  onResetRotation: () => void
  onMovePosition: (axis: GridAxis, amount: number) => GridPos
}

type ShapeSelector = {
  element: HTMLElement
  setPosition: (pos: GridPos) => void
}

export function createShapeSelector({
  shapes,
  selectedShapeId,
  initialPosition,
  onSelect,
  onRotate,
  onResetRotation,
  onMovePosition,
}: CreateShapeSelectorParams): ShapeSelector {
  const panel = document.createElement("section")
  panel.className = "shape-selector"

  const title = document.createElement("h1")
  title.textContent = "Block Puzzle Tool"
  panel.appendChild(title)

  const shapeList = document.createElement("div")
  shapeList.className = "shape-list"
  panel.appendChild(shapeList)

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

      for (const item of shapeList.querySelectorAll<HTMLButtonElement>(".shape-button")) {
        const isSelected = item.dataset.shapeId === shape.id
        item.classList.toggle("is-selected", isSelected)
        item.setAttribute("aria-pressed", String(isSelected))
      }
    })

    shapeList.appendChild(button)
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

  setPosition(initialPosition)

  function setPosition(pos: GridPos) {
    for (const axis of ["x", "y", "z"] satisfies GridAxis[]) {
      positionValues.get(axis)!.textContent = String(pos[axis])
    }
  }

  return {
    element: panel,
    setPosition,
  }
}
