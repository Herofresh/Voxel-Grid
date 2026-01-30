// src/scene/index.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
	CSS2DRenderer,
	CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

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

export function createSceneApp({
	onCellClick,
	onObjectClick,
	onObjectMove,
	onAreaHits,
} = {}) {
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

	// Floor image (optional)
	const floor = {
		mesh: null,
		material: null,
		texture: null,
		src: null,
		textureSrc: null,
		fitToMap: true,
		width: null,
		height: null,
		opacity: 1,
	};
	const textureLoader = new THREE.TextureLoader();

	// Measurement line + label
	const measure = {
		line: null,
		label: null,
		labelDiv: null,
		aId: null,
		bId: null,
	};

	function initMeasure() {
		const geom = new THREE.BufferGeometry();
		const positions = new Float32Array(6);
		geom.setAttribute(
			"position",
			new THREE.BufferAttribute(positions, 3),
		);
		const mat = new THREE.LineBasicMaterial({ color: 0x93c5fd });
		measure.line = new THREE.Line(geom, mat);
		measure.line.visible = false;
		scene.add(measure.line);

		const div = document.createElement("div");
		div.style.padding = "4px 6px";
		div.style.borderRadius = "6px";
		div.style.background = "rgba(0,0,0,0.75)";
		div.style.color = "white";
		div.style.font =
			"12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
		div.style.whiteSpace = "nowrap";
		div.style.transform = "translate(-50%, -120%)";

		measure.labelDiv = div;
		measure.label = new CSS2DObject(div);
		measure.label.visible = false;
		scene.add(measure.label);
	}

	initMeasure();

	// Area tool
	const area = {
		active: false,
		type: "burst",
		rangeFeet: 15,
		originSizeFeet: 5,
		originCell: null,
		direction: null,
		previewCell: null,
		overlay: {
			mesh: null,
			material: null,
			count: 0,
		},
	};

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

	function gridDistanceSquares(dx, dz) {
		const a = Math.abs(dx);
		const b = Math.abs(dz);
		const max = Math.max(a, b);
		const min = Math.min(a, b);
		return max + Math.floor(min / 2);
	}

	function axisDistanceFromPointToSquare(point, cellIndex) {
		const min = cellIndex - 0.5;
		const max = cellIndex + 0.5;
		if (point < min) return Math.round(min - point);
		if (point > max) return Math.round(point - max);
		return 0;
	}

	function burstDistanceFromCorner(origin, cell) {
		const cornerX = origin.x + 0.5;
		const cornerZ = origin.z + 0.5;
		const dx = axisDistanceFromPointToSquare(cornerX, cell.x);
		const dz = axisDistanceFromPointToSquare(cornerZ, cell.z);
		return gridDistanceSquares(dx, dz);
	}

	function emanationDistanceFromSquare(origin, cell, originSizeSquares = 1) {
		const size = Math.max(1, Math.trunc(originSizeSquares));
		const dx = Math.max(0, Math.abs(cell.x - origin.x) - (size - 1));
		const dz = Math.max(0, Math.abs(cell.z - origin.z) - (size - 1));
		return gridDistanceSquares(dx, dz);
	}

	function snapDirection(dx, dz) {
		if (dx === 0 && dz === 0) return null;
		const angle = Math.atan2(dz, dx);
		const step = Math.PI / 4;
		const snapped = Math.round(angle / step) * step;
		const dirX = Math.round(Math.cos(snapped));
		const dirZ = Math.round(Math.sin(snapped));
		if (dirX === 0 && dirZ === 0) return null;
		return { dirX, dirZ, angle: snapped };
	}

	function ensureAreaOverlay() {
		const max = mapSize.sizeX * mapSize.sizeZ;
		if (area.overlay.mesh && area.overlay.mesh.count >= max) return;

		if (area.overlay.mesh) {
			scene.remove(area.overlay.mesh);
			area.overlay.mesh.geometry?.dispose?.();
			area.overlay.mesh.material?.dispose?.();
		}

		const geom = new THREE.PlaneGeometry(1, 1);
		geom.rotateX(-Math.PI / 2);
		const mat = new THREE.MeshBasicMaterial({
			color: 0xa855f7,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
			depthTest: false,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.InstancedMesh(geom, mat, max);
		mesh.frustumCulled = false;
		mesh.renderOrder = 10;
		mesh.visible = false;
		scene.add(mesh);

		area.overlay.mesh = mesh;
		area.overlay.material = mat;
		area.overlay.count = max;
	}

	function setOverlayCells(cells) {
		ensureAreaOverlay();
		if (!area.overlay.mesh) return;

		const mesh = area.overlay.mesh;
		const dummy = new THREE.Object3D();

		let i = 0;
		for (const cell of cells) {
			dummy.position.set(cell.x, 0.01, cell.z);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
			i += 1;
		}
		mesh.count = i;
		mesh.visible = i > 0;
		mesh.instanceMatrix.needsUpdate = true;
	}

	function clearAreaOverlay() {
		if (area.overlay.mesh) area.overlay.mesh.visible = false;
	}

	function collectHitObjectIds(cells) {
		const cellSet = new Set(cells.map((c) => `${c.x},${c.z}`));
		const hits = [];

		for (const obj of objects.meshById.values()) {
			const pos = obj.userData?.pos;
			const size = obj.userData?.sizeValue ?? 1;
			if (!pos) continue;
			let hit = false;
			for (let x = pos.x; x <= pos.x + size - 1; x++) {
				for (let z = pos.z; z <= pos.z + size - 1; z++) {
					if (cellSet.has(`${x},${z}`)) {
						hit = true;
						break;
					}
				}
				if (hit) break;
			}
			if (hit) hits.push(obj.userData?.id);
		}

		return hits;
	}

	function updateAreaVisualization(preview = false) {
		if (!area.active) {
			clearAreaOverlay();
			objects.setHighlightedIds([]);
			onAreaHits?.([]);
			return;
		}

		const origin = area.originCell || area.previewCell;
		if (!origin) {
			clearAreaOverlay();
			objects.setHighlightedIds([]);
			onAreaHits?.([]);
			return;
		}

		const rangeSquares = Math.max(
			1,
			Math.round(Number(area.rangeFeet) / 5),
		);
		const selectedMesh = selectedId ? objects.meshById.get(selectedId) : null;
		const originSizeSquares =
			selectedMesh?.userData?.kind === "enemy"
				? Math.max(1, Math.trunc(selectedMesh.userData?.sizeValue || 1))
				: Math.max(
						1,
						Math.round(Number(area.originSizeFeet) / 5),
					);

		let dir = area.direction;
		if (!dir && area.previewCell && area.originCell) {
			dir = snapDirection(
				area.previewCell.x - area.originCell.x,
				area.previewCell.z - area.originCell.z,
			);
		}

		const cells = [];
		const xMin = 0;
		const zMin = 0;
		const xMax = mapSize.sizeX - 1;
		const zMax = mapSize.sizeZ - 1;

		if (area.type === "line") {
			if (!dir) {
				setOverlayCells([]);
				objects.setHighlightedIds([]);
				onAreaHits?.([]);
				return;
			}
			for (let i = 1; i <= rangeSquares; i++) {
				const x = origin.x + dir.dirX * i;
				const z = origin.z + dir.dirZ * i;
				if (x < xMin || x > xMax || z < zMin || z > zMax) break;
				cells.push({ x, z });
			}
		} else if (area.type === "cone") {
			if (!dir) {
				setOverlayCells([]);
				objects.setHighlightedIds([]);
				onAreaHits?.([]);
				return;
			}
			const originPointX =
				origin.x + (dir.dirX === 0 ? 0 : 0.5 * dir.dirX);
			const originPointZ =
				origin.z + (dir.dirZ === 0 ? 0 : 0.5 * dir.dirZ);
			for (let x = xMin; x <= xMax; x++) {
				for (let z = zMin; z <= zMax; z++) {
					const dx = axisDistanceFromPointToSquare(originPointX, x);
					const dz = axisDistanceFromPointToSquare(originPointZ, z);
					const dist = gridDistanceSquares(dx, dz);
					if (dist > rangeSquares) continue;
					const centerDx = x - originPointX;
					const centerDz = z - originPointZ;
					if (centerDx === 0 && centerDz === 0) continue;
					const dot = centerDx * dir.dirX + centerDz * dir.dirZ;
					if (dot <= 0) continue;
					const ang = Math.atan2(centerDz, centerDx);
					const diff = Math.abs(
						((ang - dir.angle + Math.PI * 3) % (Math.PI * 2)) -
							Math.PI,
					);
					if (diff > Math.PI / 4) continue;
					cells.push({ x, z });
				}
			}
		} else if (area.type === "emanation") {
			for (let x = xMin; x <= xMax; x++) {
				for (let z = zMin; z <= zMax; z++) {
					const dist = emanationDistanceFromSquare(
						origin,
						{ x, z },
						originSizeSquares,
					);
					if (dist <= rangeSquares) cells.push({ x, z });
				}
			}
		} else {
			// burst
			for (let x = xMin; x <= xMax; x++) {
				for (let z = zMin; z <= zMax; z++) {
					const dist = burstDistanceFromCorner(origin, { x, z });
					if (dist <= rangeSquares) cells.push({ x, z });
				}
			}
		}

		setOverlayCells(cells);
		const hitIds = collectHitObjectIds(cells);
		objects.setHighlightedIds(hitIds);
		onAreaHits?.(hitIds);
	}

	function setAreaConfig(next = {}) {
		area.active = Boolean(next.active);
		area.type = next.type || area.type;
		area.rangeFeet =
			Number.isFinite(next.rangeFeet) && next.rangeFeet > 0
				? next.rangeFeet
				: area.rangeFeet;
		area.originSizeFeet =
			Number.isFinite(next.originSizeFeet) && next.originSizeFeet > 0
				? next.originSizeFeet
				: area.originSizeFeet;

		if (!area.active) {
			area.originCell = null;
			area.direction = null;
			area.previewCell = null;
			clearAreaOverlay();
			objects.setHighlightedIds([]);
			onAreaHits?.([]);
		} else {
			mode.isAdding = false;
			setCursorVisible(cursor, false);
		}
	}

	function cancelArea() {
		area.active = false;
		area.originCell = null;
		area.direction = null;
		area.previewCell = null;
		clearAreaOverlay();
		objects.setHighlightedIds([]);
		onAreaHits?.([]);
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

		updateFloorGeometry();
	}

	function getFloorDims() {
		const fitToMap = floor.fitToMap !== false;
		const width = fitToMap
			? mapSize.sizeX
			: Math.max(1, Math.trunc(Number(floor.width) || mapSize.sizeX));
		const height = fitToMap
			? mapSize.sizeZ
			: Math.max(1, Math.trunc(Number(floor.height) || mapSize.sizeZ));
		return { width, height };
	}

	function updateFloorGeometry() {
		if (!floor.mesh) return;
		const { width, height } = getFloorDims();

		floor.mesh.geometry?.dispose?.();
		floor.mesh.geometry = new THREE.PlaneGeometry(width, height);
		floor.mesh.rotation.x = -Math.PI / 2;
		floor.mesh.position.set(
			(mapSize.sizeX - 1) / 2,
			-0.02,
			(mapSize.sizeZ - 1) / 2,
		);
	}

	function ensureFloorMesh() {
		if (floor.mesh) return;
		floor.material = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 1,
		});
		floor.mesh = new THREE.Mesh(
			new THREE.PlaneGeometry(mapSize.sizeX, mapSize.sizeZ),
			floor.material,
		);
		floor.mesh.rotation.x = -Math.PI / 2;
		floor.mesh.position.set(
			(mapSize.sizeX - 1) / 2,
			-0.02,
			(mapSize.sizeZ - 1) / 2,
		);
		scene.add(floor.mesh);
	}

	function setFloorFromState(nextFloor) {
		const cfg = nextFloor || {};
		const src = typeof cfg.src === "string" ? cfg.src : null;
		const fitToMap = cfg.fitToMap !== false;
		const width = Number.isFinite(cfg.width) ? cfg.width : null;
		const height = Number.isFinite(cfg.height) ? cfg.height : null;
		const opacity = Number.isFinite(cfg.opacity) ? cfg.opacity : 1;

		floor.src = src;
		floor.fitToMap = fitToMap;
		floor.width = width;
		floor.height = height;
		floor.opacity = Math.max(0, Math.min(1, opacity));

		if (!src) {
			if (floor.mesh) floor.mesh.visible = false;
			return;
		}

		ensureFloorMesh();
		floor.mesh.visible = true;
		floor.material.opacity = floor.opacity;

		if (src !== floor.textureSrc) {
			floor.textureSrc = src;
			textureLoader.load(
				src,
				(tex) => {
					tex.wrapS = THREE.ClampToEdgeWrapping;
					tex.wrapT = THREE.ClampToEdgeWrapping;
					tex.minFilter = THREE.LinearFilter;
					floor.material.map = tex;
					floor.material.needsUpdate = true;
				},
				undefined,
				() => {},
			);
		}

		updateFloorGeometry();
	}

	function renderFromState(state) {
		setMapSize({
			sizeX: state.map.sizeX,
			sizeY: state.map.sizeY,
			sizeZ: state.map.sizeZ,
		});
		objects.renderFromState(state);
		setFloorFromState(state.map.floor);

		if (measure.aId && measure.bId)
			setMeasurement(measure.aId, measure.bId);
		updateAreaVisualization();
	}

	function anchorToCenter(anchor, sizeValue) {
		const s = Math.max(1, Math.trunc(Number(sizeValue) || 1));
		return {
			x: anchor.x + (s - 1) / 2,
			y: anchor.y + s / 2,
			z: anchor.z + (s - 1) / 2,
		};
	}

	function animateSwap({
		aId,
		bId,
		aFrom,
		aTo,
		bFrom,
		bTo,
		durationMs = 250,
	} = {}) {
		const aMesh = objects.meshById.get(aId);
		const bMesh = objects.meshById.get(bId);
		if (!aMesh || !bMesh) return Promise.resolve();

		const aSize = aMesh.userData?.sizeValue ?? 1;
		const bSize = bMesh.userData?.sizeValue ?? 1;

		const aStart = anchorToCenter(aFrom, aSize);
		const aEnd = anchorToCenter(aTo, aSize);
		const bStart = anchorToCenter(bFrom, bSize);
		const bEnd = anchorToCenter(bTo, bSize);

		const start = performance.now();

		return new Promise((resolve) => {
			function step(now) {
				const t = Math.min(
					1,
					(now - start) / Math.max(1, durationMs),
				);
				const lerp = (a, b) => a + (b - a) * t;

				aMesh.position.set(
					lerp(aStart.x, aEnd.x),
					lerp(aStart.y, aEnd.y),
					lerp(aStart.z, aEnd.z),
				);
				bMesh.position.set(
					lerp(bStart.x, bEnd.x),
					lerp(bStart.y, bEnd.y),
					lerp(bStart.z, bEnd.z),
				);

				if (t < 1) {
					requestAnimationFrame(step);
					return;
				}

				objects.setObjectPosition(aId, aTo, aSize);
				objects.setObjectPosition(bId, bTo, bSize);
				resolve();
			}

			requestAnimationFrame(step);
		});
	}

	// Cursor preview update (add mode only)
	function updateCursor() {
		if (area.active) {
			// Area tool controls cursor preview
			return;
		}

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

	function updateAreaPreview() {
		if (!area.active) return;

		const cell = picking.pickCellUnderPointer();
		if (!cell) {
			area.previewCell = null;
			setCursorVisible(cursor, false);
			updateAreaVisualization(true);
			return;
		}

		area.previewCell = cell;
		// Project cursor onto the grid plane for area preview
		const cx = cell.x;
		const cz = cell.z;
		setCursorScale(cursor, { x: 1, y: 0.02, z: 1 });
		setCursorPosition(cursor, { x: cx, y: 0.01, z: cz });
		setCursorVisible(cursor, true);
		updateAreaVisualization(true);
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

	function pointInsideMapFootprint(p) {
		const xMin = -0.5;
		const xMax = mapSize.sizeX - 0.5;
		const zMin = -0.5;
		const zMax = mapSize.sizeZ - 0.5;
		const eps = 1e-6;

		return (
			p.x >= xMin - eps &&
			p.x <= xMax + eps &&
			p.z >= zMin - eps &&
			p.z <= zMax + eps
		);
	}

	function worldPointToCell(p) {
		let x = Math.floor(p.x + 0.5);
		let z = Math.floor(p.z + 0.5);
		const y = 0;

		x = Math.max(0, Math.min(mapSize.sizeX - 1, x));
		z = Math.max(0, Math.min(mapSize.sizeZ - 1, z));
		return { x, y, z };
	}

	function clampAnchorForSize(anchor, sizeValue) {
		const s = Math.max(1, Math.trunc(Number(sizeValue) || 1));
		return {
			x: Math.max(0, Math.min(mapSize.sizeX - s, anchor.x)),
			y: Math.max(0, Math.min(mapSize.sizeY - s, anchor.y)),
			z: Math.max(0, Math.min(mapSize.sizeZ - s, anchor.z)),
		};
	}

	function setMeshPositionFromAnchor(mesh, anchor, sizeValue) {
		const s = Math.max(1, Math.trunc(Number(sizeValue) || 1));
		const cx = anchor.x + (s - 1) / 2;
		const cy = anchor.y + s / 2;
		const cz = anchor.z + (s - 1) / 2;
		mesh.position.set(cx, cy, cz);
		mesh.userData = { ...mesh.userData, pos: { ...anchor } };
	}

	function getEventNDC(e) {
		const rect = renderer.domElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
		return {
			x: (x / rect.width) * 2 - 1,
			y: -(y / rect.height) * 2 + 1,
		};
	}

	const dragRaycaster = new THREE.Raycaster();

	function pickGroundFromEvent(e) {
		const ndc = getEventNDC(e);
		if (!ndc) return null;
		dragRaycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
		const hit = new THREE.Vector3();
		const ok = dragRaycaster.ray.intersectPlane(groundPlane, hit);
		if (!ok) return null;
		if (!pointInsideMapFootprint(hit)) return null;
		return hit;
	}

	function pickObjectFromEvent(e) {
		const ndc = getEventNDC(e);
		if (!ndc) return null;
		dragRaycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
		const hits = dragRaycaster.intersectObjects(objects.cubes, false);
		return hits.length ? hits[0].object : null;
	}

	let selectedId = null;

	function clearMeasurement() {
		measure.aId = null;
		measure.bId = null;
		if (measure.line) measure.line.visible = false;
		if (measure.label) measure.label.visible = false;
	}

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	function closestBetweenRanges(aMin, aMax, bMin, bMax) {
		if (aMax < bMin) return { a: aMax, b: bMin };
		if (bMax < aMin) return { a: aMin, b: bMax };
		const bCenter = (bMin + bMax) / 2;
		const aCoord = clamp(bCenter, aMin, aMax);
		const bCoord = clamp(aCoord, bMin, bMax);
		return { a: aCoord, b: bCoord };
	}

	function setMeasurement(aId, bId) {
		const aMesh = objects.meshById.get(aId);
		const bMesh = objects.meshById.get(bId);
		if (!aMesh || !bMesh) {
			clearMeasurement();
			return;
		}

		const aPos = aMesh.userData?.pos;
		const bPos = bMesh.userData?.pos;
		const aSize = aMesh.userData?.sizeValue ?? 1;
		const bSize = bMesh.userData?.sizeValue ?? 1;
		if (!aPos || !bPos) {
			clearMeasurement();
			return;
		}

		const aMinX = aPos.x;
		const aMaxX = aPos.x + aSize - 1;
		const aMinZ = aPos.z;
		const aMaxZ = aPos.z + aSize - 1;
		const bMinX = bPos.x;
		const bMaxX = bPos.x + bSize - 1;
		const bMinZ = bPos.z;
		const bMaxZ = bPos.z + bSize - 1;

		const x = closestBetweenRanges(aMinX, aMaxX, bMinX, bMaxX);
		const z = closestBetweenRanges(aMinZ, aMaxZ, bMinZ, bMaxZ);

		const aPoint = new THREE.Vector3(x.a, aPos.y, z.a);
		const bPoint = new THREE.Vector3(x.b, bPos.y, z.b);

		const dist = aPoint.distanceTo(bPoint);
		const feet = Math.round(dist) * 5;

		const posAttr = measure.line.geometry.getAttribute("position");
		posAttr.array[0] = aPoint.x;
		posAttr.array[1] = aPoint.y;
		posAttr.array[2] = aPoint.z;
		posAttr.array[3] = bPoint.x;
		posAttr.array[4] = bPoint.y;
		posAttr.array[5] = bPoint.z;
		posAttr.needsUpdate = true;

		const mid = aPoint.clone().add(bPoint).multiplyScalar(0.5);
		measure.label.position.set(mid.x, mid.y + 0.2, mid.z);
		measure.labelDiv.textContent = `${dist.toFixed(2)} | ${feet} ft`;

		measure.aId = aId;
		measure.bId = bId;
		measure.line.visible = true;
		measure.label.visible = true;
	}

	function setSelectedId(id) {
		selectedId = id || null;
		if (!selectedId) clearMeasurement();
	}

	// Click selection + drag (players/enemies), only when NOT adding
	let downPos = null;
	let dragActive = false;
	let dragMoved = false;
	let dragMesh = null;
	let dragId = null;
	let dragSizeValue = 1;
	let dragAnchor = null;
	let dragStartPos = null;
	const CLICK_MOVE_TOLERANCE_PX = 6;

	renderer.domElement.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		if (mode.isAdding) return;
		if (area.active) return;
		downPos = { x: e.clientX, y: e.clientY };

		const mesh = pickObjectFromEvent(e);
		const kind = mesh?.userData?.kind;
		if (mesh && (kind === "player" || kind === "enemy")) {
			dragActive = true;
			dragMoved = false;
			dragMesh = mesh;
			dragId = mesh.userData?.id ?? null;
			dragSizeValue = mesh.userData?.sizeValue ?? 1;
			dragAnchor = mesh.userData?.pos ?? null;
			dragStartPos = mesh.userData?.pos ?? null;
			controls.enabled = false;
		}
	});

	renderer.domElement.addEventListener("pointermove", (e) => {
		if (!dragActive || !dragMesh) return;

		const dx = e.clientX - downPos.x;
		const dy = e.clientY - downPos.y;
		if (!dragMoved && Math.hypot(dx, dy) <= CLICK_MOVE_TOLERANCE_PX) return;

		const hit = pickGroundFromEvent(e);
		if (!hit) return;

		const cell = worldPointToCell(hit);
		const anchor = clampAnchorForSize(cell, dragSizeValue);
		dragAnchor = anchor;
		dragMoved = true;
		setMeshPositionFromAnchor(dragMesh, anchor, dragSizeValue);
	});

	renderer.domElement.addEventListener("pointerup", (e) => {
		if (e.button !== 0) return;
		if (!downPos) return;

		const dx = e.clientX - downPos.x;
		const dy = e.clientY - downPos.y;
		downPos = null;

		if (mode.isAdding) return;
		if (area.active) return;

		if (dragActive && dragMesh) {
			const id = dragId;
			if (dragMoved && id && dragAnchor) {
				onObjectMove?.({
					id,
					pos: { ...dragAnchor },
					prevPos: dragStartPos ? { ...dragStartPos } : null,
				});
			} else if (id) {
				onObjectClick?.(id);
			}
		} else {
			if (Math.hypot(dx, dy) > CLICK_MOVE_TOLERANCE_PX) return;
			const mesh = pickObjectFromEvent(e);
			const id = mesh?.userData?.id;
			if (id) onObjectClick?.(id);
		}

		if (dragActive) {
			dragActive = false;
			dragMoved = false;
			dragMesh = null;
			dragId = null;
			dragAnchor = null;
			dragStartPos = null;
			controls.enabled = true;
		}
	});

	// Middle mouse distance measure (selected -> target)
	renderer.domElement.addEventListener("pointerup", (e) => {
		if (e.button !== 1) return;
		if (mode.isAdding) return;
		if (area.active) return;
		if (!selectedId) return;

		const mesh = pickObjectFromEvent(e);
		const targetId = mesh?.userData?.id ?? null;
		if (targetId && targetId !== selectedId) {
			setMeasurement(selectedId, targetId);
		} else {
			clearMeasurement();
		}
	});

	// Area placement (left click)
	renderer.domElement.addEventListener("pointerup", (e) => {
		if (e.button !== 0) return;
		if (!area.active) return;
		if (mode.isAdding) return;

		const cell = picking.pickCellUnderPointer();
		if (!cell) return;

		if (!area.originCell || area.direction) {
			area.originCell = cell;
			area.direction = null;
			updateAreaVisualization();
			return;
		}

		const dir = snapDirection(
			cell.x - area.originCell.x,
			cell.z - area.originCell.z,
		);
		if (!dir) return;
		area.direction = dir;
		updateAreaVisualization();
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
		updateAreaPreview();

		renderer.render(scene, camera);
		labelRenderer.render(scene, camera);
	}
	animate();

	return {
		renderFromState,
		setMapSize,
		setMode,
		setPlacementPreview,
		animateSwap,
		setSelectedId,
		setAreaConfig,
		cancelArea,
	};
}
