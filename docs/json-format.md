# Map JSON Format

This document describes the JSON format used to import and export maps
for the 3D Grid Map Editor.

The format is intentionally simple and stable so maps can be created
or edited manually if desired.

---

## Top-level structure

```json
{
	"version": 1,
	"map": {
		"sizeX": 10,
		"sizeY": 4,
		"sizeZ": 10
	},
	"objects": []
}
```

### Fields

- `version`  
  Integer. JSON format version.  
  Current version: `1`.

- `map`  
  Defines the size of the grid.
    - `sizeX` – width (X axis), integer ≥ 1
    - `sizeY` – height (Y axis), integer ≥ 1
    - `sizeZ` – depth (Z axis), integer ≥ 1

- `objects`  
  Array of placed objects (players, enemies, environment).

---

## Coordinate system

- The grid uses **integer coordinates**
- Only **positive values** are used
- Axes:
    - **X** → east / west
    - **Y** → up
    - **Z** → north / south
- The ground plane is usually at `y = 0`

### Anchor-based positioning (important)

The `pos` value of an object is **not the visual center** of the cube.

Instead, it represents the **anchor cell**:
the minimum corner (lowest X, Y, Z) of the cube’s footprint.

Examples (X axis only, same logic applies to Z and Y):

| sizeValue | pos.x | occupied cells |
| --------: | ----: | -------------- |
|         1 |     0 | [0]            |
|         2 |     0 | [0, 1]         |
|         4 |     3 | [3, 4, 5, 6]   |

This allows even-sized cubes to align correctly to the grid.

---

## Object format

Each entry in `objects` has the following structure:

```json
{
	"id": "obj_001",
	"kind": "player",
	"name": "Hero",
	"pos": { "x": 1, "y": 0, "z": 2 },
	"sizeKey": "medium",
	"sizeValue": 1,
	"color": "#22c55e",
	"labelEnabled": true,
	"hp": 10,
	"hpMax": 10,
	"order": 1,
	"structurePath": "Castle/Walls/North"
}
```

### Object fields

- `id`  
  String. Unique identifier for the object.

- `kind`  
  String. One of:
    - "player"
    - "enemy"
    - "env"

- `name`  
  String. Display name.

- `pos`  
  Anchor position on the grid.
    - `x`, `y`, `z` are integers ≥ 0

- `sizeKey`  
  String or null.  
  Human-readable size name (mainly for players and enemies).

- `sizeValue`  
  Integer ≥ 1.  
  Actual cube size used for rendering and footprint calculations.

- `color`  
  Hex color string (e.g. "#808080").

- `labelEnabled`  
  Boolean. Whether a static label is shown above the object.

- `hp`  
  Integer ≥ 0. Current hit points.  
  Default: `10` for players/enemies, `1` for env.

- `hpMax`  
  Integer ≥ 1. Maximum hit points.  
  Default: `10` for players/enemies, `1` for env.

- `order`  
  Integer ≥ 1. Sort order for players and enemies in the list.  
  (Env can include this but the UI ignores it.)

- `structurePath`  
  String or null. Folder-like path for environment cubes.  
  Example: `"Castle/Walls/North"`.  
  Empty or missing means the cube is "Loose".

## Example map

```json
{
	"version": 1,
	"map": { "sizeX": 10, "sizeY": 4, "sizeZ": 10 },
	"objects": [
		{
			"id": "p1",
			"kind": "player",
			"name": "Rogue",
			"pos": { "x": 1, "y": 0, "z": 2 },
			"sizeKey": "medium",
			"sizeValue": 1,
			"color": "#22c55e",
			"labelEnabled": true,
			"hp": 10,
			"hpMax": 10,
			"order": 1,
			"structurePath": null
		},
		{
			"id": "e1",
			"kind": "enemy",
			"name": "Ogre",
			"pos": { "x": 6, "y": 0, "z": 5 },
			"sizeKey": "large",
			"sizeValue": 2,
			"color": "#ef4444",
			"labelEnabled": false,
			"hp": 18,
			"hpMax": 18,
			"order": 2,
			"structurePath": null
		},
		{
			"id": "env_wall_01",
			"kind": "env",
			"name": "Stone Wall",
			"pos": { "x": 3, "y": 0, "z": 3 },
			"sizeKey": null,
			"sizeValue": 1,
			"color": "#808080",
			"labelEnabled": false,
			"hp": 1,
			"hpMax": 1,
			"order": 0,
			"structurePath": "Castle/Walls/North"
		},
		{
			"id": "env_floor_01",
			"kind": "env",
			"name": "Floor Tile",
			"pos": { "x": 2, "y": 0, "z": 2 },
			"sizeKey": null,
			"sizeValue": 1,
			"color": "#6b7280",
			"labelEnabled": false,
			"hp": 1,
			"hpMax": 1,
			"order": 0,
			"structurePath": null
		}
	]
}
```
