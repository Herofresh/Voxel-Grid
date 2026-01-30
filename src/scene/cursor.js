// src/scene/cursor.js
import * as THREE from "three";

/**
 * Cursor = wireframe box used for placement preview.
 * Supports non-uniform scaling (x/y/z).
 */
export function createCursor(scene) {
	const geo = new THREE.BoxGeometry(1, 1, 1);
	const mat = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		wireframe: true,
		transparent: true,
		opacity: 0.9,
	});
	const mesh = new THREE.Mesh(geo, mat);

	mesh.visible = false;
	scene.add(mesh);

	return { mesh };
}

export function setCursorVisible(cursor, visible) {
	cursor.mesh.visible = Boolean(visible);
}

export function setCursorPosition(cursor, { x, y, z }) {
	cursor.mesh.position.set(x, y, z);
}

/**
 * scale can be a number (uniform) or {x,y,z} (non-uniform)
 */
export function setCursorScale(cursor, scale) {
	if (typeof scale === "number") {
		const s = Math.max(1, Math.trunc(scale || 1));
		cursor.mesh.scale.set(s, s, s);
		return;
	}

	const sx = Math.max(1, Math.trunc(Number(scale?.x) || 1));
	const sy = Math.max(1, Math.trunc(Number(scale?.y) || 1));
	const sz = Math.max(1, Math.trunc(Number(scale?.z) || 1));
	cursor.mesh.scale.set(sx, sy, sz);
}
