// src/ui/panels/shuffle.js
import { h, styleButton, styleInput } from "../styles.js";
import { isAnchorInBoundsForSize, isSpaceFreeAt } from "../../state.js";

function randInt(min, max) {
	const a = Math.min(min, max);
	const b = Math.max(min, max);
	return a + Math.floor(Math.random() * (b - a + 1));
}

function posToString(p) {
	return `(${p.x},${p.y},${p.z})`;
}

export function createShufflePanel({ state, onChange } = {}) {
	const header = h("div", { textContent: "Shuffle Mode" });
	header.style.fontWeight = "800";
	header.style.marginBottom = "8px";

	const hint = h("div", {
		textContent:
			"Randomly swaps positions of random players/enemies and logs the swaps.",
	});
	hint.style.opacity = "0.8";
	hint.style.fontSize = "12px";
	hint.style.marginBottom = "8px";

	const minSwaps = h("input", { type: "number", min: "0", value: "1" });
	const maxSwaps = h("input", { type: "number", min: "0", value: "5" });
	styleInput(minSwaps);
	styleInput(maxSwaps);

	const rangeRow = h("div");
	rangeRow.style.display = "grid";
	rangeRow.style.gridTemplateColumns = "1fr 1fr";
	rangeRow.style.gap = "8px";

	rangeRow.append(
		h("div", {}, [
			h("div", {
				textContent: "Min swaps",
				style: "opacity:.85;font-size:12px",
			}),
			minSwaps,
		]),
		h("div", {}, [
			h("div", {
				textContent: "Max swaps",
				style: "opacity:.85;font-size:12px",
			}),
			maxSwaps,
		]),
	);

	const runBtn = h("button", { textContent: "Run shuffle" });
	styleButton(runBtn, "primary");
	runBtn.style.marginTop = "10px";

	const clearBtn = h("button", { textContent: "Clear log" });
	styleButton(clearBtn);
	clearBtn.style.marginTop = "8px";

	const log = h("textarea");
	log.readOnly = true;
	log.rows = 10;
	log.style.width = "100%";
	log.style.boxSizing = "border-box";
	log.style.marginTop = "10px";
	log.style.padding = "8px";
	log.style.borderRadius = "10px";
	log.style.border = "1px solid rgba(255,255,255,0.15)";
	log.style.background = "rgba(0,0,0,0.25)";
	log.style.color = "white";
	log.style.fontFamily =
		"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
	log.style.fontSize = "12px";

	function append(line) {
		log.value += (log.value ? "\n" : "") + line;
		log.scrollTop = log.scrollHeight;
	}

	function eligible() {
		return state.objects.filter(
			(o) => o.kind === "player" || o.kind === "enemy",
		);
	}

	function attemptSwap(a, b) {
		// Swap anchors, but ensure each anchor is valid for the other's size
		const aNew = b.pos;
		const bNew = a.pos;

		if (!isAnchorInBoundsForSize(aNew, a.sizeValue)) return false;
		if (!isAnchorInBoundsForSize(bNew, b.sizeValue)) return false;
		if (
			!isSpaceFreeAt(aNew, a.sizeValue, [a.id, b.id]) ||
			!isSpaceFreeAt(bNew, b.sizeValue, [a.id, b.id])
		)
			return false;

		// Perform swap
		const aOld = a.pos;
		const bOld = b.pos;

		a.pos = { ...aNew };
		b.pos = { ...bNew };

		return { aOld, bOld };
	}

	runBtn.onclick = () => {
		const list = eligible();
		if (list.length < 2) {
			append("Not enough players/enemies to shuffle.");
			return;
		}

		const minN = Math.max(0, Math.trunc(Number(minSwaps.value) || 0));
		const maxN = Math.max(0, Math.trunc(Number(maxSwaps.value) || 0));
		const swaps = randInt(minN, maxN);

		append(`--- Shuffle run: ${swaps} swap(s) ---`);

		let done = 0;
		const MAX_TRIES_PER_SWAP = 30;

		for (let i = 0; i < swaps; i++) {
			let swapped = false;

			for (let t = 0; t < MAX_TRIES_PER_SWAP; t++) {
				const a = list[randInt(0, list.length - 1)];
				let b = list[randInt(0, list.length - 1)];
				if (a === b) continue;

				const result = attemptSwap(a, b);
				if (!result) continue;

				swapped = true;
				done += 1;

				append(
					`#${done}: ${a.name} ${posToString(result.aOld)} ↔ ${b.name} ${posToString(result.bOld)}`,
				);
				break;
			}

			if (!swapped) {
				append(`#${done + 1}: skipped (no valid pair found)`);
			}
		}

		onChange?.();
	};

	clearBtn.onclick = () => {
		log.value = "";
	};

	const el = h("div", {}, [header, hint, rangeRow, runBtn, clearBtn, log]);
	return { el };
}
