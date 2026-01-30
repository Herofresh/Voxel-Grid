// src/ui/index.js
import { state } from "../state.js";
import { h, divider } from "./styles.js";

import { createMapSizePanel } from "./panels/mapSize.js";
import { createObjectListPanel } from "./panels/objectList.js";
import { createAddPanel } from "./panels/add.js";
import { createIOPanel } from "./panels/io.js";
import { createShufflePanel } from "./panels/shuffle.js";

export function mountUI({ onChange, onModeChange, onPreviewChange } = {}) {
	const root = document.createElement("div");
	root.style.position = "absolute";
	root.style.top = "12px";
	root.style.right = "12px";
	root.style.width = "360px";
	root.style.maxHeight = "calc(100vh - 24px)";
	root.style.overflow = "auto";
	root.style.padding = "12px";
	root.style.borderRadius = "14px";
	root.style.background = "rgba(0,0,0,0.62)";
	root.style.color = "white";
	root.style.font =
		"14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
	root.style.backdropFilter = "blur(8px)";
	root.style.zIndex = "10";

	const title = h("div", { textContent: "Map Editor" });
	title.style.fontWeight = "800";
	title.style.fontSize = "16px";
	title.style.marginBottom = "10px";

	const mapSizePanel = createMapSizePanel({
		state,
		onApply: () => {
			onChange?.();
			objectListPanel.refresh();
		},
	});

	const objectListPanel = createObjectListPanel({
		state,
		onDelete: () => {
			onChange?.();
			objectListPanel.refresh();
		},
		onChange: () => {
			onChange?.();
			objectListPanel.refresh();
		},
	});

	const addPanel = createAddPanel({
		state,
		onChange: () => {
			onChange?.();
			objectListPanel.refresh();
		},
		onModeChange,
		onPreviewChange,
	});

	const shufflePanel = createShufflePanel({
		state,
		onChange: () => {
			onChange?.();
			objectListPanel.refresh();
		},
	});

	const ioPanel = createIOPanel({
		state,
		onImported: () => {
			mapSizePanel.syncFromState();
			onChange?.();
			objectListPanel.refresh();
		},
	});

	root.append(
		title,
		mapSizePanel.el,
		divider(),
		objectListPanel.el,
		divider(),
		addPanel.el,
		divider(),
		shufflePanel.el,
		divider(),
		ioPanel.el,
	);

	document.body.appendChild(root);

	return {
		setPlacementPosition: addPanel.setPlacementPosition,
	};
}
