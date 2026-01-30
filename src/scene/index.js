// src/scene/index.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import { setGrid } from "./grid.js";
import {
	createCursor,
	setCursorPosition,
	setCursorScale,
	setCursorVisible,
} from "./cursor.js";
import { createPicking } from "./picking.js";
import { createObjects } from "./objects.js";

const DEFAULTS = { background: 0x0b0f1a };

export function createSceneApp({ onCellClick } = {}) {
	document.body.style.margin = "0";
	document.body.style.overflow = "hidden";

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	const labelRenderer = new CSS2DRenderer();
	labelRenderer.setSize(window.innerWidth, window.innerHeight);
	labelRenderer.domElement.style.position = "absolute";
	labelRenderer.domElement.style.top = "0";
	labelRenderer.domElement.style.left = "0";
	labelRenderer.domElement.style.pointerEvents = "none";
	document.body.appendChild(labelRenderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(DEFAULTS.background);

	const camera = new THREE.PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		0.1,
		2000,
	);
	camera.position.set(12, 12, 12);

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;

	scene.add(new THREE.AmbientLight(0xffffff, 0.6));
	const dir = new THREE.DirectionalLight(0xffffff, 0.8);
	dir.position.set(10, 20, 10);
	scene.add(dir);

	const axesHelper = new THREE.AxesHelper(2.5);
	scene.add(axesHelper);

	const mode = { isAdding: false };
	let placementPreviewSize = 1;

	let mapSize = { sizeX: 6, sizeY: 4, sizeZ: 6 };
	const gridLinesRef = { value: null };

	// Mathematical ground plane at y=0
	const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

	const cursor = createCursor(scene);
	const objects = createObjects({ scene });

	const picking = createPicking({
		renderer,
		camera,
		groundPlane,
		getMapSize: () => mapSize,
	});

	picking.bindPointerTracking();
	picking.bindClickToPlace({
		isAdding: () => mode.isAdding,
		onCellClick: (cell) => onCellClick?.(cell),
	});

	function setMode(next) {
		mode.isAdding = Boolean(next?.isAdding);
		setCursorVisible(cursor, false);
		if (!mode.isAdding) {
			placementPreviewSize = 1;
			setCursorScale(cursor, 1);
			objects.setHovered(null, false);
		}
	}

	function setPlacementPreview({ sizeValue }) {
		placementPreviewSize = Math.max(1, Number(sizeValue) || 1);
		setCursorScale(cursor, placementPreviewSize);
	}

	function setMapSize(next) {
		mapSize = { ...mapSize, ...next };
		setGrid(scene, gridLinesRef, mapSize);

		controls.target.set(
			(mapSize.sizeX - 1) / 2,
			0,
			(mapSize.sizeZ - 1) / 2,
		);
		controls.update();

		// your current choice: axes at (-1,-1)
		axesHelper.position.set(-1, 0, -1);
	}

	function renderFromState(state) {
		setMapSize({
			sizeX: state.map.sizeX,
			sizeY: state.map.sizeY,
			sizeZ: state.map.sizeZ,
		});
		objects.renderFromState(state);
	}

	function updateCursor() {
		if (!mode.isAdding) {
			setCursorVisible(cursor, false);
			return;
		}

		const cell = picking.pickCellUnderPointer();
		if (!cell) {
			setCursorVisible(cursor, false);
			return;
		}

		// anchor-based preview (same logic as your current scene.js)
		const s = placementPreviewSize;
		const cx = cell.x + (s - 1) / 2;
		const cy = cell.y + s / 2 + 0.01;
		const cz = cell.z + (s - 1) / 2;

		setCursorPosition(cursor, { x: cx, y: cy, z: cz });
		setCursorVisible(cursor, true);
	}

	function updateHover() {
		if (mode.isAdding) return;

		// If pointer invalid/outside canvas, clear hover
		if (picking.pointerNDC.x > 10 || picking.pointerNDC.y > 10) {
			if (objects.hoveredMesh) objects.setHovered(null, false);
			return;
		}

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(picking.pointerNDC, camera);
		const hits = raycaster.intersectObjects(objects.cubes, false);

		if (hits.length === 0) {
			objects.setHovered(null, false);
			return;
		}
		objects.setHovered(hits[0].object, false);
	}

	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		labelRenderer.setSize(window.innerWidth, window.innerHeight);
	});

	function animate() {
		requestAnimationFrame(animate);
		controls.update();

		updateCursor();
		updateHover();

		renderer.render(scene, camera);
		labelRenderer.render(scene, camera);
	}
	animate();

	return {
		renderFromState,
		setMapSize,
		setMode,
		setPlacementPreview,
		getMeshById: (id) => objects.meshById.get(id),
	};
}
