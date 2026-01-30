// src/scene/cursor.js
import * as THREE from "three";

export function createCursor(scene) {
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

	return { cursorGroup };
}

export function setCursorVisible(cursor, visible) {
	cursor.cursorGroup.visible = Boolean(visible);
}

export function setCursorScale(cursor, s) {
	cursor.cursorGroup.scale.set(s, s, s);
}

export function setCursorPosition(cursor, v3) {
	cursor.cursorGroup.position.set(v3.x, v3.y, v3.z);
}
