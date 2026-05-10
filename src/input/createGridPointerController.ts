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
  onHoverCells: (positions: GridPos[]) => void
  onTapCells?: (positions: GridPos[]) => void
  shouldHandleTap?: (event: PointerEvent) => boolean
}

export function createGridPointerController({
  bounds,
  camera,
  domElement,
  scene,
  onHoverCells,
  onTapCells,
  shouldHandleTap,
}: CreateGridPointerControllerParams): () => void {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hitboxes = createGridCellHitboxes(bounds)
  let pointerDownPos: { x: number, y: number } | null = null

  scene.add(hitboxes)

  function getPointedCells(event: PointerEvent): GridPos[] {
    const rect = domElement.getBoundingClientRect()

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)

    const intersections = raycaster.intersectObjects<GridCellHitbox>(
      hitboxes.children as GridCellHitbox[],
      false,
    )

    return intersections.map((intersection) => (
      intersection.object.userData.gridPos
    ))
  }

  function updatePointer(event: PointerEvent) {
    onHoverCells(getPointedCells(event))
  }

  function startPointer(event: PointerEvent) {
    pointerDownPos = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  function endPointer(event: PointerEvent) {
    if (!pointerDownPos || getPointerDistance(pointerDownPos, event) > 14) {
      pointerDownPos = null
      return
    }

    pointerDownPos = null

    if (shouldHandleTap && !shouldHandleTap(event)) {
      return
    }

    const positions = getPointedCells(event)

    if (positions.length > 0) {
      onTapCells?.(positions)
    }
  }

  function clearPointer() {
    onHoverCells([])
  }

  domElement.addEventListener("pointerdown", startPointer)
  domElement.addEventListener("pointermove", updatePointer)
  domElement.addEventListener("pointerup", endPointer)
  domElement.addEventListener("pointerleave", clearPointer)

  return () => {
    domElement.removeEventListener("pointerdown", startPointer)
    domElement.removeEventListener("pointermove", updatePointer)
    domElement.removeEventListener("pointerup", endPointer)
    domElement.removeEventListener("pointerleave", clearPointer)
    scene.remove(hitboxes)
  }
}

function getPointerDistance(
  start: { x: number, y: number },
  end: PointerEvent,
): number {
  return Math.hypot(end.clientX - start.x, end.clientY - start.y)
}
