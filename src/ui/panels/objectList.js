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

	const inner = document.createElement("div");
	const pct = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
	inner.style.width = `${pct * 100}%`;
	inner.style.height = "100%";
	inner.style.background = "rgba(120,180,255,0.55)";
	outer.appendChild(inner);

	const label = document.createElement("div");
	label.textContent = `${hp}/${hpMax}`;
	label.style.fontSize = "11px";
	label.style.opacity = "0.85";
	label.style.marginTop = "4px";

	return {
		outer,
		label,
		set: (newHp, newHpMax) => {
			const max = Math.max(1, Math.trunc(Number(newHpMax) || 1));
			const cur = Math.max(
				0,
				Math.min(max, Math.trunc(Number(newHp) || 0)),
			);
			const p = Math.max(0, Math.min(1, cur / max));
			inner.style.width = `${p * 100}%`;
			label.textContent = `${cur}/${max}`;
		},
	};
}

export function createObjectListPanel({ state, onDelete, onChange } = {}) {
	const header = h("div", { textContent: "Placed Objects" });
	header.style.fontWeight = "800";
	header.style.marginBottom = "8px";

	const list = h("div");
	list.style.display = "flex";
	list.style.flexDirection = "column";
	list.style.gap = "8px";

	function refresh() {
		list.innerHTML = "";

		if (state.objects.length === 0) {
			const empty = h("div", { textContent: "No objects placed yet." });
			empty.style.opacity = "0.75";
			list.appendChild(empty);
			return;
		}

		for (const obj of state.objects) {
			const card = h("div");
			card.style.padding = "10px";
			card.style.borderRadius = "12px";
			card.style.border = "1px solid rgba(255,255,255,0.12)";
			card.style.background = "rgba(255,255,255,0.06)";

			// Title row
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
				onDelete?.();
			};

			top.append(left, del);

			// Health row (bar + edit)
			const hpRow = h("div");
			hpRow.style.marginTop = "8px";

			const hp = Number.isFinite(obj.hp) ? obj.hp : (obj.hpMax ?? 10);
			const hpMax = Number.isFinite(obj.hpMax) ? obj.hpMax : 10;

			const bar = makeHealthBar(hp, hpMax);
			hpRow.appendChild(bar.outer);
			hpRow.appendChild(bar.label);

			const hpInputs = h("div");
			hpInputs.style.display = "grid";
			hpInputs.style.gridTemplateColumns = "1fr 1fr auto";
			hpInputs.style.gap = "8px";
			hpInputs.style.marginTop = "6px";
			hpInputs.style.alignItems = "end";

			const hpMaxInput = h("input", {
				type: "number",
				min: "1",
				value: String(hpMax),
			});
			const hpInput = h("input", {
				type: "number",
				min: "0",
				value: String(hp),
			});
			styleInput(hpMaxInput);
			styleInput(hpInput);

			const applyHp = h("button", { textContent: "Set HP" });
			styleButton(applyHp, "primary");
			applyHp.style.width = "auto";
			applyHp.onclick = () => {
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
			};

			hpInputs.append(
				h("div", {}, [
					h("div", {
						textContent: "HP Max",
						style: "opacity:.85;font-size:12px",
					}),
					hpMaxInput,
				]),
				h("div", {}, [
					h("div", {
						textContent: "HP",
						style: "opacity:.85;font-size:12px",
					}),
					hpInput,
				]),
				applyHp,
			);

			// Move row
			const moveRow = h("div");
			moveRow.style.marginTop = "10px";
			moveRow.style.display = "grid";
			moveRow.style.gridTemplateColumns = "1fr 1fr 1fr auto";
			moveRow.style.gap = "8px";
			moveRow.style.alignItems = "end";

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
			};

			// Meta line
			const meta = h("div");
			meta.style.marginTop = "8px";
			meta.style.opacity = "0.85";
			meta.style.fontSize = "12px";
			meta.textContent = `pos (${obj.pos.x}, ${obj.pos.y}, ${obj.pos.z}) • color ${obj.color} • label ${
				obj.labelEnabled ? "on" : "off"
			}`;

			card.append(
				top,
				hpRow,
				hpInputs,
				h("div", {
					style: "margin-top:10px;opacity:.85;font-size:12px",
					textContent: "Move position (anchor):",
				}),
				moveRow,
				moveBtn,
				meta,
			);

			// Small tweak: put moveBtn inline with inputs in the grid
			moveRow.append(
				h("div", {}, [
					h("div", {
						textContent: "X",
						style: "opacity:.85;font-size:12px",
					}),
					x,
				]),
				h("div", {}, [
					h("div", {
						textContent: "Y",
						style: "opacity:.85;font-size:12px",
					}),
					y,
				]),
				h("div", {}, [
					h("div", {
						textContent: "Z",
						style: "opacity:.85;font-size:12px",
					}),
					z,
				]),
				moveBtn,
			);

			list.appendChild(card);
		}
	}

	refresh();

	const el = h("div", {}, [header, list]);
	return { el, refresh };
}
