import { createMainScene } from "../render/scene/createMainScene"
import { shapeDefinitions } from "../core/shape/shapeDefinitions"
import { createShapeMeshGroup } from "../render/shape/createShapeMeshGroup"

const mainScene = createMainScene()

const shapeGroup = createShapeMeshGroup(shapeDefinitions[6])

shapeGroup.position.set(-2, -2, -2)
mainScene.scene.add(shapeGroup)