// src/main.js

import { state } from "./state.js";
import { createSceneApp } from "./scene.js";
import { mountUI } from "./ui.js";

// Create 3D app
const app = createSceneApp();

// Render initial
app.renderFromState(state);

// Mount UI
mountUI({
	onChange: () => {
		app.renderFromState(state);
	},
});
