import * as THREE from "three"

import type { GridPos } from "../core/grid/GridPos"
import {
  createGridCellHitboxes,
  type GridCellHitbox,
} from "../render/mesh/createGridCellHitboxes"
import type { GridBounds } from "../core/grid/GridBounds"

export type GridPointerHit = {
  gridPos: GridPos
  normal: GridPos
}

type CreateGridPointerControllerParams = {
  bounds: GridBounds
  camera: THREE.Camera
  domElement: HTMLElement
  scene: THREE.Scene
  onHoverHits: (hits: GridPointerHit[], event?: PointerEvent) => void
  onTapHits?: (hits: GridPointerHit[], event: PointerEvent) => void
  shouldHandleTap?: (event: PointerEvent) => boolean
}

export function createGridPointerController({
  bounds,
  camera,
  domElement,
  scene,
  onHoverHits,
  onTapHits,
  shouldHandleTap,
}: CreateGridPointerControllerParams): () => void {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hitboxes = createGridCellHitboxes(bounds)
  let pointerDownPos: { x: number, y: number } | null = null

  scene.add(hitboxes)

  function getPointerHits(event: PointerEvent): GridPointerHit[] {
    const rect = domElement.getBoundingClientRect()

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)

    const intersections = raycaster.intersectObjects<GridCellHitbox>(
      hitboxes.children as GridCellHitbox[],
      false,
    )

    return intersections.flatMap((intersection) => {
      return [{
        gridPos: intersection.object.userData.gridPos,
        normal: {
          x: 0,
          y: 0,
          z: 0,
        },
      }]
    })
  }

  function updatePointer(event: PointerEvent) {
    onHoverHits(getPointerHits(event), event)
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

    const hits = getPointerHits(event)

    if (hits.length > 0) {
      onTapHits?.(hits, event)
    }
  }

  function clearPointer() {
    onHoverHits([])
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
