# 3D Grid Map Editor

A lightweight browser-based editor for creating simple 3D grid maps using cubes.
The editor supports players, enemies, and environment blocks, with JSON import/export
and automatic local autosave.

---

## Features (MVP)

- 3D grid visualization
- Integer grid-based placement
- Player, Enemy, and Environment cubes
- Size preview while placing objects
- Optional labels
- Object list with delete functionality
- JSON import/export
- Local autosave (survives page refresh)

---

## Coordinate system

- X and Z define the ground plane
- Y is the vertical axis
- All positions are integer grid coordinates
- Objects are positioned using an anchor-based system (see JSON format)

---

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

---

## JSON format

The editor uses a simple JSON format for saving and loading maps.

See:
```
docs/json-format.md
```

---

## Local persistence

The editor automatically saves the current map state to localStorage.
This allows work to survive page refreshes without exporting a file.

To permanently save or share a map, use the JSON export feature.

---

## Future ideas

- Placement validation and collision checks
- Visual footprint preview
- Selecting and moving existing objects
- Multi-level (Y-axis) placement
