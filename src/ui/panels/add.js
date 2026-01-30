// src/ui/panels/add.js
import { h, styleButton, styleInput } from "../styles.js";
import { SIZE_MAPS, createObject } from "../../state.js";

export function createAddPanel({
	state,
	onChange,
	onModeChange,
	onPreviewChange,
} = {}) {
	let activeAddKind = null;
	const posInputsByKind = new Map();

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

	function hpRow(defaultMax = 10) {
		const hpMax = h("input", {
			type: "number",
			min: "1",
			value: String(defaultMax),
		});
		const hp = h("input", {
			type: "number",
			min: "0",
			value: String(defaultMax),
		});
		[hpMax, hp].forEach(styleInput);

		const row = h("div");
		row.style.display = "grid";
		row.style.gridTemplateColumns = "1fr 1fr";
		row.style.gap = "8px";

		row.append(
			h("div", {}, [h("div", { textContent: "HP Max" }), hpMax]),
			h("div", {}, [h("div", { textContent: "HP" }), hp]),
		);

		return { row, hp, hpMax };
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

			onPreviewChange?.({ sizeValue: map[sizeSelect.value] });

			sizeSelect.onchange = () => {
				onPreviewChange?.({ sizeValue: map[sizeSelect.value] });
			};
		} else {
			envSize = h("input", { type: "number", min: "1", value: "1" });
			styleInput(envSize);

			onPreviewChange?.({ sizeValue: 1 });

			envSize.oninput = () => {
				const sizeValue = Math.max(1, Number(envSize.value) || 1);
				onPreviewChange?.({ sizeValue });
			};
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

		const colorRow = h("div");
		colorRow.style.display = "flex";
		colorRow.style.gap = "8px";
		colorRow.style.marginTop = "8px";
		colorRow.style.alignItems = "center";
		colorRow.append(h("div", { textContent: "Color" }), color);

		// Health inputs (env defaults lower)
		const hpDefaults = kind === "env" ? 1 : 10;
		const hpBlock = hpRow(hpDefaults);
		hpBlock.row.style.marginTop = "10px";

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
				hp: Number(hpBlock.hp.value),
				hpMax: Number(hpBlock.hpMax.value),
			});

			state.objects.push(obj);
			onChange?.();
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
			hpBlock.row,
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
		else onPreviewChange?.({ sizeValue: 1 });
	}

	btnAddPlayer.onclick = () => setActiveAddKind("player");
	btnAddEnemy.onclick = () => setActiveAddKind("enemy");
	btnAddEnv.onclick = () => setActiveAddKind("env");

	function setPlacementPosition(cell) {
		if (!activeAddKind) return;
		const inputs = posInputsByKind.get(activeAddKind);
		if (!inputs) return;

		const c = clampToBounds(cell.x, cell.y, cell.z);
		inputs.x.value = String(c.x);
		inputs.y.value = String(c.y);
		inputs.z.value = String(c.z);
	}

	const el = h("div", {}, [addButtonsHeader, btnRow, addPanel]);

	return {
		el,
		setPlacementPosition,
	};
}
