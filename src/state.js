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

export const state = {
	version: 1,
	map: {
		sizeX: 6,
		sizeY: 4,
		sizeZ: 6,
	},
	objects: [],
};

let _idCounter = 1;
let _orderCounter = 1;

function nextId(prefix = "obj") {
	const id = `${prefix}_${String(_idCounter).padStart(4, "0")}`;
	_idCounter += 1;
	return id;
}

function nextOrder() {
	const n = _orderCounter;
	_orderCounter += 1;
	return n;
}

function clampInt(v, min, max) {
	const n = Math.trunc(Number(v) || 0);
	return Math.max(min, Math.min(max, n));
}

function ensureHp(obj) {
	const defaultMax = obj.kind === "env" ? 1 : 10;

	const hpMax =
		Number.isFinite(obj.hpMax) && obj.hpMax > 0
			? Math.trunc(obj.hpMax)
			: defaultMax;

	const hp =
		Number.isFinite(obj.hp) && obj.hp >= 0 ? Math.trunc(obj.hp) : hpMax;

	obj.hpMax = Math.max(1, hpMax);
	obj.hp = clampInt(hp, 0, obj.hpMax);
	return obj;
}

function normalizeStructurePath(p) {
	if (!p) return null;
	const cleaned = String(p)
		.split("/")
		.map((s) => s.trim())
		.filter(Boolean)
		.join("/");
	return cleaned.length ? cleaned : null;
}

function sortByOrderThenName(a, b) {
	const ao = Number.isFinite(a.order) ? a.order : 999999;
	const bo = Number.isFinite(b.order) ? b.order : 999999;
	if (ao !== bo) return ao - bo;
	return String(a.name).localeCompare(String(b.name));
}

export function createObject({
	kind,
	name,
	pos,
	color,
	labelEnabled = false,
	sizeKey = null,
	envSizeValue = null,
	hp = null,
	hpMax = null,

	// Optional ordering override
	order = null,

	// Folder-like structure path (env only, but we keep it optional)
	// Example: "Castle/Walls/North"
	structurePath = null,
} = {}) {
	const safeKind = kind === "enemy" || kind === "env" ? kind : "player";

	const computedSizeKey = safeKind === "env" ? null : sizeKey || "medium";
	const computedSizeValue =
		safeKind === "env"
			? Math.max(1, Math.trunc(Number(envSizeValue) || 1))
			: (SIZE_MAPS[safeKind][computedSizeKey] ?? 1);

	const obj = {
		id: nextId(safeKind[0]),
		kind: safeKind,
		name: String(
			name || (safeKind === "env" ? "Env Cube" : safeKind),
		).trim(),
		pos: {
			x: Math.max(0, Math.trunc(pos?.x ?? 0)),
			y: Math.max(0, Math.trunc(pos?.y ?? 0)),
			z: Math.max(0, Math.trunc(pos?.z ?? 0)),
		},
		sizeKey: computedSizeKey,
		sizeValue: computedSizeValue,
		color:
			color ||
			(safeKind === "env"
				? "#808080"
				: safeKind === "player"
					? "#22c55e"
					: "#ef4444"),
		labelEnabled: Boolean(labelEnabled),

		// Health
		hp,
		hpMax,

		// Ordering (players/enemies use this; env can keep it but UI can hide it)
		order: Number.isFinite(order) ? Math.trunc(order) : nextOrder(),

		// Folder path (null = not in a structure)
		structurePath: normalizeStructurePath(structurePath),
	};

	return ensureHp(obj);
}

export function serializeState() {
	return {
		version: 1,
		map: {
			sizeX: state.map.sizeX,
			sizeY: state.map.sizeY,
			sizeZ: state.map.sizeZ,
		},
		objects: state.objects.map((o) => ({ ...o, pos: { ...o.pos } })),
	};
}

export function normalizeOrders() {
	const list = state.objects.filter(
		(o) => o.kind === "player" || o.kind === "enemy",
	);
	list.sort(sortByOrderThenName);
	for (let i = 0; i < list.length; i++) {
		list[i].order = i + 1;
	}
	_orderCounter = list.length + 1;
}

export function resetOrderCounter() {
	_orderCounter = 1;
}

