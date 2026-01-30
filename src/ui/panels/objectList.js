// src/ui/panels/objectList.js
import { h, styleButton } from "../styles.js";

export function createObjectListPanel({ state, onDelete }) {
	const listHeader = h("div", { textContent: "Placed Objects" });
	listHeader.style.fontWeight = "800";
	listHeader.style.marginBottom = "8px";

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
				onDelete?.();
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

	const el = h("div", {}, [listHeader, list]);
	refresh();
	return { el, refresh };
}
