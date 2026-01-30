// src/ui/styles.js
export function styleInput(el) {
	el.style.width = "100%";
	el.style.boxSizing = "border-box";
	el.style.padding = "6px 8px";
	el.style.borderRadius = "8px";
	el.style.border = "1px solid rgba(255,255,255,0.15)";
	el.style.background = "rgba(255,255,255,0.08)";
	el.style.color = "white";
	el.style.outline = "none";
}

export function styleButton(btn, variant = "neutral") {
	btn.style.width = "100%";
	btn.style.padding = "8px 10px";
	btn.style.borderRadius = "10px";
	btn.style.border = "1px solid rgba(255,255,255,0.18)";
	btn.style.color = "white";
	btn.style.cursor = "pointer";

	if (variant === "danger") btn.style.background = "rgba(255,80,80,0.18)";
	else if (variant === "primary")
		btn.style.background = "rgba(120,180,255,0.18)";
	else btn.style.background = "rgba(255,255,255,0.10)";
}

export function h(tag, props = {}, children = []) {
	const el = document.createElement(tag);
	Object.assign(el, props);
	for (const c of children) el.appendChild(c);
	return el;
}

export function divider() {
	const hr = document.createElement("hr");
	hr.style.border = "none";
	hr.style.height = "1px";
	hr.style.background = "rgba(255,255,255,0.12)";
	hr.style.margin = "12px 0";
	return hr;
}
