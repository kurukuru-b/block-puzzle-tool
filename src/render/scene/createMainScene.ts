import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { DEFAULT_GRID_BOUNDS } from "../../core/grid/GridBounds"
import { createFloorMarker } from "../mesh/createFloorMarker"
import { createGridCellMeshes } from "../mesh/createGridCellMeshes"

export function createMainScene() {
    const scene = new THREE.Scene()

    scene.background = new THREE.Color(0xD8DEE9)

    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )

    camera.position.set(4.8, 4.6, 5.6)

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    })

    renderer.setSize(window.innerWidth, window.innerHeight)

    document.body.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)

    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 2.2
    controls.maxDistance = 12

    const floorMarker = createFloorMarker(DEFAULT_GRID_BOUNDS)

    scene.add(floorMarker)

    const gridCells = createGridCellMeshes(DEFAULT_GRID_BOUNDS)
    
    scene.add(gridCells)

    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        0.45,
    )
    
    scene.add(ambientLight)
    
    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x404040,
        0.6,
    )
    
    hemisphereLight.position.set(0, 10, 0)
    
    scene.add(hemisphereLight)
    
    const mainLight = new THREE.DirectionalLight(
        0xffffff,
        1.2,
    )
    
    mainLight.position.set(8, 12, 10)
    
    scene.add(mainLight)

    renderer.setAnimationLoop(() => {
        controls.update()
        renderer.render(scene, camera)
    })

    window.addEventListener("resize", () => {
        camera.aspect =
        window.innerWidth / window.innerHeight
    
        camera.updateProjectionMatrix()
    
        renderer.setSize(
          window.innerWidth,
          window.innerHeight,
        )
    })

    return {
        scene,
        camera,
        renderer,
        controls,
        floorMarker,
        gridCells,
    }
}
