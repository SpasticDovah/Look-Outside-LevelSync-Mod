# LevelSync — a Look Outside mod

Lets you swap in any companion without them being stuck at a low level. When a
companion joins your party, their level and EXP are raised to at least match
Sam's, or a configurable number of levels below.

## The problem

In Look Outside, you can unlock many companions, but only three can travel with
Sam at a time. Only the active party earns EXP. Companions waiting at the
apartment stay at whatever level they had when you left them.

On higher difficulties, that pushes you to pick an "A-team" early and never
change it. Every point of EXP spent on a companion you might bench later is EXP
your main fighters didn't get. A companion you skipped early on stays at
level 1–6 while the enemies keep getting harder. Most of the cast ends up
unused, along with their skills and dialogue.

## What the mod does

Whenever a companion joins the party, LevelSync checks their EXP against Sam's.
Sam is always in the party, so Sam's EXP is the total the party has earned. If
the companion is behind, they're raised to the target:

- **Default (`levelOffset: 1`):** they catch up to one level below Sam, with
  the same percentage progress toward the next level as Sam. Your active party
  keeps a small edge for having been there.
- **Configurable:** set `levelOffset` to `0` to match Sam's exact level and
  EXP, or to any `N` to catch up to level (Sam's level − N) with Sam's
  percentage progress. Because the target rises smoothly with Sam's EXP,
  there's no benefit to removing and re-adding a companion right after Sam
  levels up.

A few things it keeps fair:

- **Nobody is lowered.** A companion already above the target is left alone.
- **Skills arrive normally.** Class skills for each level gained are learned
  the usual way.
- **HP/MP percentage is kept,** so a caught-up companion doesn't join at a
  fraction of their new max HP.
- **The video game minigame isn't affected.** Its heroes (actors 29–37) and a
  few non-companion actors are excluded, and the minigames' own EXP rewards are
  untouched.

With this mod, picking your party comes down to who you want to bring, not who
you already spent EXP on.

## Why it works on join (technical)

Look Outside runs on RPG Maker MZ 1.8.1. RPG Maker has a "Reserve Members EXP"
option, but it only covers members who are in the party but not fighting.
Look Outside removes waiting companions from the party completely, so that
option can't reach them, and EXP can't flow to them while they wait.

Instead, the mod hooks `Game_Party.addActor`, the function the engine runs every
time anyone joins the party. That covers asking a companion at the apartment,
story joins, and joins that reset an actor. No map events are edited, so the
mod doesn't conflict with the game's story scripting.

The game's battle code gives full EXP to every party member, without splitting
it. That makes Sam's total exactly what any companion would have earned by
staying in the party.

## Install

Run from this folder in PowerShell:

```powershell
.\install.ps1                                  # default Steam location
.\install.ps1 -GameDir "D:\Games\Look Outside" # other location
.\install.ps1 -Uninstall                       # remove the mod
```

The installer:

- copies `LevelSync.js` and `LevelSync.config.json` into `<game>\js\plugins\`
- adds the mod to the end of the game's plugin list in `js\plugins.js`
- backs up the original list as `plugins.js.bak`

Running it again is safe and won't overwrite an edited config. A game update may
replace `plugins.js`, so rerun the installer after updating.

## Configuration

Edit `<game>\js\plugins\LevelSync.config.json`, then restart the game. Lines
starting with `//` are comments.

| Setting | Default | What it does |
|---|---|---|
| `enabled` | `true` | Turns the mod on or off |
| `levelOffset` | `1` | `0` = match Sam exactly. `N` = level (Sam's level − N), with Sam's % progress to the next level |
| `sourceActorId` | `1` | The character to catch up to (Sam) |
| `excludedActorIds` | `[27, 29–37, 40, 41]` | Characters never caught up (minigame heroes and non-companions) |
| `preserveHpMpRatio` | `true` | Keeps HP/MP percentage after leveling |
| `showLevelUpMessage` | `false` | Shows the usual "reached level X" message. Off by default because it can appear mid-conversation |

## EXP table

Every companion uses the same EXP curve as Sam (class `expParams [35, 0, 10, 10]`,
max level 20). These are the total EXP values needed to reach each level:

| Lv | EXP | Lv | EXP | Lv | EXP | Lv | EXP |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 1,099 | 11 | 6,446 | 16 | 18,640 |
| 2 | 35 | 7 | 1,732 | 12 | 8,272 | 17 | 22,058 |
| 3 | 134 | 8 | 2,561 | 13 | 10,390 | 18 | 25,824 |
| 4 | 326 | 9 | 3,610 | 14 | 12,816 | 19 | 29,944 |
| 5 | 639 | 10 | 4,898 | 15 | 15,563 | 20 | 34,422 |

**How the target is calculated:**

1. Sam's progress = (Sam's EXP − EXP for Sam's level) ÷ (EXP for Sam's next
   level − EXP for Sam's level).
2. Target level = Sam's level − `levelOffset`.
3. Target EXP = EXP for target level + ⌊(EXP for target level + 1 − EXP for
   target level) × Sam's progress⌋, rounded down.

**Example:** Sam is Lv 11 with 7,359 EXP, exactly 50% of the way from
6,446 to 8,272.

- `levelOffset: 0`: a companion joins at Lv 11 with 7,359 EXP.
- `levelOffset: 1`: Lv 10 with 4,898 + ⌊1,548 × 0.5⌋ = 5,672 EXP.
- `levelOffset: 2`: Lv 9 with 3,610 + ⌊1,288 × 0.5⌋ = 4,254 EXP.

If Sam is at max level (20), progress counts as 0. With offset 1, that means
Lv 19 with 29,944 EXP.

The mod doesn't hard-code this table. It calls the engine's own
`Game_Actor.expForLevel` while the game runs, so the numbers stay correct if the
curves ever change.

## Troubleshooting

Each catch-up is logged to the game's developer console, for example
`LevelSync: Xaria Lv 2 -> 13 (EXP 11000)`. `LevelSync.sync(actorId)` forces a
catch-up for one character from a script call or the console.
