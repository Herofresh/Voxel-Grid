// src/persistence.js
const STORAGE_KEY = "voxel-map-editor:state:v1";

export function loadStateFromLocalStorage({ validateAndLoadState }) {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return false;

		const parsed = JSON.parse(raw);
		validateAndLoadState(parsed);
		return true;
	} catch (err) {
		console.warn("[persistence] Failed to load state, ignoring:", err);
		return false;
	}
}

export function createAutoSaver({ serializeState, delayMs = 250 }) {
	let timer = null;

	function saveNow() {
		try {
			const snapshot = serializeState();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
		} catch (err) {
			console.warn("[persistence] Failed to save state:", err);
		}
	}

	function scheduleSave() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(saveNow, delayMs);
	}

	function clearSaved() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {}
	}

	return { saveNow, scheduleSave, clearSaved };
}
