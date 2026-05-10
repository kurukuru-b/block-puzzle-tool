import type { ShapeDefinition } from "../core/shape/ShapeDefinition"

type CreateShapeSelectorParams = {
  shapes: ShapeDefinition[]
  selectedShapeId: string
  onSelect: (shapeId: string) => void
}

export function createShapeSelector({
  shapes,
  selectedShapeId,
  onSelect,
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

  return panel
}
