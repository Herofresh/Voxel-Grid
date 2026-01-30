import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
	CSS2DRenderer,
	CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

/**
 * Voxel Grid Demo
 * - Three.js scene with axes + grid helper
 * - Cubes stored in an array for fast raycasting
 * - Hover tooltip label using CSS2DRenderer
 */

// -----------------------------
// Constants / Config
// -----------------------------
const CONFIG = {
	background: 0x0b0f1a,
	camera: {
		fov: 60,
		near: 0.1,
		far: 2000,
		position: new THREE.Vector3(12, 12, 12),
	},
	grid: {
		size: { x: 6, y: 4, z: 6 },
		cubeSize: 1,
		yStart: 0,
	},
};

// -----------------------------
// DOM / Renderers
// -----------------------------
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// CSS2D label renderer (overlay)
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

// -----------------------------
// Scene / Camera / Controls
// -----------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.background);

const camera = new THREE.PerspectiveCamera(
	CONFIG.camera.fov,
	window.innerWidth / window.innerHeight,
	CONFIG.camera.near,
	CONFIG.camera.far,
);
camera.position.copy(CONFIG.camera.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

// -----------------------------
// Lighting / Helpers
// -----------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(10, 20, 10);
scene.add(dir);

scene.add(new THREE.AxesHelper(10));

const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1f2937);
gridHelper.position.y = -0.5;
scene.add(gridHelper);

// -----------------------------
// Hover Label (single reusable tooltip)
// -----------------------------
function createHoverLabel() {
	const div = document.createElement("div");
	div.style.padding = "4px 6px";
	div.style.borderRadius = "6px";
	div.style.background = "rgba(0,0,0,0.7)";
	div.style.color = "white";
	div.style.font =
		"12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
	div.style.whiteSpace = "nowrap";
	div.style.transform = "translate(-50%, -120%)";

	const labelObj = new CSS2DObject(div);
	labelObj.position.set(0, 0.6, 0);
	labelObj.visible = false; // IMPORTANT: only after labelObj exists

	scene.add(labelObj);
	return { div, labelObj };
}

const { div: labelDiv, labelObj: hoverLabel } = createHoverLabel();

// -----------------------------
// Cubes / Voxel Grid
// -----------------------------
const cubeGeo = new THREE.BoxGeometry(
	CONFIG.grid.cubeSize,
	CONFIG.grid.cubeSize,
	CONFIG.grid.cubeSize,
);

const cubes = []; // only cubes go here for raycasting

function addCube(x, y, z, color) {
	const mat = new THREE.MeshStandardMaterial({ color });
	const cube = new THREE.Mesh(cubeGeo, mat);
	cube.position.set(x, y, z);

	cube.userData = {
		x,
		y,
		z,
		label: `(${x}, ${y}, ${z})`,
	};

	scene.add(cube);
	cubes.push(cube);
	return cube;
}

function buildVoxelGrid() {
	const { x: sizeX, y: sizeY, z: sizeZ } = CONFIG.grid.size;

	// Center the grid around origin (x,z), start y at CONFIG.grid.yStart
	const offsetX = -(sizeX - 1) / 2;
	const offsetY = CONFIG.grid.yStart;
	const offsetZ = -(sizeZ - 1) / 2;

	for (let x = 0; x < sizeX; x++) {
		for (let y = 0; y < sizeY; y++) {
			for (let z = 0; z < sizeZ; z++) {
				// example color: based on y
				const t = y / Math.max(1, sizeY - 1);
				const color = new THREE.Color().setHSL(
					0.58 - t * 0.3,
					0.8,
					0.55,
				);
				addCube(offsetX + x, offsetY + y, offsetZ + z, color);
			}
		}
	}
}

buildVoxelGrid();

// -----------------------------
// Raycasting / Hover Logic
// -----------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(9999, 9999); // start "offscreen"
let pointerInside = false;
let hoveredCube = null;

function setHover(targetCube) {
	hoveredCube = targetCube;

	if (!hoveredCube) {
		hoverLabel.visible = false;
		scene.add(hoverLabel); // detach so it never "sticks" to the last cube
		return;
	}

	labelDiv.textContent = hoveredCube.userData?.label ?? "cube";
	hoveredCube.add(hoverLabel); // attach to cube
	hoverLabel.position.set(0, 0.6, 0);
	hoverLabel.visible = true;
}

renderer.domElement.addEventListener("pointerenter", () => {
	pointerInside = true;
});

renderer.domElement.addEventListener("pointerleave", () => {
	pointerInside = false;
	setHover(null);
});

renderer.domElement.addEventListener("pointermove", (event) => {
	const rect = renderer.domElement.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;

	pointer.x = (x / rect.width) * 2 - 1;
	pointer.y = -(y / rect.height) * 2 + 1;
});

function updateHover() {
	if (!pointerInside) {
		if (hoveredCube) setHover(null);
		return;
	}

	raycaster.setFromCamera(pointer, camera);
	const hits = raycaster.intersectObjects(cubes, false);

	if (hits.length === 0) {
		if (hoveredCube) setHover(null);
		return;
	}

	const hitCube = hits[0].object;
	if (hitCube !== hoveredCube) setHover(hitCube);
}

// -----------------------------
// Resize
// -----------------------------
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------
// Animation Loop
// -----------------------------
function animate() {
	requestAnimationFrame(animate);

	controls.update();
	updateHover();

	renderer.render(scene, camera);
	labelRenderer.render(scene, camera);
}

animate();
