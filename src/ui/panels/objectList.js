// src/ui/panels/objectList.js
import { h, styleButton, styleInput } from "../styles.js";
import { clampPosToMap } from "../../state.js";

function makeHealthBar(hp, hpMax) {
	const outer = document.createElement("div");
	outer.style.height = "10px";
	outer.style.borderRadius = "999px";
	outer.style.border = "1px solid rgba(255,255,255,0.16)";
	outer.style.background = "rgba(255,255,255,0.06)";
	outer.style.overflow = "hidden";
	outer.style.flex = "1";

	const inner = document.createElement("div");
	const pct = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
	inner.style.width = `${pct * 100}%`;
	inner.style.height = "100%";
	inner.style.background = "rgba(120,180,255,0.55)";
	outer.appendChild(inner);

	return {
		outer,
		set: (newHp, newHpMax) => {
			const max = Math.max(1, Math.trunc(Number(newHpMax) || 1));
			const cur = Math.max(
				0,
				Math.min(max, Math.trunc(Number(newHp) || 0)),
			);
			const p = Math.max(0, Math.min(1, cur / max));
			inner.style.width = `${p * 100}%`;
		},
	};
}

function sortObjects(a, b) {
	const ao = Number.isFinite(a.order) ? a.order : 999999;
	const bo = Number.isFinite(b.order) ? b.order : 999999;
	if (ao !== bo) return ao - bo;
	return String(a.name).localeCompare(String(b.name));
}

function normalizePath(p) {
	if (!p) return "";
	return String(p)
		.split("/")
		.map((s) => s.trim())
		.filter(Boolean)
		.join("/");
}

function isInFolder(objPath, folderPath) {
	const p = normalizePath(objPath);
	const f = normalizePath(folderPath);
	if (!f) return true;
	return p === f || p.startsWith(f + "/");
}

function buildEnvTree(envObjects) {
	const root = {
		name: "ROOT",
		path: "",
		children: new Map(),
		cubes: [],
	};

	for (const cube of envObjects) {
		const p = normalizePath(cube.structurePath);
		const parts = p ? p.split("/") : [];
		let node = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const subPath = parts.slice(0, i + 1).join("/");
			if (!node.children.has(part)) {
				node.children.set(part, {
					name: part,
					path: subPath,
					children: new Map(),
					cubes: [],
				});
			}
			node = node.children.get(part);
		}

		node.cubes.push(cube);
	}

	return root;
}

function countCubesRecursive(node) {
	let total = node.cubes.length;
	for (const child of node.children.values())
		total += countCubesRecursive(child);
	return total;
}

