import * as THREE from "three"

import type { GridPos } from "../core/grid/GridPos"
import {
  createGridCellHitboxes,
  type GridCellHitbox,
} from "../render/mesh/createGridCellHitboxes"
import type { GridBounds } from "../core/grid/GridBounds"

type CreateGridPointerControllerParams = {
  bounds: GridBounds
  camera: THREE.Camera
  domElement: HTMLElement
  scene: THREE.Scene
  onHoverCell: (pos: GridPos | null) => void
}

export function createGridPointerController({
  bounds,
  camera,
  domElement,
  scene,
  onHoverCell,
}: CreateGridPointerControllerParams): () => void {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hitboxes = createGridCellHitboxes(bounds)

  scene.add(hitboxes)

  function updatePointer(event: PointerEvent) {
    const rect = domElement.getBoundingClientRect()

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)

    const intersections = raycaster.intersectObjects<GridCellHitbox>(
      hitboxes.children as GridCellHitbox[],
      false,
    )

    onHoverCell(intersections[0]?.object.userData.gridPos ?? null)
  }

  function clearPointer() {
    onHoverCell(null)
  }

  domElement.addEventListener("pointermove", updatePointer)
  domElement.addEventListener("pointerleave", clearPointer)

  return () => {
    domElement.removeEventListener("pointermove", updatePointer)
    domElement.removeEventListener("pointerleave", clearPointer)
    scene.remove(hitboxes)
  }
}
