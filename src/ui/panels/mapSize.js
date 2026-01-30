// src/ui/panels/mapSize.js
import { h, styleButton, styleInput } from "../styles.js";

const DEFAULT_FLOORS = [
	{ label: "Arena (35x35)", src: "/maps/arena/arena35x35.jpg" },
	{
		label: "Dungeon Pack 1",
		src: "/maps/dungeon/PZO30088-Dungeon-Multi-Pack.jpg",
	},
	{
		label: "Dungeon Pack 2",
		src: "/maps/dungeon/PZO30088-Dungeon-Multi-Pack2.jpg",
	},
	{
		label: "Dungeon Pack 3",
		src: "/maps/dungeon/PZO30088-Dungeon-Multi-Pack3.jpg",
	},
	{
		label: "Dungeon Pack 4",
		src: "/maps/dungeon/PZO30088-Dungeon-Multi-Pack4.jpg",
	},
];

const CUSTOM_FLOORS_KEY = "voxel-map-editor:floor-library:v1";

function loadCustomFloors() {
	try {
		const raw = localStorage.getItem(CUSTOM_FLOORS_KEY);
		const parsed = JSON.parse(raw || "[]");
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item) =>
				item &&
				typeof item.label === "string" &&
				typeof item.src === "string",
		);
	} catch {
		return [];
	}
}

function saveCustomFloors(list) {
	try {
		localStorage.setItem(CUSTOM_FLOORS_KEY, JSON.stringify(list));
	} catch {}
}

export function createMapSizePanel({ state, onApply, onChange }) {
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

	const floorHeader = h("div", { textContent: "Floor Image" });
	floorHeader.style.fontWeight = "700";
	floorHeader.style.marginTop = "12px";
	floorHeader.style.marginBottom = "6px";

	const floorSelect = h("select");
	styleInput(floorSelect);

	const fitToggleLabel = h("label");
	fitToggleLabel.style.display = "flex";
	fitToggleLabel.style.alignItems = "center";
	fitToggleLabel.style.gap = "8px";
	const fitToggle = h("input", { type: "checkbox", checked: true });
	fitToggleLabel.append(
		fitToggle,
		h("span", { textContent: "Fit to grid size" }),
	);

	const wInput = h("input", { type: "number", min: "1", placeholder: "width" });
	const hInput = h("input", { type: "number", min: "1", placeholder: "height" });
	[wInput, hInput].forEach(styleInput);

	const dimRow = h("div");
	dimRow.style.display = "grid";
	dimRow.style.gridTemplateColumns = "1fr 1fr";
	dimRow.style.gap = "8px";
	dimRow.append(wInput, hInput);

	const uploadLabel = h("div", { textContent: "Add custom map image" });
	uploadLabel.style.opacity = "0.85";
	uploadLabel.style.marginTop = "6px";
	uploadLabel.style.fontSize = "12px";

	const uploadInput = h("input", { type: "file", accept: "image/*" });
	uploadInput.style.marginTop = "6px";
	uploadInput.style.width = "100%";

	let customFloors = loadCustomFloors();

	function rebuildFloorOptions(selectedSrc = null) {
		floorSelect.innerHTML = "";
		floorSelect.appendChild(
			h("option", { value: "", textContent: "None" }),
		);

		for (const item of DEFAULT_FLOORS) {
			floorSelect.appendChild(
				h("option", { value: item.src, textContent: item.label }),
			);
		}

		if (customFloors.length) {
			floorSelect.appendChild(
				h("option", {
					value: "__custom__",
					textContent: "— Custom —",
					disabled: true,
				}),
			);
			for (const item of customFloors) {
				floorSelect.appendChild(
					h("option", {
						value: item.src,
						textContent: item.label,
					}),
				);
			}
		}

		const valueToSet =
			selectedSrc ??
			(typeof state.map.floor?.src === "string"
				? state.map.floor.src
				: "");
		floorSelect.value = valueToSet || "";
	}

	function updateFloorFromControls() {
		const src = floorSelect.value || null;
		const fitToMap = Boolean(fitToggle.checked);
		const width = Number.isFinite(Number(wInput.value))
			? Math.max(1, Math.trunc(Number(wInput.value)))
			: null;
		const height = Number.isFinite(Number(hInput.value))
			? Math.max(1, Math.trunc(Number(hInput.value)))
			: null;

		state.map.floor = {
			src,
			fitToMap,
			width: fitToMap ? null : width,
			height: fitToMap ? null : height,
			opacity: state.map.floor?.opacity ?? 1,
		};
		onChange?.();
	}

	floorSelect.onchange = () => updateFloorFromControls();
	fitToggle.onchange = () => {
		const enabled = !fitToggle.checked;
		wInput.disabled = !enabled;
		hInput.disabled = !enabled;
		updateFloorFromControls();
	};
	wInput.oninput = () => {
		if (fitToggle.checked) return;
		updateFloorFromControls();
	};
	hInput.oninput = () => {
		if (fitToggle.checked) return;
		updateFloorFromControls();
	};

	uploadInput.onchange = () => {
		const file = uploadInput.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const src = String(reader.result || "");
			if (!src) return;

			const label = file.name.replace(/\.[^/.]+$/, "");
			customFloors = [
				{ label, src },
				...customFloors.filter((f) => f.src !== src),
			];
			saveCustomFloors(customFloors);
			rebuildFloorOptions(src);
			updateFloorFromControls();
		};
		reader.readAsDataURL(file);
	};

	function syncFromState() {
		gx.value = String(state.map.sizeX);
		gy.value = String(state.map.sizeY);
		gz.value = String(state.map.sizeZ);

		if (!state.map.floor) {
			state.map.floor = {
				src: null,
				fitToMap: true,
				width: null,
				height: null,
				opacity: 1,
			};
		}
		const floor = state.map.floor;
		rebuildFloorOptions(floor.src || "");
		fitToggle.checked = floor.fitToMap !== false;
		wInput.value = floor.width ? String(floor.width) : "";
		hInput.value = floor.height ? String(floor.height) : "";
		wInput.disabled = fitToggle.checked;
		hInput.disabled = fitToggle.checked;
	}

	const el = h("div", {}, [
		mapHeader,
		gridRow,
		applyGrid,
		floorHeader,
		floorSelect,
		fitToggleLabel,
		dimRow,
		uploadLabel,
		uploadInput,
	]);
	return { el, syncFromState };
}
