//=============================================================================
// LevelSync.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [v1.0.0] Catches inactive party members up to Sam's level/EXP when they join.
 * @author SpasticDovah
 *
 * @help LevelSync.js
 *
 * Look Outside keeps inactive companions completely outside the party (they
 * wait at the apartment), so they never receive battle EXP, and the engine's
 * "Reserve Members EXP" option cannot help.
 *
 * This plugin hooks Game_Party.addActor. Whenever a companion joins the party
 * (by talking to them, through a story event, etc.), their EXP is raised to
 * a minimum based on Sam's current EXP. Nobody is ever lowered.
 *
 * Configuration lives in js/plugins/LevelSync.config.json:
 *
 *   enabled            true/false
 *   levelOffset        0 = match Sam's exact level and EXP.
 *                      N = catch up to level (Sam's level - N) with the
 *                          same % progress toward the next level as Sam.
 *   sourceActorId      Actor whose level is used as the reference (Sam = 1).
 *   excludedActorIds   Actors that are never synced.
 *   preserveHpMpRatio  Keep HP/MP percentage after leveling, so a
 *                      caught-up member doesn't join at 30% HP.
 *   showLevelUpMessage Show the standard "X reached level Y!" message.
 *
 * If the file is missing or invalid, built-in defaults are used.
 *
 * Place this plugin at the bottom of the plugin list.
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "LevelSync";
    const CONFIG_FILE = "LevelSync.config.json";

    const DEFAULTS = {
        enabled: true,
        levelOffset: 1,
        sourceActorId: 1,
        // 27 Fungus, 29-37 the in-game RPG heroes, 40 Betty, 41 placeholder
        excludedActorIds: [27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 40, 41],
        preserveHpMpRatio: true,
        showLevelUpMessage: false
    };

    //-------------------------------------------------------------------------
    // Config loading
    //-------------------------------------------------------------------------

    const stripLineComments = text =>
        text
            .split(/\r?\n/)
            .filter(line => !line.trim().startsWith("//"))
            .join("\n");

    const loadConfig = () => {
        const config = Object.assign({}, DEFAULTS);
        if (!Utils.isNwjs()) {
            return config;
        }
        try {
            const fs = require("fs");
            const path = require("path");
            const base = path.dirname(process.mainModule.filename);
            const file = path.join(base, "js", "plugins", CONFIG_FILE);
            if (!fs.existsSync(file)) {
                console.warn(`${PLUGIN_NAME}: ${file} not found, using defaults.`);
                return config;
            }
            const user = JSON.parse(stripLineComments(fs.readFileSync(file, "utf8")));
            for (const key of Object.keys(DEFAULTS)) {
                if (key in user) {
                    config[key] = user[key];
                }
            }
        } catch (e) {
            console.error(`${PLUGIN_NAME}: failed to read config, using defaults.`, e);
        }
        config.levelOffset = Math.max(0, Math.floor(Number(config.levelOffset) || 0));
        config.sourceActorId = Number(config.sourceActorId) || DEFAULTS.sourceActorId;
        config.excludedActorIds = (config.excludedActorIds || []).map(Number);
        return config;
    };

    const config = loadConfig();

    //-------------------------------------------------------------------------
    // Target EXP calculation
    //-------------------------------------------------------------------------

    // Fraction (0 to <1) of the way `actor` is from its current level to the next.
    const levelProgress = actor => {
        if (actor.isMaxLevel()) {
            return 0;
        }
        const start = actor.currentLevelExp();
        const span = actor.nextLevelExp() - start;
        return span > 0 ? Math.min(Math.max((actor.currentExp() - start) / span, 0), 1) : 0;
    };

    // Returns the minimum EXP `actor` should have, measured on the actor's
    // own EXP curve, or null if the actor should not be synced.
    // Target = level (Sam's level - offset), with the same fractional progress
    // toward the next level as Sam, so the target rises smoothly as Sam earns
    // EXP instead of jumping a whole level each time Sam levels up.
    const targetExpFor = (actor, source) => {
        const targetLevel = source.level - config.levelOffset;
        if (targetLevel < 1) {
            return null;
        }
        if (targetLevel >= actor.maxLevel()) {
            return actor.expForLevel(actor.maxLevel());
        }
        const start = actor.expForLevel(targetLevel);
        const span = actor.expForLevel(targetLevel + 1) - start;
        return start + Math.floor(span * levelProgress(source));
    };

    const syncActor = actor => {
        if (!config.enabled || !actor) {
            return;
        }
        const actorId = actor.actorId();
        if (actorId === config.sourceActorId || config.excludedActorIds.includes(actorId)) {
            return;
        }
        const source = $gameActors.actor(config.sourceActorId);
        if (!source) {
            return;
        }
        const target = targetExpFor(actor, source);
        if (target === null || actor.currentExp() >= target) {
            return;
        }
        const hpRate = actor.hpRate();
        const mpRate = actor.mpRate();
        const oldLevel = actor.level;
        actor.changeExp(target, config.showLevelUpMessage);
        if (config.preserveHpMpRatio && actor.isAlive()) {
            actor.setHp(Math.max(1, Math.round(actor.mhp * hpRate)));
            actor.setMp(Math.round(actor.mmp * mpRate));
        }
        console.log(
            `${PLUGIN_NAME}: ${actor.name()} Lv ${oldLevel} -> ${actor.level} (EXP ${actor.currentExp()})`
        );
    };

    //-------------------------------------------------------------------------
    // Hook
    //-------------------------------------------------------------------------

    const _Game_Party_addActor = Game_Party.prototype.addActor;
    Game_Party.prototype.addActor = function(actorId) {
        const isNew = !this._actors.includes(actorId);
        if (isNew) {
            // Sync before joining so battle refresh sees the final stats.
            syncActor($gameActors.actor(actorId));
        }
        _Game_Party_addActor.call(this, actorId);
    };

    // Exposed for script calls / debugging: LevelSync.sync(actorId)
    window.LevelSync = {
        config,
        sync: actorId => syncActor($gameActors.actor(actorId))
    };
})();