export function createObjectListPanel({ state, onDelete, onChange } = {}) {
	const header = h("div", { textContent: "Objects" });
	header.style.fontWeight = "800";
	header.style.marginBottom = "8px";

	const controls = h("div");
	controls.style.display = "grid";
	controls.style.gridTemplateColumns = "1fr";
	controls.style.gap = "6px";
	controls.style.marginBottom = "8px";

	const togglesRow = h("div");
	togglesRow.style.display = "flex";
	togglesRow.style.alignItems = "center";
	togglesRow.style.justifyContent = "space-between";
	togglesRow.style.gap = "10px";

	const groupLabel = h("label");
	groupLabel.style.display = "flex";
	groupLabel.style.alignItems = "center";
	groupLabel.style.gap = "8px";
	const groupToggle = h("input", { type: "checkbox", checked: true }); // ✅ default on
	groupLabel.append(
		groupToggle,
		h("span", { textContent: "Group by type", style: "opacity:.9" }),
	);

	const hideEnvHpLabel = h("label");
	hideEnvHpLabel.style.display = "flex";
	hideEnvHpLabel.style.alignItems = "center";
	hideEnvHpLabel.style.gap = "8px";
	const hideEnvHpToggle = h("input", { type: "checkbox", checked: true });
	hideEnvHpLabel.append(
		hideEnvHpToggle,
		h("span", { textContent: "Hide HP for env", style: "opacity:.9" }),
	);

	togglesRow.append(groupLabel, hideEnvHpLabel);

	const hint = h("div", { textContent: "Click an item to edit" });
	hint.style.opacity = "0.7";
	hint.style.fontSize = "12px";

	controls.append(togglesRow, hint);

	const scroll = h("div");
	scroll.style.maxHeight = "340px";
	scroll.style.overflow = "auto";
	scroll.style.paddingRight = "4px";

	const list = h("div");
	list.style.display = "flex";
	list.style.flexDirection = "column";
	list.style.gap = "8px";
	scroll.appendChild(list);

	let expandedId = null;
	const cardById = new Map();

	const openFolders = new Set();
	openFolders.add("");

	function minimalRow(obj, bar) {
		const row = h("div");
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = "10px";

		// no order badge for env
		if (obj.kind !== "env") {
			const badge = h("div", { textContent: String(obj.order ?? "") });
			badge.style.minWidth = "28px";
			badge.style.textAlign = "center";
			badge.style.padding = "4px 6px";
			badge.style.borderRadius = "10px";
			badge.style.background = "rgba(255,255,255,0.06)";
			badge.style.border = "1px solid rgba(255,255,255,0.10)";
			badge.style.opacity = "0.9";
			badge.style.fontSize = "12px";
			row.appendChild(badge);
		}

		const name = h("div", { textContent: obj.name });
		name.style.flex = "0 0 auto";
		name.style.fontWeight = "700";
		row.appendChild(name);

		const hideHp = hideEnvHpToggle.checked && obj.kind === "env";
		if (!hideHp) {
			const hpWrap = h("div");
			hpWrap.style.display = "flex";
			hpWrap.style.alignItems = "center";
			hpWrap.style.gap = "8px";
			hpWrap.style.flex = "1";

			const hpLabel = h("div", { textContent: `${obj.hp}/${obj.hpMax}` });
			hpLabel.style.opacity = "0.8";
			hpLabel.style.fontSize = "12px";
			hpLabel.style.minWidth = "56px";
			hpLabel.style.textAlign = "right";

			hpWrap.append(bar.outer, hpLabel);
			row.appendChild(hpWrap);
		} else {
			const spacer = h("div");
			spacer.style.flex = "1";
			row.appendChild(spacer);
		}

		return row;
	}

	function expandedPanel(obj, bar) {
		const panel = h("div");
		panel.style.marginTop = "10px";
		panel.style.display = "flex";
		panel.style.flexDirection = "column";
		panel.style.gap = "8px";

		if (obj.kind !== "env") {
			const orderRow = h("div");
			orderRow.style.display = "flex";
			orderRow.style.alignItems = "center";
			orderRow.style.gap = "8px";

			const orderLabel = h("div", {
				textContent: `Order: ${String(obj.order ?? "")}`,
			});
			orderLabel.style.opacity = "0.85";
			orderLabel.style.fontSize = "12px";
			orderLabel.style.flex = "1";

			const upBtn = h("button", { textContent: "Move up" });
			styleButton(upBtn, "neutral");
			upBtn.style.width = "auto";

			const downBtn = h("button", { textContent: "Move down" });
			styleButton(downBtn, "neutral");
			downBtn.style.width = "auto";

			function moveOrder(dir) {
				const sameKind = state.objects
					.filter((o) => o.kind === obj.kind)
					.sort(sortObjects);

				const idx = sameKind.findIndex((o) => o.id === obj.id);
				const swapWith = sameKind[idx + dir];
				if (!swapWith) return;

				const a = Number.isFinite(obj.order) ? obj.order : 0;
				const b = Number.isFinite(swapWith.order) ? swapWith.order : 0;
				obj.order = b;
				swapWith.order = a;
				onChange?.();
				refresh();
			}

			upBtn.onclick = () => moveOrder(-1);
			downBtn.onclick = () => moveOrder(1);

			orderRow.append(orderLabel, upBtn, downBtn);
			panel.append(orderRow);
		}

		if (!(hideEnvHpToggle.checked && obj.kind === "env")) {
			const hpGrid = h("div");
			hpGrid.style.display = "grid";
			hpGrid.style.gridTemplateColumns = "1fr 1fr auto";
			hpGrid.style.gap = "8px";
			hpGrid.style.alignItems = "end";

			const hpMaxInput = h("input", {
				type: "number",
				min: "1",
				value: String(obj.hpMax),
			});
			const hpInput = h("input", {
				type: "number",
				min: "0",
				value: String(obj.hp),
			});
			styleInput(hpMaxInput);
			styleInput(hpInput);

			const setHp = h("button", { textContent: "Set" });
			styleButton(setHp, "primary");
			setHp.style.width = "auto";
			setHp.onclick = () => {
				const max = Math.max(
					1,
					Math.trunc(Number(hpMaxInput.value) || 1),
				);
				const cur = Math.max(
					0,
					Math.min(max, Math.trunc(Number(hpInput.value) || 0)),
				);
				obj.hpMax = max;
				obj.hp = cur;
				bar.set(cur, max);
				onChange?.();
				refresh();
			};

			hpGrid.append(
				h("div", {}, [
					h("div", {
						textContent: "HP Max",
						style: "opacity:.8;font-size:12px",
					}),
					hpMaxInput,
				]),
				h("div", {}, [
					h("div", {
						textContent: "HP",
						style: "opacity:.8;font-size:12px",
					}),
					hpInput,
				]),
				setHp,
			);
			panel.append(hpGrid);
		}

		const posGrid = h("div");
		posGrid.style.display = "grid";
		posGrid.style.gridTemplateColumns = "1fr 1fr 1fr auto";
		posGrid.style.gap = "8px";
		posGrid.style.alignItems = "end";

		const x = h("input", { type: "number", value: String(obj.pos.x) });
		const y = h("input", { type: "number", value: String(obj.pos.y) });
		const z = h("input", { type: "number", value: String(obj.pos.z) });
		[x, y, z].forEach(styleInput);

		const moveBtn = h("button", { textContent: "Move" });
		styleButton(moveBtn, "primary");
		moveBtn.style.width = "auto";
		moveBtn.onclick = () => {
			const raw = {
				x: Math.trunc(Number(x.value) || 0),
				y: Math.trunc(Number(y.value) || 0),
				z: Math.trunc(Number(z.value) || 0),
			};
			const clamped = clampPosToMap(raw);
			obj.pos = clamped;
			x.value = String(clamped.x);
			y.value = String(clamped.y);
			z.value = String(clamped.z);
			onChange?.();
			refresh();
		};

		posGrid.append(
			h("div", {}, [
				h("div", {
					textContent: "X",
					style: "opacity:.8;font-size:12px",
				}),
				x,
			]),
			h("div", {}, [
				h("div", {
					textContent: "Y",
					style: "opacity:.8;font-size:12px",
				}),
				y,
			]),
			h("div", {}, [
				h("div", {
					textContent: "Z",
					style: "opacity:.8;font-size:12px",
				}),
				z,
			]),
			moveBtn,
		);
		panel.append(posGrid);

		const del = h("button", { textContent: "Delete cube" });
		styleButton(del, "danger");
		del.onclick = () => {
			const idx = state.objects.findIndex((o) => o.id === obj.id);
			if (idx >= 0) state.objects.splice(idx, 1);
			expandedId = null;
			onDelete?.();
		};
		panel.append(del);

		return panel;
	}

	function renderCard(obj) {
		const card = h("div");
		card.style.padding = "10px";
		card.style.borderRadius = "12px";
		card.style.border = "1px solid rgba(255,255,255,0.12)";
		card.style.background = "rgba(255,255,255,0.06)";
		card.style.cursor = "pointer";
		card.style.userSelect = "none";

		card.dataset.objectId = obj.id;
		cardById.set(obj.id, card);

		const bar = makeHealthBar(obj.hp, obj.hpMax);
		card.appendChild(minimalRow(obj, bar));

		if (expandedId === obj.id) {
			card.style.background = "rgba(255,255,255,0.085)";
			card.appendChild(expandedPanel(obj, bar));
		}

		card.onclick = (e) => {
			const tag = e.target?.tagName;
			if (
				tag === "BUTTON" ||
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				tag === "SELECT"
			)
				return;
			expandedId = expandedId === obj.id ? null : obj.id;
			refresh();
		};

		return card;
	}

	function renderFolderNode(node, depth = 0) {
		const isOpen = openFolders.has(node.path);

		const wrap = h("div");
		wrap.style.marginLeft = depth === 0 ? "0" : `${depth * 10}px`;

		const head = h("div");
		head.style.display = "flex";
		head.style.alignItems = "center";
		head.style.gap = "8px";
		head.style.padding = "6px 8px";
		head.style.borderRadius = "10px";
		head.style.background = "rgba(255,255,255,0.04)";
		head.style.border = "1px solid rgba(255,255,255,0.08)";

		const toggle = h("button", { textContent: isOpen ? "▾" : "▸" });
		styleButton(toggle, "neutral");
		toggle.style.width = "34px";
		toggle.onclick = () => {
			if (openFolders.has(node.path)) openFolders.delete(node.path);
			else openFolders.add(node.path);
			refresh();
		};

		const title = h("div", { textContent: node.name });
		title.style.fontWeight = "800";
		title.style.flex = "1";

		const count = h("div", {
			textContent: String(countCubesRecursive(node)),
		});
		count.style.opacity = "0.75";
		count.style.fontSize = "12px";

		head.append(toggle, title, count);

		const del = h("button", { textContent: "Delete folder" });
		styleButton(del, "danger");
		del.style.width = "auto";
		del.onclick = () => {
			const folderPath = node.path;
			state.objects = state.objects.filter((o) => {
				if (o.kind !== "env") return true;
				return !isInFolder(o.structurePath, folderPath);
			});
			onDelete?.();
		};
		head.appendChild(del);

		wrap.appendChild(head);

		if (!isOpen) return wrap;

		// children folders
		const children = [...node.children.values()].sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		for (const child of children)
			wrap.appendChild(renderFolderNode(child, depth + 1));

		// cubes directly in this folder
		if (node.cubes.length) {
			const cubes = [...node.cubes].sort(sortObjects);
			const cubesWrap = h("div");
			cubesWrap.style.marginTop = "6px";
			cubesWrap.style.display = "flex";
			cubesWrap.style.flexDirection = "column";
			cubesWrap.style.gap = "8px";
			cubesWrap.style.marginLeft = `${(depth + 1) * 10}px`;

			for (const cube of cubes) cubesWrap.appendChild(renderCard(cube));
			wrap.appendChild(cubesWrap);
		}

		return wrap;
	}

	function renderLooseGroup(cubes) {
		const path = "__loose__";
		const isOpen = openFolders.has(path);

		const wrap = h("div");

		const head = h("div");
		head.style.display = "flex";
		head.style.alignItems = "center";
		head.style.gap = "8px";
		head.style.padding = "6px 8px";
		head.style.borderRadius = "10px";
		head.style.background = "rgba(255,255,255,0.04)";
		head.style.border = "1px solid rgba(255,255,255,0.08)";

		const toggle = h("button", { textContent: isOpen ? "▾" : "▸" });
		styleButton(toggle, "neutral");
		toggle.style.width = "34px";
		toggle.onclick = () => {
			if (openFolders.has(path)) openFolders.delete(path);
			else openFolders.add(path);
			refresh();
		};

		const title = h("div", { textContent: "Loose cubes" });
		title.style.fontWeight = "800";
		title.style.flex = "1";

		const count = h("div", { textContent: String(cubes.length) });
		count.style.opacity = "0.75";
		count.style.fontSize = "12px";

		const del = h("button", { textContent: "Delete group" });
		styleButton(del, "danger");
		del.style.width = "auto";
		del.onclick = () => {
			state.objects = state.objects.filter((o) => {
				if (o.kind !== "env") return true;
				return normalizePath(o.structurePath) !== "";
			});
			onDelete?.();
		};

		head.append(toggle, title, count, del);
		wrap.appendChild(head);

		if (!isOpen) return wrap;

		const cubesWrap = h("div");
		cubesWrap.style.marginTop = "6px";
		cubesWrap.style.display = "flex";
		cubesWrap.style.flexDirection = "column";
		cubesWrap.style.gap = "8px";
		cubesWrap.style.marginLeft = "10px";

		for (const cube of [...cubes].sort(sortObjects))
			cubesWrap.appendChild(renderCard(cube));

		wrap.appendChild(cubesWrap);
		return wrap;
	}

	function refresh() {
		list.innerHTML = "";
		cardById.clear();

		const all = [...state.objects].sort(sortObjects);
		if (!all.length) {
			const empty = h("div", { textContent: "No objects placed yet." });
			empty.style.opacity = "0.75";
			list.appendChild(empty);
			return;
		}

		const players = all.filter((o) => o.kind === "player");
		const enemies = all.filter((o) => o.kind === "enemy");
		const env = all.filter((o) => o.kind === "env");

		// Players + Enemies:
		// - if grouped: show with headings
		// - if ungrouped: show flat (still NO env mixed in)
		if (groupToggle.checked) {
			if (players.length) {
				const head = h("div", { textContent: "Players" });
				head.style.opacity = "0.85";
				head.style.fontSize = "12px";
				head.style.margin = "6px 0 2px 0";
				list.appendChild(head);
				players.forEach((o) => list.appendChild(renderCard(o)));
			}

			if (enemies.length) {
				const head = h("div", { textContent: "Enemies" });
				head.style.opacity = "0.85";
				head.style.fontSize = "12px";
				head.style.margin = "6px 0 2px 0";
				list.appendChild(head);
				enemies.forEach((o) => list.appendChild(renderCard(o)));
			}
		} else {
			const flat = [...players, ...enemies].sort(sortObjects);
			for (const obj of flat) list.appendChild(renderCard(obj));
		}

		// ✅ Environment ALWAYS as its own section title (and ALWAYS tree)
		if (env.length) {
			const envTitle = h("div", { textContent: "Environment" });
			envTitle.style.opacity = "0.9";
			envTitle.style.fontSize = "12px";
			envTitle.style.margin = "10px 0 2px 0";
			envTitle.style.fontWeight = "800";
			list.appendChild(envTitle);

			const tree = buildEnvTree(env);

			// Root node is not rendered; we render its children as top folders
			const topFolders = [...tree.children.values()].sort((a, b) =>
				a.name.localeCompare(b.name),
			);
			for (const folder of topFolders)
				list.appendChild(renderFolderNode(folder, 0));

			// cubes directly under root (no structurePath)
			if (tree.cubes.length) list.appendChild(renderLooseGroup(tree.cubes));
		}
	}

	function openObject(id) {
		expandedId = id;
		refresh();
		const el = cardById.get(id);
		if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}

	groupToggle.onchange = () => refresh();
	hideEnvHpToggle.onchange = () => refresh();

	refresh();

	const el = h("div", {}, [header, controls, scroll]);
	return { el, refresh, openObject };
}
