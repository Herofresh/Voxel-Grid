// src/ui/panels/areas.js
import { h, styleButton, styleInput } from "../styles.js";
import { SIZE_MAPS } from "../../state.js";

export function createAreasPanel({
	onConfigChange,
	onCancel,
	onHitsChange,
} = {}) {
	const header = h("div", { textContent: "Areas" });
	header.style.fontWeight = "800";
	header.style.marginBottom = "8px";

	const hint = h("div", {
		textContent:
			"Place origin with a click. Click again to set direction (cone/line).",
	});
	hint.style.opacity = "0.75";
	hint.style.fontSize = "12px";
	hint.style.marginBottom = "8px";

	const toggleBtn = h("button", { textContent: "Enable Area Tool" });
	styleButton(toggleBtn, "primary");

	let active = false;

	const typeSelect = h("select");
	styleInput(typeSelect);
	[
		{ value: "burst", label: "Burst" },
		{ value: "cone", label: "Cone" },
		{ value: "line", label: "Line" },
		{ value: "emanation", label: "Emanation" },
	].forEach((opt) =>
		typeSelect.appendChild(
			h("option", { value: opt.value, textContent: opt.label }),
		),
	);

	const rangeInput = h("input", {
		type: "number",
		min: "5",
		value: "15",
	});
	styleInput(rangeInput);

	const originSizeSelect = h("select");
	styleInput(originSizeSelect);
	for (const key of Object.keys(SIZE_MAPS.enemy)) {
		const squares = SIZE_MAPS.enemy[key];
		const feet = squares * 5;
		originSizeSelect.appendChild(
			h("option", {
				value: String(feet),
				textContent: `${key} (${feet} ft)`,
			}),
		);
	}

	const row = h("div");
	row.style.display = "grid";
	row.style.gridTemplateColumns = "1fr 1fr";
	row.style.gap = "8px";
	const originWrap = h("div", {}, [
		h("div", {
			textContent: "Origin size (ft)",
			style: "font-size:12px",
		}),
		originSizeSelect,
	]);
	row.append(
		h("div", {}, [
			h("div", { textContent: "Range (ft)", style: "font-size:12px" }),
			rangeInput,
		]),
		originWrap,
	);

	const cancelBtn = h("button", { textContent: "Cancel area" });
	styleButton(cancelBtn, "danger");
	cancelBtn.style.marginTop = "6px";

	const hitsHeader = h("div", { textContent: "Hit objects" });
	hitsHeader.style.fontWeight = "700";
	hitsHeader.style.marginTop = "8px";
	hitsHeader.style.marginBottom = "4px";

	const hitsList = h("div");
	hitsList.style.maxHeight = "120px";
	hitsList.style.overflow = "auto";
	hitsList.style.fontSize = "12px";
	hitsList.style.opacity = "0.85";

	function updateConfig() {
		onConfigChange?.({
			active,
			type: typeSelect.value,
			rangeFeet: Number(rangeInput.value) || 5,
			originSizeFeet: Number(originSizeSelect.value) || 5,
		});
	}

	function setActive(next) {
		active = next;
		toggleBtn.textContent = active
			? "Disable Area Tool"
			: "Enable Area Tool";
		styleButton(toggleBtn, active ? "primary" : "neutral");
		updateConfig();
	}

	toggleBtn.onclick = () => setActive(!active);
	function updateOriginVisibility() {
		originWrap.style.display =
			typeSelect.value === "emanation" ? "block" : "none";
	}

	typeSelect.onchange = () => {
		updateOriginVisibility();
		updateConfig();
	};
	rangeInput.oninput = () => updateConfig();
	originSizeSelect.onchange = () => updateConfig();
	updateOriginVisibility();

	cancelBtn.onclick = () => {
		setActive(false);
		onCancel?.();
	};

	function renderHits(list) {
		hitsList.innerHTML = "";
		if (!list || !list.length) {
			hitsList.appendChild(
				h("div", { textContent: "No objects hit." }),
			);
			return;
		}
		for (const name of list) hitsList.appendChild(h("div", { textContent: name }));
	}

	if (onHitsChange) onHitsChange(renderHits);

	const el = h("div", {}, [
		header,
		hint,
		toggleBtn,
		h("div", { style: "margin-top:8px" }),
		h("div", { textContent: "Type", style: "font-size:12px" }),
		typeSelect,
		row,
		cancelBtn,
		hitsHeader,
		hitsList,
	]);

	return { el, setActive, renderHits };
}
