// src/ui/panels/io.js
import { h, styleButton } from "../styles.js";
import {
	serializeState,
	validateAndLoadState,
	resetOrderCounter,
} from "../../state.js";

export function createIOPanel({ state, onImported }) {
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

	const clearBtn = h("button", { textContent: "Clear world" });
	styleButton(clearBtn, "danger");
	clearBtn.style.marginTop = "10px";
	clearBtn.onclick = () => {
		const ok = window.confirm(
			"Clear all objects from the map? This cannot be undone.",
		);
		if (!ok) return;
		state.objects = [];
		resetOrderCounter();
		importStatus.textContent = "World cleared.";
		onImported?.();
	};

	importInput.onchange = () => {
		const file = importInput.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			try {
				validateAndLoadState(JSON.parse(String(reader.result)));
				importStatus.textContent = "Loaded!";
				onImported?.();
			} catch (e) {
				importStatus.textContent = `Import failed: ${e?.message ?? e}`;
			}
		};
		reader.readAsText(file);
	};

	const el = h("div", {}, [
		ioHeader,
		exportBtn,
		importLabel,
		importInput,
		importStatus,
		clearBtn,
	]);
	return { el };
}
