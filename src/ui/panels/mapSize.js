// src/ui/panels/mapSize.js
import { h, styleButton, styleInput } from "../styles.js";

export function createMapSizePanel({ state, onApply }) {
	const mapHeader = h("div", { textContent: "Map Size (integer grid)" });
	mapHeader.style.fontWeight = "700";
	mapHeader.style.marginBottom = "6px";

	const gx = h("input", {
		type: "number",
		min: "1",
		value: String(state.map.sizeX),
	});
	const gy = h("input", {
		type: "number",
		min: "1",
		value: String(state.map.sizeY),
	});
	const gz = h("input", {
		type: "number",
		min: "1",
		value: String(state.map.sizeZ),
	});
	[gx, gy, gz].forEach(styleInput);

	const gridRow = h("div");
	gridRow.style.display = "grid";
	gridRow.style.gridTemplateColumns = "1fr 1fr 1fr";
	gridRow.style.gap = "8px";
	gridRow.append(gx, gy, gz);

	const applyGrid = h("button", { textContent: "Apply Map Size" });
	styleButton(applyGrid, "primary");
	applyGrid.style.marginTop = "8px";
	applyGrid.onclick = () => {
		state.map.sizeX = Math.max(1, Math.trunc(Number(gx.value) || 1));
		state.map.sizeY = Math.max(1, Math.trunc(Number(gy.value) || 1));
		state.map.sizeZ = Math.max(1, Math.trunc(Number(gz.value) || 1));
		onApply?.();
	};

	function syncFromState() {
		gx.value = String(state.map.sizeX);
		gy.value = String(state.map.sizeY);
		gz.value = String(state.map.sizeZ);
	}

	const el = h("div", {}, [mapHeader, gridRow, applyGrid]);
	return { el, syncFromState };
}
