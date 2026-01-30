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

export function createSceneApp({ onCellClick, onObjectClick } = {}) {
	// Page setup
	document.body.style.margin = "0";
	document.body.style.overflow = "hidden";

	// WebGL renderer
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// Label renderer (CSS2D)
	const labelRenderer = new CSS2DRenderer();
	labelRenderer.setSize(window.innerWidth, window.innerHeight);
	labelRenderer.domElement.style.position = "absolute";
	labelRenderer.domElement.style.top = "0";
	labelRenderer.domElement.style.left = "0";
	labelRenderer.domElement.style.pointerEvents = "none";
	document.body.appendChild(labelRenderer.domElement);

	// Scene + camera
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(DEFAULTS.background);

	const camera = new THREE.PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		0.1,
		2000,
	);
	camera.position.set(12, 12, 12);

	// Controls
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;

	// Lights
	scene.add(new THREE.AmbientLight(0xffffff, 0.6));
	const dir = new THREE.DirectionalLight(0xffffff, 0.8);
	dir.position.set(10, 20, 10);
	scene.add(dir);

	// Axes helper (outside-ish)
	const axesHelper = new THREE.AxesHelper(2.5);
	axesHelper.position.set(-1, 0, -1);
	scene.add(axesHelper);

	// Map size + grid
	let mapSize = { sizeX: 6, sizeY: 4, sizeZ: 6 };
	const gridLinesRef = { value: null };

	// Mathematical ground plane at y=0
	const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

	// Mode + preview
	const mode = { isAdding: false };

	// Preview scale can be uniform number or dims {x,y,z}
	let placementPreview = {
		kind: "generic",
		sizeValue: 1,
		dims: { x: 1, y: 1, z: 1 },
	};

	// Scene modules
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
		if (!mode.isAdding) setCursorVisible(cursor, false);
	}

	/**
	 * For player/enemy: { sizeValue: number }
	 * For env structures: { dims: {x,y,z} }
	 */
	function setPlacementPreview(next = {}) {
		if (Number.isFinite(next.sizeValue)) {
			const s = Math.max(1, Math.trunc(Number(next.sizeValue) || 1));
			placementPreview = {
				kind: "uniform",
				sizeValue: s,
				dims: { x: s, y: s, z: s },
			};
			setCursorScale(cursor, s);
			return;
		}

		if (next.dims) {
			const dx = Math.max(1, Math.trunc(Number(next.dims.x) || 1));
			const dy = Math.max(1, Math.trunc(Number(next.dims.y) || 1));
			const dz = Math.max(1, Math.trunc(Number(next.dims.z) || 1));

			placementPreview = {
				kind: "env",
				sizeValue: 1,
				dims: { x: dx, y: dy, z: dz },
			};
			setCursorScale(cursor, { x: dx, y: dy, z: dz });
			return;
		}

		// fallback
		placementPreview = {
			kind: "generic",
			sizeValue: 1,
			dims: { x: 1, y: 1, z: 1 },
		};
		setCursorScale(cursor, 1);
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
	}

	function renderFromState(state) {
		setMapSize({
			sizeX: state.map.sizeX,
			sizeY: state.map.sizeY,
			sizeZ: state.map.sizeZ,
		});
		objects.renderFromState(state);
	}

	// Cursor preview update (add mode only)
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

		const dx = placementPreview.dims.x;
		const dy = placementPreview.dims.y;
		const dz = placementPreview.dims.z;

		// Center the preview box so that its "min corner" is at the hovered cell (anchor),
		// and it extends into +x/+y/+z.
		const cx = cell.x + (dx - 1) / 2;
		const cy = cell.y + dy / 2 + 0.01; // slight lift avoids z-fighting
		const cz = cell.z + (dz - 1) / 2;

		setCursorPosition(cursor, { x: cx, y: cy, z: cz });
		setCursorVisible(cursor, true);
	}

	// Hover labels update (disabled while adding)
	function updateHover() {
		if (mode.isAdding) {
			objects.setHovered(null, true);
			return;
		}

		if (picking.pointerNDC.x > 10 || picking.pointerNDC.y > 10) {
			objects.setHovered(null, false);
			return;
		}

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(picking.pointerNDC, camera);
		const hits = raycaster.intersectObjects(objects.cubes, false);

		if (!hits.length) {
			objects.setHovered(null, false);
			return;
		}

		objects.setHovered(hits[0].object, false);
	}

	// Click selection (cube -> object id), only when NOT adding
	let downPos = null;
	const CLICK_MOVE_TOLERANCE_PX = 6;

	renderer.domElement.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		downPos = { x: e.clientX, y: e.clientY };
	});

	renderer.domElement.addEventListener("pointerup", (e) => {
		if (e.button !== 0) return;
		if (!downPos) return;

		const dx = e.clientX - downPos.x;
		const dy = e.clientY - downPos.y;
		downPos = null;

		if (Math.hypot(dx, dy) > CLICK_MOVE_TOLERANCE_PX) return;
		if (mode.isAdding) return;

		const rect = renderer.domElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

		const ndcX = (x / rect.width) * 2 - 1;
		const ndcY = -(y / rect.height) * 2 + 1;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

		const hits = raycaster.intersectObjects(objects.cubes, false);
		if (!hits.length) return;

		const mesh = hits[0].object;
		const id = mesh?.userData?.id;
		if (id) onObjectClick?.(id);
	});

	// Resize
	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		labelRenderer.setSize(window.innerWidth, window.innerHeight);
	});

	// Loop
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
	};
}
