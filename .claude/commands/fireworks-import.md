---
name: fireworks-import
description: Convert any fireworks list (plain text, spreadsheet paste, notes) into a CSV ready to import into FireworksFX. Ask the user to share their data, then output a properly formatted CSV with the correct column headers and values.
---

# Fireworks Import Helper

Help the user prepare fireworks data for import into FireworksFX.

## What to do

When invoked, ask the user to paste or describe their fireworks list in any format (plain text, their own spreadsheet columns, notes, etc.). Then convert it into a properly formatted CSV they can save and import using the app's Import button.

## Output format

Produce a CSV with these exact column headers in this order:

```
Name,Type,Cost ($),Duration (sec),Phase,Notes / Effects,Rating (1-10),Quantity
```

## Column rules

**Name** (required)
- The firework product name exactly as sold

**Type** — use one of these exact values (auto-detect from context if not given):
- `200g Cake` — small-to-mid cake, typically under $30
- `500g Cake` — large cake, typically $30+
- `Fountain` — ground fountain
- `Reload/Mortar` — mortar shell or reload
- `Roman Candle` — roman candle
- `Misc` — smoke bombs, parachutes, novelties, anything else

**Cost ($)** — numeric only, no $ sign (e.g. `25`, `12.99`)

**Duration (sec)** — seconds as a number (e.g. `30`, `90`). Convert m:ss to seconds if needed. If unknown, leave blank.

**Phase** — use one of these exact values (use context clues like "opener", "body", "mid finale", "finale" to guess):
- `Opening` — first few items, crowd-warmer
- `Main Show` — bulk of the show
- `Mid-Finale` — the build-up section before the big finale
- `Finale` — the closing barrage
- `Other` — doesn't fit a phase

**Rating (1-10)** — personal rating if known, otherwise leave blank

**Quantity** — how many of this item (default 1 if not specified)

**Notes / Effects** — describe the visual/audio effect in plain English (mines, crackle, breaks, salutes, color, etc.)

## Example output

```csv
Name,Type,Cost ($),Duration (sec),Phase,Notes / Effects,Rating (1-10),Quantity
Bling Bling,200g Cake,13,30,Main Show,"36 shot, fast with lots of variation, starts soft gets loud",8,3
Snow Cone,Fountain,20,60,Opening,"big, lots of variation",7.5,1
Alien Disco,Misc,10,15,Main Show,crowd favorite,10,1
Hydrogen Bomb,500g Cake,30,30,Mid-Finale,"whistle, 6 at a time, unique",7.5,1
Fancy Freedom,500g Cake,100,30,Finale,"triple 500g cake, big, starts fast, fan",8,1
```

## After generating the CSV

Tell the user:
1. Save the output as a `.csv` file (e.g. `fireworks.csv`)
2. Open FireworksFX → **Inventory** tab → **Import** button
3. Drop the file in, confirm column mappings, and click **Add to Inventory**

Or they can copy the CSV into a spreadsheet app and save as `.xlsx` — both formats work.
