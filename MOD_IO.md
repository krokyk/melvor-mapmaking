# Kroky's Mapmaking 2.0.1 mod.io upload copy

Use the listing fields and release notes below to publish version 2.0.1 on the existing Kroky's Mapmaking mod.io page.

## Listing name

Kroky's Mapmaking

## Summary

Batch Paper Making and dig-site Map Upgrading with separate 1–1000× multipliers.
Each normal-duration cycle performs more actions with their normal material costs, output, XP and bonuses.
Requires Atlas of Discovery.

## Full description

**Make more paper and upgrade dig-site maps in fewer timer cycles.**

Kroky's Mapmaking adds separate whole-number action multipliers for **Paper Making** and **Map Upgrading** in Cartography.
Choose any value from **1 to 1000** for each activity.
Both default to **1×**.

### How it works

Every normal-duration timer cycle attempts the configured number of ordinary actions.
Each action pays its normal material costs and grants its normal output or map progress, XP and reward rolls.

- **Paper Making at 10×:** if the recipe normally uses 1 log to make 4 paper, a full batch uses 10 logs, makes 40 paper and awards ten actions' XP in the time of one ordinary action.
  Normal preservation, doubling and other bonuses still apply independently to each action.
- **Map Upgrading at 10×:** attempts up to ten ordinary upgrade actions per cycle, with normal material costs and XP for every action.
  Costs update as the map advances through tiers, and tier benefits apply normally.

Batches stop early when materials run out, the skill stops, the selected recipe or map changes, or the map reaches Perfect.
If the game selects another map after reaching Perfect, its batch starts on the next timer completion.

### Settings

Open **Kroky's Mapmaking** settings in Melvor, select **Mapmaking**, and set:

- **Paper Making multiplier:** actions per Paper Making cycle.
- **Map Upgrade multiplier:** actions per Map Upgrade cycle.

Enter a whole number from **1 to 1000**.
**1×** performs one ordinary action per cycle.
Changes take effect at the next timer completion, and settings are saved with your character through Melvor's mod settings system.

### Requirements and compatibility

- Requires **Atlas of Discovery** and access to **Cartography**.
- Uses Melvor's native action processing for online and offline progress.
- Keeps normal interval bonuses and other mods' interval changes, including Speedup++.
- Respects Auto Cartographer's queued refill, resume and map-advance transitions when supported by its installed version.
  Older versions may produce surplus paper before switching tasks.
- Includes a fix for batches stopping after one action when Multitasking runs Cartography alongside combat or other skills.
- Surveying and initial map creation retain their normal behavior.

### Display notes

The Paper Making and Map Upgrade menus show a batch note when the multiplier is above 1×.
Native material, output and XP figures remain **per action**.
Other mods' rate and ETA displays may not account for batching.
Melvor's time-spent statistics count the ordinary duration of each batched action.

### Updating from 1.0.0

Version **2.0.0** replaces speed multipliers with action multipliers.
This avoids the game's minimum action-duration limit while preserving normal costs and rewards for every action performed.
Both new multipliers start at **1×**, so choose your preferred values after updating.

### Source

[Source code on GitHub](https://github.com/krokyk/melvor-mapmaking)

## Release version

2.0.1

## Release changelog

- Fix Paper Making and Map Upgrade batches stopping after one action when used with Multitasking.
- Check Cartography's own activity state so batches continue alongside other skills and still stop when Cartography is interrupted.

## Upload fields and assets

| Field | Value |
| --- | --- |
| Release file | [krokys-mapmaking-2.0.1.zip](krokys-mapmaking-2.0.1.zip) |
| Cover / logo | [krokys-mapmaking-cover.png](assets/krokys-mapmaking-cover.png) |
| Source URL | https://github.com/krokyk/melvor-mapmaking |
| Required expansion | Atlas of Discovery |
| Suggested categories | QoL, Cheat |
| Visibility | Private, for your existing owner-subscription setup |

Upload the ZIP as a new **2.0.1** release on the existing listing and make it the active release.
The summary is written as three sentences; paste them together into the single-line summary field.
Copy the content under **Full description** into the listing description, and the **Release changelog** bullets into the file upload changelog.

Verification status: 20 automated tests pass against mocked game APIs.
Map batching in version 2.0.1 was verified in the browser through Creator Toolkit with Multitasking and combat active: two 20-action batches added 40 upgrades, consumed 120 paper, and granted 576 Cartography XP.
Paper batching has automated coverage; mobile and offline batch execution have not been verified on a live character.

## Creator Toolkit iteration

Replace the existing local mod's ZIP and reload Melvor to test a build without publishing it.
The Toolkit entry keeps its existing name when the ZIP is replaced.
Unlinked local mods reset native settings after a reload.
To retain settings while using local builds, link the local entry to the existing mod.io listing and keep that listing subscribed and installed through mod.io.
See the [Creator Toolkit documentation](https://wiki.melvoridle.com/w/Mod_Creation/Creator_Toolkit).
