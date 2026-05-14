import * as THREE from "three"

export function disposeObject3D(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    geometries.add(child.geometry)

    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        materials.add(material)
      }
    } else {
      materials.add(child.material)
    }
  })

  for (const geometry of geometries) {
    geometry.dispose()
  }

  for (const material of materials) {
    disposeMaterial(material)
  }
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose()
    }
  }

  material.dispose()
}
