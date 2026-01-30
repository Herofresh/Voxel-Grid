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

function styleButton(btn, variant = "neutral") {
	btn.style.width = "100%";
	btn.style.padding = "8px 10px";
	btn.style.borderRadius = "10px";
	btn.style.border = "1px solid rgba(255,255,255,0.18)";
	btn.style.color = "white";
	btn.style.cursor = "pointer";

	if (variant === "danger") btn.style.background = "rgba(255,80,80,0.18)";
	else if (variant === "primary")
		btn.style.background = "rgba(120,180,255,0.18)";
	else btn.style.background = "rgba(255,255,255,0.10)";
}

function h(tag, props = {}, children = []) {
	const el = document.createElement(tag);
	Object.assign(el, props);
	for (const c of children) el.appendChild(c);
	return el;
}

export function mountUI({ onChange, onModeChange } = {}) {
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

	const divider = () => {
		const hr = document.createElement("hr");
		hr.style.border = "none";
		hr.style.height = "1px";
		hr.style.background = "rgba(255,255,255,0.12)";
		hr.style.margin = "12px 0";
		return hr;
	};

	const title = h("div", { textContent: "Map Editor" });
	title.style.fontWeight = "800";
	title.style.fontSize = "16px";
	title.style.marginBottom = "10px";

	// ----------------------------
	// Map size
	// ----------------------------
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
		onChange?.();
		refreshObjectList();
	};

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
			styleButton(del, "danger");
			del.style.width = "auto";

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
			bottom.textContent = `pos (${obj.pos.x}, ${obj.pos.y}, ${obj.pos.z}) • color ${obj.color} • label ${obj.labelEnabled ? "on" : "off"}`;

			row.append(top, bottom);
			list.appendChild(row);
		}
	}

	// ----------------------------
	// Add mode (single form at a time)
	// ----------------------------
	let activeAddKind = null; // "player"|"enemy"|"env"|null

	const addButtonsHeader = h("div", { textContent: "Add…" });
	addButtonsHeader.style.fontWeight = "800";
	addButtonsHeader.style.marginBottom = "8px";

	const btnRow = h("div");
	btnRow.style.display = "grid";
	btnRow.style.gridTemplateColumns = "1fr 1fr 1fr";
	btnRow.style.gap = "8px";

	const btnAddPlayer = h("button", { textContent: "Player" });
	const btnAddEnemy = h("button", { textContent: "Enemy" });
	const btnAddEnv = h("button", { textContent: "Env" });
	[btnAddPlayer, btnAddEnemy, btnAddEnv].forEach((b) =>
		styleButton(b, "primary"),
	);

	btnRow.append(btnAddPlayer, btnAddEnemy, btnAddEnv);

	const addPanel = h("div");
	addPanel.style.display = "none";

	// Position inputs for click-to-place
	const posInputsByKind = new Map();

	function clampToBounds(x, y, z) {
		return {
			x: Math.max(0, Math.min(state.map.sizeX - 1, x)),
			y: Math.max(0, Math.min(state.map.sizeY - 1, y)),
			z: Math.max(0, Math.min(state.map.sizeZ - 1, z)),
		};
	}

	function posRow(kind) {
		const x = h("input", { type: "number", placeholder: "x" });
		const y = h("input", { type: "number", placeholder: "y", value: "0" });
		const z = h("input", { type: "number", placeholder: "z" });
		[x, y, z].forEach(styleInput);

		const row = h("div");
		row.style.display = "grid";
		row.style.gridTemplateColumns = "1fr 1fr 1fr";
		row.style.gap = "8px";
		row.append(x, y, z);

		posInputsByKind.set(kind, { x, y, z });
		return row;
	}

	function buildAddForm(kind) {
		addPanel.innerHTML = "";

		const header = h("div", {
			textContent: `Adding ${kind.toUpperCase()} (click grid to fill position)`,
		});
		header.style.fontWeight = "800";
		header.style.marginBottom = "8px";

		const name = h("input", { placeholder: "Name" });
		styleInput(name);

		let sizeSelect = null;
		let envSize = null;

		if (kind === "player" || kind === "enemy") {
			sizeSelect = h("select");
			styleInput(sizeSelect);
			const map = SIZE_MAPS[kind];
			for (const key of Object.keys(map)) {
				sizeSelect.appendChild(
					h("option", {
						value: key,
						textContent: `${key} (→ ${map[key]})`,
					}),
				);
			}
		} else {
			envSize = h("input", { type: "number", min: "1", value: "1" });
			styleInput(envSize);
		}

		const posLabel = h("div", { textContent: "Position (x,y,z)" });
		posLabel.style.marginTop = "8px";
		posLabel.style.opacity = "0.9";

		const pos = posRow(kind);

		const labelRow = h("label");
		labelRow.style.display = "flex";
		labelRow.style.alignItems = "center";
		labelRow.style.gap = "8px";
		labelRow.style.marginTop = "6px";
		const labelEnabled = h("input", { type: "checkbox" });
		labelRow.append(
			labelEnabled,
			h("span", { textContent: "Static label" }),
		);

		const colorRow = h("div");
		colorRow.style.display = "flex";
		colorRow.style.gap = "8px";
		colorRow.style.marginTop = "8px";
		colorRow.style.alignItems = "center";

		const defaultColor =
			kind === "env"
				? "#808080"
				: kind === "player"
					? "#22c55e"
					: "#ef4444";
		const color = h("input", { type: "color", value: defaultColor });
		color.style.width = "50%";
		color.style.height = "34px";
		color.style.borderRadius = "10px";
		color.style.border = "1px solid rgba(255,255,255,0.18)";
		color.style.background = "transparent";
		colorRow.append(h("div", { textContent: "Color" }), color);

		const warn = h("div", { textContent: "" });
		warn.style.marginTop = "6px";
		warn.style.opacity = "0.85";
		warn.style.fontSize = "12px";

		const addBtn = h("button", {
			textContent: `Place ${kind.toUpperCase()}`,
		});
		styleButton(addBtn, "primary");
		addBtn.style.marginTop = "10px";

		addBtn.onclick = () => {
			const inputs = posInputsByKind.get(kind);
			const px = Math.trunc(Number(inputs.x.value) || 0);
			const py = Math.trunc(Number(inputs.y.value) || 0);
			const pz = Math.trunc(Number(inputs.z.value) || 0);
			const clamped = clampToBounds(px, py, pz);

			if (clamped.x !== px || clamped.y !== py || clamped.z !== pz) {
				warn.textContent = `Clamped to (${clamped.x}, ${clamped.y}, ${clamped.z})`;
			} else warn.textContent = "";

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

		const closeBtn = h("button", { textContent: "Done" });
		styleButton(closeBtn);
		closeBtn.style.marginTop = "8px";
		closeBtn.onclick = () => setActiveAddKind(null);

		addPanel.append(header, name);

		if (sizeSelect) {
			const sLabel = h("div", { textContent: "Size" });
			sLabel.style.marginTop = "8px";
			addPanel.append(sLabel, sizeSelect);
		}
		if (envSize) {
			const sLabel = h("div", { textContent: "Size (integer ≥ 1)" });
			sLabel.style.marginTop = "8px";
			addPanel.append(sLabel, envSize);
		}

		addPanel.append(
			posLabel,
			pos,
			labelRow,
			colorRow,
			warn,
			addBtn,
			closeBtn,
		);
	}

	function setActiveAddKind(kind) {
		activeAddKind = kind;

		const isAdding = Boolean(activeAddKind);
		addPanel.style.display = isAdding ? "block" : "none";
		onModeChange?.(isAdding);

		if (isAdding) buildAddForm(activeAddKind);
	}

	btnAddPlayer.onclick = () => setActiveAddKind("player");
	btnAddEnemy.onclick = () => setActiveAddKind("enemy");
	btnAddEnv.onclick = () => setActiveAddKind("env");

	function getActiveAddKind() {
		return activeAddKind;
	}

	function setPlacementPosition(cell) {
		const kind = getActiveAddKind();
		if (!kind) return;

		const inputs = posInputsByKind.get(kind);
		if (!inputs) return;

		const c = clampToBounds(cell.x, cell.y, cell.z);
		inputs.x.value = String(c.x);
		inputs.y.value = String(c.y);
		inputs.z.value = String(c.z);
	}

	// ----------------------------
	// Export / import
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

	const importLabel = h("div", { textContent: "Import JSON file" });
	importLabel.style.opacity = "0.9";
	importLabel.style.marginTop = "10px";

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
				validateAndLoadState(JSON.parse(String(reader.result)));
				importStatus.textContent = "Loaded!";
				gx.value = String(state.map.sizeX);
				gy.value = String(state.map.sizeY);
				gz.value = String(state.map.sizeZ);
				onChange?.();
				refreshObjectList();
			} catch (e) {
				importStatus.textContent = `Import failed: ${e?.message ?? e}`;
			}
		};
		reader.readAsText(file);
	};

	// Init list
	refreshObjectList();

	root.append(
		title,
		mapHeader,
		gridRow,
		applyGrid,
		divider(),
		listHeader,
		list,
		divider(),
		addButtonsHeader,
		btnRow,
		addPanel,
		divider(),
		ioHeader,
		exportBtn,
		importLabel,
		importInput,
		importStatus,
	);

	document.body.appendChild(root);

	return {
		refreshObjectList,
		setPlacementPosition,
		getIsAdding: () => Boolean(activeAddKind),
	};
}
