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
  const floorPlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    (bounds.height - 1) / 2 + 0.5,
  )
  const floorPoint = new THREE.Vector3()
  let pointerDownPos: { x: number, y: number } | null = null

  scene.add(hitboxes)

  function getPointerHits(event: PointerEvent): GridPointerHit[] {
    const rect = domElement.getBoundingClientRect()

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const floorHit = getFloorHit()

    const intersections = raycaster.intersectObjects<GridCellHitbox>(
      hitboxes.children as GridCellHitbox[],
      false,
    )

    return [
      ...(floorHit ? [floorHit] : []),
      ...intersections.flatMap((intersection) => {
        return [{
          gridPos: intersection.object.userData.gridPos,
          normal: {
            x: 0,
            y: 0,
            z: 0,
          },
        }]
      }),
    ]
  }

  function getFloorHit(): GridPointerHit | null {
    if (!raycaster.ray.intersectPlane(floorPlane, floorPoint)) {
      return null
    }

    const x = Math.round(floorPoint.x + (bounds.width - 1) / 2)
    const z = Math.round(floorPoint.z + (bounds.depth - 1) / 2)

    if (x < 0 || x >= bounds.width || z < 0 || z >= bounds.depth) {
      return null
    }

    return {
      gridPos: { x, y: 0, z },
      normal: { x: 0, y: 0, z: 0 },
    }
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
