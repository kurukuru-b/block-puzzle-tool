import { createMainScene } from "../render/scene/createMainScene"
import type { PuzzleState } from "../core/puzzle/PuzzleState"
import { shapeDefinitions } from "../core/shape/shapeDefinitions"
import { createShapeMeshGroup } from "../render/shape/createShapeMeshGroup"
import { gridToWorld } from "../render/scene/gridToWorld"
import { DEFAULT_GRID_BOUNDS } from "../core/grid/GridBounds"

const mainScene = createMainScene()

const puzzleState: PuzzleState = {
  placedShapes: [
    {
      shapeId: "gray",
      origin: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  ],
}

for (const placedShape of puzzleState.placedShapes) {
  const shape = shapeDefinitions.find((s) => s.id === placedShape.shapeId)

  if (!shape) {
    throw new Error(`Shape not found: ${placedShape.shapeId}`)
  }

  const shapeGroup = createShapeMeshGroup(shape)
  const worldPos = gridToWorld(
  placedShape.origin,
  DEFAULT_GRID_BOUNDS
  )

  shapeGroup.position.set(worldPos.x, worldPos.y, worldPos.z)
  mainScene.scene.add(shapeGroup)
}