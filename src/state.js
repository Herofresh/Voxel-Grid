// src/state.js

export const SIZE_MAPS = {
	player: {
		small: 1,
		medium: 1,
		large: 2,
		huge: 3,
	},
	enemy: {
		small: 1,
		medium: 1,
		large: 2,
		huge: 3,
		gargantuan: 4,
	},
};

// Single source of truth (mutate in-place; don't reassign)
export const state = {
	map: { sizeX: 6, sizeY: 4, sizeZ: 6 },
	objects: [], // { id, kind, name, sizeKey, sizeValue, color, pos:{x,y,z}, labelEnabled }
};

export function uid() {
	return crypto.randomUUID
		? crypto.randomUUID()
		: String(Date.now() + Math.random());
}

export function clampInt(n, min, max) {
	const x = Number.isFinite(n) ? Math.trunc(n) : min;
	return Math.max(min, Math.min(max, x));
}

export function normalizeObject(obj) {
	// Minimal normalization + defaults (trust but verify)
	const kind = obj.kind;
	const name =
		typeof obj.name === "string" && obj.name.trim()
			? obj.name.trim()
			: kind;

	const color =
		typeof obj.color === "string" && obj.color.startsWith("#")
			? obj.color
			: "#808080";

	const sizeKey = typeof obj.sizeKey === "string" ? obj.sizeKey : "medium";
	const sizeValue =
		typeof obj.sizeValue === "number" && Number.isFinite(obj.sizeValue)
			? obj.sizeValue
			: 1;

	const labelEnabled = Boolean(obj.labelEnabled);

	const pos = obj.pos ?? {};
	const x = Number.isFinite(pos.x) ? Math.trunc(pos.x) : 0;
	const y = Number.isFinite(pos.y) ? Math.trunc(pos.y) : 0;
	const z = Number.isFinite(pos.z) ? Math.trunc(pos.z) : 0;

	return {
		id: typeof obj.id === "string" ? obj.id : uid(),
		kind,
		name,
		color,
		sizeKey,
		sizeValue,
		labelEnabled,
		pos: { x, y, z },
	};
}

export function createObject({
	kind,
	name,
	sizeKey,
	envSizeValue,
	color,
	pos,
	labelEnabled,
}) {
	if (!["player", "enemy", "env"].includes(kind)) {
		throw new Error(`Invalid kind: ${kind}`);
	}

	let sizeValue = 1;

	if (kind === "player" || kind === "enemy") {
		const map = SIZE_MAPS[kind];
		const key = sizeKey in map ? sizeKey : "medium";
		sizeKey = key;
		sizeValue = map[key];
	} else {
		// env cube: numeric size (allow >= 1)
		sizeKey = "custom";
		sizeValue = Number(envSizeValue);
		if (!Number.isFinite(sizeValue) || sizeValue < 1) sizeValue = 1;
		sizeValue = Math.trunc(sizeValue);
	}

	return normalizeObject({
		id: uid(),
		kind,
		name: name?.trim() || (kind === "env" ? "Environment" : kind),
		color: color || "#808080",
		sizeKey,
		sizeValue,
		labelEnabled: Boolean(labelEnabled),
		pos: {
			x: Math.trunc(Number(pos?.x ?? 0)),
			y: Math.trunc(Number(pos?.y ?? 0)),
			z: Math.trunc(Number(pos?.z ?? 0)),
		},
	});
}

export function validateAndLoadState(json) {
	// Basic schema validation (keeps MVP resilient)
	if (!json || typeof json !== "object") throw new Error("Invalid JSON root");

	const map = json.map;
	if (!map || typeof map !== "object") throw new Error("Missing map");

	const sizeX = Math.trunc(Number(map.sizeX));
	const sizeY = Math.trunc(Number(map.sizeY));
	const sizeZ = Math.trunc(Number(map.sizeZ));
	if (![sizeX, sizeY, sizeZ].every((n) => Number.isFinite(n) && n >= 1)) {
		throw new Error("Map sizes must be integers >= 1");
	}

	const objects = Array.isArray(json.objects) ? json.objects : [];
	const normalized = objects
		.filter((o) => o && typeof o === "object")
		.filter((o) => ["player", "enemy", "env"].includes(o.kind))
		.map((o) => normalizeObject(o));

	// Mutate in place (important)
	state.map.sizeX = sizeX;
	state.map.sizeY = sizeY;
	state.map.sizeZ = sizeZ;

	state.objects.length = 0;
	state.objects.push(...normalized);
}

export function serializeState() {
	// Return plain JSON-safe object
	return {
		map: { ...state.map },
		objects: state.objects.map((o) => ({
			id: o.id,
			kind: o.kind,
			name: o.name,
			color: o.color,
			sizeKey: o.sizeKey,
			sizeValue: o.sizeValue,
			labelEnabled: o.labelEnabled,
			pos: { ...o.pos },
		})),
	};
}
