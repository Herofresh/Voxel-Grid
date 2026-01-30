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

function kindLabel(kind) {
	if (kind === "player") return "Players";
	if (kind === "enemy") return "Enemies";
	return "Environment";
}

function sortObjects(a, b) {
	const ao = Number.isFinite(a.order) ? a.order : 999999;
	const bo = Number.isFinite(b.order) ? b.order : 999999;
	if (ao !== bo) return ao - bo;
	return String(a.name).localeCompare(String(b.name));
}

export function createObjectListPanel({ state, onDelete, onChange } = {}) {
	const header = h("div", { textContent: "Objects" });
	header.style.fontWeight = "800";
	header.style.marginBottom = "8px";

	// Controls row
	const controls = h("div");
	controls.style.display = "flex";
	controls.style.alignItems = "center";
	controls.style.justifyContent = "space-between";
	controls.style.gap = "10px";
	controls.style.marginBottom = "8px";

	const groupLabel = h("label");
	groupLabel.style.display = "flex";
	groupLabel.style.alignItems = "center";
	groupLabel.style.gap = "8px";

	const groupToggle = h("input", { type: "checkbox" });
	const groupText = h("span", { textContent: "Group by type" });
	groupText.style.opacity = "0.9";
	groupLabel.append(groupToggle, groupText);

	const hint = h("div", { textContent: "Click an item to edit" });
	hint.style.opacity = "0.7";
	hint.style.fontSize = "12px";

	controls.append(groupLabel, hint);

	// Scroll container (fixed height)
	const scroll = h("div");
	scroll.style.maxHeight = "min(340px, calc(100vh - 420px))";
	scroll.style.overflow = "auto";
	scroll.style.paddingRight = "4px";

	const list = h("div");
	list.style.display = "flex";
	list.style.flexDirection = "column";
	list.style.gap = "8px";
	scroll.appendChild(list);

	let expandedId = null;

	function rowMinimal(obj, bar) {
		const row = h("div");
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = "10px";

		const badge = h("div", { textContent: String(obj.order ?? "") });
		badge.style.minWidth = "28px";
		badge.style.textAlign = "center";
		badge.style.padding = "4px 6px";
		badge.style.borderRadius = "10px";
		badge.style.background = "rgba(255,255,255,0.06)";
		badge.style.border = "1px solid rgba(255,255,255,0.10)";
		badge.style.opacity = "0.9";
		badge.style.fontSize = "12px";

		const name = h("div", { textContent: obj.name });
		name.style.flex = "0 0 auto";
		name.style.fontWeight = "700";

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

		row.append(badge, name, hpWrap);
		return row;
	}

	function rowExpanded(obj, bar, card) {
		const panel = h("div");
		panel.style.marginTop = "10px";
		panel.style.display = "flex";
		panel.style.flexDirection = "column";
		panel.style.gap = "8px";

		// HP editor
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
			const max = Math.max(1, Math.trunc(Number(hpMaxInput.value) || 1));
			const cur = Math.max(
				0,
				Math.min(max, Math.trunc(Number(hpInput.value) || 0)),
			);
			obj.hpMax = max;
			obj.hp = cur;
			bar.set(cur, max);
			onChange?.();
			refresh(); // keep label updated
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

		// Move editor
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

		// Order editor
		const orderRow = h("div");
		orderRow.style.display = "grid";
		orderRow.style.gridTemplateColumns = "1fr auto";
		orderRow.style.gap = "8px";
		orderRow.style.alignItems = "end";

		const orderInput = h("input", {
			type: "number",
			value: String(obj.order ?? ""),
		});
		styleInput(orderInput);

		const setOrder = h("button", { textContent: "Set order" });
		styleButton(setOrder);
		setOrder.style.width = "auto";
		setOrder.onclick = () => {
			obj.order = Math.trunc(Number(orderInput.value) || 0);
			onChange?.();
			refresh();
		};

		orderRow.append(
			h("div", {}, [
				h("div", {
					textContent: "Order",
					style: "opacity:.8;font-size:12px",
				}),
				orderInput,
			]),
			setOrder,
		);

		// Delete
		const del = h("button", { textContent: "Delete" });
		styleButton(del, "danger");
		del.onclick = () => {
			const idx = state.objects.findIndex((o) => o.id === obj.id);
			if (idx >= 0) state.objects.splice(idx, 1);
			expandedId = null;
			onDelete?.();
		};

		// Meta
		const meta = h("div", {
			textContent: `kind ${obj.kind} • size ${obj.sizeValue} • color ${obj.color} • label ${obj.labelEnabled ? "on" : "off"}`,
		});
		meta.style.opacity = "0.75";
		meta.style.fontSize = "12px";

		panel.append(hpGrid, posGrid, orderRow, del, meta);
		return panel;
	}

	function renderGroup(title, objects) {
		const group = h("div");
		const groupHead = h("div", { textContent: title });
		groupHead.style.opacity = "0.85";
		groupHead.style.fontSize = "12px";
		groupHead.style.margin = "6px 0 2px 0";
		group.appendChild(groupHead);

		for (const obj of objects) {
			group.appendChild(renderCard(obj));
		}

		return group;
	}

	function renderCard(obj) {
		const card = h("div");
		card.style.padding = "10px";
		card.style.borderRadius = "12px";
		card.style.border = "1px solid rgba(255,255,255,0.12)";
		card.style.background = "rgba(255,255,255,0.06)";
		card.style.cursor = "pointer";
		card.style.userSelect = "none";

		const bar = makeHealthBar(obj.hp, obj.hpMax);
		const minimal = rowMinimal(obj, bar);
		card.appendChild(minimal);

		const isExpanded = expandedId === obj.id;
		if (isExpanded) {
			card.style.background = "rgba(255,255,255,0.085)";
			card.appendChild(rowExpanded(obj, bar, card));
		}

		card.onclick = (e) => {
			// prevent clicking buttons inside from toggling twice
			if (e.target?.tagName === "BUTTON" || e.target?.tagName === "INPUT")
				return;
			expandedId = expandedId === obj.id ? null : obj.id;
			refresh();
		};

		return card;
	}

	function refresh() {
		list.innerHTML = "";

		const all = [...state.objects].sort(sortObjects);

		if (all.length === 0) {
			const empty = h("div", { textContent: "No objects placed yet." });
			empty.style.opacity = "0.75";
			list.appendChild(empty);
			return;
		}

		if (!groupToggle.checked) {
			for (const obj of all) list.appendChild(renderCard(obj));
			return;
		}

		const players = all.filter((o) => o.kind === "player");
		const enemies = all.filter((o) => o.kind === "enemy");
		const env = all.filter((o) => o.kind === "env");

		if (players.length)
			list.appendChild(renderGroup(kindLabel("player"), players));
		if (enemies.length)
			list.appendChild(renderGroup(kindLabel("enemy"), enemies));
		if (env.length) list.appendChild(renderGroup(kindLabel("env"), env));
	}

	groupToggle.onchange = () => refresh();

	refresh();

	const el = h("div", {}, [header, controls, scroll]);
	return { el, refresh };
}
