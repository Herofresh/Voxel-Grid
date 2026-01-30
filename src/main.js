// src/main.js
import "./style.css";

import { state, serializeState, validateAndLoadState } from "./state.js";
import { createSceneApp } from "./scene/index.js";
import { mountUI } from "./ui/index.js";
import { loadStateFromLocalStorage, createAutoSaver } from "./persistence.js";

// Restore from localStorage (if present)
loadStateFromLocalStorage({ validateAndLoadState });

// Autosave helper
const autosaver = createAutoSaver({ serializeState, delayMs: 250 });

let ui = null;

const app = createSceneApp({
	// In add mode, click should PLACE.
	// Otherwise it can still be used to set inputs (but we place by default).
	onCellClick: (cell) => ui?.placeCurrentAtCell?.(cell),

	// Click a cube (not in add mode) selects it and opens it in the list
	onObjectClick: (id) => ui?.openObjectById?.(id),

	// Drag a player/enemy to a new anchor position
	onObjectMove: ({ id, pos }) => {
		const obj = state.objects.find((o) => o.id === id);
		if (!obj) return;
		obj.pos = { ...pos };
		app.renderFromState(state);
		autosaver.scheduleSave();
		ui?.refresh?.();
	},
});

// Render initial state
app.renderFromState(state);

ui = mountUI({
	onChange: () => {
		app.renderFromState(state);
		autosaver.scheduleSave();
	},
	onModeChange: (isAdding) => app.setMode({ isAdding }),
	onPreviewChange: (payload) => app.setPlacementPreview(payload),
});
