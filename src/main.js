// src/main.js
import "./style.css";

import { state, serializeState, validateAndLoadState } from "./state.js";
import { createSceneApp } from "./scene/index.js";
import { mountUI } from "./ui/index.js";

import { loadStateFromLocalStorage, createAutoSaver } from "./persistence.js";

// 1) Restore from localStorage (if present)
loadStateFromLocalStorage({ validateAndLoadState });

// 2) Create autosaver
const autosaver = createAutoSaver({ serializeState, delayMs: 250 });

let ui = null;

const app = createSceneApp({
	onCellClick: (cell) => ui?.setPlacementPosition(cell),
});

// Render initial state (restored or default)
app.renderFromState(state);

ui = mountUI({
	onChange: () => {
		app.renderFromState(state);
		autosaver.scheduleSave(); // autosave every change
	},
	onModeChange: (isAdding) => app.setMode({ isAdding }),
	onPreviewChange: ({ sizeValue }) => app.setPlacementPreview({ sizeValue }),
});
