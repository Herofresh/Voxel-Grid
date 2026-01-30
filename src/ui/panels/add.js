// src/ui/panels/add.js
import { h, styleButton, styleInput } from "../styles.js";
import {
	SIZE_MAPS,
	createObject,
	findLowestFreeAnchor,
	isSpaceFreeAt,
} from "../../state.js";

function clampInt(v, min, max) {
	const n = Math.trunc(Number(v) || 0);
	return Math.max(min, Math.min(max, n));
}

export function createAddPanel({
	state,
	onChange,
	onModeChange,
	onPreviewChange,
} = {}) {
	let activeAddKind = null;
	let currentForm = null;

	const addButtonsHeader = h("div", { textContent: "Add…" });
	addButtonsHeader.style.fontWeight = "800";
	addButtonsHeader.style.marginBottom = "8px";

	const btnRow = h("div");
	btnRow.style.display = "grid";
	btnRow.style.gridTemplateColumns = "1fr 1fr 1fr";
	btnRow.style.gap = "8px";

	const btnAddPlayer = h("button", { textContent: "Player" });
	const btnAddEnemy = h("button", { textContent: "Enemy" });
	const btnAddEnv = h("button", { textContent: "Env (Folder)" });
	[btnAddPlayer, btnAddEnemy, btnAddEnv].forEach((b) =>
		styleButton(b, "primary"),
	);
	btnRow.append(btnAddPlayer, btnAddEnemy, btnAddEnv);

	const addPanel = h("div");
	addPanel.style.display = "none";

	function clampToBounds(pos) {
		return {
			x: clampInt(pos.x, 0, state.map.sizeX - 1),
			y: clampInt(pos.y ?? 0, 0, state.map.sizeY - 1),
			z: clampInt(pos.z, 0, state.map.sizeZ - 1),
		};
	}

	function withinMap(x, y, z) {
		return (
			x >= 0 &&
			y >= 0 &&
			z >= 0 &&
			x < state.map.sizeX &&
			y < state.map.sizeY &&
			z < state.map.sizeZ
		);
	}

	function buildAddForm(kind) {
		addPanel.innerHTML = "";
		currentForm = null;

		const header = h("div", {
			textContent: `Add mode: Click the grid to place ${kind.toUpperCase()}`,
		});
		header.style.fontWeight = "800";
		header.style.marginBottom = "8px";

		const name = h("input", {
			placeholder: kind === "env" ? "Cube name (e.g. Wall)" : "Name",
		});
		styleInput(name);

		const posLabel = h("div", { textContent: "Anchor position (x,y,z)" });
		posLabel.style.marginTop = "8px";
		posLabel.style.opacity = "0.9";

		const x = h("input", { type: "number", placeholder: "x", value: "0" });
		const y = h("input", { type: "number", placeholder: "y", value: "0" });
		const z = h("input", { type: "number", placeholder: "z", value: "0" });
		[x, y, z].forEach(styleInput);

		const posRow = h("div");
		posRow.style.display = "grid";
		posRow.style.gridTemplateColumns = "1fr 1fr 1fr";
		posRow.style.gap = "8px";
		posRow.append(x, y, z);

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

		const hpMax = h("input", {
			type: "number",
			min: "1",
			value: String(kind === "env" ? 1 : 10),
		});
		const hp = h("input", {
			type: "number",
			min: "0",
			value: String(kind === "env" ? 1 : 10),
		});
		[hpMax, hp].forEach(styleInput);

		const hpGrid = h("div");
		hpGrid.style.display = "grid";
		hpGrid.style.gridTemplateColumns = "1fr 1fr";
		hpGrid.style.gap = "8px";
		hpGrid.style.marginTop = "10px";
		hpGrid.append(
			h("div", {}, [h("div", { textContent: "HP Max" }), hpMax]),
			h("div", {}, [h("div", { textContent: "HP" }), hp]),
		);

		let sizeSelect = null;

		let structurePath = null;
		let dxIn = null,
			dyIn = null,
			dzIn = null;

		function readDims() {
			return {
				x: Math.max(1, Math.trunc(Number(dxIn?.value) || 1)),
				y: Math.max(1, Math.trunc(Number(dyIn?.value) || 1)),
				z: Math.max(1, Math.trunc(Number(dzIn?.value) || 1)),
			};
		}

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
			sizeSelect.onchange = () =>
				onPreviewChange?.({ sizeValue: map[sizeSelect.value] });
		} else {
			// ENV: folder path + dims drive preview
			structurePath = h("input", {
				placeholder: "Structure folder path (e.g. Castle/Walls/North)",
			});
			styleInput(structurePath);

			dxIn = h("input", { type: "number", min: "1", value: "3" });
			dyIn = h("input", { type: "number", min: "1", value: "2" });
			dzIn = h("input", { type: "number", min: "1", value: "3" });
			[dxIn, dyIn, dzIn].forEach(styleInput);

			const dimGrid = h("div");
			dimGrid.style.display = "grid";
			dimGrid.style.gridTemplateColumns = "1fr 1fr 1fr";
			dimGrid.style.gap = "8px";
			dimGrid.append(
				h("div", {}, [h("div", { textContent: "dx" }), dxIn]),
				h("div", {}, [h("div", { textContent: "dy" }), dyIn]),
				h("div", {}, [h("div", { textContent: "dz" }), dzIn]),
			);

			const dimWrap = h("div");
			dimWrap.style.marginTop = "10px";
			dimWrap.append(
				h("div", { textContent: "Dimensions (in cubes)" }),
				dimGrid,
			);

			addPanel.append(
				h("div", {
					textContent: "Structure folders",
					style: "margin-top:8px; font-weight:700",
				}),
				structurePath,
				dimWrap,
			);

			// initial preview + live updates
			onPreviewChange?.({ dims: readDims() });
			const updatePreview = () => onPreviewChange?.({ dims: readDims() });
			dxIn.addEventListener("input", updatePreview);
			dyIn.addEventListener("input", updatePreview);
			dzIn.addEventListener("input", updatePreview);
		}

		const warn = h("div", { textContent: "" });
		warn.style.marginTop = "6px";
		warn.style.opacity = "0.85";
		warn.style.fontSize = "12px";

		function readAnchor() {
			return clampToBounds({
				x: Math.trunc(Number(x.value) || 0),
				y: Math.trunc(Number(y.value) || 0),
				z: Math.trunc(Number(z.value) || 0),
			});
		}

		function placeAtAnchor(anchor) {
			if (kind === "env") {
				const folder = (structurePath?.value || "").trim();
				const cubeName = (name.value || "Env Cube").trim();

				const dims = readDims();
				const nx = dims.x,
					ny = dims.y,
					nz = dims.z;

				let placed = 0;
				let skipped = 0;
				let blocked = 0;

				for (let ox = 0; ox < nx; ox++) {
					for (let oy = 0; oy < ny; oy++) {
						for (let oz = 0; oz < nz; oz++) {
							const px = anchor.x + ox;
							const py = anchor.y + oy;
							const pz = anchor.z + oz;

							if (!withinMap(px, py, pz)) {
								skipped += 1;
								continue;
							}

							if (
								!isSpaceFreeAt(
									{ x: px, y: py, z: pz },
									1,
								)
							) {
								blocked += 1;
								continue;
							}

							state.objects.push(
								createObject({
									kind: "env",
									name: cubeName,
									pos: { x: px, y: py, z: pz },
									color: color.value,
									labelEnabled: labelEnabled.checked,
									envSizeValue: 1,
									hp: Number(hp.value),
									hpMax: Number(hpMax.value),
									structurePath: folder || null,
								}),
							);

							placed += 1;
						}
					}
				}

				warn.textContent =
					skipped > 0 || blocked > 0
						? `Placed ${placed} cubes, skipped ${skipped} (out of bounds), blocked ${blocked} (occupied).`
						: `Placed ${placed} cubes.`;

				onChange?.();
				return;
			}

			const map = SIZE_MAPS[kind];
			const sizeValue = map[sizeSelect.value];
			const candidate = findLowestFreeAnchor(
				{ x: anchor.x, z: anchor.z },
				sizeValue,
			);
			if (!candidate) {
				warn.textContent =
					"No free space at that X/Z (blocked or out of bounds).";
				return;
			}

			state.objects.push(
				createObject({
					kind,
					name: name.value,
					sizeKey: sizeSelect?.value,
					color: color.value,
					pos: candidate,
					labelEnabled: labelEnabled.checked,
					hp: Number(hp.value),
					hpMax: Number(hpMax.value),
				}),
			);

			x.value = String(candidate.x);
			y.value = String(candidate.y);
			z.value = String(candidate.z);

			warn.textContent = "";
			onChange?.();
		}

		const actions = h("div");
		actions.style.display = "grid";
		actions.style.gridTemplateColumns = "1fr 1fr";
		actions.style.gap = "8px";
		actions.style.marginTop = "10px";
		actions.style.position = "sticky";
		actions.style.bottom = "0";
		actions.style.paddingTop = "8px";
		actions.style.background =
			"linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.55))";

		const placeBtn = h("button", {
			textContent:
				kind === "env" ? "Place cubes" : `Place ${kind.toUpperCase()}`,
		});
		styleButton(placeBtn, "primary");
		placeBtn.onclick = () => placeAtAnchor(readAnchor());

		const doneBtn = h("button", { textContent: "Done" });
		styleButton(doneBtn);
		doneBtn.onclick = () => setActiveAddKind(null);

		actions.append(placeBtn, doneBtn);

		addPanel.append(header, name);

		if (sizeSelect) {
			const sLabel = h("div", { textContent: "Size" });
			sLabel.style.marginTop = "8px";
			addPanel.append(sLabel, sizeSelect);
		}

		addPanel.append(
			posLabel,
			posRow,
			labelRow,
			colorRow,
			hpGrid,
			warn,
			actions,
		);

		currentForm = {
			setAnchorInputs: (cell) => {
				const c = clampToBounds(cell);
				x.value = String(c.x);
				y.value = String(c.y);
				z.value = String(c.z);
				return c;
			},
			placeAt: (cell) => {
				const anchor = clampToBounds(cell);
				x.value = String(anchor.x);
				y.value = String(anchor.y);
				z.value = String(anchor.z);
				placeAtAnchor(anchor);
			},
		};
	}

	function setActiveAddKind(kind) {
		activeAddKind = kind;
		const isAdding = Boolean(activeAddKind);
		addPanel.style.display = isAdding ? "block" : "none";
		onModeChange?.(isAdding);

		if (isAdding) buildAddForm(activeAddKind);
		else {
			currentForm = null;
			onPreviewChange?.({ sizeValue: 1 });
		}
	}

	btnAddPlayer.onclick = () => setActiveAddKind("player");
	btnAddEnemy.onclick = () => setActiveAddKind("enemy");
	btnAddEnv.onclick = () => setActiveAddKind("env");

	function setPlacementPosition(cell) {
		if (!activeAddKind || !currentForm) return;
		currentForm.setAnchorInputs(cell);
	}

	function placeCurrentAtCell(cell) {
		if (!activeAddKind || !currentForm) return;
		currentForm.placeAt(cell);
	}

	const el = h("div", {}, [addButtonsHeader, btnRow, addPanel]);
	return { el, setPlacementPosition, placeCurrentAtCell };
}
