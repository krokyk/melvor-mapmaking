# Kroky's Mapmaking

A small Melvor Idle mod with separate integer action multipliers for Paper Making and dig-site Map Upgrading.
Requires Atlas of Discovery and access to Cartography.
Version: 2.0.2.
Internal namespace: `KrokyMapmaking`.
Melvor takes the displayed mod name from the mod.io listing.

## Settings

Open the mod's settings in Melvor and select the **Mapmaking** section.

| Setting | Default | Example |
| --- | --- | --- |
| Paper Making multiplier | 1 | 10 performs up to ten paper actions per normal-duration cycle |
| Map Upgrade multiplier | 1 | 10 performs up to ten upgrade actions per normal-duration cycle |

Enter a whole number from 1 to 1000.
The limit bounds work per cycle to keep the game responsive.
Decimals, zero, negative numbers, and values above 1000 are rejected.
Invalid values restored from a save act as 1.
Settings are saved through Melvor's native mod settings system.

## Behavior

- Action duration keeps the game's normal interval bonuses and other mods' interval changes, including Speedup++.
- Each completed cycle attempts the configured number of ordinary actions, paying each action's costs and granting its output or upgrade progress, XP, and normal reward rolls.
  For a recipe that normally consumes 1 log and produces 4 paper, 10× consumes 10 logs, produces 40 paper, and grants ten actions' XP in one normal-duration cycle, before preservation or other bonuses.
- Each action applies normal preservation and output bonuses independently.
  Map costs are recalculated as the map advances through tiers.
- Batches stop early if ingredients run out, the game stops the skill, the selected recipe or map changes, or the map reaches Perfect.
  Finishing a map preserves the game's choice of the next map, whose batch begins on the next timer completion.
- Settings changes apply at the next timer completion.
- The Paper Making and Map Upgrade menus show a batch note when their multiplier exceeds 1.
  Native cost, reward, and XP figures remain per action, and other mods' rate or ETA displays may not account for batching.
- Online and offline progress use the same native action callback.
  Native time-spent statistics count the ordinary duration of every batched action.
- Auto Cartographer's public queued-transition status is respected when available, allowing its refill, resume, and map-advance transitions to run before another batch.
  Older versions without this status field may produce surplus paper before their next transition.
- Batches use Cartography's own activity state, including when Multitasking runs it alongside combat or other skills.
- Surveying and initial map creation keep their existing behavior.

## Changes in 2.0.2

Batch summary text and visibility update only when their values change.

## Changes in 2.0.1

Fix Paper Making and Map Upgrade batches stopping after one action when Multitasking runs Cartography alongside another skill.
Batch continuation now checks Cartography's own activity, timer, mode, and selected target.

## Upgrading from 1.0.0

Version 2.0.0 replaces speed multipliers with action multipliers and removes this mod's interval reductions.
Both new settings start at **1×** rather than reusing old speed values, so updating does not unexpectedly consume materials in large batches.
Choose the desired multipliers after updating.

## Check and package

No dependencies or build step are required.
From this repository, run:

```powershell
node --test
Compress-Archive -LiteralPath manifest.json, setup.mjs -DestinationPath krokys-mapmaking-2.0.2.zip -Force
```

The ZIP contains only `manifest.json` and `setup.mjs`, both at its root.
The tests exercise the real setup module with mocked Melvor API boundaries; they do not run the game.
All 21 automated tests pass, including Paper Making and Map Upgrade batching when another activity owns the game's primary action.

## Cover artwork

Upload [assets/krokys-mapmaking-cover.png](assets/krokys-mapmaking-cover.png) as the mod.io listing's cover/logo image.
It is a 1672 × 941 PNG using Melvor's Cartography compass, dig-site map, and paper artwork as references.
The image is separate from the runtime mod ZIP.
See [cover notes](assets/cover-notes.md) for the source assets and generation prompt.

## Install privately through mod.io

Ready-to-paste summary, description, changelog and upload fields are in [MOD_IO.md](MOD_IO.md).

1. Sign in to mod.io using the same login method and email used for mod.io inside Melvor.
2. Open the existing **Kroky's Mapmaking** mod's management page and keep its visibility private.
3. Upload `krokys-mapmaking-2.0.2.zip` as a new file with version **2.0.2** and make it the active release.
4. Restart Melvor on each subscribed device and confirm the mod is enabled in the active mod profile.
5. Set the new Paper Making and Map Upgrade multipliers.

Use the same mod.io account on each device.
Version 2.0.1 map batching was verified in the browser through Creator Toolkit with Multitasking and combat active.
Two 20-action batches added 40 map upgrades, consumed 120 paper, and granted 576 Cartography XP.
Paper batching has automated coverage; mobile and offline batch execution have not been verified on a live character.

## Local iteration through Creator Toolkit

Replace the local mod's ZIP using its upload button, reload Melvor, and load your latest character save.
Toolkit preserves the entry's existing name when replacing a ZIP, so an entry named `krokys-mapmaking-2.0.0` can contain the 2.0.2 build.
Unlinked local mods reset their native settings after a reload, so re-enter the desired multipliers for local testing.
To retain settings, link the local entry to your existing mod.io listing and keep that listing subscribed and installed through mod.io, as described in the [Creator Toolkit documentation](https://wiki.melvoridle.com/w/Mod_Creation/Creator_Toolkit).
The local ZIP remains the development build; linking does not require publishing every edit.

## References

- [Melvor mod creation and private installation](https://wiki.melvoridle.com/w/Mod_Creation/Getting_Started)
- [Native settings and patch API](https://wiki.melvoridle.com/w/Mod_Creation/Mod_Context_API_Reference)
- [Cartography actions, costs, rewards, and timers](https://melvoridle.com/assets/js/built/cartography.js)
- [Native Paper Making and Map Upgrade menus](https://melvoridle.com/assets/js/built/cartographyMenu.js)
