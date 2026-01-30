// src/main.js
import { state } from "./state.js";
import { createSceneApp } from "./scene/index.js";
import { mountUI } from "./ui/index.js";

let ui = null;

const app = createSceneApp({
	onCellClick: (cell) => ui?.setPlacementPosition(cell),
});

app.renderFromState(state);

ui = mountUI({
	onChange: () => app.renderFromState(state),
	onModeChange: (isAdding) => app.setMode({ isAdding }),
	onPreviewChange: ({ sizeValue }) => app.setPlacementPreview({ sizeValue }),
});
