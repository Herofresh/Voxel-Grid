// src/ui.js

import {
	state,
	SIZE_MAPS,
	createObject,
	serializeState,
	validateAndLoadState,
} from "./state.js";

function styleInput(el) {
	el.style.width = "100%";
	el.style.boxSizing = "border-box";
	el.style.padding = "6px 8px";
	el.style.borderRadius = "8px";
	el.style.border = "1px solid rgba(255,255,255,0.15)";
	el.style.background = "rgba(255,255,255,0.08)";
	el.style.color = "white";
	el.style.outline = "none";
}

function styleButton(btn) {
	btn.style.width = "100%";
	btn.style.padding = "8px 10px";
	btn.style.borderRadius = "10px";
	btn.style.border = "1px solid rgba(255,255,255,0.18)";
	btn.style.background = "rgba(255,255,255,0.10)";
	btn.style.color = "white";
	btn.style.cursor = "pointer";
}

function h(tag, props = {}, children = []) {
	const el = document.createElement(tag);
	Object.assign(el, props);
	for (const c of children) el.appendChild(c);
	return el;
}

export function mountUI({ onChange } = {}) {
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

	// ----------------------------
	// Map size section
	// ----------------------------
	const mapSection = h("div");
	mapSection.style.marginBottom = "12px";

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
	styleButton(applyGrid);
	applyGrid.style.marginTop = "8px";
	applyGrid.onclick = () => {
		state.map.sizeX = Math.max(1, Math.trunc(Number(gx.value) || 1));
		state.map.sizeY = Math.max(1, Math.trunc(Number(gy.value) || 1));
		state.map.sizeZ = Math.max(1, Math.trunc(Number(gz.value) || 1));
		onChange?.();
		refreshObjectList();
	};

	mapSection.append(mapHeader, gridRow, applyGrid);

	// Divider helper
	const divider = () => {
		const hr = document.createElement("hr");
		hr.style.border = "none";
		hr.style.height = "1px";
		hr.style.background = "rgba(255,255,255,0.12)";
		hr.style.margin = "12px 0";
		return hr;
	};

	// ----------------------------
	// Generic fields
	// ----------------------------
	function posRow(prefix) {
		const x = h("input", { type: "number", placeholder: "x" });
		const y = h("input", { type: "number", placeholder: "y" });
		const z = h("input", { type: "number", placeholder: "z" });
		[x, y, z].forEach(styleInput);

		const row = h("div");
		row.style.display = "grid";
		row.style.gridTemplateColumns = "1fr 1fr 1fr";
		row.style.gap = "8px";
		row.append(x, y, z);

		return { row, x, y, z };
	}

	function withinBounds(x, y, z) {
		return (
			x >= 0 &&
			x < state.map.sizeX &&
			y >= 0 &&
			y < state.map.sizeY &&
			z >= 0 &&
			z < state.map.sizeZ
		);
	}

	function clampToBounds(x, y, z) {
		const cx = Math.max(0, Math.min(state.map.sizeX - 1, x));
		const cy = Math.max(0, Math.min(state.map.sizeY - 1, y));
		const cz = Math.max(0, Math.min(state.map.sizeZ - 1, z));
		return { x: cx, y: cy, z: cz };
	}

	// ----------------------------
	// Add Player
	// ----------------------------
	function createAddSection({ kind }) {
		const section = h("div");
		const header = h("div", {
			textContent: `Add ${kind === "env" ? "Environment" : kind}`,
		});
		header.style.fontWeight = "700";
		header.style.marginBottom = "6px";

		const name = h("input", { placeholder: "Name" });
		styleInput(name);

		let sizeSelect = null;
		let envSize = null;

		if (kind === "player" || kind === "enemy") {
			sizeSelect = h("select");
			styleInput(sizeSelect);

			const map = SIZE_MAPS[kind];
			for (const key of Object.keys(map)) {
				const opt = h("option", {
					value: key,
					textContent: `${key} (→ ${map[key]})`,
				});
				sizeSelect.appendChild(opt);
			}
		} else {
			envSize = h("input", { type: "number", min: "1", value: "1" });
			styleInput(envSize);
		}

		const { row: pos, x, y, z } = posRow(kind);

		const labelRow = h("label");
		labelRow.style.display = "flex";
		labelRow.style.alignItems = "center";
		labelRow.style.gap = "8px";
		labelRow.style.marginTop = "6px";

		const labelEnabled = h("input", { type: "checkbox" });
		const labelText = h("span", { textContent: "Static label" });
		labelRow.append(labelEnabled, labelText);

		const colorRow = h("div");
		colorRow.style.display = "flex";
		colorRow.style.gap = "8px";
		colorRow.style.marginTop = "8px";
		colorRow.style.alignItems = "center";

		const color = h("input", {
			type: "color",
			value:
				kind === "env"
					? "#808080"
					: kind === "player"
						? "#22c55e"
						: "#ef4444",
		});
		// color input gets its own style naturally
		color.style.width = "50%";
		color.style.height = "34px";
		color.style.borderRadius = "10px";
		color.style.border = "1px solid rgba(255,255,255,0.18)";
		color.style.background = "transparent";

		const colorLabel = h("div", { textContent: "Color" });
		colorLabel.style.opacity = "0.9";
		colorLabel.style.width = "50%";

		colorRow.append(colorLabel, color);

		const warn = h("div", { textContent: "" });
		warn.style.marginTop = "6px";
		warn.style.opacity = "0.85";
		warn.style.fontSize = "12px";
		warn.style.color = "rgba(255,255,255,0.75)";

		const addBtn = h("button", {
			textContent: `Add ${kind === "env" ? "Environment" : kind}`,
		});
		styleButton(addBtn);
		addBtn.style.marginTop = "8px";

		addBtn.onclick = () => {
			const px = Math.trunc(Number(x.value) || 0);
			const py = Math.trunc(Number(y.value) || 0);
			const pz = Math.trunc(Number(z.value) || 0);

			// keep placement inside bounds (you asked for 0..size-1)
			const clamped = clampToBounds(px, py, pz);
			if (!withinBounds(px, py, pz)) {
				warn.textContent = `Position clamped to (${clamped.x}, ${clamped.y}, ${clamped.z}) within map bounds.`;
			} else {
				warn.textContent = "";
			}

			const obj = createObject({
				kind,
				name: name.value,
				sizeKey: sizeSelect?.value,
				envSizeValue: envSize?.value,
				color: color.value,
				pos: clamped,
				labelEnabled: labelEnabled.checked,
			});

			state.objects.push(obj);
			onChange?.();
			refreshObjectList();
		};

		section.append(header, name);

		if (sizeSelect) {
			const sLabel = h("div", { textContent: "Size" });
			sLabel.style.marginTop = "8px";
			sLabel.style.opacity = "0.9";
			section.append(sLabel, sizeSelect);
		}
		if (envSize) {
			const sLabel = h("div", { textContent: "Size (integer ≥ 1)" });
			sLabel.style.marginTop = "8px";
			sLabel.style.opacity = "0.9";
			section.append(sLabel, envSize);
		}

		const pLabel = h("div", { textContent: "Position (x,y,z)" });
		pLabel.style.marginTop = "8px";
		pLabel.style.opacity = "0.9";

		section.append(pLabel, pos, labelRow, colorRow, warn, addBtn);
		return section;
	}

	const addPlayer = createAddSection({ kind: "player" });
	const addEnemy = createAddSection({ kind: "enemy" });
	const addEnv = createAddSection({ kind: "env" });

	// ----------------------------
	// Object list + delete
	// ----------------------------
	const listHeader = h("div", { textContent: "Placed Objects" });
	listHeader.style.fontWeight = "800";
	listHeader.style.marginBottom = "8px";

	const list = h("div");
	list.style.display = "flex";
	list.style.flexDirection = "column";
	list.style.gap = "8px";

	function refreshObjectList() {
		list.innerHTML = "";

		if (state.objects.length === 0) {
			const empty = h("div", { textContent: "No objects placed yet." });
			empty.style.opacity = "0.75";
			list.appendChild(empty);
			return;
		}

		for (const obj of state.objects) {
			const row = h("div");
			row.style.padding = "10px";
			row.style.borderRadius = "12px";
			row.style.border = "1px solid rgba(255,255,255,0.12)";
			row.style.background = "rgba(255,255,255,0.06)";

			const top = h("div");
			top.style.display = "flex";
			top.style.justifyContent = "space-between";
			top.style.gap = "10px";

			const left = h("div");
			const kind = obj.kind.toUpperCase();
			const sizePart =
				obj.kind === "env"
					? `size ${obj.sizeValue}`
					: `${obj.sizeKey} → ${obj.sizeValue}`;
			left.textContent = `${kind}: ${obj.name} • ${sizePart}`;

			const del = h("button", { textContent: "Delete" });
			del.style.padding = "6px 10px";
			del.style.borderRadius = "10px";
			del.style.border = "1px solid rgba(255,255,255,0.18)";
			del.style.background = "rgba(255,80,80,0.18)";
			del.style.color = "white";
			del.style.cursor = "pointer";

			del.onclick = () => {
				const idx = state.objects.findIndex((o) => o.id === obj.id);
				if (idx >= 0) state.objects.splice(idx, 1);
				onChange?.();
				refreshObjectList();
			};

			top.append(left, del);

			const bottom = h("div");
			bottom.style.marginTop = "6px";
			bottom.style.opacity = "0.85";
			bottom.style.fontSize = "12px";
			bottom.textContent = `pos (${obj.pos.x}, ${obj.pos.y}, ${obj.pos.z}) • color ${obj.color} • label ${
				obj.labelEnabled ? "on" : "off"
			}`;

			row.append(top, bottom);
			list.appendChild(row);
		}
	}

	// ----------------------------
	// Export / Import JSON
	// ----------------------------
	const ioHeader = h("div", { textContent: "Save / Load" });
	ioHeader.style.fontWeight = "800";
	ioHeader.style.marginBottom = "8px";

	const exportBtn = h("button", { textContent: "Download JSON" });
	styleButton(exportBtn);

	exportBtn.onclick = () => {
		const json = JSON.stringify(serializeState(), null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = "map.json";
		a.click();

		URL.revokeObjectURL(url);
	};

	const copyBtn = h("button", { textContent: "Copy JSON to Clipboard" });
	styleButton(copyBtn);
	copyBtn.style.marginTop = "8px";
	copyBtn.onclick = async () => {
		const json = JSON.stringify(serializeState(), null, 2);
		await navigator.clipboard.writeText(json);
		copyBtn.textContent = "Copied!";
		setTimeout(() => (copyBtn.textContent = "Copy JSON to Clipboard"), 900);
	};

	const importLabel = h("div", { textContent: "Import JSON file" });
	importLabel.style.marginTop = "10px";
	importLabel.style.opacity = "0.9";

	const importInput = h("input", {
		type: "file",
		accept: "application/json",
	});
	importInput.style.marginTop = "6px";
	importInput.style.width = "100%";

	const importStatus = h("div", { textContent: "" });
	importStatus.style.marginTop = "6px";
	importStatus.style.fontSize = "12px";
	importStatus.style.opacity = "0.85";

	importInput.onchange = () => {
		const file = importInput.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			try {
				const parsed = JSON.parse(String(reader.result));
				validateAndLoadState(parsed);
				importStatus.textContent = "Loaded!";
				onChange?.();
				refreshObjectList();

				// update grid inputs too
				gx.value = String(state.map.sizeX);
				gy.value = String(state.map.sizeY);
				gz.value = String(state.map.sizeZ);
			} catch (e) {
				importStatus.textContent = `Import failed: ${e?.message ?? e}`;
			}
		};
		reader.readAsText(file);
	};

	// Initial render of list
	refreshObjectList();

	root.append(
		title,
		mapSection,
		divider(),
		addPlayer,
		divider(),
		addEnemy,
		divider(),
		addEnv,
		divider(),
		listHeader,
		list,
		divider(),
		ioHeader,
		exportBtn,
		copyBtn,
		importLabel,
		importInput,
		importStatus,
	);

	document.body.appendChild(root);

	return {
		refreshObjectList,
	};
}
