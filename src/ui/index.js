// src/ui/index.js
import { state } from "../state.js";
import { h, divider, styleButton } from "./styles.js";

import { createMapSizePanel } from "./panels/mapSize.js";
import { createObjectListPanel } from "./panels/objectList.js";
import { createAddPanel } from "./panels/add.js";
import { createIOPanel } from "./panels/io.js";
import { createShufflePanel } from "./panels/shuffle.js";

function makeTabButton(label, active = false) {
	const b = h("button", { textContent: label });
	styleButton(b, active ? "primary" : "neutral");
	b.style.width = "auto";
	b.style.flex = "1";
	return b;
}

export function mountUI({ onChange, onModeChange, onPreviewChange } = {}) {
	const root = document.createElement("div");
	root.style.position = "absolute";
	root.style.top = "12px";
	root.style.right = "12px";
	root.style.width = "380px";
	root.style.maxHeight = "calc(100vh - 24px)"; // ✅ never exceed viewport
	root.style.display = "flex"; // ✅ allow internal scrolling layout
	root.style.flexDirection = "column";
	root.style.overflow = "hidden"; // content scrolls instead

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
	title.style.flex = "0 0 auto";

	const tabRow = h("div");
	tabRow.style.display = "flex";
	tabRow.style.gap = "8px";
	tabRow.style.marginBottom = "10px";
	tabRow.style.flex = "0 0 auto";

	const tabObjectsBtn = makeTabButton("Objects", true);
	const tabMapBtn = makeTabButton("Map & JSON", false);
	const tabFeaturesBtn = makeTabButton("Features", false);
	tabRow.append(tabObjectsBtn, tabMapBtn, tabFeaturesBtn);

	// ✅ content area scrolls if too tall
	const content = h("div");
	content.style.flex = "1 1 auto";
	content.style.overflow = "auto";
	content.style.paddingRight = "4px";

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

	const tabObjects = h("div");
	tabObjects.append(objectListPanel.el, divider(), addPanel.el);

	const tabMap = h("div");
	tabMap.append(mapSizePanel.el, divider(), ioPanel.el);

	const tabFeatures = h("div");
	tabFeatures.append(shufflePanel.el);

	function setActive(tabName) {
		content.innerHTML = "";
		if (tabName === "objects") content.appendChild(tabObjects);
		if (tabName === "map") content.appendChild(tabMap);
		if (tabName === "features") content.appendChild(tabFeatures);

		styleButton(
			tabObjectsBtn,
			tabName === "objects" ? "primary" : "neutral",
		);
		styleButton(tabMapBtn, tabName === "map" ? "primary" : "neutral");
		styleButton(
			tabFeaturesBtn,
			tabName === "features" ? "primary" : "neutral",
		);
	}

	tabObjectsBtn.onclick = () => setActive("objects");
	tabMapBtn.onclick = () => setActive("map");
	tabFeaturesBtn.onclick = () => setActive("features");

	setActive("objects");

	function openObjectById(id) {
		setActive("objects");
		objectListPanel.openObject(id);
	}

	root.append(title, tabRow, content);
	document.body.appendChild(root);

	return {
		setPlacementPosition: addPanel.setPlacementPosition,
		placeCurrentAtCell: addPanel.placeCurrentAtCell,
		openObjectById,
	};
}