export function validateAndLoadState(raw) {
	if (!raw || typeof raw !== "object")
		throw new Error("Invalid JSON: expected object");
	if (!raw.map || typeof raw.map !== "object")
		throw new Error("Invalid JSON: missing map");
	if (!Array.isArray(raw.objects))
		throw new Error("Invalid JSON: objects must be an array");

	const sizeX = Math.max(1, Math.trunc(Number(raw.map.sizeX) || 1));
	const sizeY = Math.max(1, Math.trunc(Number(raw.map.sizeY) || 1));
	const sizeZ = Math.max(1, Math.trunc(Number(raw.map.sizeZ) || 1));

	state.version = 1;
	state.map.sizeX = sizeX;
	state.map.sizeY = sizeY;
	state.map.sizeZ = sizeZ;

	state.objects = raw.objects.map((o, idx) => {
		if (!o || typeof o !== "object")
			throw new Error(`Invalid object at index ${idx}`);

		const kind = o.kind === "enemy" || o.kind === "env" ? o.kind : "player";
		const sizeKey =
			kind === "env"
				? null
				: typeof o.sizeKey === "string"
					? o.sizeKey
					: "medium";

		const sizeValue =
			Number.isFinite(o.sizeValue) && o.sizeValue >= 1
				? Math.trunc(o.sizeValue)
				: kind === "env"
					? 1
					: (SIZE_MAPS[kind][sizeKey] ?? 1);

		// Back-compat: if you had structureName/Id before, treat structureName as a top folder
		const legacyStructure =
			typeof o.structurePath === "string"
				? o.structurePath
				: typeof o.structureName === "string"
					? o.structureName
					: null;

		const obj = {
			id: typeof o.id === "string" ? o.id : `obj_${idx}`,
			kind,
			name: typeof o.name === "string" ? o.name : kind,
			pos: {
				x: Math.max(0, Math.trunc(Number(o.pos?.x) || 0)),
				y: Math.max(0, Math.trunc(Number(o.pos?.y) || 0)),
				z: Math.max(0, Math.trunc(Number(o.pos?.z) || 0)),
			},
			sizeKey,
			sizeValue,
			color: typeof o.color === "string" ? o.color : "#808080",
			labelEnabled: Boolean(o.labelEnabled),

			hp: Number.isFinite(o.hp) ? Math.trunc(o.hp) : undefined,
			hpMax: Number.isFinite(o.hpMax) ? Math.trunc(o.hpMax) : undefined,

			order: Number.isFinite(o.order) ? Math.trunc(o.order) : idx + 1,

			structurePath: normalizeStructurePath(legacyStructure),
		};

		return ensureHp(obj);
	});

	// keep counters ahead (best-effort)
	for (const o of state.objects) {
		const m = String(o.id).match(/_(\d+)$/);
		if (m) _idCounter = Math.max(_idCounter, Number(m[1]) + 1);
	}

	normalizeOrders();

	return true;
}

export function clampPosToMap(pos) {
	return {
		x: clampInt(pos.x, 0, state.map.sizeX - 1),
		y: clampInt(pos.y ?? 0, 0, state.map.sizeY - 1),
		z: clampInt(pos.z, 0, state.map.sizeZ - 1),
	};
}

export function isAnchorInBoundsForSize(anchor, sizeValue) {
	const s = Math.max(1, Math.trunc(Number(sizeValue) || 1));
	return (
		anchor.x >= 0 &&
		anchor.y >= 0 &&
		anchor.z >= 0 &&
		anchor.x + s - 1 <= state.map.sizeX - 1 &&
		anchor.y + s - 1 <= state.map.sizeY - 1 &&
		anchor.z + s - 1 <= state.map.sizeZ - 1
	);
}

export function isSpaceFreeAt(anchor, sizeValue, ignoreIds = []) {
	const s = Math.max(1, Math.trunc(Number(sizeValue) || 1));
	if (!isAnchorInBoundsForSize(anchor, s)) return false;

	const ignore = new Set(
		Array.isArray(ignoreIds) ? ignoreIds : [ignoreIds],
	);

	for (const obj of state.objects) {
		if (ignore.has(obj.id)) continue;
		const o = obj.pos;
		const os = Math.max(1, Math.trunc(Number(obj.sizeValue) || 1));

		const overlap =
			anchor.x <= o.x + os - 1 &&
			anchor.x + s - 1 >= o.x &&
			anchor.y <= o.y + os - 1 &&
			anchor.y + s - 1 >= o.y &&
			anchor.z <= o.z + os - 1 &&
			anchor.z + s - 1 >= o.z;

		if (overlap) return false;
	}

	return true;
}

export function findLowestFreeAnchor({ x, z }, sizeValue, ignoreIds = []) {
	const s = Math.max(1, Math.trunc(Number(sizeValue) || 1));
	for (let y = 0; y <= state.map.sizeY - s; y++) {
		const anchor = { x, y, z };
		if (isSpaceFreeAt(anchor, s, ignoreIds)) return anchor;
	}
	return null;
}
