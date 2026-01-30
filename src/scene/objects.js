// src/scene/objects.js
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export function createObjects({ scene }) {
	const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
	const cubes = [];
	const meshById = new Map();
	const staticLabelById = new Map();
	let hoveredMesh = null;

	// Hover label
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

	function centerFromAnchor(pos, sizeValue) {
		const s = sizeValue;
		return {
			x: pos.x + (s - 1) / 2,
			y: pos.y + s / 2,
			z: pos.z + (s - 1) / 2,
		};
	}

	function setHovered(mesh, isAdding) {
		hoveredMesh = mesh;

		if (!mesh || isAdding) {
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

	function clear() {
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

		setHovered(null, false);
	}

	function renderFromState(state) {
		clear();

		for (const obj of state.objects) {
			const mat = new THREE.MeshStandardMaterial({
				color: new THREE.Color(obj.color || "#808080"),
			});
			const mesh = new THREE.Mesh(cubeGeo, mat);

			mesh.scale.set(obj.sizeValue, obj.sizeValue, obj.sizeValue);

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

	return {
		cubes,
		meshById,
		renderFromState,
		setHovered,
	};
}
