import type { ShapeDefinition } from "../core/shape/ShapeDefinition"
import type { RotationAxis } from "../core/shape/rotateShapeCells"

type CreateShapeSelectorParams = {
  shapes: ShapeDefinition[]
  selectedShapeId: string
  onSelect: (shapeId: string) => void
  onRotate: (axis: RotationAxis) => void
  onResetRotation: () => void
}

export function createShapeSelector({
  shapes,
  selectedShapeId,
  onSelect,
  onRotate,
  onResetRotation,
}: CreateShapeSelectorParams): HTMLElement {
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

  return panel
}
