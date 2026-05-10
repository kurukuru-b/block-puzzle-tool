import "../style.css"

import * as THREE from "three"

import { createMainScene } from "../render/scene/createMainScene"
import { shapeDefinitions } from "../core/shape/shapeDefinitions"
import { createShapeMeshGroup } from "../render/shape/createShapeMeshGroup"
import { gridToWorld } from "../render/scene/gridToWorld"
import { DEFAULT_GRID_BOUNDS } from "../core/grid/GridBounds"
import { createShapeSelector } from "../ui/createShapeSelector"

const mainScene = createMainScene()

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("App root not found")
}

let activeShapeGroup: THREE.Group | null = null

function renderSelectedShape(shapeId: string) {
  const shape = shapeDefinitions.find((definition) => definition.id === shapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${shapeId}`)
  }

  if (activeShapeGroup) {
    mainScene.scene.remove(activeShapeGroup)
  }

  activeShapeGroup = createShapeMeshGroup(shape)

  const worldPos = gridToWorld(
    { x: 0, y: 0, z: 0 },
    DEFAULT_GRID_BOUNDS,
  )

  activeShapeGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  mainScene.scene.add(activeShapeGroup)
}

const initialShape = shapeDefinitions[0]

if (!initialShape) {
  throw new Error("No shape definitions found")
}

app.appendChild(createShapeSelector({
  shapes: shapeDefinitions,
  selectedShapeId: initialShape.id,
  onSelect: renderSelectedShape,
}))

renderSelectedShape(initialShape.id)
