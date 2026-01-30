// src/scene/grid.js
import * as THREE from "three";

function buildGridLines(sizeX, sizeZ) {
	const verts = [];
	const xMin = -0.5;
	const xMax = sizeX - 0.5;
	const zMin = -0.5;
	const zMax = sizeZ - 0.5;
	const y = 0; // matches your current grid at y=0

	for (let x = 0; x <= sizeX; x++) {
		const xx = x - 0.5;
		verts.push(xx, y, zMin, xx, y, zMax);
	}
	for (let z = 0; z <= sizeZ; z++) {
		const zz = z - 0.5;
		verts.push(xMin, y, zz, xMax, y, zz);
	}

	const geom = new THREE.BufferGeometry();
	geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
	const mat = new THREE.LineBasicMaterial({
		color: 0x1f2937,
		transparent: true,
		opacity: 0.9,
	});

	return new THREE.LineSegments(geom, mat);
}

export function createGrid({ scene, mapSize }) {
	const gridLines = buildGridLines(mapSize.sizeX, mapSize.sizeZ);
	scene.add(gridLines);

	return {
		get gridLines() {
			return gridLines;
		},
	};
}

export function setGrid(scene, currentGridLinesRef, mapSize) {
	if (currentGridLinesRef.value) {
		scene.remove(currentGridLinesRef.value);
		currentGridLinesRef.value.geometry.dispose();
		currentGridLinesRef.value.material.dispose();
	}

	currentGridLinesRef.value = buildGridLines(mapSize.sizeX, mapSize.sizeZ);
	scene.add(currentGridLinesRef.value);
}
