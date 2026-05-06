import * as THREE from "three";

// シーン
const scene = new THREE.Scene();

// カメラ
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// レンダラー
const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// 立方体
const geometry = new THREE.BoxGeometry(1, 1, 1);

const material = new THREE.MeshNormalMaterial();

const cube = new THREE.Mesh(geometry, material);

scene.add(cube);

// カメラ位置
camera.position.z = 5;

// アニメーション
function animate() {
  requestAnimationFrame(animate);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

animate();