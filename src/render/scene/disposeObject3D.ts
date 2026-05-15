import * as THREE from "three"

export function disposeObject3D(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  object.traverse((child) => {
    if (hasGeometry(child)) {
      geometries.add(child.geometry)
    }

    if (hasMaterial(child)) {
      addMaterial(child.material, materials)
    }
  })

  for (const geometry of geometries) {
    geometry.dispose()
  }

  for (const material of materials) {
    disposeMaterial(material)
  }
}

function hasGeometry(
  object: THREE.Object3D,
): object is THREE.Object3D & { geometry: THREE.BufferGeometry } {
  return "geometry" in object && object.geometry instanceof THREE.BufferGeometry
}

function hasMaterial(
  object: THREE.Object3D,
): object is THREE.Object3D & { material: THREE.Material | THREE.Material[] } {
  return "material" in object
}

function addMaterial(
  material: THREE.Material | THREE.Material[],
  materials: Set<THREE.Material>,
) {
  if (Array.isArray(material)) {
    for (const item of material) {
      materials.add(item)
    }
    return
  }

  materials.add(material)
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose()
    }
  }

  material.dispose()
}
