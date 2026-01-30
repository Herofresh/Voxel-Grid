// src/scene.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
	CSS2DRenderer,
	CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

const DEFAULTS = {
	background: 0x0b0f1a,
};

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

	scene.add(new THREE.AxesHelper(10));

	// -----------------------------
	// Mode: view vs add
	// -----------------------------
	const mode = {
		isAdding: false, // when true: disable hover labels
	};

	function setMode(next) {
		mode.isAdding = Boolean(next?.isAdding);
		// cursor cube should always show (helps even in view),
		// but you can choose to hide it in view if you want.
	}

	// -----------------------------
	// Map size + map-aligned grid & picking plane
	// -----------------------------
	let mapSize = { sizeX: 6, sizeY: 4, sizeZ: 6 };

	// Custom grid lines (so it aligns with integer-centered cells)
	let gridLines = null;

	function buildGridLines(sizeX, sizeZ) {
		const verts = [];

		const xMin = -0.5;
		const xMax = sizeX - 0.5;
		const zMin = -0.5;
		const zMax = sizeZ - 0.5;
		const y = -0.5; // under cubes slightly

		// Lines parallel to Z (vary X)
		for (let x = 0; x <= sizeX; x++) {
			const xx = x - 0.5;
			verts.push(xx, y, zMin, xx, y, zMax);
		}

		// Lines parallel to X (vary Z)
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

	// Picking plane constrained to map footprint
	const pickPlaneGeo = new THREE.PlaneGeometry(1, 1);
	const pickPlaneMat = new THREE.MeshBasicMaterial({ visible: false });
	const pickPlane = new THREE.Mesh(pickPlaneGeo, pickPlaneMat);
	pickPlane.rotation.x = -Math.PI / 2;
	scene.add(pickPlane);

	function setMapSize(next) {
		mapSize = { ...mapSize, ...next };

		// rebuild grid lines
		if (gridLines) {
			scene.remove(gridLines);
			gridLines.geometry.dispose();
			gridLines.material.dispose();
		}
		gridLines = buildGridLines(mapSize.sizeX, mapSize.sizeZ);
		scene.add(gridLines);

		// resize pick plane to cover [-0.5..sizeX-0.5] etc.
		// PlaneGeometry is centered; scale to sizeX, sizeZ and position at center of footprint.
		pickPlane.scale.set(mapSize.sizeX, 1, mapSize.sizeZ);
		pickPlane.position.set(
			(mapSize.sizeX - 1) / 2,
			0,
			(mapSize.sizeZ - 1) / 2,
		);

		// controls target to center of map footprint
		controls.target.set(
			(mapSize.sizeX - 1) / 2,
			0,
			(mapSize.sizeZ - 1) / 2,
		);
		controls.update();
	}

	setMapSize(mapSize);

	// -----------------------------
	// Cursor cube (wireframe 1x1x1 outline)
	// -----------------------------
	const cursorCube = new THREE.Mesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshBasicMaterial({
			color: 0xffffff,
			wireframe: true,
			transparent: true,
			opacity: 0.7,
		}),
	);
	cursorCube.visible = true;
	cursorCube.position.set(0, 0, 0);
	scene.add(cursorCube);

	// -----------------------------
	// Hover tooltip (CSS2D)
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
	// Rendered objects registry
	// -----------------------------
	const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
	const cubes = [];
	const meshById = new Map();
	const staticLabelById = new Map();

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
		obj.position.set(0, 0.8, 0);
		return obj;
	}

	function clearRenderedObjects() {
		for (const mesh of cubes) {
			mesh.parent?.remove(mesh);
			mesh.material?.dispose?.();
			// cubeGeo is shared; don't dispose geometry
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

			mesh.position.set(obj.pos.x, obj.pos.y, obj.pos.z);
			mesh.scale.set(obj.sizeValue, obj.sizeValue, obj.sizeValue);

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
				staticLabelById.set(obj.id, lbl);
			}
		}
	}

	// -----------------------------
	// Raycasting (hover + cursor + click)
	// -----------------------------
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2(9999, 9999);
	let pointerInside = false;
	let hoveredMesh = null;

	function getPointerNDC(event) {
		const rect = renderer.domElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		return { x: (x / rect.width) * 2 - 1, y: -(y / rect.height) * 2 + 1 };
	}

	function worldPointToCell(p) {
		// Cells are centered on integers; boundaries are at n +/- 0.5
		let x = Math.floor(p.x + 0.5);
		let z = Math.floor(p.z + 0.5);
		let y = 0;

		x = Math.max(0, Math.min(mapSize.sizeX - 1, x));
		z = Math.max(0, Math.min(mapSize.sizeZ - 1, z));

		return { x, y, z };
	}

	function setHovered(mesh) {
		hoveredMesh = mesh;

		if (!mesh || mode.isAdding) {
			hoverLabel.visible = false;
			scene.add(hoverLabel);
			return;
		}

		const ud = mesh.userData || {};
		hoverDiv.textContent = `${(ud.kind || "OBJ").toUpperCase()} • ${ud.name} • size ${ud.sizeValue} • (${ud.pos.x},${ud.pos.y},${ud.pos.z})`;

		mesh.add(hoverLabel);
		hoverLabel.position.set(0, 0.6, 0);
		hoverLabel.visible = true;
	}

	function updateCursorAndHover() {
		if (!pointerInside) return;

		// Cursor: raycast against pickPlane
		raycaster.setFromCamera(pointer, camera);
		const planeHits = raycaster.intersectObject(pickPlane, false);

		if (planeHits.length > 0) {
			const cell = worldPointToCell(planeHits[0].point);
			cursorCube.position.set(cell.x, cell.y, cell.z);
			cursorCube.visible = true;
		} else {
			cursorCube.visible = false;
		}

		// Hover (only in view mode)
		if (!mode.isAdding) {
			const cubeHits = raycaster.intersectObjects(cubes, false);
			if (cubeHits.length === 0) {
				if (hoveredMesh) setHovered(null);
			} else {
				const hit = cubeHits[0].object;
				if (hit !== hoveredMesh) setHovered(hit);
			}
		} else {
			if (hoveredMesh) setHovered(null);
		}
	}

	renderer.domElement.addEventListener(
		"pointerenter",
		() => (pointerInside = true),
	);
	renderer.domElement.addEventListener("pointerleave", () => {
		pointerInside = false;
		setHovered(null);
		cursorCube.visible = false;
	});

	renderer.domElement.addEventListener("pointermove", (event) => {
		const ndc = getPointerNDC(event);
		pointer.x = ndc.x;
		pointer.y = ndc.y;
	});

	renderer.domElement.addEventListener("pointerdown", (event) => {
		if (event.button !== 0) return;

		const ndc = getPointerNDC(event);
		raycaster.setFromCamera(ndc, camera);

		const hits = raycaster.intersectObject(pickPlane, false);
		if (hits.length === 0) return;

		const cell = worldPointToCell(hits[0].point);
		onCellClick?.(cell);
	});

	// -----------------------------
	// Resize + loop
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
		updateCursorAndHover();
		renderer.render(scene, camera);
		labelRenderer.render(scene, camera);
	}
	animate();

	return {
		renderFromState,
		setMapSize,
		setMode,
		getMeshById: (id) => meshById.get(id),
	};
}
