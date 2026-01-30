// src/scene/picking.js
import * as THREE from "three";

export function createPicking({ renderer, camera, groundPlane, getMapSize }) {
	const raycaster = new THREE.Raycaster();
	const pointerNDC = new THREE.Vector2(9999, 9999);

	let downPos = null;
	const CLICK_MOVE_TOLERANCE_PX = 6;

	function getCanvasRect() {
		return renderer.domElement.getBoundingClientRect();
	}

	function updatePointerFromClient(clientX, clientY) {
		const rect = getCanvasRect();

		const inside =
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom;

		if (!inside) {
			pointerNDC.set(9999, 9999);
			return false;
		}

		const x = clientX - rect.left;
		const y = clientY - rect.top;

		pointerNDC.x = (x / rect.width) * 2 - 1;
		pointerNDC.y = -(y / rect.height) * 2 + 1;
		return true;
	}

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	function pointInsideMapFootprint(p) {
		const mapSize = getMapSize();
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
		const mapSize = getMapSize();
		let x = Math.floor(p.x + 0.5);
		let z = Math.floor(p.z + 0.5);
		const y = 0;

		x = clamp(x, 0, mapSize.sizeX - 1);
		z = clamp(z, 0, mapSize.sizeZ - 1);
		return { x, y, z };
	}

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

	function bindPointerTracking() {
		window.addEventListener("pointermove", (e) => {
			updatePointerFromClient(e.clientX, e.clientY);
		});
	}

	function bindClickToPlace({ isAdding, onCellClick }) {
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

			if (!isAdding()) return;
			if (!downPos) return;

			const dx = e.clientX - downPos.x;
			const dy = e.clientY - downPos.y;
			if (Math.hypot(dx, dy) > CLICK_MOVE_TOLERANCE_PX) return;

			const inside = updatePointerFromClient(e.clientX, e.clientY);
			if (!inside) return;

			const cell = pickCellUnderPointer();
			if (!cell) return;

			onCellClick(cell);
		});
	}

	return {
		pointerNDC,
		bindPointerTracking,
		bindClickToPlace,
		pickWorldPointOnGround,
		pickCellUnderPointer,
	};
}
