import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// --- Basic scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	2000,
);
camera.position.set(12, 12, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// Orbit controls (rotate/pan/zoom)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(10, 20, 10);
scene.add(dir);

// --- Axes helper (x=red, y=green, z=blue) ---
const axes = new THREE.AxesHelper(10);
scene.add(axes);

// Optional: a subtle ground grid to orient yourself
const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1f2937);
gridHelper.position.y = -0.5;
scene.add(gridHelper);

// --- Voxel grid of cubes ---
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

// Simple function to create a cube at x/y/z with a color
function addCube(x, y, z, color = 0x22c55e) {
	const mat = new THREE.MeshStandardMaterial({ color });
	const cube = new THREE.Mesh(cubeGeo, mat);
	cube.position.set(x, y, z);
	scene.add(cube);
	return cube;
}

// Build a 3D grid (example)
const sizeX = 6;
const sizeY = 4;
const sizeZ = 6;

// Center the grid around origin
const offsetX = -(sizeX - 1) / 2;
const offsetY = 0; // start at y=0
const offsetZ = -(sizeZ - 1) / 2;

for (let x = 0; x < sizeX; x++) {
	for (let y = 0; y < sizeY; y++) {
		for (let z = 0; z < sizeZ; z++) {
			// Example color rule: height-based gradient-ish
			const t = y / Math.max(1, sizeY - 1);
			const color = new THREE.Color().setHSL(0.58 - t * 0.3, 0.8, 0.55);
			addCube(offsetX + x, offsetY + y, offsetZ + z, color);
		}
	}
}

// --- Resize handling ---
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- Animation loop ---
function animate() {
	requestAnimationFrame(animate);
	controls.update();
	renderer.render(scene, camera);
}
animate();
