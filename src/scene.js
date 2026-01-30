// src/scene.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
	CSS2DRenderer,
	CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

const DEFAULTS = { background: 0x0b0f1a };

export function createSceneApp({ onCellClick } = {}) {
	// -----------------------------
	// DOM / renderers
	// -----------------------------
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

	// -----------------------------
	// Scene / camera / controls
	// -----------------------------
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

	// Axes helper out of the way (updated in setMapSize)
	const axesHelper = new THREE.AxesHelper(2.5);
	scene.add(axesHelper);

	// -----------------------------
	// Mode: view vs add
	// -----------------------------
	const mode = { isAdding: false };
	function setMode(next) {
		mode.isAdding = Boolean(next?.isAdding);
		cursorGroup.visible = false; // will be re-shown when we have a valid hit
		if (!mode.isAdding) {
			placementPreviewSize = 1;
			cursorGroup.scale.set(1, 1, 1);
			setHovered(null);
		}
	}

	// -----------------------------
	// Placement preview size
	// -----------------------------

	let placementPreviewSize = 1;
	function setPlacementPreview({ sizeValue }) {
		placementPreviewSize = Math.max(1, Number(sizeValue) || 1);

		// Scale cursor cube uniformly
		cursorGroup.scale.set(
			placementPreviewSize,
			placementPreviewSize,
			placementPreviewSize,
		);
	}

	// -----------------------------
	// Map size + aligned grid
	// -----------------------------
	let mapSize = { sizeX: 6, sizeY: 4, sizeZ: 6 };
	let gridLines = null;

	// Mathematical ground plane at y=0
	const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

	function buildGridLines(sizeX, sizeZ) {
		const verts = [];
		const xMin = -0.5;
		const xMax = sizeX - 0.5;
		const zMin = -0.5;
		const zMax = sizeZ - 0.5;
		const y = 0;

		for (let x = 0; x <= sizeX; x++) {
			const xx = x - 0.5;
			verts.push(xx, y, zMin, xx, y, zMax);
		}
		for (let z = 0; z <= sizeZ; z++) {
			const zz = z - 0.5;
			verts.push(xMin, y, zz, xMax, y, zz);
		}

		const geom = new THREE.BufferGeometry();
		geom.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(verts, 3),
		);
		const mat = new THREE.LineBasicMaterial({
			color: 0x1f2937,
			transparent: true,
			opacity: 0.9,
		});
		return new THREE.LineSegments(geom, mat);
	}

	function setMapSize(next) {
		mapSize = { ...mapSize, ...next };

		if (gridLines) {
			scene.remove(gridLines);
			gridLines.geometry.dispose();
			gridLines.material.dispose();
		}
		gridLines = buildGridLines(mapSize.sizeX, mapSize.sizeZ);
		scene.add(gridLines);

		controls.target.set(
			(mapSize.sizeX - 1) / 2,
			0,
			(mapSize.sizeZ - 1) / 2,
		);
		controls.update();

		axesHelper.position.set(-1, 0, -1);
	}

	setMapSize(mapSize);

	// -----------------------------
	// Cursor highlight (EdgesGeometry) - add mode only
	// -----------------------------
	const cursorGroup = new THREE.Group();

	const cursorFill = new THREE.Mesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.06,
			depthTest: false,
			depthWrite: false,
		}),
	);
	cursorFill.renderOrder = 999;

	const cursorEdges = new THREE.LineSegments(
		new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
		new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.95,
			depthTest: false,
			depthWrite: false,
		}),
	);
	cursorEdges.renderOrder = 1000;

	cursorGroup.add(cursorFill);
	cursorGroup.add(cursorEdges);
	cursorGroup.visible = false;
	cursorGroup.position.set(0, 0.01, 0);
	scene.add(cursorGroup);

	// -----------------------------
	// Hover label (your labels are fine; keep minimal)
	// -----------------------------
	const hoverDiv = document.createElement("div");
	hoverDiv.style.padding = "4px 6px";
	hoverDiv.style.borderRadius = "6px";
	hoverDiv.style.background = "rgba(0,0,0,0.75)";
	hoverDiv.style.color = "white";
	hoverDiv.style.font =
		"12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
	hoverDiv.style.whiteSpace = "nowrap";
	hoverDiv.style.transform = "translate(-50%, -120%)";

	const hoverLabel = new CSS2DObject(hoverDiv);
	hoverLabel.position.set(0, 0.6, 0);
	hoverLabel.visible = false;
	scene.add(hoverLabel);

	// -----------------------------
	// Rendered object registry
	// -----------------------------
	const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
	const cubes = [];
	const meshById = new Map();
	const staticLabelById = new Map();
	let hoveredMesh = null;

	function createStaticLabel(text) {
		const div = document.createElement("div");
		div.style.padding = "2px 5px";
		div.style.borderRadius = "6px";
		div.style.background = "rgba(0,0,0,0.55)";
		div.style.color = "white";
		div.style.font =
			"11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
		div.style.whiteSpace = "nowrap";
		div.style.transform = "translate(-50%, -120%)";
		div.textContent = text;

		const obj = new CSS2DObject(div);
		obj.position.set(0, 0, 0);
		return obj;
	}

	function setHovered(mesh) {
		hoveredMesh = mesh;

		if (!mesh || mode.isAdding) {
			hoverLabel.visible = false;
			scene.add(hoverLabel);
			return;
		}

		const ud = mesh.userData || {};
		hoverDiv.textContent = `${(ud.kind || "OBJ").toUpperCase()} • ${ud.name} • size ${
			ud.sizeValue
		} • (${ud.pos.x},${ud.pos.y},${ud.pos.z})`;

		mesh.add(hoverLabel);
		hoverLabel.position.set(0, 0.6, 0);
		hoverLabel.visible = true;
	}

	function clearRenderedObjects() {
		for (const mesh of cubes) {
			mesh.parent?.remove(mesh);
			mesh.material?.dispose?.();
		}
		cubes.length = 0;
		meshById.clear();

		for (const lbl of staticLabelById.values()) {
			lbl.parent?.remove(lbl);
		}
		staticLabelById.clear();

		setHovered(null);
	}

	function renderFromState(state) {
		setMapSize({
			sizeX: state.map.sizeX,
			sizeY: state.map.sizeY,
			sizeZ: state.map.sizeZ,
		});

		clearRenderedObjects();

		for (const obj of state.objects) {
			const mat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(obj.color || "#808080"),
			});
			const mesh = new THREE.Mesh(cubeGeo, mat);

			mesh.scale.set(obj.sizeValue, obj.sizeValue, obj.sizeValue);

			// anchor to ground: grid coord is the bottom "cell" location
			const c = centerFromAnchor(obj.pos, obj.sizeValue);
			mesh.position.set(c.x, c.y, c.z);

			mesh.userData = {
				id: obj.id,
				kind: obj.kind,
				name: obj.name,
				sizeValue: obj.sizeValue,
				pos: obj.pos,
			};

			scene.add(mesh);
			cubes.push(mesh);
			meshById.set(obj.id, mesh);

			if (obj.labelEnabled) {
				const lbl = createStaticLabel(`${obj.name} (${obj.sizeValue})`);
				mesh.add(lbl);
				lbl.position.set(0, obj.sizeValue / 2 + 0.35, 0);
				staticLabelById.set(obj.id, lbl);
			}
		}
	}

	// -----------------------------
	// Pointer + robust ground intersection (no mesh raycast)
	// -----------------------------
	const raycaster = new THREE.Raycaster();
	const pointerNDC = new THREE.Vector2(9999, 9999);
	let lastClient = { x: -9999, y: -9999 };

	// click vs drag tolerance
	let downPos = null;
	const CLICK_MOVE_TOLERANCE_PX = 6;

	function getCanvasRect() {
		return renderer.domElement.getBoundingClientRect();
	}

	function updatePointerFromClient(clientX, clientY) {
		const rect = getCanvasRect();
		lastClient.x = clientX;
		lastClient.y = clientY;

		const inside =
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom;

		if (!inside) {
			// If we are outside the canvas, we won't show cursor/hovers
			pointerNDC.set(9999, 9999);
			return false;
		}

		const x = clientX - rect.left;
		const y = clientY - rect.top;

		pointerNDC.x = (x / rect.width) * 2 - 1;
		pointerNDC.y = -(y / rect.height) * 2 + 1;
		return true;
	}

	// Track pointer globally, always
	window.addEventListener("pointermove", (e) => {
		updatePointerFromClient(e.clientX, e.clientY);
	});

	// Pointer capture helps keep consistent click detection
	renderer.domElement.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		downPos = { x: e.clientX, y: e.clientY };
		try {
			renderer.domElement.setPointerCapture(e.pointerId);
		} catch {}
	});

	renderer.domElement.addEventListener("pointerup", (e) => {
		if (e.button !== 0) return;
		try {
			renderer.domElement.releasePointerCapture(e.pointerId);
		} catch {}

		if (!mode.isAdding) return;
		if (!downPos) return;

		const dx = e.clientX - downPos.x;
		const dy = e.clientY - downPos.y;
		if (Math.hypot(dx, dy) > CLICK_MOVE_TOLERANCE_PX) return;

		// Ensure pointer NDC is computed from this exact click position
		const inside = updatePointerFromClient(e.clientX, e.clientY);
		if (!inside) return;

		const cell = pickCellUnderPointer();
		if (!cell) return;

		onCellClick?.(cell);
	});

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	function pointInsideMapFootprint(p) {
		const xMin = -0.5;
		const xMax = mapSize.sizeX - 0.5;
		const zMin = -0.5;
		const zMax = mapSize.sizeZ - 0.5;
		// small epsilon to avoid floating edge weirdness
		const eps = 1e-6;

		return (
			p.x >= xMin - eps &&
			p.x <= xMax + eps &&
			p.z >= zMin - eps &&
			p.z <= zMax + eps
		);
	}

	function worldPointToCell(p) {
		// Centers at integers, boundaries at n +/- 0.5
		let x = Math.floor(p.x + 0.5);
		let z = Math.floor(p.z + 0.5);
		const y = 0;

		x = clamp(x, 0, mapSize.sizeX - 1);
		z = clamp(z, 0, mapSize.sizeZ - 1);
		return { x, y, z };
	}

	function centerFromAnchor(pos, sizeValue) {
		const s = sizeValue;
		return {
			x: pos.x + (s - 1) / 2,
			y: pos.y + s / 2,
			z: pos.z + (s - 1) / 2,
		};
	}

	// Robust pick: intersect ray with infinite plane y=0
	function pickWorldPointOnGround() {
		raycaster.setFromCamera(pointerNDC, camera);
		const hit = new THREE.Vector3();
		const ok = raycaster.ray.intersectPlane(groundPlane, hit);
		if (!ok) return null;
		if (!pointInsideMapFootprint(hit)) return null;
		return hit;
	}

	function pickCellUnderPointer() {
		const p = pickWorldPointOnGround();
		if (!p) return null;
		return worldPointToCell(p);
	}

	// -----------------------------
	// Update loop: cursor + hover
	// -----------------------------
	function updateCursor() {
		if (!mode.isAdding) {
			cursorGroup.visible = false;
			return;
		}

		const p = pickWorldPointOnGround();
		if (!p) {
			cursorGroup.visible = false;
			return;
		}

		const cell = worldPointToCell(p);
		const c = centerFromAnchor(cell, placementPreviewSize);
		cursorGroup.position.set(c.x, c.y + 0.01, c.z);

		cursorGroup.visible = true;
	}

	function updateHover() {
		if (mode.isAdding) {
			if (hoveredMesh) setHovered(null);
			return;
		}

		// Only attempt hover if pointer is valid (inside canvas)
		if (pointerNDC.x > 10 || pointerNDC.y > 10) {
			if (hoveredMesh) setHovered(null);
			return;
		}

		raycaster.setFromCamera(pointerNDC, camera);
		const hits = raycaster.intersectObjects(cubes, false);

		if (hits.length === 0) {
			if (hoveredMesh) setHovered(null);
			return;
		}

		const hit = hits[0].object;
		if (hit !== hoveredMesh) setHovered(hit);
	}

	// -----------------------------
	// Resize + animation loop
	// -----------------------------
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
		getMeshById: (id) => meshById.get(id),
	};
}
