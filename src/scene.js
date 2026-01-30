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

export function createSceneApp({ onHoverTextChange } = {}) {
	// ---- DOM setup ----
	document.body.style.margin = "0";
	document.body.style.overflow = "hidden";

	// WebGL renderer
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// Label renderer
	const labelRenderer = new CSS2DRenderer();
	labelRenderer.setSize(window.innerWidth, window.innerHeight);
	labelRenderer.domElement.style.position = "absolute";
	labelRenderer.domElement.style.top = "0";
	labelRenderer.domElement.style.left = "0";
	labelRenderer.domElement.style.pointerEvents = "none";
	document.body.appendChild(labelRenderer.domElement);

	// ---- Scene / Camera ----
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
	controls.target.set(0, 0, 0);
	controls.update();

	// Lights
	scene.add(new THREE.AmbientLight(0xffffff, 0.6));
	const dir = new THREE.DirectionalLight(0xffffff, 0.8);
	dir.position.set(10, 20, 10);
	scene.add(dir);

	// Helpers
	scene.add(new THREE.AxesHelper(10));
	const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1f2937);
	gridHelper.position.y = -0.5;
	scene.add(gridHelper);

	// ---- Hover tooltip label (single reusable) ----
	const hoverDiv = document.createElement("div");
	hoverDiv.style.padding = "4px 6px";
	hoverDiv.style.borderRadius = "6px";
	hoverDiv.style.background = "rgba(0,0,0,0.7)";
	hoverDiv.style.color = "white";
	hoverDiv.style.font =
		"12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
	hoverDiv.style.whiteSpace = "nowrap";
	hoverDiv.style.transform = "translate(-50%, -120%)";

	const hoverLabel = new CSS2DObject(hoverDiv);
	hoverLabel.position.set(0, 0.6, 0);
	hoverLabel.visible = false;
	scene.add(hoverLabel);

	// ---- Rendering registry ----
	const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

	const cubes = []; // meshes for raycasting
	const meshById = new Map(); // id -> mesh
	const staticLabelById = new Map(); // id -> CSS2DObject

	// ---- Raycasting ----
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2(9999, 9999);
	let pointerInside = false;
	let hoveredMesh = null;

	renderer.domElement.addEventListener(
		"pointerenter",
		() => (pointerInside = true),
	);
	renderer.domElement.addEventListener("pointerleave", () => {
		pointerInside = false;
		setHovered(null);
	});
	renderer.domElement.addEventListener("pointermove", (event) => {
		const rect = renderer.domElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		pointer.x = (x / rect.width) * 2 - 1;
		pointer.y = -(y / rect.height) * 2 + 1;
	});

	function setHovered(mesh) {
		hoveredMesh = mesh;

		if (!mesh) {
			hoverLabel.visible = false;
			scene.add(hoverLabel); // detach
			if (onHoverTextChange) onHoverTextChange("");
			return;
		}

		const ud = mesh.userData || {};
		const text =
			`${(ud.kind || "obj").toUpperCase()} • ${ud.name || "Unnamed"} • ` +
			`size ${ud.sizeValue ?? "?"} • (${ud.pos?.x},${ud.pos?.y},${ud.pos?.z})`;

		hoverDiv.textContent = text;
		if (onHoverTextChange) onHoverTextChange(text);

		mesh.add(hoverLabel);
		hoverLabel.position.set(0, 0.6, 0);
		hoverLabel.visible = true;
	}

	function updateHover() {
		if (!pointerInside) return;

		raycaster.setFromCamera(pointer, camera);
		const hits = raycaster.intersectObjects(cubes, false);
		if (hits.length === 0) {
			if (hoveredMesh) setHovered(null);
			return;
		}

		const hit = hits[0].object;
		if (hit !== hoveredMesh) setHovered(hit);
	}

	// ---- Static labels (optional per object) ----
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

	// ---- Render from state ----
	function clearRenderedObjects() {
		// Remove meshes + static labels, keep helpers/lights/hoverLabel
		for (const mesh of cubes) {
			if (mesh.parent) mesh.parent.remove(mesh);
			mesh.geometry?.dispose?.();
			mesh.material?.dispose?.();
		}
		cubes.length = 0;
		meshById.clear();

		for (const lbl of staticLabelById.values()) {
			if (lbl.parent) lbl.parent.remove(lbl);
		}
		staticLabelById.clear();

		setHovered(null);
	}

	function renderFromState(state) {
		clearRenderedObjects();

		// Build cubes
		for (const obj of state.objects) {
			const color = new THREE.Color(obj.color || "#808080");
			const mat = new THREE.MeshStandardMaterial({ color });
			const mesh = new THREE.Mesh(cubeGeo, mat);

			mesh.position.set(obj.pos.x, obj.pos.y, obj.pos.z);
			mesh.scale.set(obj.sizeValue, obj.sizeValue, obj.sizeValue);

			mesh.userData = {
				id: obj.id,
				kind: obj.kind,
				name: obj.name,
				sizeKey: obj.sizeKey,
				sizeValue: obj.sizeValue,
				pos: obj.pos,
			};

			scene.add(mesh);
			cubes.push(mesh);
			meshById.set(obj.id, mesh);

			if (obj.labelEnabled) {
				const labelText = `${obj.name} (${obj.sizeValue})`;
				const lbl = createStaticLabel(labelText);
				mesh.add(lbl);
				staticLabelById.set(obj.id, lbl);
			}
		}
	}

	// ---- Resize ----
	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		labelRenderer.setSize(window.innerWidth, window.innerHeight);
	});

	// ---- Animation loop ----
	function animate() {
		requestAnimationFrame(animate);

		controls.update();
		updateHover();

		renderer.render(scene, camera);
		labelRenderer.render(scene, camera);
	}
	animate();

	return {
		renderer,
		scene,
		camera,
		controls,
		renderFromState,
		getMeshById: (id) => meshById.get(id),
	};
}
