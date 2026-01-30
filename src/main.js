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
	onCellClick: (cell) => ui?.setPlacementPosition(cell),
	onObjectClick: (id) => ui?.openObjectById(id),
});

// Render initial (restored or default) state
app.renderFromState(state);

ui = mountUI({
	onChange: () => {
		app.renderFromState(state);
		autosaver.scheduleSave();
	},
	onModeChange: (isAdding) => app.setMode({ isAdding }),
	onPreviewChange: ({ sizeValue }) => app.setPlacementPreview({ sizeValue }),
});
