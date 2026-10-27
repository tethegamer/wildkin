/**
 * WILDKIN: AETHER BOUND — Complete Handheld RPG Engine
 * Pure Battle Math, 2D Tile Overworld, Turn-Based Combat, Prism Capture,
 * 3-Stage Evolution, Sanctuary Vault, KinDex, Wardens & Cloud/PvP Sync.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const dataMod = typeof root.WILDKIN_DATA !== 'undefined' ? root.WILDKIN_DATA : require('./data.js');
    module.exports = factory(root, dataMod);
  } else {
    root.WILDKIN_GAME = factory(root, root.WILDKIN_DATA);
  }
})(typeof self !== 'undefined' ? self : this, function (root, DATA) {
  'use strict';

  const SAVE_KEY = 'wildkin_aether_bound_save_v1';

  // Ensure cross-file aliases exist in browser
  if (typeof window !== 'undefined') {
    if (window.WILDKIN_AUDIO && !window.WildkinAudio) {
      window.WildkinAudio = window.WILDKIN_AUDIO;
    }
    if (window.WILDKIN_MAPS && !window.WILDKIN_MAPS.ZONES) {
      window.WILDKIN_MAPS.ZONES = window.WILDKIN_MAPS.ZONE_MAPS;
    }
  }

  // =========================================================================
  // 1. PURE BATTLE & CAPTURE MATH HELPERS
  // =========================================================================

  function resolveMove(moveInput) {
    if (!moveInput) return (DATA && DATA.MOVES && DATA.MOVES.clawSwipe) || { id: 'clawSwipe', name: 'Claw Swipe', affinity: 'Terra', power: 40, accuracy: 100 };
    if (typeof moveInput === 'string') {
      return (DATA && DATA.MOVES && DATA.MOVES[moveInput]) || { id: moveInput, name: moveInput, affinity: 'Terra', power: 45, accuracy: 100 };
    }
    return moveInput;
  }

  function resolveAffinity(combatant) {
    if (!combatant) return 'Terra';
    if (combatant.affinity) return combatant.affinity;
    if (DATA && DATA.getSpeciesById && combatant.speciesId) {
      return DATA.getSpeciesById(combatant.speciesId).affinity;
    }
    return 'Terra';
  }

  /**
   * Calculates turn-based attack damage, STAB, elemental affinity multiplier,
   * status modifiers (burn/soak), and critical hit.
   */
  function calculateDamage(attacker, defender, moveInput, opts = {}) {
    const move = resolveMove(moveInput);
    if (!move || !move.power || move.power <= 0 || move.category === 'status') {
      return {
        damage: 0,
        multiplier: 1.0,
        isCrit: false,
        stab: false,
        effectiveness: 'neutral'
      };
    }

    const atkAffinity = resolveAffinity(attacker);
    const defAffinity = resolveAffinity(defender);
    const moveAffinity = move.affinity || atkAffinity;

    const level = Math.max(1, Number((attacker && attacker.level) || 5));
    let atkStat = Math.max(1, Number((attacker && (attacker.atk || attacker.attack)) || 18));
    let defStat = Math.max(1, Number((defender && (defender.def || defender.defense)) || 16));

    // Apply in-battle stat buffs
    if (attacker && attacker.buffs && attacker.buffs.atk) {
      atkStat *= attacker.buffs.atk;
    }
    if (defender && defender.buffs && defender.buffs.def) {
      defStat *= defender.buffs.def;
    }

    // Status modifiers: Burn lowers attacker physical power; Soak softens defender guard
    if (attacker && attacker.status === 'burn' && move.category !== 'special') {
      atkStat *= 0.8;
    }
    if (defender && defender.status === 'soak') {
      defStat *= 0.85;
    }

    const stab = moveAffinity === atkAffinity;
    const stabMult = stab ? 1.25 : 1.0;
    const typeMult = DATA && DATA.getTypeMultiplier
      ? DATA.getTypeMultiplier(moveAffinity, defAffinity)
      : 1.0;

    const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
    const critChance = 0.08 + Number(move.critBonus || 0);
    const isCrit = opts.forceCrit !== undefined ? Boolean(opts.forceCrit) : (rng() < critChance);
    const critMult = isCrit ? 1.5 : 1.0;

    const variance = opts.noVariance ? 1.0 : (0.9 + rng() * 0.16);
    const base = (((2 * level) / 5 + 2) * move.power * (atkStat / defStat)) / 18 + 2;
    const rawDamage = base * stabMult * typeMult * critMult * variance;
    const damage = Math.max(1, Math.round(rawDamage));

    let effectiveness = 'neutral';
    if (typeMult > 1.0) effectiveness = 'super';
    else if (typeMult < 1.0) effectiveness = 'resist';

    return {
      damage,
      multiplier: typeMult,
      isCrit,
      stab,
      effectiveness
    };
  }

  /**
   * Calculates Aether Prism capture probability (0.05 to 0.98)
   * Scales with missing HP ratio, Prism multiplier, status bonus, and species catchRate.
   */
  function calculateCatchChance(enemy, prismInput) {
    if (!enemy) return 0.5;
    let prism = prismInput;
    if (typeof prismInput === 'string' && DATA && DATA.ITEMS) {
      prism = DATA.ITEMS[prismInput] || DATA.ITEMS.basicPrism;
    }
    const prismMult = Number((prism && (prism.catchMod || prism.catchMult)) || 1.0);

    const maxHp = Math.max(1, Number(enemy.maxHp || 30));
    const currentHp = Math.max(0, Math.min(maxHp, Number(enemy.currentHp !== undefined ? enemy.currentHp : (enemy.hp !== undefined ? enemy.hp : maxHp))));
    const missingRatio = (maxHp - currentHp) / maxHp; // 0.0 at full HP, ~1.0 at 1 HP

    let baseCatchRate = Number(enemy.catchRate || 0);
    if (!baseCatchRate && DATA && DATA.getSpeciesById && enemy.speciesId) {
      baseCatchRate = DATA.getSpeciesById(enemy.speciesId).catchRate || 0.45;
    }
    if (!baseCatchRate) baseCatchRate = 0.45;

    const hpFactor = 0.35 + missingRatio * 1.65;
    const statusBonus = enemy.status ? 1.35 : 1.0;

    const rawChance = baseCatchRate * hpFactor * prismMult * statusBonus;
    return Math.max(0.05, Math.min(0.98, Number(rawChance.toFixed(4))));
  }

  // =========================================================================
  // 2. GAME STATE & PERSISTENCE
  // =========================================================================

  function createInitialState(starterSpeciesId = null) {
    const baseState = {
      started: false,
      trainerName: 'Rowan’s Apprentice',
      selectedStarterId: starterSpeciesId || 1,
      zone: 'meadow',
      pos: { x: 7, y: 6, dir: 'down' },
      shards: 250,
      gems: 50,
      shrineCooldownUntil: 0,
      regenBoostUntil: 0,
      xpBoostUntil: 0,
      vipShrinePass: false,
      hatchBoostReady: false,
      marketTab: 'recovery',
      selectedMarketKinIdx: 0,
      activeCheckoutBundleId: null,
      bagTier: 0,
      maxSquadSize: 4,
      maxVaultSize: 8,
      inventory: {
        basicPrism: 6,
        greaterPrism: 2,
        masteryPrism: 0,
        bagUpgrade1: 0,
        bagUpgrade2: 0,
        bagUpgrade3: 0,
        dewTonic: 3,
        vitalTonic: 2,
        hiTonic: 1,
        hyperTonic: 0,
        reviveLeaf: 1,
        phoenixDew: 1,
        sunberryRation: 3,
        heartwoodStew: 1,
        feastPlatter: 0,
        heartwoodBerry: 2,
        apexNectar: 0,
        aetherCandy: 1,
        apexTome: 0,
        xpBooster2x: 0,
        hatchAccelerator: 0
      },
      squad: [],
      vault: [],
      kindexSeen: {},
      kindexBound: {},
      crests: [],
      defeatedTamers: {},
      stats: {
        battlesWon: 0,
        kinBound: 0,
        stepsTaken: 0,
        kinBred: 0,
        evolutions: 0,
        foodFed: 0,
        radiantBound: 0,
        tradesDone: 0
      },
      storyChapter: 1,
      storyModalTab: 'story',
      claimedChapters: {},
      claimedSideQuests: {},
      claimedTasks: {},
      battlePassXp: 120,
      battlePassGold: false,
      claimedBpFree: {},
      claimedBpGold: {},
      loginStreak: 1,
      claimedLoginDays: {},
      unlockedOutfits: { homestead_tunic: true, crimson_vanguard: true },
      equippedOutfit: 'homestead_tunic',
      unlockedEmotes: { emote_wave: true, emote_fire: true, emote_hype: true },
      completedTrades: {},
      wildSpawns: [],
      spireFloor: 1,
      ranchTab: 'care',
      breedParentA: null,
      breedParentB: null,
      cloudCode: null
    };

    if (starterSpeciesId && DATA && DATA.createKinInstance) {
      const starter = DATA.createKinInstance(starterSpeciesId, 5, {
        isRadiant: false,
        caughtZone: 'Sunleaf Sanctuary'
      });
      baseState.started = true;
      baseState.squad = [starter];
      baseState.kindexSeen[starter.speciesId] = true;
      baseState.kindexBound[starter.speciesId] = true;
      baseState.stats.kinBound = 1;
    }

    return baseState;
  }

  let state = createInitialState();
  let battleState = null;
  let evoQueue = [];
  let activeEvo = null;
  let toastTimeout = null;
  let animTick = 0;
  let lastFrameTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const heldDirs = { up: false, down: false, left: false, right: false };
  const dragSteer = { active: false, startX: 0, startY: 0, vx: 0, vy: 0, pointerId: null, moved: false };
  const playerMotion = {
    x: 7,
    y: 6,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    targetX: null,
    targetY: null,
    targetNpc: null,
    grassDist: 0,
    encounterGraceUntil: 0,
    syncedZone: null
  };

  function grantEncounterGrace(durationMs = 4500) {
    playerMotion.encounterGraceUntil = Date.now() + durationMs;
    playerMotion.grassDist = 0;
    playerMotion.vx = 0;
    playerMotion.vy = 0;
    playerMotion.speed = 0;
    playerMotion.targetX = null;
    playerMotion.targetY = null;
    playerMotion.targetNpc = null;
    heldDirs.up = false;
    heldDirs.down = false;
    heldDirs.left = false;
    heldDirs.right = false;
    dragSteer.active = false;
    dragSteer.moved = false;
    if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);
  }

  function relocateAndRerollRoamer(ws, zoneId = state.zone) {
    if (!ws) return;
    const rolled = rollWildSpeciesForZone(zoneId);
    ws.speciesId = rolled.speciesId;
    ws.level = rolled.level;
    ws.isRadiant = Math.random() < 0.08;
    ws.cooldownUntil = Date.now() + 6500;
    let bestTile = { x: ws.homeX === 3 ? 12 : 3, y: ws.homeY === 3 ? 8 : 4 };
    let bestDist = -1;
    if (root.WILDKIN_MAPS) {
      for (let y = 1; y < root.WILDKIN_MAPS.MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < root.WILDKIN_MAPS.MAP_WIDTH - 1; x++) {
          const ch = root.WILDKIN_MAPS.getTileAt(zoneId, x, y);
          if (ch === "G" || ch === "F") {
            const d = Math.hypot(x - playerMotion.x, y - playerMotion.y);
            if (d > bestDist) {
              bestDist = d;
              bestTile = { x, y };
            }
          }
        }
      }
    }
    ws.homeX = bestTile.x;
    ws.homeY = bestTile.y;
    ws.x = bestTile.x;
    ws.y = bestTile.y;
    if (root.WILDKIN_3D && typeof root.WILDKIN_3D.syncWildSpawns === "function" && DATA) {
      root.WILDKIN_3D.syncWildSpawns(state.wildSpawns, DATA.getSpeciesById);
    }
  }

  function syncMotionFromState() {
    playerMotion.x = state.pos.x;
    playerMotion.y = state.pos.y;
    playerMotion.vx = 0;
    playerMotion.vy = 0;
    playerMotion.speed = 0;
    playerMotion.targetX = null;
    playerMotion.targetY = null;
    playerMotion.targetNpc = null;
    if (root.WILDKIN_3D) {
      root.WILDKIN_3D.setTargetBeacon(0, 0, false);
    }
  }

  function isTilePassableFloat(fx, fy) {
    if (!root.WILDKIN_MAPS) return true;
    const tx = Math.round(fx);
    const ty = Math.round(fy);
    if (tx < 0 || tx >= root.WILDKIN_MAPS.MAP_WIDTH || ty < 0 || ty >= root.WILDKIN_MAPS.MAP_HEIGHT) return false;
    const ch = root.WILDKIN_MAPS.getTileAt(state.zone, tx, ty);
    return ch !== "T" && ch !== "#" && ch !== "~";
  }

  function findNearbyNpcFloat(fx, fy, maxRadius = 1.35) {
    if (!root.WILDKIN_MAPS) return null;
    const mapObj = root.WILDKIN_MAPS.ZONE_MAPS[state.zone];
    if (!mapObj) return null;
    let best = null;
    let bestDist = maxRadius;
    Object.entries(mapObj.npcs || {}).forEach(([coord, npc]) => {
      const [nx, ny] = coord.split(",").map(Number);
      const d = Math.hypot(fx - nx, fy - ny);
      if (d <= bestDist) {
        bestDist = d;
        best = Object.assign({ x: nx, y: ny }, npc);
      }
    });
    Object.entries(mapObj.portals || {}).forEach(([coord, p]) => {
      const [px, py] = coord.split(",").map(Number);
      const d = Math.hypot(fx - px, fy - py);
      if (d <= bestDist) {
        bestDist = d;
        best = {
          id: `portal_${state.zone}_${px}_${py}`,
          name: p.label || `Portal → ${p.targetZone}`,
          type: 'portal',
          icon: '🌀',
          targetZone: p.targetZone,
          targetX: p.targetX,
          targetY: p.targetY,
          label: p.label,
          x: px,
          y: py
        };
      }
    });
    return best;
  }

  function spawnBattleDamagePopup(targetSide, damage, isCrit, effectiveness) {
    const layer = $("battleDamageLayer");
    const flash = $("battleImpactFlash");
    if (flash) {
      flash.classList.add("active");
      setTimeout(() => flash.classList.remove("active"), 160);
    }
    if (!layer) return;
    const el = document.createElement("div");
    let cls = "dmg-popup";
    if (isCrit) cls += " crit";
    else if (effectiveness === "super") cls += " super";
    el.className = cls;
    el.style.left = targetSide === "enemy" ? "66%" : "34%";
    el.style.top = targetSide === "enemy" ? "36%" : "62%";

    let sub = "";
    if (isCrit && effectiveness === "super") sub = "<span class=\"dmg-subtag\">⚡ CRITICAL • 2x SUPER EFFECTIVE!</span>";
    else if (isCrit) sub = "<span class=\"dmg-subtag\">⚡ CRITICAL HIT!</span>";
    else if (effectiveness === "super") sub = "<span class=\"dmg-subtag\">🔥 SUPER EFFECTIVE!</span>";
    else if (effectiveness === "resist") sub = "<span class=\"dmg-subtag\">🛡️ RESISTED</span>";

    el.innerHTML = `${sub}-${damage}!`;
    layer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 950);
  }

  function saveGame() {
    try {
      if (typeof localStorage !== 'undefined' && state.started) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      }
    } catch (e) {}
  }

  function loadGame() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.started && Array.isArray(parsed.squad) && parsed.squad.length > 0) {
        return parsed;
      }
    } catch (e) {}
    return null;
  }

  function markSeen(speciesId) {
    state.kindexSeen[Number(speciesId)] = true;
  }

  function markBound(speciesId, isRadiant = false) {
    const id = Number(speciesId);
    state.kindexSeen[id] = true;
    state.kindexBound[id] = true;
    if (!state.stats) state.stats = { battlesWon: 0, kinBound: 0, stepsTaken: 0, kinBred: 0, evolutions: 0, foodFed: 0, radiantBound: 0, tradesDone: 0 };
    state.stats.kinBound = Object.keys(state.kindexBound).length;
    if (isRadiant) {
      state.stats.radiantBound = (state.stats.radiantBound || 0) + 1;
    }
  }

  function getMaxSquadSize(st = state) {
    return Math.max(4, Number((st && st.maxSquadSize) || 4));
  }

  function getMaxVaultSize(st = state) {
    return Math.max(8, Number((st && st.maxVaultSize) || 8));
  }

  function upgradeKinBag(bagItemId, st = state) {
    if (!st || !DATA || !DATA.ITEMS) return { ok: false, reason: "invalid_state" };
    const item = DATA.ITEMS[bagItemId];
    if (!item || item.category !== "bag") return { ok: false, reason: "invalid_bag_item" };
    if (!st.inventory) st.inventory = {};
    const curTier = Number(st.bagTier || 0);
    if (curTier >= item.bagTier && Number(st.maxSquadSize || 4) >= item.maxSquadSize) {
      return { ok: false, reason: "already_upgraded" };
    }
    if ((st.inventory[bagItemId] || 0) > 0) {
      st.inventory[bagItemId] -= 1;
    }
    st.bagTier = Math.max(curTier, Number(item.bagTier || 1));
    st.maxSquadSize = Math.max(Number(st.maxSquadSize || 4), Number(item.maxSquadSize || 5));
    st.maxVaultSize = Math.max(Number(st.maxVaultSize || 8), Number(item.maxVaultSize || 16));
    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`🎒 Equipped ${item.name}! Active Squad expanded to ${st.maxSquadSize} Kin & Reserve Bag to ${st.maxVaultSize}!`, 3600);
    }
    return {
      ok: true,
      bagTier: st.bagTier,
      maxSquadSize: st.maxSquadSize,
      maxVaultSize: st.maxVaultSize
    };
  }

  function getBattlePassLevel(st = state) {
    const xp = Number((st && st.battlePassXp) || 0);
    const tiers = (DATA && DATA.BATTLE_PASS_TIERS) || [];
    let lvl = 1;
    for (const t of tiers) {
      if (xp >= t.xpRequired) lvl = t.tier;
    }
    return lvl;
  }

  function addBattlePassXp(amount, st = state) {
    if (!st) return 1;
    const prevLv = getBattlePassLevel(st);
    st.battlePassXp = Number(st.battlePassXp || 0) + Math.max(0, Number(amount || 0));
    const newLv = getBattlePassLevel(st);
    if (st === state && newLv > prevLv) {
      showToast(`🎖️ Battle Pass Tier Up! Reached Tier ${newLv}/20 — Claim your rewards in 🎖️ Pass!`, 3400);
    }
    return newLv;
  }

  function grantRewardBundle(rew, st = state) {
    if (!rew || !st) return;
    if (!st.inventory) st.inventory = {};
    if (!st.unlockedOutfits) st.unlockedOutfits = { homestead_tunic: true };
    if (!st.unlockedEmotes) st.unlockedEmotes = { emote_wave: true };
    if (rew.shards) st.shards = Number(st.shards || 0) + Number(rew.shards);
    if (rew.gems) st.gems = Number(st.gems || 0) + Number(rew.gems);
    if (rew.items && typeof rew.items === "object") {
      Object.entries(rew.items).forEach(([k, q]) => {
        st.inventory[k] = Number(st.inventory[k] || 0) + Number(q || 0);
      });
    }
    const oId = rew.outfitId || rew.unlockOutfit;
    if (oId) {
      st.unlockedOutfits[oId] = true;
      if (oId === "astral_sovereign") st.unlockedOutfits.sovereign_regalia = true;
      if (oId === "sovereign_regalia") st.unlockedOutfits.astral_sovereign = true;
    }
    const eId = rew.emoteId || rew.unlockEmote;
    if (eId) {
      st.unlockedEmotes[eId] = true;
    }
  }

  function claimDailyLoginReward(dayNumber, st = state) {
    if (!st || !DATA || !DATA.DAILY_LOGIN_REWARDS) return { ok: false, reason: "no_data" };
    if (!st.claimedLoginDays) st.claimedLoginDays = {};
    const targetDay = Number(dayNumber || st.loginStreak || 1);
    const entry = DATA.DAILY_LOGIN_REWARDS.find((d) => d.day === targetDay);
    if (!entry) return { ok: false, reason: "invalid_day" };
    if (st.claimedLoginDays[targetDay]) return { ok: false, reason: "already_claimed" };

    st.claimedLoginDays[targetDay] = true;
    grantRewardBundle(entry, st);
    st.loginStreak = Math.min(7, Math.max(Number(st.loginStreak || 1), targetDay + 1));
    addBattlePassXp(50, st);

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`🎁 Claimed ${entry.title}: ${entry.label}! (+50 BP XP)`, 3500);
    }
    return { ok: true, day: targetDay, reward: entry };
  }

  function claimBattlePassTier(tierNumber, track = "free", st = state) {
    if (!st || !DATA || !DATA.BATTLE_PASS_TIERS) return { ok: false, reason: "no_data" };
    const tNum = Number(tierNumber);
    const tierObj = DATA.BATTLE_PASS_TIERS.find((t) => t.tier === tNum);
    if (!tierObj) return { ok: false, reason: "invalid_tier" };
    if (Number(st.battlePassXp || 0) < tierObj.xpRequired) {
      return { ok: false, reason: "insufficient_bp_xp" };
    }
    if (!st.claimedBpFree) st.claimedBpFree = {};
    if (!st.claimedBpGold) st.claimedBpGold = {};

    if (track === "gold") {
      if (!st.battlePassGold) return { ok: false, reason: "gold_locked" };
      if (st.claimedBpGold[tNum]) return { ok: false, reason: "already_claimed" };
      st.claimedBpGold[tNum] = true;
      grantRewardBundle(tierObj.gold, st);
    } else {
      if (st.claimedBpFree[tNum]) return { ok: false, reason: "already_claimed" };
      st.claimedBpFree[tNum] = true;
      grantRewardBundle(tierObj.free, st);
    }

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      const rew = track === "gold" ? tierObj.gold : tierObj.free;
      showToast(`🎖️ Claimed Battle Pass Tier ${tNum} (${track.toUpperCase()}): ${rew.label}!`, 3400);
    }
    return { ok: true, tier: tNum, track };
  }

  function unlockGoldBattlePass(st = state) {
    if (!st) return { ok: false };
    if (st.battlePassGold) return { ok: true, already: true };
    if (Number(st.gems || 0) < 200) {
      if (st === state) showToast("Need 200 💎 Aether Gems to unlock the Gold Battle Pass Track!");
      return { ok: false, reason: "insufficient_gems" };
    }
    st.gems -= 200;
    st.battlePassGold = true;
    addBattlePassXp(240, st);
    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast("👑 Unlocked Season 1 GOLD BATTLE PASS +240 Bonus BP XP!", 3800);
    }
    return { ok: true };
  }

  function equipOutfit(outfitId, st = state) {
    if (!st || !DATA || !DATA.TAMER_OUTFITS) return { ok: false, reason: "no_data" };
    const normId = outfitId === "sovereign_regalia" ? "astral_sovereign" : outfitId;
    const outfit = DATA.TAMER_OUTFITS.find((o) => o.id === normId || o.id === outfitId);
    if (!outfit) return { ok: false, reason: "invalid_outfit" };
    if (!st.unlockedOutfits) st.unlockedOutfits = { homestead_tunic: true };
    if (!st.unlockedOutfits[outfitId]) {
      return { ok: false, reason: "locked" };
    }
    st.equippedOutfit = outfitId;
    if (st === state) {
      if (root.WILDKIN_3D && typeof root.WILDKIN_3D.syncPlayerOutfit === "function") {
        root.WILDKIN_3D.syncPlayerOutfit(outfit);
      }
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(680, 0.06);
      saveGame();
      updateHud();
      showToast(`👕 Equipped 3D Outfit: ${outfit.icon} ${outfit.name}!`, 2800);
    }
    return { ok: true, outfit };
  }

  let emoteTimer = null;
  function triggerEmote(emoteId, st = state) {
    if (!DATA || !DATA.TAMER_EMOTES) return { ok: false };
    const em = DATA.TAMER_EMOTES.find((e) => e.id === emoteId) || DATA.TAMER_EMOTES[0];
    if (typeof document !== "undefined") {
      const bubble = $("playerEmoteBubble");
      if (bubble) {
        bubble.textContent = `${em.icon} ${em.bubbleText}`;
        bubble.classList.remove("hidden");
        if (emoteTimer) clearTimeout(emoteTimer);
        emoteTimer = setTimeout(() => {
          bubble.classList.add("hidden");
        }, 2300);
      }
      const wheel = $("emoteWheelPopover");
      if (wheel) wheel.classList.add("hidden");
    }
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(760, 0.08);
    return { ok: true, emote: em };
  }

  function executeNpcTrade(tradeId, st = state) {
    if (!st || !DATA || !DATA.NPC_TRADES) return { ok: false, reason: "no_data" };
    const offer = DATA.NPC_TRADES.find((t) => t.id === tradeId);
    if (!offer) return { ok: false, reason: "invalid_trade" };
    if (!st.completedTrades) st.completedTrades = {};
    if (st.completedTrades[tradeId]) return { ok: false, reason: "already_traded" };

    // Find requested Kin by wantsSpeciesId OR wantsAffinity (or any extra Kin in squad/vault)
    const matchesOffer = (k) => {
      if (!k) return false;
      if (offer.wantsSpeciesId && Number(k.speciesId) === Number(offer.wantsSpeciesId)) return true;
      const sp = DATA.getSpeciesById(k.speciesId);
      if (offer.wantsAffinity && sp && sp.affinity === offer.wantsAffinity) return true;
      return false;
    };
    let fromSquadIdx = (st.squad || []).findIndex(matchesOffer);
    let fromVaultIdx = (st.vault || []).findIndex(matchesOffer);
    if (fromSquadIdx === -1 && fromVaultIdx === -1 && (st.squad || []).length >= 2) {
      fromSquadIdx = st.squad.length - 1;
    }

    const totalKin = ((st.squad && st.squad.length) || 0) + ((st.vault && st.vault.length) || 0);
    if (fromSquadIdx === -1 && fromVaultIdx === -1) {
      return { ok: false, reason: "missing_wanted_species", wantedSpeciesId: offer.wantsSpeciesId };
    }
    if (fromSquadIdx !== -1 && (st.squad || []).length <= 1 && fromVaultIdx === -1) {
      // Replace the 1 squad kin directly so player still has at least 1 Kin
    }

    const receivedKin = DATA.createKinInstance(offer.offersSpeciesId, offer.offersLevel || 10, {
      nickname: offer.offersNickname,
      geneticTier: offer.offersGeneticTier || "A",
      isRadiant: Boolean(offer.isRadiant),
      caughtZone: `Traded w/ ${offer.npcName}`
    });

    if (fromVaultIdx !== -1) {
      st.vault.splice(fromVaultIdx, 1, receivedKin);
    } else if (fromSquadIdx !== -1) {
      st.squad.splice(fromSquadIdx, 1, receivedKin);
    }

    st.completedTrades[tradeId] = true;
    if (!st.stats) st.stats = { battlesWon: 0, kinBound: 0, stepsTaken: 0, kinBred: 0, evolutions: 0, foodFed: 0, radiantBound: 0, tradesDone: 0 };
    st.stats.tradesDone = (st.stats.tradesDone || 0) + 1;
    if (offer.bonusItem && st.inventory) {
      st.inventory[offer.bonusItem] = (st.inventory[offer.bonusItem] || 0) + 1;
    }
    st.kindexSeen[receivedKin.speciesId] = true;
    st.kindexBound[receivedKin.speciesId] = true;
    st.stats.kinBound = Object.keys(st.kindexBound).length;
    addBattlePassXp(65, st);

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`🔄 Trade Complete! Received ${receivedKin.nickname} (${receivedKin.geneticTier}-Rank Lv.${receivedKin.level}) from ${offer.npcName}!`, 3800);
    }
    return { ok: true, receivedKin, offer };
  }

  function evaluateQuestMetric(metric, st = state) {
    if (!st) return 0;
    const stats = st.stats || {};
    const allKin = (st.squad || []).concat(st.vault || []);
    if (metric === "kinBound" || metric === "kindexCount" || metric === "wildCaught" || metric === "trapsThrown") return Object.keys(st.kindexBound || {}).length;
    if (metric === "totalKinOwned") return allKin.length;
    if (metric === "battlesWon") return Number(stats.battlesWon || 0);
    if (metric === "stepsTaken") return Number(stats.stepsTaken || 0);
    if (metric === "kinBred" || metric === "eggsHatched") return Number(stats.kinBred || 0);
    if (metric === "evolutions" || metric === "evolutionsTriggered") return Number(stats.evolutions || 0);
    if (metric === "foodFed") return Number(stats.foodFed || 0);
    if (metric === "radiantBound" || metric === "radiantCount") {
      const hasRad = allKin.filter((k) => k && k.isRadiant).length;
      return Math.max(Number(stats.radiantBound || 0), hasRad);
    }
    if (metric === "tradesDone" || metric === "kinTraded") return Number(stats.tradesDone || 0);
    if (metric === "crestsEarned" || metric === "badgesCount") return (st.crests || []).length;
    if (metric === "spireFloor") return Number(st.spireFloor || 1);
    if (metric === "bagTier") return Number(st.bagTier || 0);
    if (metric === "maxBond" || metric === "maxBondLevel") return allKin.reduce((m, k) => Math.max(m, Number((k && k.bondLevel) || 1)), 1);
    if (metric === "sRankBred") return allKin.filter((k) => k && (k.geneticTier === "S" || k.geneticTier === "SS")).length;
    if (metric === "maxLevel") return allKin.reduce((m, k) => Math.max(m, Number((k && k.level) || 1)), 1);
    if (metric === "highRankCount") {
      return allKin.filter((k) => k && (k.geneticTier === "A" || k.geneticTier === "S" || k.geneticTier === "SS")).length;
    }
    return 0;
  }

  function claimSideQuest(questId, st = state) {
    if (!st || !DATA || !DATA.SIDE_QUESTS) return { ok: false, reason: "no_data" };
    const sq = DATA.SIDE_QUESTS.find((q) => q.id === questId);
    if (!sq) return { ok: false, reason: "not_found" };
    if (!st.claimedSideQuests) st.claimedSideQuests = {};
    if (st.claimedSideQuests[questId]) return { ok: false, reason: "already_claimed" };
    const progress = evaluateQuestMetric(sq.metric, st);
    if (progress < sq.target) return { ok: false, reason: "incomplete", progress, target: sq.target };

    st.claimedSideQuests[questId] = true;
    grantRewardBundle({ shards: sq.rewardShards, gems: sq.rewardGems, items: sq.rewardItems }, st);
    addBattlePassXp(75, st);

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`🗺️ Side Quest Complete: ${sq.title}! +${sq.rewardShards}🪙 +${sq.rewardGems || 0}💎 & +75 BP XP!`, 3600);
    }
    return { ok: true, quest: sq };
  }

  function claimTamerTask(taskId, st = state) {
    if (!st || !DATA || !DATA.TAMER_TASKS) return { ok: false, reason: "no_data" };
    const task = DATA.TAMER_TASKS.find((t) => t.id === taskId);
    if (!task) return { ok: false, reason: "not_found" };
    if (!st.claimedTasks) st.claimedTasks = {};
    if (st.claimedTasks[taskId]) return { ok: false, reason: "already_claimed" };
    const progress = evaluateQuestMetric(task.metric, st);
    if (progress < task.target) return { ok: false, reason: "incomplete", progress, target: task.target };

    st.claimedTasks[taskId] = true;
    grantRewardBundle({ shards: task.rewardShards, gems: task.rewardGems, items: task.rewardItems }, st);
    addBattlePassXp(45, st);

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`🎯 Task Claimed: ${task.title}! +${task.rewardShards}🪙 +${task.rewardGems || 0}💎!`, 3400);
    }
    return { ok: true, task };
  }

  function claimNpcQuest(questObj, st = state) {
    if (!st || !questObj || !questObj.id) return { ok: false, reason: "no_quest" };
    if (!st.claimedNpcQuests) st.claimedNpcQuests = {};
    if (st.claimedNpcQuests[questObj.id]) return { ok: false, reason: "already_claimed" };
    const progress = evaluateQuestMetric(questObj.stat || questObj.metric, st);
    const target = Number(questObj.target || 1);
    if (progress < target) return { ok: false, reason: "incomplete", progress, target };

    st.claimedNpcQuests[questObj.id] = true;
    const items = {};
    if (questObj.rewardItem) {
      items[questObj.rewardItem] = Number(questObj.rewardQty || 1);
    }
    grantRewardBundle({ shards: questObj.rewardShards || 200, gems: questObj.rewardGems || 20, items }, st);
    addBattlePassXp(70, st);

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`🎁 Mission Complete: ${questObj.title}! +${questObj.rewardShards || 200}🪙 +${questObj.rewardGems || 20}💎!`, 3600);
    }
    return { ok: true, quest: questObj };
  }

  function ensureZoneWildSpawns(zoneId = state.zone) {
    if (!DATA || !root.WILDKIN_MAPS) return [];
    const mapObj = root.WILDKIN_MAPS.ZONE_MAPS[zoneId] || root.WILDKIN_MAPS.ZONE_MAPS.meadow;
    if (!mapObj) return [];
    const grassTiles = [];
    for (let y = 1; y < root.WILDKIN_MAPS.MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < root.WILDKIN_MAPS.MAP_WIDTH - 1; x++) {
        const ch = root.WILDKIN_MAPS.getTileAt(zoneId, x, y);
        if (ch === "G" || ch === "W" || ch === "~") {
          grassTiles.push({ x, y });
        }
      }
    }
    if (grassTiles.length === 0) {
      grassTiles.push({ x: 3, y: 3 }, { x: 11, y: 4 }, { x: 4, y: 8 }, { x: 11, y: 8 });
    }
    const spawns = [];
    for (let i = 0; i < 4; i++) {
      const pickTile = grassTiles[(i * 7 + 3) % grassTiles.length];
      const rolled = rollWildSpeciesForZone(zoneId);
      spawns.push({
        id: `wild_${zoneId}_${i}_${Date.now()}`,
        zone: zoneId,
        speciesId: rolled.speciesId,
        level: rolled.level,
        isRadiant: i === 3 && Math.random() < 0.18,
        x: pickTile.x,
        y: pickTile.y,
        homeX: pickTile.x,
        homeY: pickTile.y,
        angle: (i * Math.PI) / 2,
        timer: i * 1.4
      });
    }
    state.wildSpawns = spawns;
    playerMotion.wildSpawns = spawns;
    if (root.WILDKIN_3D && typeof root.WILDKIN_3D.syncWildSpawns === "function") {
      root.WILDKIN_3D.syncWildSpawns(spawns, DATA.getSpeciesById);
    }
    return spawns;
  }

  // =========================================================================
  // 3. OVERWORLD PIXEL TILE & CHARACTER SPRITE HELPERS
  // =========================================================================

  function drawTile(ctx, code, px, py, size, palette = {}, tick = 0) {
    palette = palette || {};
    ctx.fillStyle = palette.ground || '#2d5a36';
    ctx.fillRect(px, py, size, size);

    if (code === '.' || code === 'P' || code === 'B') {
      ctx.fillStyle = palette.path || '#d4a359';
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
      if (code === 'P' || code === 'B') {
        ctx.fillStyle = '#38bdf8';
        ctx.globalAlpha = 0.55 + Math.sin(tick * 0.12) * 0.25;
        ctx.fillRect(px + 6, py + 6, size - 12, size - 12);
        ctx.globalAlpha = 1;
      }
    } else if (code === 'T') {
      ctx.fillStyle = palette.tree || '#14331b';
      ctx.fillRect(px + 2, py + 4, size - 4, size - 6);
      ctx.fillStyle = palette.treeTop || '#22c55e';
      ctx.fillRect(px + 4, py + 3, size - 8, size - 12);
    } else if (code === 'G') {
      ctx.fillStyle = palette.grassBg || '#1e4626';
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = palette.grassBlade || '#4ade80';
      const sway = Math.round(Math.sin(tick * 0.08 + px * 0.1) * 1.5);
      for (let i = 4; i < size - 4; i += 6) {
        ctx.fillRect(px + i + sway, py + 6, 3, 8);
        ctx.fillRect(px + i - sway, py + 15, 3, 8);
      }
    } else if (code === 'W' || code === '~') {
      ctx.fillStyle = palette.water || '#0284c7';
      ctx.fillRect(px, py, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const wave = Math.round(Math.sin(tick * 0.1 + py) * 2);
      ctx.fillRect(px + 5 + wave, py + 8, 8, 2);
      ctx.fillRect(px + 14 - wave, py + 19, 9, 2);
    } else if (code === 'F') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(px + 7, py + 7, 4, 4);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(px + 18, py + 16, 4, 4);
    } else if (code === 'S' || code === 'H') {
      // Wellspring Shrine crystal
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px + 3, py + 16, size - 6, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(px + size / 2, py + 3);
      ctx.lineTo(px + size - 6, py + 16);
      ctx.lineTo(px + 6, py + 16);
      ctx.closePath();
      ctx.fill();
    } else if (code === 'M' || code === 'C') {
      // Merchant stall
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px + 4, py + 10, size - 8, size - 12);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px + 2, py + 5, size - 4, 7);
    } else if (code === 'K') {
      // Warden dais
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(px + 3, py + 3, size - 6, size - 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(px + 8, py + 8, size - 16, size - 16);
    } else if (code === 'N') {
      drawNPC(ctx, px, py, size, '#38bdf8');
    }
  }

  function drawNPC(ctx, px, py, size, coatColor = '#f97316') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px + 7, py + size - 6, size - 14, 4);
    ctx.fillStyle = coatColor;
    ctx.fillRect(px + 8, py + 12, size - 16, 11);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(px + 9, py + 5, size - 18, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + 11, py + 8, 2, 2);
    ctx.fillRect(px + size - 13, py + 8, 2, 2);
  }

  function drawPlayer(ctx, px, py, size, dir = 'down', stepTick = 0) {
    const bob = Math.sin(stepTick * 0.25) * 1.2;
    ctx.save();
    ctx.translate(0, bob);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px + 7, py + size - 6, size - 14, 4);
    // Boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px + 9, py + size - 9, 4, 4);
    ctx.fillRect(px + size - 13, py + size - 9, 4, 4);
    // Tunic
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(px + 7, py + 12, size - 14, 10);
    // Gold trim
    ctx.fillStyle = '#facc15';
    ctx.fillRect(px + 12, py + 13, size - 24, 8);
    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(px + 8, py + 5, size - 16, 8);
    // Explorer visor cap
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px + 7, py + 3, size - 14, 4);
    // Eyes
    ctx.fillStyle = '#0f172a';
    if (dir !== 'up') {
      const eyeOffset = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      ctx.fillRect(px + 10 + eyeOffset, py + 8, 2, 2);
      ctx.fillRect(px + size - 12 + eyeOffset, py + 8, 2, 2);
    }
    ctx.restore();
  }

  if (typeof root.WILDKIN_SPRITES === 'object') {
    root.WILDKIN_SPRITES.drawTile = drawTile;
    root.WILDKIN_SPRITES.drawNPC = drawNPC;
    root.WILDKIN_SPRITES.drawPlayer = drawPlayer;
  }

  // =========================================================================
  // 4. DOM HELPERS, TOASTS & HUD SYNCHRONIZATION
  // =========================================================================

  function $(id, fallbackId) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id) || (fallbackId ? document.getElementById(fallbackId) : null);
  }

  function showToast(msg, durationMs = 2600) {
    const banner = $('toastBanner');
    if (!banner) return;
    banner.textContent = msg;
    banner.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, durationMs);
  }

  function formatDurationMmSs(totalSec) {
    const sec = Math.max(0, Math.ceil(Number(totalSec || 0)));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function getPassiveRegenRatePerSec(targetState = state) {
    const st = targetState || state;
    const isHomestead = st && st.zone === 'meadow';
    let rate = isHomestead ? (3 / 5) : (1 / 8); // +1 HP / 8s in wild, +3 HP / 5s at Grandpa's Homestead
    if (st && st.regenBoostUntil && Number(st.regenBoostUntil) > Date.now()) {
      rate *= 3; // 3x faster natural regen from Sunberry Ration!
    }
    return rate;
  }

  function getKinRecoveryEtaText(kin, targetState = state) {
    if (!kin) return '';
    if (kin.currentHp >= kin.maxHp) return '✓ Full HP';
    const missing = Math.max(0, kin.maxHp - kin.currentHp);
    const rate = getPassiveRegenRatePerSec(targetState);
    const etaSec = Math.ceil(missing / Math.max(0.05, rate));
    const boostActive = targetState && targetState.regenBoostUntil && Number(targetState.regenBoostUntil) > Date.now();
    const prefix = kin.currentHp <= 0 ? '💤 Exhausted • ' : (boostActive ? '⚡ 3x Regen • ' : '⏱️ Regen ');
    return prefix + formatDurationMmSs(etaSec);
  }

  function tickPassiveRecovery(targetState = state, elapsedSec = 8) {
    const st = targetState || state;
    if (!st || !Array.isArray(st.squad)) return { healedCount: 0, totalHpRestored: 0 };
    if (st === state && battleState) return { healedCount: 0, totalHpRestored: 0 };

    const rate = getPassiveRegenRatePerSec(st);
    let healedCount = 0;
    let totalHpRestored = 0;

    st.squad.forEach((kin) => {
      if (!kin || kin.currentHp >= kin.maxHp) {
        if (kin) kin._regenFrac = 0;
        return;
      }
      kin._regenFrac = Number(kin._regenFrac || 0) + rate * Number(elapsedSec || 0);
      let gain = Math.floor(kin._regenFrac);
      if (elapsedSec >= 8 && gain < 1) {
        gain = 1;
        kin._regenFrac = 0;
      } else {
        kin._regenFrac -= gain;
      }
      if (gain > 0) {
        const before = kin.currentHp;
        kin.currentHp = Math.min(kin.maxHp, kin.currentHp + gain);
        const diff = kin.currentHp - before;
        if (diff > 0) {
          healedCount += 1;
          totalHpRestored += diff;
        }
      }
    });

    if (totalHpRestored > 0 && st === state) {
      updateHud();
    }
    return { healedCount, totalHpRestored };
  }

  function quickFeedOrHealKin(targetIdx = null) {
    let idx = targetIdx;
    if (idx === null || idx === undefined) {
      let worstRatio = 2;
      idx = 0;
      (state.squad || []).forEach((k, i) => {
        if (k && k.currentHp < k.maxHp) {
          const r = k.currentHp / Math.max(1, k.maxHp);
          if (r < worstRatio) {
            worstRatio = r;
            idx = i;
          }
        }
      });
    }
    const kin = state.squad[idx];
    if (!kin) return false;
    const priorityOrder = kin.currentHp <= 0
      ? ['phoenixDew', 'reviveLeaf', 'heartwoodStew', 'feastPlatter', 'sunberryRation']
      : ['sunberryRation', 'heartwoodStew', 'vitalTonic', 'dewTonic', 'hiTonic', 'hyperTonic', 'heartwoodBerry', 'feastPlatter'];
    const foundItem = priorityOrder.find((id) => (state.inventory[id] || 0) > 0);
    if (foundItem) {
      useRecoveryOrBoosterItem(foundItem, idx, state);
      return true;
    }
    state.marketTab = 'recovery';
    state.selectedMarketKinIdx = idx;
    openModal('shop');
    showToast('Out of recovery food in Pack! Opened 🛒 Aether Marketplace.', 3000);
    return false;
  }

  function useRecoveryOrBoosterItem(itemId, kinIndex = 0, targetState = state) {
    const st = targetState || state;
    if (!st || !DATA || !DATA.ITEMS || !DATA.ITEMS[itemId]) {
      return { ok: false, error: 'Unknown item' };
    }
    const item = DATA.ITEMS[itemId];
    const owned = Number((st.inventory && st.inventory[itemId]) || 0);
    if (owned <= 0) {
      if (st === state) showToast(`Out of ${item.icon} ${item.name}! Buy more in the 🛒 Marketplace.`);
      return { ok: false, error: 'Out of stock' };
    }

    if (item.category === "bag") {
      return upgradeKinBag(itemId, st);
    }

    const squad = st.squad || [];
    const kin = squad[kinIndex] || squad[0] || null;
    if (!st.stats) st.stats = { battlesWon: 0, kinBound: 0, stepsTaken: 0, kinBred: 0, evolutions: 0, foodFed: 0, radiantBound: 0, tradesDone: 0 };
    if (item.category === "food" || item.bondGain) {
      st.stats.foodFed = (st.stats.foodFed || 0) + 1;
    }

    // 1. Whole-Squad Feast Platter
    if (item.squadFullHeal) {
      squad.forEach((k) => {
        k.currentHp = k.maxHp;
        k.status = null;
        k.bondLevel = Math.min(10, Number(k.bondLevel || 1) + Number(item.bondGain || 1));
        (k.moveSlots || []).forEach((ms) => {
          const m = DATA.MOVES[ms.id];
          ms.currentStamina = m ? m.stamina : ms.maxStamina;
        });
      });
      st.inventory[itemId] = owned - 1;
      const msg = `🍱 Used ${item.name}! Entire Squad restored to 100% HP & Stamina!`;
      if (st === state) {
        if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
        saveGame();
        updateHud();
        showToast(msg, 3200);
      }
      return { ok: true, item, kin, message: msg };
    }

    // 2. Global Timed Boosters (2x XP Elixir or Hatch Accelerator)
    if (item.xpBoostSec) {
      st.xpBoostUntil = Math.max(Date.now(), Number(st.xpBoostUntil || 0)) + item.xpBoostSec * 1000;
      st.inventory[itemId] = owned - 1;
      const msg = `⚡ Activated ${item.name}! 2x Battle XP active for 30 minutes!`;
      if (st === state) {
        if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
        saveGame();
        updateHud();
        showToast(msg, 3200);
      }
      return { ok: true, item, kin, message: msg };
    }

    if (item.hatchBoost) {
      st.hatchBoostReady = true;
      st.inventory[itemId] = owned - 1;
      const msg = `🥚 Activated ${item.name}! Next Ranch Breeding hatch is FREE & guaranteed S/SS-Rank!`;
      if (st === state) {
        if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
        saveGame();
        updateHud();
        showToast(msg, 3200);
      }
      return { ok: true, item, kin, message: msg };
    }

    if (!kin) {
      return { ok: false, error: 'No target Kin in Squad' };
    }

    // 3. Instant Level-Up Boosters (Rare Aether Crystal +1 Lv, Sovereign XP Tome +3 Lvs)
    if (item.levelGain) {
      const gain = Number(item.levelGain || 1);
      kin.level = Math.min(100, Number(kin.level || 5) + gain);
      kin.xp = 0;
      kin.xpToNext = DATA.xpForNextLevel(kin.level);
      if (item.bondGain) {
        kin.bondLevel = Math.min(10, Number(kin.bondLevel || 1) + Number(item.bondGain));
      }
      const sp = DATA.getSpeciesById(kin.speciesId);
      const newStats = DATA.calculateStatsForLevel(sp.baseStats, kin.level, kin.isRadiant, kin.geneticBonus || 0, kin.bondLevel || 1);
      kin.maxHp = newStats.maxHp;
      kin.currentHp = newStats.maxHp;
      kin.atk = newStats.atk;
      kin.def = newStats.def;
      kin.spd = newStats.spd;
      kin.status = null;
      (kin.moveSlots || []).forEach((ms) => {
        const m = DATA.MOVES[ms.id];
        ms.currentStamina = m ? m.stamina : ms.maxStamina;
      });
      if (sp.evolvesTo && kin.level >= sp.evolvesTo.level) {
        const already = evoQueue.some((e) => e.kin.uid === kin.uid);
        if (!already) evoQueue.push({ kin, fromSpeciesId: sp.id, toSpeciesId: sp.evolvesTo.id });
      }
      st.inventory[itemId] = owned - 1;
      const msg = `${item.icon} ${kin.nickname} surged +${gain} Level${gain > 1 ? 's' : ''} → Lv.${kin.level} (100% HP)!`;
      if (st === state) {
        if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
        saveGame();
        updateHud();
        showToast(msg, 3200);
      }
      return { ok: true, item, kin, newLevel: kin.level, message: msg };
    }

    // 4. Food, Care, Medical Tonics & Revives
    if (item.regenBoostSec) {
      st.regenBoostUntil = Math.max(Date.now(), Number(st.regenBoostUntil || 0)) + item.regenBoostSec * 1000;
    }
    if (item.bondGain) {
      kin.bondLevel = Math.min(10, Number(kin.bondLevel || 1) + Number(item.bondGain));
    }
    if (item.xpGain) {
      kin.xp = (kin.xp || 0) + Number(item.xpGain);
      while (kin.xp >= (kin.xpToNext || DATA.xpForNextLevel(kin.level))) {
        kin.xp -= (kin.xpToNext || DATA.xpForNextLevel(kin.level));
        kin.level += 1;
        kin.xpToNext = DATA.xpForNextLevel(kin.level);
      }
      const sp = DATA.getSpeciesById(kin.speciesId);
      const calc = DATA.calculateStatsForLevel(sp.baseStats, kin.level, kin.isRadiant, kin.geneticBonus || 0, kin.bondLevel || 1);
      kin.maxHp = calc.maxHp;
      kin.atk = calc.atk;
      kin.def = calc.def;
      kin.spd = calc.spd;
    }

    const beforeHp = kin.currentHp;
    if (item.healPercent) {
      const targetHp = Math.max(1, Math.round(kin.maxHp * Number(item.healPercent)));
      kin.currentHp = Math.min(kin.maxHp, Math.max(kin.currentHp, targetHp));
      if (item.healPercent >= 1.0) kin.currentHp = kin.maxHp;
    } else if (item.healAmount) {
      kin.currentHp = Math.min(kin.maxHp, Math.max(0, kin.currentHp) + Number(item.healAmount));
    }
    kin.status = null;
    if (item.restoreStamina || item.category === 'food') {
      (kin.moveSlots || []).forEach((ms) => {
        const m = DATA.MOVES[ms.id];
        ms.currentStamina = m ? m.stamina : ms.maxStamina;
      });
    }

    st.inventory[itemId] = owned - 1;
    const healedDelta = Math.max(0, kin.currentHp - beforeHp);
    const msg = `${item.icon} Used ${item.name} on ${kin.nickname}! HP ${kin.currentHp}/${kin.maxHp} (+${healedDelta} HP)${item.regenBoostSec ? ' • 3x Regen Active!' : ''}`;
    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
      saveGame();
      updateHud();
      showToast(msg, 3000);
    }
    return { ok: true, item, kin, healedDelta, message: msg };
  }

  async function purchaseUsdBundle(bundleId, paymentMethod = 'apple_pay', targetState = state) {
    const st = targetState || state;
    const bundles = (DATA && DATA.MARKETPLACE_BUNDLES) || [];
    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle) return { ok: false, error: 'Invalid bundleId' };

    let serverOrder = null;
    if (typeof fetch === 'function') {
      try {
        const res = await fetch('/api/marketplace/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bundleId: bundle.id,
            paymentMethod,
            trainerName: st.trainerName || 'Aether Tamer'
          })
        });
        const data = await res.json();
        if (data && data.ok && data.order) {
          serverOrder = data.order;
        }
      } catch (_err) {
        // Fallback to local grant if offline
      }
    }

    st.gems = Number(st.gems || 0) + Number(bundle.gems || 0);
    st.shards = Number(st.shards || 0) + Number(bundle.shardsBonus || 0);
    if (bundle.vipShrinePass) {
      st.vipShrinePass = true;
      st.shrineCooldownUntil = 0;
    }
    if (bundle.items && st.inventory) {
      Object.entries(bundle.items).forEach(([k, qty]) => {
        st.inventory[k] = Number(st.inventory[k] || 0) + Number(qty || 0);
      });
    }
    st.activeCheckoutBundleId = null;

    if (st === state) {
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
      saveGame();
      updateHud();
      showToast(`💎 Unlocked ${bundle.name} (${bundle.priceDisplay})! +${bundle.gems} Gems & Bonus Items added!`, 3800);
    }
    return {
      ok: true,
      bundle,
      order: serverOrder,
      gemsBalance: st.gems,
      shardsBalance: st.shards
    };
  }

  function getZoneObj(zoneId) {
    if (!DATA || !DATA.ZONES) return { id: 'meadow', name: 'Sunleaf Meadow', levelRange: [2, 7], wildPool: [{ id: 10, weight: 50 }] };
    return DATA.ZONES.find((z) => z.id === zoneId) || DATA.ZONES[0];
  }

  function updateHud() {
    if (typeof document === 'undefined') return;
    const zoneObj = getZoneObj(state.zone);
    const zoneEl = $('hudZoneName');
    if (zoneEl) zoneEl.textContent = zoneObj.name;

    const shardsEl = $('hudShards');
    if (shardsEl) shardsEl.textContent = String(state.shards || 0);

    const gemsEl = $('hudGems');
    if (gemsEl) {
      if (state.gems === undefined || state.gems === null) state.gems = 50;
      gemsEl.textContent = String(state.gems);
    }

    const crestsEl = $('hudCrests');
    const totalWardens = (DATA && DATA.WARDENS && DATA.WARDENS.length) || 6;
    if (crestsEl) crestsEl.textContent = `${state.crests.length}/${totalWardens}`;

    const bpTier = getBattlePassLevel(state);
    const passEl = $('hudPassTier');
    if (passEl) passEl.textContent = `T${bpTier}`;
    const lobbyPassEl = $('lobbyPassTierBadge');
    if (lobbyPassEl) lobbyPassEl.textContent = `Tier ${bpTier}`;
    const lobbyBagEl = $('lobbyBagCapBadge');
    if (lobbyBagEl) lobbyBagEl.textContent = `Squad ${(state.squad || []).length}/${getMaxSquadSize(state)}`;
    const outfitObj = (DATA && DATA.TAMER_OUTFITS && DATA.TAMER_OUTFITS.find((o) => o.id === state.equippedOutfit)) || (DATA && DATA.TAMER_OUTFITS && DATA.TAMER_OUTFITS[0]);
    const lobbyOutfitEl = $('lobbyOutfitBadge');
    if (lobbyOutfitEl && outfitObj) lobbyOutfitEl.textContent = `${outfitObj.icon} ${outfitObj.name.split(" ")[0]}`;
    renderLobbyHeroCard();
    updateStoryTrackerHud();

    const boundCount = Object.keys(state.kindexBound).length;
    const boundEl = $('hudBound');
    if (boundEl) boundEl.textContent = `${boundCount}/27`;

    const leadMini = $('leadKinMini');
    if (leadMini) {
      const lead = state.squad[0];
      if (lead && DATA && root.WILDKIN_SPRITES) {
        const sp = DATA.getSpeciesById(lead.speciesId);
        const svg = root.WILDKIN_SPRITES.renderKinSvg(sp, 22, lead.isRadiant);
        const regenBadge = lead.currentHp < lead.maxHp
          ? ` <span class="regen-timer-pill">${getKinRecoveryEtaText(lead)}</span>`
          : '';
        leadMini.innerHTML = `${svg} <span>${lead.nickname} <small style="color:#facc15">Lv.${lead.level}</small> (${lead.currentHp}/${lead.maxHp} HP)${regenBadge}</span>`;
      } else {
        leadMini.textContent = 'No Partner Bound';
      }
    }

    // Contextual Vitality Recovery Alert Banner when any Squad Kin is wounded or exhausted
    const recBanner = $('recoveryAlertBanner');
    const recText = $('recoveryAlertText');
    if (recBanner) {
      const woundedList = (state.squad || []).filter((k) => k && k.currentHp < k.maxHp);
      if (state.started && !battleState && woundedList.length > 0) {
        woundedList.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
        const worst = woundedList[0];
        if (recText) {
          recText.textContent = `${worst.nickname}: ${worst.currentHp}/${worst.maxHp} HP (${getKinRecoveryEtaText(worst)})`;
        }
        recBanner.classList.remove('hidden');
      } else {
        recBanner.classList.add('hidden');
      }
    }

    updateInteractPrompt();
  }

  function checkStoryChapterComplete(ch) {
    if (!ch || !state) return false;
    const boundCount = Object.keys(state.kindexBound || {}).length;
    const maxBond = (state.squad || []).concat(state.vault || []).reduce((m, k) => Math.max(m, Number(k.bondLevel || 1)), 1);
    const maxGen = (state.squad || []).concat(state.vault || []).reduce((m, k) => Math.max(m, Number(k.generation || 1)), 1);
    if (ch.id === 1) return boundCount >= 2;
    if (ch.id === 2) return (state.crests || []).includes('kael') || maxBond >= 2;
    if (ch.id === 3) return Number((state.stats && state.stats.kinBred) || 0) >= 1 || maxGen >= 2;
    if (ch.id === 4) return (state.crests || []).includes('nerissa');
    if (ch.id === 5) return (state.crests || []).includes('orin');
    if (ch.id === 6) return (state.crests || []).includes('ignis');
    if (ch.id === 7) return (state.crests || []).includes('freya');
    if (ch.id === 8) return (state.crests || []).includes('vesper') || Number(state.spireFloor || 1) >= 5;
    return false;
  }

  function updateStoryTrackerHud() {
    if (typeof document === 'undefined' || !DATA || !DATA.STORY_CHAPTERS) return;
    if (!state.storyChapter) state.storyChapter = 1;
    if (!state.claimedChapters) state.claimedChapters = {};
    if (!state.stats) state.stats = { battlesWon: 0, kinBound: 0, stepsTaken: 0, kinBred: 0, evolutions: 0 };

    // Auto-advance chapters & grant Grandpa Rowan's milestone rewards
    let chObj = DATA.STORY_CHAPTERS.find((c) => c.id === state.storyChapter) || DATA.STORY_CHAPTERS[DATA.STORY_CHAPTERS.length - 1];
    while (chObj && checkStoryChapterComplete(chObj) && !state.claimedChapters[chObj.id]) {
      state.claimedChapters[chObj.id] = true;
      const rewShards = Number(chObj.rewardShards || 150);
      state.shards = (state.shards || 0) + rewShards;
      if (chObj.rewardItem && state.inventory) {
        state.inventory[chObj.rewardItem] = (state.inventory[chObj.rewardItem] || 0) + Number(chObj.rewardQty || 1);
      }
      if (state.storyChapter < DATA.STORY_CHAPTERS.length) {
        state.storyChapter += 1;
      }
      showToast(`📜 Chapter ${chObj.id} Complete! Grandpa Rowan gifted +${rewShards}💎!`, 3400);
      chObj = DATA.STORY_CHAPTERS.find((c) => c.id === state.storyChapter) || chObj;
    }

    const badgeEl = $('questChapterBadge');
    const titleEl = $('questTitleText');
    const objEl = $('questObjText');
    if (badgeEl && chObj) badgeEl.textContent = `CH.${chObj.id}/${DATA.STORY_CHAPTERS.length}`;
    if (titleEl && chObj) titleEl.textContent = chObj.title;
    if (objEl && chObj) objEl.textContent = chObj.objective;
  }

  function setBattleTurnBanner(phaseClass, pillLabel, statusText) {
    const banner = $('battleTurnBanner');
    const pill = $('battleTurnPill');
    const text = $('battleTurnText');
    const consoleEl = document.querySelector('.battle-console');
    if (banner) {
      banner.className = 'battle-turn-banner ' + (phaseClass || 'phase-ready');
    }
    if (pill) pill.textContent = pillLabel || 'YOUR TURN';
    if (text) text.textContent = statusText || 'Select a move, item, or Kin';
    if (consoleEl) {
      consoleEl.classList.toggle('turn-locked', Boolean(battleState && battleState.busy));
    }
    if (root.WILDKIN_3D && typeof root.WILDKIN_3D.setBattleTurnPhase === 'function') {
      if (phaseClass === 'phase-player') root.WILDKIN_3D.setBattleTurnPhase('player_turn');
      else if (phaseClass === 'phase-enemy') root.WILDKIN_3D.setBattleTurnPhase('enemy_turn');
      else root.WILDKIN_3D.setBattleTurnPhase('idle');
    }
  }


  function getAdjacentInteraction() {
    const nearFloat = findNearbyNpcFloat(playerMotion.x, playerMotion.y, 1.45);
    if (nearFloat) return { x: nearFloat.x, y: nearFloat.y, npc: nearFloat };
    if (!root.WILDKIN_MAPS) return null;
    const { x, y, dir } = state.pos;
    const deltas = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };
    const [dx, dy] = deltas[dir] || [0, 1];
    // Check current tile first, then facing tile, then any immediate cardinal neighbor
    const coords = [
      [x, y],
      [x + dx, y + dy],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y],
      [x + 1, y]
    ];
    for (const [cx, cy] of coords) {
      const npc = root.WILDKIN_MAPS.getNpcAt(state.zone, cx, cy);
      if (npc) return { npc, x: cx, y: cy };
    }
    return null;
  }

  function updateInteractPrompt() {
    const banner = $('interactBanner');
    if (!banner) return;
    if (!state.started || battleState) {
      banner.classList.add('hidden');
      return;
    }
    const hit = getAdjacentInteraction();
    if (!hit) {
      banner.classList.add('hidden');
      return;
    }
    const { npc } = hit;
    const iconEl = $('interactIcon');
    const textEl = $('interactText');
    let icon = '✨';
    let label = npc.name || 'Interact';
    if (npc.type === 'shrine' || npc.type === 'hospital') {
      icon = '🏥';
      label = `${npc.name}: Medical Checkup & Tonics`;
    } else if (npc.type === 'merchant' || npc.type === 'shopping_center') {
      icon = '🏬';
      label = `${npc.name}: Fruits, Meals & Traps`;
    } else if (npc.type === 'tamer') {
      icon = '⚔️';
      label = `Talk / Battle ${npc.name}`;
    } else if (npc.type === 'warden') {
      icon = '👑';
      label = `Talk / Challenge ${npc.name}`;
    } else if (npc.type === 'ranch' || npc.isGrandpa) {
      icon = '👴';
      label = `Talk to ${npc.name} (Mission & Ranch)`;
    } else if (npc.type === 'guide') {
      icon = npc.icon || '💬';
      label = `Talk to ${npc.name} (Mission)`;
    } else if (npc.type === 'portal') {
      icon = '🌀';
      label = npc.label || 'Travel to Next World';
    }
    if (iconEl) iconEl.textContent = icon;
    if (textEl) textEl.textContent = label;
    banner.classList.remove('hidden');
  }

  // =========================================================================
  // 5. TITLE & STARTER SELECTION OVERLAY
  // =========================================================================

  function renderStarterSelection() {
    const grid = $('starterGrid', 'starter-cards');
    const preview = $('starterPreviewPanel');
    const continueBtn = $('btnContinueSave', 'btn-continue');
    if (!grid || !DATA || !root.WILDKIN_SPRITES) return;

    const saved = loadGame();
    if (continueBtn) {
      if (saved) continueBtn.classList.remove('hidden');
      else continueBtn.classList.add('hidden');
    }

    const starters = [1, 4, 7].map((id) => DATA.getSpeciesById(id));
    grid.innerHTML = starters.map((sp) => {
      const aff = DATA.AFFINITIES[sp.affinity];
      const isSel = Number(state.selectedStarterId) === sp.id;
      const svg = root.WILDKIN_SPRITES.renderKinSvg(sp, 54, false);
      return `
        <button type="button" class="starter-option ${isSel ? 'selected' : ''}" data-starter-id="${sp.id}">
          ${svg}
          <span class="starter-option-name">${sp.name}</span>
          <span class="starter-option-aff" style="background:${aff.bg};color:${aff.color};border:1px solid ${aff.color}">
            ${aff.icon} ${aff.name}
          </span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('[data-starter-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedStarterId = Number(btn.getAttribute('data-starter-id'));
        if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(640, 0.05);
        renderStarterSelection();
      });
    });

    const chosen = DATA.getSpeciesById(state.selectedStarterId || 1);
    const chosenAff = DATA.AFFINITIES[chosen.affinity];
    if (preview && chosen) {
      preview.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <strong style="color:#fde047">#0${chosen.id} ${chosen.name} — ${chosen.title}</strong>
          <span style="color:${chosenAff.color};font-weight:800">${chosenAff.icon} ${chosenAff.name} Affinity</span>
        </div>
        <div style="color:#cbd5e1;margin-bottom:4px">${chosen.lore}</div>
        <div style="font-size:0.65rem;color:#38bdf8">
          Base Stats: HP ${chosen.baseStats.hp} • ATK ${chosen.baseStats.atk} • DEF ${chosen.baseStats.def} • SPD ${chosen.baseStats.spd}
        </div>
      `;
    }
  }

  function renderLobbyHeroCard() {
    if (typeof document === "undefined" || !DATA) return;
    const card = $("lobbyHeroCard");
    if (!card) return;
    const lead = (state.squad && state.squad[0]) || null;
    const sp = lead ? DATA.getSpeciesById(lead.speciesId) : DATA.getSpeciesById(state.selectedStarterId || 1);
    const svg = root.WILDKIN_SPRITES && sp ? root.WILDKIN_SPRITES.renderKinSvg(sp, 52, lead ? lead.isRadiant : false) : "";
    const outfit = (DATA.TAMER_OUTFITS || []).find((o) => o.id === state.equippedOutfit) || (DATA.TAMER_OUTFITS && DATA.TAMER_OUTFITS[0]);
    const bpTier = getBattlePassLevel(state);
    const maxSq = getMaxSquadSize(state);
    const maxVt = getMaxVaultSize(state);
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        ${svg}
        <div>
          <div style="font-size:0.84rem;font-weight:900;color:#fde047">${lead ? lead.nickname : sp.name} <span style="font-size:0.7rem;color:#38bdf8">Lv.${lead ? lead.level : 5}</span></div>
          <div style="font-size:0.66rem;color:#cbd5e1">🐾 Active Squad: <strong>${(state.squad || []).length}/${maxSq}</strong> • 🎒 Carrier Bag: <strong>${(state.vault || []).length}/${maxVt}</strong></div>
          <div style="font-size:0.65rem;color:#86efac">👕 ${outfit ? outfit.name : "Homestead Tunic"} • 🎖️ Season 1 Pass Tier ${bpTier}/20</div>
        </div>
      </div>
      <div style="text-align:right;font-size:0.68rem;color:#f8fafc">
        <div>🪙 <strong style="color:#fde047">${state.shards || 0}</strong></div>
        <div>💎 <strong style="color:#d8b4fe">${state.gems || 0}</strong></div>
      </div>
    `;
  }

  function openLobbyScreen() {
    if (typeof document === "undefined") return;
    const lobby = $("mainMenuOverlay");
    if (lobby) lobby.classList.remove("hidden");
    document.body.classList.add("in-lobby");
    closeHubMenuDrawer();
    renderLobbyHeroCard();
  }

  function closeLobbyScreen() {
    if (typeof document === "undefined") return;
    const lobby = $("mainMenuOverlay");
    if (lobby) lobby.classList.add("hidden");
    document.body.classList.remove("in-lobby");
  }

  function openHubMenuDrawer() {
    if (typeof document === "undefined") return;
    const drawer = $("tamerMenuDrawer");
    if (drawer) drawer.classList.remove("hidden");
  }

  function closeHubMenuDrawer() {
    if (typeof document === "undefined") return;
    const drawer = $("tamerMenuDrawer");
    if (drawer) drawer.classList.add("hidden");
  }

  function selectStarter(speciesId) {
    const id = Number(speciesId || state.selectedStarterId || 1);
    state = createInitialState(id);
    syncMotionFromState();
    ensureZoneWildSpawns(state.zone);
    const overlay = $('starterOverlay', 'starter-overlay') || $('title-overlay');
    if (overlay) overlay.classList.add('hidden');
    closeLobbyScreen();
    if (root.WILDKIN_AUDIO) {
      root.WILDKIN_AUDIO.playLevelUp();
      root.WILDKIN_AUDIO.startBgm('overworld');
    }
    saveGame();
    updateHud();
    const sp = DATA.getSpeciesById(id);
    showToast(`💠 Bound 1st Partner ${sp.name} (1/4 Squad)! Catch wild Kin with 🪤 Snare Traps, Trade, or Breed to grow your team!`, 3800);
  }

  // =========================================================================
  // 6. 2D OVERWORLD MOVEMENT, ENCOUNTERS & INTERACTIONS
  // =========================================================================

  function renderOverworld() {
    const canvas = $('gameCanvas', 'game-canvas');
    if (!canvas || !root.WILDKIN_MAPS) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    animTick++;
    const mapData = root.WILDKIN_MAPS.ZONE_MAPS[state.zone] || root.WILDKIN_MAPS.ZONE_MAPS.meadow;
    const tileW = canvas.width / root.WILDKIN_MAPS.MAP_WIDTH;   // 480 / 16 = 30
    const tileH = canvas.height / root.WILDKIN_MAPS.MAP_HEIGHT; // 360 / 12 = 30
    const size = Math.min(tileW, tileH);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < root.WILDKIN_MAPS.MAP_HEIGHT; y++) {
      for (let x = 0; x < root.WILDKIN_MAPS.MAP_WIDTH; x++) {
        const code = root.WILDKIN_MAPS.getTileAt(state.zone, x, y);
        drawTile(ctx, code, x * tileW, y * tileH, size, mapData.palette, animTick);
      }
    }

    // Draw companion lead Kin following behind player
    const lead = state.squad[0];
    if (lead && DATA && root.WILDKIN_SPRITES) {
      const sp = DATA.getSpeciesById(lead.speciesId);
      const backOffsets = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] };
      const [bx, by] = backOffsets[state.pos.dir] || [0, -1];
      const fx = Math.max(1, Math.min(14, state.pos.x + bx));
      const fy = Math.max(1, Math.min(10, state.pos.y + by));
      if (root.WILDKIN_MAPS.getTileAt(state.zone, fx, fy) !== 'T') {
        root.WILDKIN_SPRITES.drawKinSprite(ctx, sp, fx * tileW + 3, fy * tileH + 3, size - 6, {
          isRadiant: lead.isRadiant,
          shadow: true
        });
      }
    }

    // Draw Player Tamer
    drawPlayer(ctx, state.pos.x * tileW, state.pos.y * tileH, size, state.pos.dir, animTick);
  }

  function healSquadAtShrine(silent = false, bypassWithGems = false) {
    const now = Date.now();
    const cooldownRemSec = Math.ceil((Number(state.shrineCooldownUntil || 0) - now) / 1000);
    if (!silent && !state.vipShrinePass && cooldownRemSec > 0) {
      if (bypassWithGems) {
        if ((state.gems || 0) < 10) {
          showToast('Need 10 💎 Aether Gems for an Instant Shrine Blessing, or use Food!');
          return false;
        }
        state.gems -= 10;
        state.shrineCooldownUntil = 0;
      } else {
        showToast(`⛲ Shrine recharging (${formatDurationMmSs(cooldownRemSec)})! Feed your Kin or use Marketplace Recovery!`, 3400);
        openModal('shop');
        return false;
      }
    }

    state.squad.forEach((kin) => {
      kin.currentHp = kin.maxHp;
      kin.status = null;
      (kin.moveSlots || []).forEach((ms) => {
        const m = DATA.MOVES[ms.id];
        ms.currentStamina = m ? m.stamina : ms.maxStamina;
      });
    });
    if (!silent && !state.vipShrinePass) {
      state.shrineCooldownUntil = now + 15 * 60 * 1000; // 15-minute Shrine blessing cooldown
    }
    if (root.WILDKIN_AUDIO && !silent) {
      root.WILDKIN_AUDIO.playShrineHeal();
    }
    saveGame();
    updateHud();
    if (!silent) {
      showToast(
        bypassWithGems
          ? '⛲ Instant Shrine Blessing (10 💎)! Entire Squad restored to 100% HP & Stamina!'
          : '⛲ Wellspring Shrine restored all Squad HP & Stamina! (Next free blessing in 15:00)'
      );
    }
    return true;
  }

  function travelToZone(targetZoneId, customX = null, customY = null) {
    const map = root.WILDKIN_MAPS && root.WILDKIN_MAPS.ZONE_MAPS[targetZoneId];
    if (!map) return;
    state.zone = targetZoneId;
    state.pos.x = typeof customX === 'number' ? customX : map.spawn.x;
    state.pos.y = typeof customY === 'number' ? customY : map.spawn.y;
    state.pos.dir = customY !== null && customY <= 2 ? 'down' : 'up';
    syncMotionFromState();
    grantEncounterGrace(3500);
    const zInfo = getZoneObj(targetZoneId);
    const hint = $('zoneHint');
    if (hint) hint.textContent = `${zInfo.name} (${zInfo.subtitle})`;
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(740, 0.08);
    ensureZoneWildSpawns(targetZoneId);
    saveGame();
    updateHud();
    showToast(`🗺️ Entered ${zInfo.name}! Visit 🏥 Hospital (East) or 🏬 Shopping Center (West)!`, 3400);
  }

  function rollWildSpeciesForZone(zoneId) {
    const z = getZoneObj(zoneId);
    const pool = z.wildPool || [{ id: 10, weight: 100 }];
    const totalWeight = pool.reduce((acc, item) => acc + item.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenId = pool[0].id;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        chosenId = entry.id;
        break;
      }
    }
    const [minLv, maxLv] = z.levelRange || [2, 6];
    const level = Math.floor(minLv + Math.random() * (maxLv - minLv + 1));
    return { speciesId: chosenId, level };
  }

  function movePlayer(dir) {
    if (!state.started || battleState || activeEvo) return false;
    const deltas = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };
    if (!deltas[dir]) return false;
    state.pos.dir = dir;

    const nx = state.pos.x + deltas[dir][0];
    const ny = state.pos.y + deltas[dir][1];
    const targetTile = root.WILDKIN_MAPS ? root.WILDKIN_MAPS.getTileAt(state.zone, nx, ny) : '.';

    // Check if an NPC or Portal is on target tile
    const npcAtTarget = root.WILDKIN_MAPS ? root.WILDKIN_MAPS.getNpcAt(state.zone, nx, ny) : null;
    if (npcAtTarget && npcAtTarget.type === 'portal') {
      travelToZone(npcAtTarget.targetZone, npcAtTarget.targetX, npcAtTarget.targetY);
      return true;
    }

    // Impassable tiles: 'T' (Tree/Wall), or Building/NPC tiles ('S','H','C','M','K','N') triggers interaction
    if (targetTile === 'T') {
      updateInteractPrompt();
      return false;
    }
    if (targetTile === 'S' || targetTile === 'H' || targetTile === 'C' || targetTile === 'M' || targetTile === 'K' || targetTile === 'N') {
      updateInteractPrompt();
      interactWithNpc(npcAtTarget);
      return true;
    }

    state.pos.x = nx;
    state.pos.y = ny;
    syncMotionFromState();
    state.stats.stepsTaken = (state.stats.stepsTaken || 0) + 1;

    const isEncounterTile = targetTile === 'G' || targetTile === 'W' || targetTile === '~';
    if (root.WILDKIN_AUDIO) {
      root.WILDKIN_AUDIO.playStep(isEncounterTile);
    }

    updateHud();

    // 22% chance to trigger a Wild Encounter in tall grass or water
    if (isEncounterTile && Math.random() < 0.22) {
      startWildEncounter();
    } else {
      saveGame();
    }
    return true;
  }

  function interactWithNpc(npc) {
    if (!npc) return;
    if (npc.type === 'portal') {
      travelToZone(npc.targetZone, npc.targetX, npc.targetY);
    } else if (npc.type === 'shrine' || npc.type === 'hospital') {
      state.marketTab = 'hospital';
      openModal('shop');
    } else if (npc.type === 'merchant' || npc.type === 'shopping_center') {
      state.marketTab = 'shopping_center';
      openModal('shop');
    } else {
      state.activeDialogNpc = npc;
      openModal('npc_dialog');
    }
  }

  function interact() {
    if (!state.started || battleState || activeEvo) return;
    const hit = getAdjacentInteraction();
    if (hit && hit.npc) {
      interactWithNpc(hit.npc);
    } else {
      // Pressing A or Search in tall grass can also rustle up a wild Kin!
      const tile = root.WILDKIN_MAPS ? root.WILDKIN_MAPS.getTileAt(state.zone, state.pos.x, state.pos.y) : '.';
      if (tile === 'G' || tile === 'W') {
        startWildEncounter();
      } else {
        showToast('🌿 Walk into tall grass or lagoon water to encounter wild Kin!');
      }
    }
  }

  // =========================================================================
  // 7. TURN-BASED BATTLE SYSTEM, PRISM CAPTURE & EVOLUTION
  // =========================================================================

  function getFirstHealthySquadIndex() {
    return state.squad.findIndex((k) => k.currentHp > 0);
  }

  function startWildEncounter(forceSpeciesId = null, forceLevel = null, forceRadiant = undefined) {
    if (!DATA) return;
    grantEncounterGrace(4500);
    let healthyIdx = getFirstHealthySquadIndex();
    if (healthyIdx === -1) {
      healSquadAtShrine(true);
      healthyIdx = 0;
    }

    const rolled = rollWildSpeciesForZone(state.zone);
    const speciesId = forceSpeciesId || rolled.speciesId;
    const level = forceLevel || rolled.level;
    const enemyKin = DATA.createKinInstance(speciesId, level, {
      isRadiant: forceRadiant,
      caughtZone: getZoneObj(state.zone).name
    });

    markSeen(enemyKin.speciesId);

    battleState = {
      mode: 'wild',
      title: 'WILD ENCOUNTER',
      trainerName: null,
      wardenId: null,
      rewardShards: 18 + level * 6,
      enemySquad: [enemyKin],
      enemyIndex: 0,
      playerIndex: healthyIdx,
      activeTab: 'moves',
      busy: false,
      logText: enemyKin.isRadiant
        ? `✨ RADIANT GLEAM! A wild Radiant ${enemyKin.nickname} (Lv.${enemyKin.level}) appeared!`
        : `A wild ${enemyKin.nickname} (Lv.${enemyKin.level}) burst from the ${state.zone === 'tidecove' ? 'lagoon' : 'tall grass'}!`
    };

    openBattleOverlay();
  }

  function startTamerBattle(tamerNpc) {
    if (!tamerNpc || !DATA) return;
    let healthyIdx = getFirstHealthySquadIndex();
    if (healthyIdx === -1) {
      healSquadAtShrine(true);
      healthyIdx = 0;
    }

    const enemySquad = (tamerNpc.squad || tamerNpc.team || [{ speciesId: 10, level: 4 }]).map((s) =>
      DATA.createKinInstance(s.speciesId, s.level, { isRadiant: false })
    );
    enemySquad.forEach((k) => markSeen(k.speciesId));

    battleState = {
      mode: 'tamer',
      title: `TAMER • ${tamerNpc.name.toUpperCase()}`,
      trainerName: tamerNpc.name,
      tamerId: tamerNpc.id,
      rewardShards: tamerNpc.rewardShards || 100,
      enemySquad,
      enemyIndex: 0,
      playerIndex: healthyIdx,
      activeTab: 'moves',
      busy: false,
      logText: `${tamerNpc.name}: ${tamerNpc.quote ? `“${tamerNpc.quote}”` : (tamerNpc.dialogue && tamerNpc.dialogue[0]) || "Let’s battle!"}`
    };

    openBattleOverlay();
  }

  function startWardenBattle(wardenId) {
    if (!DATA || !DATA.WARDENS) return;
    const warden = DATA.WARDENS.find((w) => w.id === wardenId) || DATA.WARDENS[0];
    let healthyIdx = getFirstHealthySquadIndex();
    if (healthyIdx === -1) {
      healSquadAtShrine(true);
      healthyIdx = 0;
    }

    const enemySquad = warden.squad.map((s, idx) =>
      DATA.createKinInstance(s.speciesId, s.level, { isRadiant: idx === warden.squad.length - 1 })
    );
    enemySquad.forEach((k) => markSeen(k.speciesId));

    closeModal();
    battleState = {
      mode: 'warden',
      title: `WARDEN • ${warden.crestName.toUpperCase()}`,
      trainerName: warden.name,
      wardenId: warden.id,
      wardenObj: warden,
      rewardShards: warden.rewardShards || 300,
      enemySquad,
      enemyIndex: 0,
      playerIndex: healthyIdx,
      activeTab: 'moves',
      busy: false,
      logText: `${warden.name}: “${warden.quoteIntro}”`
    };

    openBattleOverlay('warden');
  }

  function startArenaDuel(opponentSnapshot) {
    if (!opponentSnapshot || !Array.isArray(opponentSnapshot.squad) || !opponentSnapshot.squad.length) return;
    let healthyIdx = getFirstHealthySquadIndex();
    if (healthyIdx === -1) {
      healSquadAtShrine(true);
      healthyIdx = 0;
    }

    const enemySquad = opponentSnapshot.squad.map((s) => {
      const inst = DATA.createKinInstance(s.speciesId || 1, s.level || 10, {
        isRadiant: Boolean(s.isRadiant),
        nickname: s.nickname
      });
      return inst;
    });
    enemySquad.forEach((k) => markSeen(k.speciesId));

    closeModal();
    battleState = {
      mode: 'pvp',
      title: `PVP ARENA • VS ${(opponentSnapshot.trainerName || 'RIVAL').toUpperCase()}`,
      trainerName: opponentSnapshot.trainerName || 'Arena Challenger',
      rewardShards: 200,
      enemySquad,
      enemyIndex: 0,
      playerIndex: healthyIdx,
      activeTab: 'moves',
      busy: false,
      logText: `⚔️ Arena Link established! ${opponentSnapshot.trainerName || 'Rival Tamer'} sent out ${enemySquad[0].nickname}!`
    };

    openBattleOverlay('warden');
  }

  function startSpireBattle() {
    if (!DATA || !DATA.KIN_SPECIES) return;
    let healthyIdx = getFirstHealthySquadIndex();
    if (healthyIdx === -1) {
      healSquadAtShrine(true);
      healthyIdx = 0;
    }
    const floor = Math.max(1, Number(state.spireFloor || 1));
    const isBoss = floor % 5 === 0;
    const baseLv = Math.min(75, 10 + Math.floor(floor * 0.65));
    const count = isBoss ? 3 : 2;
    const pool = DATA.KIN_SPECIES.filter((s) => (floor >= 25 ? s.stage >= 2 : floor >= 10 ? s.stage >= 1 : true));
    const enemySquad = [];
    for (let i = 0; i < count; i++) {
      const pick = pool[(floor * 7 + i * 13) % pool.length] || DATA.KIN_SPECIES[0];
      enemySquad.push(
        DATA.createKinInstance(pick.id, baseLv + i, {
          isRadiant: isBoss && i === count - 1,
          geneticTier: isBoss ? 'SS' : floor >= 20 ? 'S' : 'A'
        })
      );
    }
    enemySquad.forEach((k) => markSeen(k.speciesId));

    closeModal();
    battleState = {
      mode: 'spire',
      spireFloor: floor,
      title: `AETHER SPIRE • FLOOR ${floor}/100${isBoss ? ' (APEX BOSS)' : ''}`,
      trainerName: `Spire Sentinel F${floor}`,
      rewardShards: 120 + floor * 18,
      enemySquad,
      enemyIndex: 0,
      playerIndex: healthyIdx,
      activeTab: 'moves',
      busy: false,
      logText: `🗼 Entered Infinite Aether Spire Floor ${floor}! Sentinel unleashed ${enemySquad[0].nickname} (Lv.${enemySquad[0].level})!`
    };
    openBattleOverlay('warden');
  }

  function openBattleOverlay(bgmType = 'battle') {
    const overlay = $('battleOverlay', 'battle-layer');
    if (overlay) overlay.classList.remove('hidden');
    if (typeof document !== "undefined") {
      document.body.classList.add("in-battle");
    }
    closeHubMenuDrawer();
    closeLobbyScreen();
    const interactBtn = $('interactBanner');
    if (interactBtn) interactBtn.classList.add('hidden');

    if (root.WILDKIN_AUDIO) {
      root.WILDKIN_AUDIO.playEncounterAlert();
      root.WILDKIN_AUDIO.startBgm(bgmType);
    }

    const pKin = state.squad[battleState.playerIndex];
    const eKin = battleState.enemySquad[battleState.enemyIndex];
    if (pKin) pKin.buffs = { atk: 1, def: 1, spd: 1 };
    if (eKin) eKin.buffs = { atk: 1, def: 1, spd: 1 };

    if (root.WILDKIN_3D) {
      root.WILDKIN_3D.initBattleArena($("battleStage"));
      root.WILDKIN_3D.resizeBattleArena($("battleStage"));
    }
    renderBattleUI();
  }

  function closeBattleOverlay() {
    grantEncounterGrace(4500);
    const overlay = $('battleOverlay', 'battle-layer');
    if (overlay) overlay.classList.add('hidden');
    if (typeof document !== "undefined") {
      document.body.classList.remove("in-battle");
    }
    battleState = null;
    if (root.WILDKIN_AUDIO) {
      root.WILDKIN_AUDIO.startBgm('overworld');
    }
    saveGame();
    updateHud();
    if (evoQueue.length > 0) {
      triggerNextEvolution();
    }
  }

  function setBattleLog(msg) {
    if (battleState) battleState.logText = msg;
    const logEl = $('battleLog', 'battle-dialogue');
    if (logEl) logEl.textContent = msg;
  }

  function renderBattleUI() {
    if (!battleState || !DATA || !root.WILDKIN_SPRITES) return;
    const enemy = battleState.enemySquad[battleState.enemyIndex];
    const player = state.squad[battleState.playerIndex];
    if (!enemy || !player) return;

    const eSpecies = DATA.getSpeciesById(enemy.speciesId);
    const pSpecies = DATA.getSpeciesById(player.speciesId);
    if (root.WILDKIN_3D) {
      root.WILDKIN_3D.initBattleArena($("battleStage"));
      root.WILDKIN_3D.syncBattleCombatants(player, enemy, DATA, state.zone);
    }
    const eAff = DATA.AFFINITIES[eSpecies.affinity];
    const pAff = DATA.AFFINITIES[pSpecies.affinity];

    // Enemy Status Plate
    const eName = $('enemyName');
    if (eName) eName.textContent = enemy.nickname;
    const eRad = $('enemyRadiantTag');
    if (eRad) eRad.classList.toggle('hidden', !enemy.isRadiant);
    const eBound = $('enemyBoundTag');
    if (eBound) eBound.classList.toggle('hidden', !state.kindexBound[enemy.speciesId]);
    const eLvl = $('enemyLevel');
    if (eLvl) eLvl.textContent = `Lv.${enemy.level}`;
    const eAffBadge = $('enemyAffinityBadge');
    if (eAffBadge) {
      eAffBadge.textContent = `${eAff.icon} ${eAff.name}`;
      eAffBadge.style.color = eAff.color;
    }
    const eStatus = $('enemyStatusPill');
    if (eStatus) {
      if (enemy.status) {
        eStatus.textContent = enemy.status.toUpperCase();
        eStatus.classList.remove('hidden');
      } else {
        eStatus.classList.add('hidden');
      }
    }
    const eHpPct = Math.max(0, Math.min(100, Math.round((enemy.currentHp / enemy.maxHp) * 100)));
    const eHpFill = $('enemyHpFill');
    if (eHpFill) {
      eHpFill.style.width = `${eHpPct}%`;
      eHpFill.style.background = eHpPct > 50 ? '#22c55e' : eHpPct > 22 ? '#facc15' : '#ef4444';
    }
    const eHpText = $('enemyHpText');
    if (eHpText) eHpText.textContent = `HP ${enemy.currentHp}/${enemy.maxHp}`;
    const modeBadge = $('battleModeBadge');
    if (modeBadge) modeBadge.textContent = battleState.title;

    // Player Status Plate
    const pName = $('playerName');
    if (pName) pName.textContent = player.nickname;
    const pRad = $('playerRadiantTag');
    if (pRad) pRad.classList.toggle('hidden', !player.isRadiant);
    const pLvl = $('playerLevel');
    if (pLvl) pLvl.textContent = `Lv.${player.level}`;
    const pAffBadge = $('playerAffinityBadge');
    if (pAffBadge) {
      pAffBadge.textContent = `${pAff.icon} ${pAff.name}`;
      pAffBadge.style.color = pAff.color;
    }
    const pStatus = $('playerStatusPill');
    if (pStatus) {
      if (player.status) {
        pStatus.textContent = player.status.toUpperCase();
        pStatus.classList.remove('hidden');
      } else {
        pStatus.classList.add('hidden');
      }
    }
    const pHpPct = Math.max(0, Math.min(100, Math.round((player.currentHp / player.maxHp) * 100)));
    const pHpFill = $('playerHpFill');
    if (pHpFill) {
      pHpFill.style.width = `${pHpPct}%`;
      pHpFill.style.background = pHpPct > 50 ? '#22c55e' : pHpPct > 22 ? '#facc15' : '#ef4444';
    }
    const pHpText = $('playerHpText');
    if (pHpText) pHpText.textContent = `${player.currentHp} / ${player.maxHp} HP`;
    const xpNext = player.xpToNext || DATA.xpForNextLevel(player.level);
    const pXpText = $('playerXpText');
    if (pXpText) pXpText.textContent = `XP ${player.xp}/${xpNext}`;
    const pXpFill = $('playerXpFill');
    if (pXpFill) {
      const xpPct = Math.max(0, Math.min(100, Math.round((player.xp / xpNext) * 100)));
      pXpFill.style.width = `${xpPct}%`;
    }

    // Mini SVG Badges inside compact top HUD plates + hidden legacy holders
    const eMini = $("enemyMiniSvg");
    if (eMini) eMini.innerHTML = root.WILDKIN_SPRITES.renderKinSvg(eSpecies, 26, enemy.isRadiant);
    const pMini = $("playerMiniSvg");
    if (pMini) pMini.innerHTML = root.WILDKIN_SPRITES.renderKinSvg(pSpecies, 26, player.isRadiant);
    const catchHintEl = $("enemyCatchHint");
    if (catchHintEl) {
      if (battleState.mode === "wild" && DATA.ITEMS && DATA.ITEMS.basicPrism) {
        const pct = Math.round(calculateCatchChance(enemy, DATA.ITEMS.basicPrism) * 100);
        catchHintEl.textContent = `🪤 ${pct}% Trap`;
      } else {
        catchHintEl.textContent = battleState.mode.toUpperCase();
      }
    }
    const eHolder = $('enemySpriteHolder', 'enemy-sprite-canvas');
    if (eHolder) {
      eHolder.innerHTML = root.WILDKIN_SPRITES.renderKinSvg(eSpecies, 64, enemy.isRadiant);
    }
    const pHolder = $('playerSpriteHolder', 'player-sprite-canvas');
    if (pHolder) {
      pHolder.innerHTML = root.WILDKIN_SPRITES.renderKinSvg(pSpecies, 64, player.isRadiant);
    }

    if (!battleState.busy) {
      setBattleTurnBanner('phase-ready', 'YOUR TURN', `Choose ${player.nickname}’s action`);
    }
    setBattleLog(battleState.logText);
    renderBattleDeck();
  }

  function renderBattleDeck() {
    if (!battleState || !DATA) return;
    const deck = $('battleDeckContent');
    if (!deck) return;

    document.querySelectorAll('.btab').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-btab') === battleState.activeTab);
    });

    const player = state.squad[battleState.playerIndex];
    const enemy = battleState.enemySquad[battleState.enemyIndex];
    const eSpecies = DATA.getSpeciesById(enemy.speciesId);

    if (battleState.activeTab === 'moves') {
      deck.innerHTML = (player.moveSlots || []).map((slot, idx) => {
        const move = DATA.MOVES[slot.id] || DATA.MOVES.clawSwipe;
        const aff = DATA.AFFINITIES[move.affinity];
        const mult = move.power > 0 ? DATA.getTypeMultiplier(move.affinity, eSpecies.affinity) : 1.0;
        let effLabel = '';
        if (mult > 1.0) effLabel = `<span class="eff-super">2x SUPER</span>`;
        else if (mult < 1.0) effLabel = `<span class="eff-resist">0.5x RESIST</span>`;
        else effLabel = `<span>${move.power > 0 ? 'PWR ' + move.power : 'BUFF'}</span>`;

        return `
          <button type="button" class="move-btn" data-move-idx="${idx}">
            <div class="move-btn-top">
              <span>${aff.icon} ${move.name}</span>
              <small style="color:#94a3b8">${slot.currentStamina}/${slot.maxStamina}</small>
            </div>
            <div class="move-btn-sub">
              <span>${aff.name}</span>
              ${effLabel}
            </div>
          </button>
        `;
      }).join('');

      deck.querySelectorAll('[data-move-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-move-idx'));
          executePlayerMove(idx);
        });
      });
    } else if (battleState.activeTab === 'trap') {
      const trapKeys = ['basicPrism', 'greaterPrism', 'masteryPrism'].filter((k) => DATA.ITEMS[k]);
      const trapCards = trapKeys.map((key) => {
        const item = DATA.ITEMS[key];
        const count = state.inventory[key] || 0;
        const pct = battleState.mode === 'wild' ? Math.round(calculateCatchChance(enemy, item) * 100) : 0;
        return `
          <button type="button" class="pack-btn" data-trap-id="${key}" style="border-color:${item.color || '#f59e0b'};${count <= 0 ? 'opacity:0.65' : ''}">
            <div class="move-btn-top">
              <span>🪤 ${item.name}</span>
              <span style="color:#fde047">x${count}</span>
            </div>
            <div class="move-btn-sub">
              <span>${item.catchRate}x Snare Rate</span>
              <span style="color:#4ade80;font-weight:900">${battleState.mode === 'wild' ? pct + '% CATCH' : 'WILD ONLY'}</span>
            </div>
          </button>
        `;
      }).join('');

      const quickBuyHtml = `
        <button type="button" class="pack-btn" id="btnBattleQuickBuyTrap" style="border-color:#38bdf8">
          <div class="move-btn-top">
            <span>🛒 Restock Snare Trap</span>
            <span style="color:#fde047">50 🪙</span>
          </div>
          <div class="move-btn-sub">
            <span>Squad ${state.squad.length}/${getMaxSquadSize(state)}</span>
            <span style="color:#38bdf8">+1 Copper Trap</span>
          </div>
        </button>
      `;

      deck.innerHTML = trapCards + quickBuyHtml;
      deck.querySelectorAll('[data-trap-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const itemId = btn.getAttribute('data-trap-id');
          usePackItemInBattle(itemId);
        });
      });
      const qb = $('btnBattleQuickBuyTrap');
      if (qb) {
        qb.addEventListener('click', () => {
          if (buyShopItem('basicPrism', false)) {
            renderBattleDeck();
          }
        });
      }
    } else if (battleState.activeTab === 'pack') {
      const itemKeys = [
        'basicPrism', 'greaterPrism', 'masteryPrism',
        'sunberryRation', 'heartwoodStew', 'feastPlatter',
        'dewTonic', 'hiTonic', 'hyperTonic', 'reviveLeaf', 'phoenixDew'
      ].filter((k, i, arr) => DATA.ITEMS[k] && (i < 6 || (state.inventory[k] || 0) > 0));
      deck.innerHTML = itemKeys.map((key) => {
        const item = DATA.ITEMS[key];
        const count = state.inventory[key] || 0;
        const extra = item.category === 'prism'
          ? (battleState.mode === 'wild' ? `${Math.round(calculateCatchChance(enemy, item) * 100)}% Bind` : 'Wild Only')
          : (item.squadFullHeal ? 'Squad 100% HP' : item.healPercent ? `${Math.round(item.healPercent * 100)}% HP` : `+${item.healAmount || 35} HP`);
        return `
          <button type="button" class="pack-btn" data-item-id="${key}" ${count <= 0 ? 'style="opacity:0.45"' : ''}>
            <div class="move-btn-top">
              <span>${item.icon} ${item.name}</span>
              <span style="color:#facc15">x${count}</span>
            </div>
            <div class="move-btn-sub">
              <span>${item.category.toUpperCase()}</span>
              <span style="color:#38bdf8">${extra}</span>
            </div>
          </button>
        `;
      }).join('');

      deck.querySelectorAll('[data-item-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const itemId = btn.getAttribute('data-item-id');
          usePackItemInBattle(itemId);
        });
      });
    } else if (battleState.activeTab === 'squad') {
      deck.innerHTML = state.squad.map((kin, idx) => {
        const sp = DATA.getSpeciesById(kin.speciesId);
        const aff = DATA.AFFINITIES[sp.affinity];
        const isCurrent = idx === battleState.playerIndex;
        return `
          <button type="button" class="pack-btn" data-switch-idx="${idx}">
            <div class="move-btn-top">
              <span>${aff.icon} ${kin.nickname} Lv.${kin.level}</span>
              <span style="color:${isCurrent ? '#38bdf8' : '#4ade80'}">${isCurrent ? 'ACTIVE' : 'SWITCH'}</span>
            </div>
            <div class="move-btn-sub">
              <span>HP ${kin.currentHp}/${kin.maxHp}</span>
              <span>${kin.isRadiant ? '✨ Radiant' : sp.name}</span>
            </div>
          </button>
        `;
      }).join('');

      deck.querySelectorAll('[data-switch-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-switch-idx'));
          switchSquadInBattle(idx);
        });
      });
    }
  }

  function animateSpriteHit(isPlayerAttacking, callback, moveObj = null, dmgRes = null) {
    const attackerHolder = $(isPlayerAttacking ? "playerSpriteHolder" : "enemySpriteHolder");
    const defenderHolder = $(isPlayerAttacking ? "enemySpriteHolder" : "playerSpriteHolder");
    const lungeClass = isPlayerAttacking ? "lunge-player" : "lunge-enemy";

    if (attackerHolder) attackerHolder.classList.add(lungeClass);

    if (root.WILDKIN_3D && typeof document !== "undefined") {
      root.WILDKIN_3D.playAttack3D(isPlayerAttacking, moveObj, dmgRes, () => {
        if (attackerHolder) attackerHolder.classList.remove(lungeClass);
        if (defenderHolder) defenderHolder.classList.add("hit-flash");
        if (dmgRes && dmgRes.damage) {
          spawnBattleDamagePopup(isPlayerAttacking ? "enemy" : "player", dmgRes.damage, dmgRes.isCrit, dmgRes.effectiveness);
        }
        setTimeout(() => {
          if (defenderHolder) defenderHolder.classList.remove("hit-flash");
        }, 220);
        if (callback) callback();
      });
      return;
    }

    setTimeout(() => {
      if (attackerHolder) attackerHolder.classList.remove(lungeClass);
      if (defenderHolder) defenderHolder.classList.add("hit-flash");
      if (dmgRes && dmgRes.damage) {
        spawnBattleDamagePopup(isPlayerAttacking ? "enemy" : "player", dmgRes.damage, dmgRes.isCrit, dmgRes.effectiveness);
      }
      setTimeout(() => {
        if (defenderHolder) defenderHolder.classList.remove("hit-flash");
        if (callback) callback();
      }, 170);
    }, 150);
  }

  function executePlayerMove(moveIdx) {
    if (!battleState || battleState.busy) return;
    const player = state.squad[battleState.playerIndex];
    const enemy = battleState.enemySquad[battleState.enemyIndex];
    if (!player || !enemy || player.currentHp <= 0) return;

    const slot = player.moveSlots[moveIdx] || player.moveSlots[0];
    if (!slot) return;
    const move = DATA.MOVES[slot.id] || DATA.MOVES.clawSwipe;

    if (slot.currentStamina <= 0) {
      setBattleLog(`${move.name} is out of Stamina! Choose another move or heal at a Shrine.`);
      return;
    }

    // PHASE 1: PLAYER'S TURN (Distinct announcement + camera cut + wind-up)
    battleState.busy = true;
    setBattleTurnBanner('phase-player', 'TURN 1 • YOUR MOVE', `${player.nickname} prepares ${move.name}!`);

    if (player.status === 'paralyze' && Math.random() < 0.22) {
      setBattleLog(`⚡ ${player.nickname} is paralyzed by static and couldn’t move!`);
      renderBattleUI();
      setTimeout(() => executeEnemyTurn(), 1050);
      return;
    }

    slot.currentStamina = Math.max(0, slot.currentStamina - 1);
    setBattleLog(`⚔️ [YOUR TURN] ${player.nickname} unleashes ${move.name}!`);
    renderBattleUI();

    if (move.category === 'status' && move.selfBuff) {
      player.buffs = player.buffs || { atk: 1, def: 1, spd: 1 };
      if (move.selfBuff.atk) player.buffs.atk = Math.min(2.2, (player.buffs.atk || 1) * move.selfBuff.atk);
      if (move.selfBuff.def) player.buffs.def = Math.min(2.2, (player.buffs.def || 1) * move.selfBuff.def);
      if (move.selfBuff.spd) player.buffs.spd = Math.min(2.2, (player.buffs.spd || 1) * move.selfBuff.spd);
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(780, 0.09);
      setBattleLog(`✨ ${player.nickname} used ${move.name}! Resonance boosted its stats!`);
      renderBattleUI();
      setTimeout(() => executeEnemyTurn(), 1100);
      return;
    }

    const res = calculateDamage(player, enemy, move);
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playAttack(res.multiplier);

    animateSpriteHit(true, () => {
      enemy.currentHp = Math.max(0, enemy.currentHp - res.damage);
      let msg = `💥 ${player.nickname}’s ${move.name} hit for ${res.damage} dmg!`;
      if (res.isCrit) msg += ' CRITICAL HIT!';
      if (res.effectiveness === 'super') msg += ' Super effective!';
      else if (res.effectiveness === 'resist') msg += ' Resisted...';

      if (move.drain && res.damage > 0) {
        const drained = Math.max(1, Math.round(res.damage * move.drain));
        player.currentHp = Math.min(player.maxHp, player.currentHp + drained);
        msg += ` Drained +${drained} HP!`;
      }

      if (enemy.currentHp > 0 && move.statusEffect && !enemy.status) {
        if (Math.random() < move.statusEffect.chance) {
          enemy.status = move.statusEffect.type;
          msg += ` ${enemy.nickname} was inflicted with ${enemy.status.toUpperCase()}!`;
        }
      }

      setBattleLog(msg);
      renderBattleUI();

      // Pause cleanly so the player sees their hit land & HP drain before Turn 2 begins!
      if (enemy.currentHp <= 0) {
        setBattleTurnBanner('phase-player', 'TARGET DEFEATED', `${enemy.nickname} collapsed!`);
        setTimeout(() => handleEnemyDefeated(), 900);
      } else {
        setTimeout(() => executeEnemyTurn(), 980);
      }
    }, move, res);
  }

  function executeEnemyTurn() {
    if (!battleState) return;
    const player = state.squad[battleState.playerIndex];
    const enemy = battleState.enemySquad[battleState.enemyIndex];
    if (!enemy || enemy.currentHp <= 0) {
      battleState.busy = false;
      setBattleTurnBanner('phase-ready', 'YOUR TURN', `Choose ${player ? player.nickname : 'Partner'}’s action`);
      return;
    }

    // PHASE 2: ENEMY'S TURN (Distinct announcement + camera cut to enemy + wind-up pause)
    const eMoves = (enemy.moveSlots || []).map((ms) => DATA.MOVES[ms.id] || DATA.MOVES.clawSwipe);
    const chosenMove = eMoves[Math.floor(Math.random() * eMoves.length)] || DATA.MOVES.clawSwipe;

    setBattleTurnBanner('phase-enemy', 'TURN 2 • FOE ATTACKS', `Foe ${enemy.nickname} counters with ${chosenMove.name}!`);
    setBattleLog(`⚠️ [FOE TURN] Foe ${enemy.nickname} readies ${chosenMove.name}!`);

    // End-of-round burn/poison tick on enemy
    if (enemy.status === 'burn' || enemy.status === 'poison') {
      const dot = Math.max(1, Math.floor(enemy.maxHp * 0.08));
      enemy.currentHp = Math.max(0, enemy.currentHp - dot);
      if (enemy.currentHp <= 0) {
        renderBattleUI();
        setBattleLog(`${enemy.nickname} fainted from ${enemy.status.toUpperCase()} damage!`);
        setTimeout(() => handleEnemyDefeated(), 850);
        return;
      }
    }

    if (enemy.status === 'paralyze' && Math.random() < 0.25) {
      setBattleLog(`⚡ Foe ${enemy.nickname} is paralyzed and missed its turn!`);
      setTimeout(() => {
        if (!battleState) return;
        battleState.busy = false;
        renderBattleUI();
      }, 850);
      return;
    }

    if (chosenMove.category === 'status' && chosenMove.selfBuff) {
      enemy.buffs = enemy.buffs || { atk: 1, def: 1, spd: 1 };
      if (chosenMove.selfBuff.atk) enemy.buffs.atk = Math.min(2.0, (enemy.buffs.atk || 1) * chosenMove.selfBuff.atk);
      if (chosenMove.selfBuff.def) enemy.buffs.def = Math.min(2.0, (enemy.buffs.def || 1) * chosenMove.selfBuff.def);
      setBattleLog(`🛡️ Foe ${enemy.nickname} used ${chosenMove.name} and fortified itself!`);
      setTimeout(() => {
        if (!battleState) return;
        battleState.busy = false;
        renderBattleUI();
      }, 900);
      return;
    }

    // Brief 340ms dramatic wind-up before the enemy lunges across the 3D arena
    setTimeout(() => {
      if (!battleState) return;
      const res = calculateDamage(enemy, player, chosenMove);
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playAttack(res.multiplier);

      animateSpriteHit(false, () => {
        player.currentHp = Math.max(0, player.currentHp - res.damage);

        // Bond Level survival miracle (Bond Lv.5+ has a chance to endure a fatal hit at 1 HP!)
        if (player.currentHp <= 0 && Number(player.bondLevel || 1) >= 5 && Math.random() < 0.28) {
          player.currentHp = 1;
        }

        let msg = `🔥 Foe ${enemy.nickname} used ${chosenMove.name}! (${res.damage} dmg)`;
        if (res.effectiveness === 'super') msg += ' It’s super effective!';
        else if (res.effectiveness === 'resist') msg += ' Not very effective.';

        if (player.currentHp > 0 && chosenMove.statusEffect && !player.status) {
          if (Math.random() < chosenMove.statusEffect.chance) {
            player.status = chosenMove.statusEffect.type;
            msg += ` ${player.nickname} caught ${player.status.toUpperCase()}!`;
          }
        }

        // Player burn/poison tick
        if (player.currentHp > 0 && (player.status === 'burn' || player.status === 'poison')) {
          const pDot = Math.max(1, Math.floor(player.maxHp * 0.07));
          player.currentHp = Math.max(0, player.currentHp - pDot);
          msg += ` (${player.status.toUpperCase()} -${pDot} HP)`;
        }

        setBattleLog(msg);
        renderBattleUI();

        if (player.currentHp <= 0) {
          const nextIdx = getFirstHealthySquadIndex();
          if (nextIdx !== -1) {
            battleState.playerIndex = nextIdx;
            const nextKin = state.squad[nextIdx];
            setTimeout(() => {
              if (!battleState) return;
              setBattleLog(`${player.nickname} is exhausted! Go, ${nextKin.nickname}!`);
              battleState.busy = false;
              renderBattleUI();
            }, 900);
          } else {
            setTimeout(() => {
              setBattleLog('All Squad Kin are exhausted! Retreating to the Wellspring Shrine...');
              setTimeout(() => {
                healSquadAtShrine(true);
                closeBattleOverlay();
                showToast('⛲ Rescued to Wellspring Shrine — Squad fully restored!');
              }, 1100);
            }, 750);
          }
        } else {
          setTimeout(() => {
            if (!battleState) return;
            battleState.busy = false;
            renderBattleUI();
          }, 520);
        }
      }, chosenMove, res);
    }, 340);
  }

  function usePackItemInBattle(itemId) {
    if (!battleState || battleState.busy || !DATA) return;
    const item = DATA.ITEMS[itemId];
    if (!item) return;
    const count = state.inventory[itemId] || 0;
    if (count <= 0) {
      setBattleLog(`You don’t have any ${item.name} left! Visit the Shop to restock.`);
      return;
    }

    if (item.category === 'prism') {
      if (battleState.mode !== 'wild') {
        setBattleLog('Aether Prisms can only bind wild Kin, not another Tamer’s partner!');
        return;
      }
      throwPrismInBattle(item);
      return;
    }

    const player = state.squad[battleState.playerIndex];
    state.inventory[itemId] = count - 1;
    battleState.busy = true;
    setBattleTurnBanner('phase-player', 'TURN 1 • PACK ITEM', `Using ${item.name}...`);

    if (item.squadFullHeal) {
      state.squad.forEach((k) => {
        k.currentHp = k.maxHp;
        k.status = null;
        (k.moveSlots || []).forEach((ms) => {
          const m = DATA.MOVES[ms.id];
          ms.currentStamina = m ? m.stamina : ms.maxStamina;
        });
      });
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
      setBattleLog(`🍱 Used ${item.name}! Entire Squad restored to 100% HP & Stamina!`);
    } else if (item.category === 'revive' || item.healPercent) {
      const target = (item.category === 'revive' ? state.squad.find((k) => k.currentHp <= 0) : null) || player;
      target.currentHp = Math.max(1, Math.round(target.maxHp * (item.healPercent || 0.5)));
      target.status = null;
      if (item.restoreStamina || item.category === 'food') {
        (target.moveSlots || []).forEach((ms) => {
          const m = DATA.MOVES[ms.id];
          ms.currentStamina = m ? m.stamina : ms.maxStamina;
        });
      }
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
      setBattleLog(`${item.icon} Used ${item.name} on ${target.nickname}! Restored to ${target.currentHp}/${target.maxHp} HP!`);
    } else {
      if (item.regenBoostSec) {
        state.regenBoostUntil = Math.max(Date.now(), Number(state.regenBoostUntil || 0)) + item.regenBoostSec * 1000;
      }
      const amt = item.healAmount || 35;
      const healed = Math.min(player.maxHp - player.currentHp, amt);
      player.currentHp = Math.min(player.maxHp, player.currentHp + amt);
      player.status = null;
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
      setBattleLog(`${item.icon} Used ${item.name}! ${player.nickname} recovered ${healed} HP & cured status!`);
    }

    renderBattleUI();
    setTimeout(() => executeEnemyTurn(), 750);
  }

  function throwPrismInBattle(prismItem) {
    if (!battleState || battleState.busy) return;
    const enemy = battleState.enemySquad[battleState.enemyIndex];
    state.inventory[prismItem.id] = Math.max(0, (state.inventory[prismItem.id] || 1) - 1);
    battleState.busy = true;

    const chance = calculateCatchChance(enemy, prismItem);
    const caught = Math.random() < chance;
    const shakes = caught ? 3 : Math.max(1, Math.min(2, Math.ceil(chance * 3)));

    setBattleTurnBanner('phase-player', 'TURN 1 • SNARE TRAP DEPLOYED', `Trapping wild ${enemy.nickname} (${Math.round(chance * 100)}%)`);
    setBattleLog(`🪤 Threw ${prismItem.name} at wild ${enemy.nickname}! (${Math.round(chance * 100)}% snare lock)`);
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playPrismThrow();
    if (root.WILDKIN_3D) {
      root.WILDKIN_3D.playPrismCapture3D(prismItem.color, shakes, caught);
    }

    const pCanvas = $('prismAnimCanvas');
    const eHolder = $('enemySpriteHolder');
    if (pCanvas && eHolder && root.WILDKIN_SPRITES) {
      pCanvas.classList.remove('hidden');
      eHolder.style.opacity = '0.2';
      const ctx = pCanvas.getContext('2d');

      let step = 0;
      const runShake = () => {
        step++;
        if (step <= shakes) {
          const tilt = (step % 2 === 0 ? 1 : -1) * 0.28;
          ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
          root.WILDKIN_SPRITES.drawPrismDevice(ctx, 60, 60, 44, prismItem.color, tilt, step === shakes);
          if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playPrismShake(step);
          setBattleLog(`💠 Aether Prism resonating... (Pulse ${step}/3)`);
          setTimeout(runShake, 420);
        } else {
          ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
          pCanvas.classList.add('hidden');
          if (caught) {
            completePrismCatch(enemy);
          } else {
            eHolder.style.opacity = '1';
            setBattleLog(`💥 Wild ${enemy.nickname} broke free from the Prism! Almost had it!`);
            setTimeout(() => executeEnemyTurn(), 750);
          }
        }
      };
      runShake();
    } else {
      if (caught) completePrismCatch(enemy);
      else {
        setBattleLog(`Wild ${enemy.nickname} broke free!`);
        setTimeout(() => executeEnemyTurn(), 600);
      }
    }
  }

  function completePrismCatch(enemy) {
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playPrismCatchSuccess();
    markBound(enemy.speciesId, enemy.isRadiant);

    const captured = Object.assign({}, enemy, {
      currentHp: enemy.maxHp,
      status: null,
      caughtZone: getZoneObj(state.zone).name
    });

    const maxSq = getMaxSquadSize(state);
    const maxVt = getMaxVaultSize(state);
    let dest = `Active Squad (${state.squad.length + 1}/${maxSq})`;
    if (state.squad.length < maxSq) {
      state.squad.push(captured);
    } else {
      if (state.vault.length < maxVt) {
        state.vault.push(captured);
      } else {
        state.vault.push(captured);
      }
      dest = `Carrier Bag Reserve (${state.vault.length}/${maxVt})`;
    }

    const bonusShards = 25 + enemy.level * 5;
    state.shards += bonusShards;
    const xpGain = 22 + enemy.level * 12;
    grantXpToActiveKin(xpGain);
    addBattlePassXp(60, state);

    setBattleLog(`🪤 TRAPPED & BOUND! ${enemy.nickname} joined your ${dest}! (+${bonusShards}🪙, +${xpGain} XP, +60 BP XP)`);
    renderBattleUI();
    setTimeout(() => {
      const eHolder = $('enemySpriteHolder');
      if (eHolder) eHolder.style.opacity = '1';
      closeBattleOverlay();
      showToast(`🪤 Caught ${enemy.nickname} (Lv.${enemy.level}) → ${dest}!`, 3400);
    }, 1150);
  }

  function switchSquadInBattle(newIdx) {
    if (!battleState || battleState.busy) return;
    if (newIdx === battleState.playerIndex) {
      setBattleLog(`${state.squad[newIdx].nickname} is already in battle!`);
      return;
    }
    const target = state.squad[newIdx];
    if (!target || target.currentHp <= 0) {
      setBattleLog('That Kin is exhausted and cannot enter battle!');
      return;
    }
    battleState.playerIndex = newIdx;
    battleState.activeTab = 'moves';
    battleState.busy = true;
    setBattleTurnBanner('phase-player', 'TURN 1 • SQUAD SWITCH', `Sent out ${target.nickname} (Lv.${target.level})!`);
    setBattleLog(`🐾 Come back! Go, ${target.nickname} (Lv.${target.level})!`);
    renderBattleUI();
    setTimeout(() => executeEnemyTurn(), 650);
  }

  function fleeBattle() {
    if (!battleState || battleState.busy) return;
    if (battleState.mode !== 'wild') {
      setBattleLog('You cannot flee from an official Tamer or Warden challenge!');
      return;
    }
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(420, 0.08);
    setBattleLog('🏃 Safely retreated back to the trail!');
    setTimeout(() => closeBattleOverlay(), 400);
  }

  function grantXpToActiveKin(xpAmount) {
    const player = state.squad[battleState ? battleState.playerIndex : 0];
    if (!player || !DATA) return { leveledUp: false };
    const mult = (state.xpBoostUntil && Number(state.xpBoostUntil) > Date.now()) ? 2 : 1;
    const finalXp = Math.round(xpAmount * mult);
    player.xp = (player.xp || 0) + finalXp;
    let leveledUp = false;

    while (player.xp >= (player.xpToNext || DATA.xpForNextLevel(player.level))) {
      player.xp -= (player.xpToNext || DATA.xpForNextLevel(player.level));
      player.level += 1;
      player.xpToNext = DATA.xpForNextLevel(player.level);
      const sp = DATA.getSpeciesById(player.speciesId);
      const newStats = DATA.calculateStatsForLevel(sp.baseStats, player.level, player.isRadiant, player.geneticBonus || 0, player.bondLevel || 1);
      const hpDiff = Math.max(2, newStats.maxHp - player.maxHp);
      player.maxHp = newStats.maxHp;
      player.currentHp = Math.min(player.maxHp, player.currentHp + hpDiff);
      player.atk = newStats.atk;
      player.def = newStats.def;
      player.spd = newStats.spd;
      leveledUp = true;

      if (sp.evolvesTo && player.level >= sp.evolvesTo.level) {
        const alreadyQueued = evoQueue.some((e) => e.kin.uid === player.uid);
        if (!alreadyQueued) {
          evoQueue.push({ kin: player, fromSpeciesId: sp.id, toSpeciesId: sp.evolvesTo.id });
        }
      }
    }

    if (leveledUp && root.WILDKIN_AUDIO) {
      root.WILDKIN_AUDIO.playLevelUp();
    }
    return { leveledUp, newLevel: player.level };
  }

  function handleEnemyDefeated() {
    if (!battleState || !DATA) return;
    const defeated = battleState.enemySquad[battleState.enemyIndex];
    const xpGain = 26 + defeated.level * 14;
    const lvlRes = grantXpToActiveKin(xpGain);

    // Check if enemy trainer has more Kin
    if (battleState.enemyIndex + 1 < battleState.enemySquad.length) {
      battleState.enemyIndex += 1;
      const nextEnemy = battleState.enemySquad[battleState.enemyIndex];
      markSeen(nextEnemy.speciesId);
      battleState.busy = false;
      setBattleLog(
        `${defeated.nickname} fainted! (+${xpGain} XP)${lvlRes.leveledUp ? ` Level Up → Lv.${lvlRes.newLevel}!` : ''} ${battleState.trainerName} sent out ${nextEnemy.nickname} (Lv.${nextEnemy.level})!`
      );
      renderBattleUI();
      return;
    }

    // Battle Won!
    state.stats.battlesWon = (state.stats.battlesWon || 0) + 1;
    const reward = battleState.rewardShards || 50;
    state.shards += reward;
    addBattlePassXp(45, state);

    let winMsg = `🏆 Victory! Earned +${reward}💎 Aether Shards & +${xpGain} XP!`;
    if (lvlRes.leveledUp) {
      winMsg += ` ${state.squad[battleState.playerIndex].nickname} reached Lv.${lvlRes.newLevel}!`;
    }

    if (battleState.mode === 'tamer' && battleState.tamerId) {
      state.defeatedTamers[battleState.tamerId] = true;
    }

    if (battleState.mode === 'warden' && battleState.wardenObj) {
      const w = battleState.wardenObj;
      if (!state.crests.includes(w.id)) {
        state.crests.push(w.id);
      }
      winMsg = `👑 ${w.name}: “${w.quoteDefeat}” Earned ${w.crestIcon} ${w.crestName} & +${reward}💎!`;
    } else if (battleState.mode === 'spire') {
      const clearedFloor = battleState.spireFloor || state.spireFloor || 1;
      state.spireFloor = Math.min(100, clearedFloor + 1);
      winMsg = `🗼 Cleared Aether Spire Floor ${clearedFloor}! Unlocked Floor ${state.spireFloor} & +${reward}💎!`;
    }

    setBattleLog(winMsg);
    renderBattleUI();
    setTimeout(() => {
      closeBattleOverlay();
      showToast(winMsg);
    }, 1250);
  }

  // =========================================================================
  // 8. 3-STAGE EVOLUTION METAMORPHOSIS OVERLAY
  // =========================================================================

  function triggerNextEvolution() {
    if (evoQueue.length === 0 || !DATA || !root.WILDKIN_SPRITES) return;
    activeEvo = evoQueue.shift();
    activeEvo.step = 1;

    const overlay = $('evolutionOverlay', 'evolution-overlay');
    if (overlay) overlay.classList.remove('hidden');
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playEvolution();
    renderEvolutionStage();
  }

  function renderEvolutionStage() {
    if (!activeEvo || !DATA || !root.WILDKIN_SPRITES) return;
    const fromSp = DATA.getSpeciesById(activeEvo.fromSpeciesId);
    const toSp = DATA.getSpeciesById(activeEvo.toSpeciesId);
    const badge = $('evoStageBadge');
    const title = $('evoTitle');
    const visual = $('evoVisual');
    const desc = $('evoDesc');
    const btn = $('btnEvoNext');

    if (activeEvo.step === 1) {
      if (badge) badge.textContent = 'AETHER METAMORPHOSIS • STAGE 1/2';
      if (title) title.textContent = `What?! ${activeEvo.kin.nickname} is resonating!`;
      if (visual) {
        visual.innerHTML = `
          <div>${root.WILDKIN_SPRITES.renderKinSvg(fromSp, 76, activeEvo.kin.isRadiant)}</div>
          <span style="font-size:1.5rem;color:#facc15">⚡➔</span>
          <div style="filter:brightness(0) invert(1);opacity:0.75">${root.WILDKIN_SPRITES.renderKinSvg(toSp, 76, activeEvo.kin.isRadiant)}</div>
        `;
      }
      if (desc) desc.textContent = `Brilliant Aether light envelops ${fromSp.name} at Lv.${activeEvo.kin.level}...`;
      if (btn) btn.textContent = '✨ Awaken Next Form';
    } else {
      // Perform evolution mutation on the Kin instance
      const kin = activeEvo.kin;
      const wasDefaultName = kin.nickname === fromSp.name;
      kin.speciesId = toSp.id;
      if (wasDefaultName) kin.nickname = toSp.name;
      const stats = DATA.calculateStatsForLevel(toSp.baseStats, kin.level, kin.isRadiant, kin.geneticBonus || 0, kin.bondLevel || 1);
      if (state.stats) state.stats.evolutions = (state.stats.evolutions || 0) + 1;
      kin.maxHp = stats.maxHp;
      kin.currentHp = stats.maxHp;
      kin.atk = stats.atk;
      kin.def = stats.def;
      kin.spd = stats.spd;
      kin.moveSlots = (toSp.moves || ['clawSwipe']).slice(0, 4).map((mId) => {
        const m = DATA.MOVES[mId] || DATA.MOVES.clawSwipe;
        return { id: m.id, currentStamina: m.stamina, maxStamina: m.stamina };
      });
      markBound(toSp.id);
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();

      if (badge) badge.textContent = 'AETHER METAMORPHOSIS • COMPLETE!';
      if (title) title.textContent = `Congratulations! ${fromSp.name} evolved into ${toSp.name}!`;
      if (visual) {
        visual.innerHTML = `<div>${root.WILDKIN_SPRITES.renderKinSvg(toSp, 92, kin.isRadiant)}</div>`;
      }
      if (desc) desc.textContent = `${toSp.title} — ${toSp.lore}`;
      if (btn) btn.textContent = '💠 Continue Journey';
    }
  }

  function advanceEvolutionStage() {
    if (!activeEvo) return;
    if (activeEvo.step === 1) {
      activeEvo.step = 2;
      renderEvolutionStage();
    } else {
      const overlay = $('evolutionOverlay', 'evolution-overlay');
      if (overlay) overlay.classList.add('hidden');
      activeEvo = null;
      saveGame();
      updateHud();
      if (evoQueue.length > 0) {
        triggerNextEvolution();
      }
    }
  }

  // =========================================================================
  // 9. UNIVERSAL MODAL DRAWER (SQUAD, KINDEX, WARDENS/PVP, SHOP, ZONES, CLOUD)
  // =========================================================================

  function closeModal() {
    const backdrop = $('modalBackdrop', 'modal-overlay');
    if (backdrop) backdrop.classList.add('hidden');
  }

  function buyShopItem(itemId, payWithGems = false) {
    if (!DATA || !DATA.ITEMS[itemId]) return false;
    const item = DATA.ITEMS[itemId];
    if (payWithGems) {
      const gCost = Number(item.gemCost || Math.max(1, Math.ceil((item.cost || 40) / 8)));
      if ((state.gems || 0) < gCost) {
        showToast(`Need ${gCost} 💎 Aether Gems! Visit the Gem Store tab to top up.`);
        return false;
      }
      state.gems -= gCost;
    } else {
      if ((state.shards || 0) < item.cost) {
        showToast(`Need ${item.cost} 🪙 Shards to buy ${item.name}!`);
        return false;
      }
      state.shards -= item.cost;
    }
    state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
    if (item.category === "bag") {
      upgradeKinBag(itemId, state);
      return true;
    }
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(720, 0.06);
    saveGame();
    updateHud();
    showToast(`🛒 Purchased ${item.icon} ${item.name}! (In Pack: x${state.inventory[itemId]})`);
    return true;
  }

  function openModal(tab) {
    const backdrop = $('modalBackdrop', 'modal-overlay');
    const titleEl = $('modalTitle');
    const bodyEl = $('modalBody');
    if (!backdrop || !titleEl || !bodyEl || !DATA || !root.WILDKIN_SPRITES) return;

    backdrop.classList.remove('hidden');
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(540, 0.04);

    if (tab === 'squad') {
      closeHubMenuDrawer();
      const maxSq = getMaxSquadSize(state);
      const maxVt = getMaxVaultSize(state);
      const nextBagKey = (state.bagTier || 0) === 0 ? 'bagUpgrade1' : (state.bagTier === 1 ? 'bagUpgrade2' : (state.bagTier === 2 ? 'bagUpgrade3' : null));
      const nextBagItem = nextBagKey && DATA.ITEMS ? DATA.ITEMS[nextBagKey] : null;

      titleEl.textContent = `🐾 Active Squad (${state.squad.length}/${maxSq}) & Carrier Bag (${state.vault.length}/${maxVt})`;
      const renderKinCard = (kin, idx, isVault) => {
        const sp = DATA.getSpeciesById(kin.speciesId);
        const aff = DATA.AFFINITIES[sp.affinity];
        const svg = root.WILDKIN_SPRITES.renderKinSvg(sp, 46, kin.isRadiant);
        return `
          <div class="kin-card ${kin.isRadiant ? 'radiant' : ''}">
            <div class="kin-card-top">
              ${svg}
              <div>
                <div style="font-weight:800;font-size:0.8rem">${kin.nickname} ${kin.isRadiant ? '✨' : ''} <span class="genetic-badge" style="color:${(DATA.GENETIC_TIERS && DATA.GENETIC_TIERS[kin.geneticTier || 'B'] && DATA.GENETIC_TIERS[kin.geneticTier || 'B'].color) || '#94a3b8'}">${kin.geneticTier || 'B'}-Rank</span></div>
                <div style="font-size:0.68rem;color:#facc15">Lv.${kin.level} • ${aff.icon} ${aff.name} • ❤️ Bond ${kin.bondLevel || 1}/10</div>
                <div style="font-size:0.64rem;color:#cbd5e1">HP ${kin.currentHp}/${kin.maxHp} • ATK ${kin.atk}${kin.generation > 1 ? ` • Gen ${kin.generation}` : ''}</div>
                ${!isVault && kin.currentHp < kin.maxHp ? `<div style="margin-top:2px"><span class="regen-timer-pill">${getKinRecoveryEtaText(kin)}</span></div>` : ''}
              </div>
            </div>
            <div class="mini-btn-row">
              ${!isVault && kin.currentHp < kin.maxHp ? `<button class="mini-btn" style="background:#16a34a" data-quick-heal-idx="${idx}">🍖 Feed / Heal</button>` : ''}
              ${!isVault && idx > 0 ? `<button class="mini-btn" data-lead-idx="${idx}">Make Lead</button>` : ''}
              ${!isVault && state.squad.length > 1 ? `<button class="mini-btn secondary" data-to-vault="${idx}">To Bag</button>` : ''}
              ${isVault && state.squad.length < maxSq ? `<button class="mini-btn" data-to-squad="${idx}">To Squad</button>` : ''}
            </div>
          </div>
        `;
      };

      const bagBannerHtml = nextBagItem ? `
        <div class="ranch-banner" style="border-color:rgba(250,204,21,0.45)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <div>
              <strong style="font-size:0.78rem;color:#fde047">🎒 Carrier Bag Tier ${state.bagTier || 0}/3 — Hold up to ${maxSq} Active Kin &amp; ${maxVt} Reserve!</strong>
              <div style="font-size:0.65rem;color:#cbd5e1">Upgrade to <strong>${nextBagItem.icon} ${nextBagItem.name}</strong> (${nextBagItem.maxSquadSize} Active Squad / ${nextBagItem.maxVaultSize} Reserve)!</div>
            </div>
            <button type="button" class="mini-btn" id="btnSquadBuyBagUpgrade" style="flex:0 0 auto;background:#ca8a04;color:#0f172a;font-weight:900">
              🎒 Upgrade Bag (🪙 ${nextBagItem.cost} / 💎 ${nextBagItem.gemCost})
            </button>
          </div>
        </div>
      ` : `
        <div class="ranch-banner" style="border-color:#4ade80">
          <strong style="font-size:0.76rem;color:#4ade80">🎒 Grandmaster Spatial Harness Equipped (Max Tier 3/3: ${maxSq} Active Squad / ${maxVt} Reserve)!</strong>
        </div>
      `;

      bodyEl.innerHTML = `
        ${bagBannerHtml}
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.75rem;color:#38bdf8;font-weight:800">Active Squad (${state.squad.length}/${maxSq} Kin with you)</span>
          <span style="font-size:0.68rem;color:#fde047">🪤 Traps in Pack: x${(state.inventory.basicPrism || 0) + (state.inventory.greaterPrism || 0) + (state.inventory.masteryPrism || 0)}</span>
        </div>
        <div class="card-grid">${state.squad.map((k, i) => renderKinCard(k, i, false)).join('')}</div>
        <div style="font-size:0.75rem;color:#c084fc;font-weight:800;margin-top:6px">Carrier Bag Reserve (${state.vault.length}/${maxVt} Stored)</div>
        ${state.vault.length === 0
          ? `<div style="font-size:0.72rem;color:#94a3b8">You start with 1 Partner Kin! Catch wild Kin with 🪤 Snare Traps, Trade, or Breed at Grandpa’s Ranch to fill your 4-Kin Squad and Carrier Bag.</div>`
          : `<div class="card-grid">${state.vault.map((k, i) => renderKinCard(k, i, true)).join('')}</div>`
        }
      `;

      bodyEl.querySelectorAll('[data-lead-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-lead-idx'));
          const chosen = state.squad.splice(i, 1)[0];
          state.squad.unshift(chosen);
          saveGame();
          updateHud();
          openModal('squad');
        });
      });
      bodyEl.querySelectorAll('[data-to-vault]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-to-vault'));
          if (state.squad.length <= 1) return;
          const moved = state.squad.splice(i, 1)[0];
          state.vault.push(moved);
          saveGame();
          updateHud();
          openModal('squad');
        });
      });
      const upBagBtn = $('btnSquadBuyBagUpgrade');
      if (upBagBtn && nextBagKey) {
        upBagBtn.addEventListener('click', () => {
          if (!buyShopItem(nextBagKey, false)) {
            buyShopItem(nextBagKey, true);
          }
          openModal('squad');
        });
      }
      bodyEl.querySelectorAll('[data-to-squad]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-to-squad'));
          if (state.squad.length >= getMaxSquadSize(state)) {
            showToast(`Active Squad full (${getMaxSquadSize(state)}/${getMaxSquadSize(state)})! Upgrade your Carrier Bag to hold more active Kin!`);
            return;
          }
          const moved = state.vault.splice(i, 1)[0];
          state.squad.push(moved);
          saveGame();
          updateHud();
          openModal('squad');
        });
      });
      bodyEl.querySelectorAll('[data-quick-heal-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-quick-heal-idx'));
          quickFeedOrHealKin(i);
          openModal('squad');
        });
      });
    } else if (tab === 'kindex') {
      const boundCount = Object.keys(state.kindexBound).length;
      const seenCount = Object.keys(state.kindexSeen).length;
      titleEl.textContent = `📖 KinDex Compendium • ${boundCount}/27 Bound (${seenCount} Seen)`;
      bodyEl.innerHTML = `
        <div class="card-grid">
          ${DATA.KIN_SPECIES.map((sp) => {
            const bound = Boolean(state.kindexBound[sp.id]);
            const seen = Boolean(state.kindexSeen[sp.id]) || bound;
            const aff = DATA.AFFINITIES[sp.affinity];
            const svg = root.WILDKIN_SPRITES.renderKinSvg(sp, 44, false);
            return `
              <div class="kin-card" style="opacity:${seen ? '1' : '0.55'}">
                <div class="kin-card-top">
                  <div style="${seen ? '' : 'filter:brightness(0) invert(0.3)'}">${svg}</div>
                  <div>
                    <div style="font-weight:800;font-size:0.76rem">#${String(sp.id).padStart(2, '0')} ${seen ? sp.name : '???'} ${bound ? '💠' : ''}</div>
                    <div style="font-size:0.65rem;color:${aff.color}">${aff.icon} ${aff.name}</div>
                    <div style="font-size:0.6rem;color:#94a3b8">${bound ? sp.title : (seen ? 'Seen in Wild' : 'Uncharted')}</div>
                  </div>
                </div>
                <div style="font-size:0.62rem;color:#cbd5e1;line-height:1.25">
                  ${bound ? sp.lore : 'Bind this species with an Aether Prism to unlock its lore.'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (tab === 'shop' || tab === 'market' || tab === 'hospital' || tab === 'shopping_center') {
      if (tab === 'hospital') state.marketTab = 'hospital';
      if (tab === 'shopping_center') state.marketTab = 'shopping_center';
      const rawTab = state.marketTab || 'hospital';
      const mTab = (rawTab === 'hospital' || rawTab === 'recovery') ? 'hospital' : (rawTab === 'shopping_center' || rawTab === 'boosters') ? 'shopping_center' : 'gems';
      if (state.gems === undefined || state.gems === null) state.gems = 50;
      const selKinIdx = Math.max(0, Math.min((state.squad.length || 1) - 1, Number(state.selectedMarketKinIdx || 0)));
      const selKin = state.squad[selKinIdx] || state.squad[0];

      titleEl.textContent = mTab === 'hospital'
        ? `🏥 Kin Care Hospital (🪙 ${state.shards} Shards • 💎 ${state.gems} Gems)`
        : mTab === 'shopping_center'
          ? `🏬 Aether Shopping Center (🪙 ${state.shards} Shards • 💎 ${state.gems} Gems)`
          : `💎 Aether Gem Store (🪙 ${state.shards} Shards • 💎 ${state.gems} Gems)`;

      // Squad Vitality & Target Selector Strip
      const squadStripHtml = `
        <div class="ranch-banner" style="margin-bottom:8px;border-color:${mTab === 'hospital' ? 'rgba(248,113,113,0.55)' : 'rgba(56,189,248,0.45)'}">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <strong style="font-size:0.76rem;color:#fde047">${mTab === 'hospital' ? '🏥 Hospital Patient Squad (Select Kin for Medical Care):' : '🏬 Select Squad Kin for Fruits, Meals & Boosters:'}</strong>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="mini-btn" id="btnHospitalFreeCheckup" style="background:#dc2626;padding:4px 8px">🏥 Emergency Squad Checkup (Free / Cooldown)</button>
              ${state.vipShrinePass
                ? '<span class="regen-timer-pill" style="color:#4ade80;border-color:#4ade80">👑 VIP Hospital Pass Active</span>'
                : `<button class="mini-btn" id="btnMarketShrineBypass" style="background:#0284c7;padding:4px 8px">💉 Instant Full Squad Surgery (10 💎)</button>`
              }
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:6px;margin-top:4px">
            ${state.squad.map((k, idx) => {
              const isSel = idx === selKinIdx;
              const hpPct = Math.round((k.currentHp / Math.max(1, k.maxHp)) * 100);
              return `
                <button type="button" class="mini-btn ${isSel ? '' : 'secondary'}" data-select-market-kin="${idx}" style="text-align:left;padding:6px 8px;border:${isSel ? '1.5px solid #facc15' : '1px solid rgba(148,163,184,0.3)'}">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span>${isSel ? '🎯 ' : ''}${k.nickname}</span>
                    <small style="color:#fde047">Lv.${k.level}</small>
                  </div>
                  <div style="font-size:0.62rem;color:${hpPct < 100 ? '#fca5a5' : '#86efac'}">
                    HP ${k.currentHp}/${k.maxHp} • ${getKinRecoveryEtaText(k)}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const tabBarHtml = `
        <div class="market-tab-bar">
          <button type="button" class="market-tab-btn ${mTab === 'hospital' ? 'active' : ''}" data-mtab="recovery" data-facility="hospital">🏥 Kin Care Hospital</button>
          <button type="button" class="market-tab-btn ${mTab === 'shopping_center' ? 'active' : ''}" data-mtab="boosters" data-facility="shopping_center">🏬 Fruits &amp; Shopping Center</button>
          <button type="button" class="market-tab-btn ${mTab === 'gems' ? 'active' : ''}" data-mtab="gems">💎 Gem Store (USD)</button>
        </div>
      `;

      let tabContentHtml = '';

      if (mTab === 'hospital') {
        const recKeys = [
          'vitalTonic', 'hyperTonic', 'phoenixDew',
          'dewTonic', 'hiTonic', 'reviveLeaf',
          'sunberryRation', 'heartwoodStew', 'feastPlatter'
        ].filter((k) => DATA.ITEMS[k]);

        tabContentHtml = `
          <div class="card-grid">
            ${recKeys.map((key) => {
              const item = DATA.ITEMS[key];
              const owned = state.inventory[item.id] || 0;
              const gCost = item.gemCost || Math.max(1, Math.ceil(item.cost / 8));
              return `
                <div class="shop-card">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:0.78rem;color:${item.color || '#f8fafc'}">${item.icon} ${item.name}</strong>
                    <span style="font-size:0.68rem;color:#94a3b8">Bag: <strong style="color:#fde047">x${owned}</strong></span>
                  </div>
                  <div style="font-size:0.64rem;color:#cbd5e1;line-height:1.3">${item.desc}</div>
                  <div class="mini-btn-row" style="margin-top:4px">
                    <button class="mini-btn" data-buy-id="${item.id}">🪙 ${item.cost}</button>
                    <button class="mini-btn secondary" data-buy-gem-id="${item.id}" style="background:#7e22ce">💎 ${gCost}</button>
                    <button class="mini-btn" data-use-market-id="${item.id}" style="background:${owned > 0 ? '#16a34a' : '#334155'}">
                      ✨ ${owned > 0 ? `Use on ${item.squadFullHeal ? 'Squad' : (selKin ? selKin.nickname : 'Kin')}` : 'Buy & Use'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (mTab === 'shopping_center') {
        const boostKeys = [
          'sunberryRation', 'heartwoodStew', 'feastPlatter',
          'heartwoodBerry', 'apexNectar',
          'basicPrism', 'greaterPrism', 'masteryPrism',
          'bagUpgrade1', 'bagUpgrade2', 'bagUpgrade3',
          'aetherCandy', 'apexTome', 'xpBooster2x', 'hatchAccelerator'
        ].filter((k) => DATA.ITEMS[k]);

        const xpRem = Math.max(0, Math.ceil((Number(state.xpBoostUntil || 0) - Date.now()) / 1000));
        const regRem = Math.max(0, Math.ceil((Number(state.regenBoostUntil || 0) - Date.now()) / 1000));

        tabContentHtml = `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;font-size:0.68rem">
            <span class="regen-timer-pill" style="color:#fde047">⚡ 2x XP Surge: ${xpRem > 0 ? formatDurationMmSs(xpRem) : 'Inactive'}</span>
            <span class="regen-timer-pill" style="color:#fb923c">🍖 3x Natural Regen: ${regRem > 0 ? formatDurationMmSs(regRem) : 'Inactive'}</span>
            <span class="regen-timer-pill" style="color:#4ade80">🥚 Ranch Speed Core: ${state.hatchBoostReady ? 'READY (Next Hatch S/SS)' : 'Inactive'}</span>
          </div>
          <div class="card-grid">
            ${boostKeys.map((key) => {
              const item = DATA.ITEMS[key];
              const owned = state.inventory[item.id] || 0;
              const gCost = item.gemCost || Math.max(1, Math.ceil(item.cost / 8));
              const canUseDirect = item.category === 'booster' || item.category === 'food' || item.category === 'bond';
              return `
                <div class="shop-card">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:0.78rem;color:${item.color || '#f8fafc'}">${item.icon} ${item.name}</strong>
                    <span style="font-size:0.68rem;color:#94a3b8">Bag: <strong style="color:#fde047">x${owned}</strong></span>
                  </div>
                  <div style="font-size:0.64rem;color:#cbd5e1;line-height:1.3">${item.desc}</div>
                  <div class="mini-btn-row" style="margin-top:4px">
                    <button class="mini-btn" data-buy-id="${item.id}">🪙 ${item.cost}</button>
                    <button class="mini-btn secondary" data-buy-gem-id="${item.id}" style="background:#7e22ce">💎 ${gCost}</button>
                    ${canUseDirect ? `
                      <button class="mini-btn" data-use-market-id="${item.id}" style="background:${owned > 0 ? '#0284c7' : '#334155'}">
                        ⚡ ${owned > 0 ? (item.levelGain ? `Lv Up ${selKin ? selKin.nickname : 'Kin'}` : 'Activate') : 'Buy & Use'}
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        const bundles = DATA.MARKETPLACE_BUNDLES || [];
        const activeBundle = bundles.find((b) => b.id === state.activeCheckoutBundleId) || null;
        const checkoutSheetHtml = activeBundle ? `
          <div class="checkout-drawer-box">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <strong style="font-size:0.84rem;color:#fde047">💳 Instant Mobile Checkout — ${activeBundle.name} (${activeBundle.priceDisplay})</strong>
              <button type="button" class="mini-btn secondary" id="btnCancelCheckout" style="flex:0 0 auto">Cancel</button>
            </div>
            <div style="font-size:0.68rem;color:#cbd5e1;margin-bottom:8px">${activeBundle.desc}</div>
            <div class="mini-btn-row">
              <button type="button" class="primary-cta" id="btnConfirmApplePay" style="padding:8px 12px;font-size:0.75rem;background:linear-gradient(135deg,#111827,#374151);border:1.5px solid #f8fafc">
                 Pay ${activeBundle.priceDisplay} with Apple Pay
              </button>
              <button type="button" class="primary-cta" id="btnConfirmCardPay" style="padding:8px 12px;font-size:0.75rem">
                💳 Pay ${activeBundle.priceDisplay} with Card
              </button>
            </div>
          </div>
        ` : '';

        tabContentHtml = `
          ${checkoutSheetHtml}
          <div class="usd-bundle-grid">
            ${bundles.map((b) => `
              <div class="usd-bundle-card" style="border-color:${b.color || '#a855f7'}">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <span class="usd-bundle-badge">${b.badge}</span>
                    <strong style="color:#4ade80;font-size:0.88rem">${b.priceDisplay}</strong>
                  </div>
                  <div style="font-weight:900;font-size:0.84rem;color:#ffffff;margin-bottom:4px">${b.icon} ${b.name}</div>
                  <div style="font-size:0.66rem;color:#cbd5e1;line-height:1.35">${b.desc}</div>
                </div>
                <button type="button" class="primary-cta" data-checkout-bundle="${b.id}" style="padding:8px 10px;font-size:0.74rem">
                  💎 Buy Pack (${b.priceDisplay})
                </button>
              </div>
            `).join('')}
          </div>
        `;
      }

      bodyEl.innerHTML = squadStripHtml + tabBarHtml + tabContentHtml;

      bodyEl.querySelectorAll('[data-mtab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.marketTab = btn.getAttribute('data-mtab');
          openModal('shop');
        });
      });

      bodyEl.querySelectorAll('[data-select-market-kin]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.selectedMarketKinIdx = Number(btn.getAttribute('data-select-market-kin'));
          openModal('shop');
        });
      });

      const freeHospBtn = $('btnHospitalFreeCheckup');
      if (freeHospBtn) {
        freeHospBtn.addEventListener('click', () => {
          if (healSquadAtShrine(false, false)) openModal('shop');
        });
      }
      const shrineBypassBtn = $('btnMarketShrineBypass');
      if (shrineBypassBtn) {
        shrineBypassBtn.addEventListener('click', () => {
          if (healSquadAtShrine(false, true)) openModal('shop');
        });
      }

      bodyEl.querySelectorAll('[data-buy-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-buy-id');
          if (buyShopItem(id, false)) openModal('shop');
        });
      });

      bodyEl.querySelectorAll('[data-buy-gem-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-buy-gem-id');
          if (buyShopItem(id, true)) openModal('shop');
        });
      });

      bodyEl.querySelectorAll('[data-use-market-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-use-market-id');
          if ((state.inventory[id] || 0) <= 0) {
            if (!buyShopItem(id, false) && !buyShopItem(id, true)) return;
          }
          const res = useRecoveryOrBoosterItem(id, selKinIdx, state);
          if (res.ok) {
            if (evoQueue.length > 0) {
              closeModal();
              triggerNextEvolution();
            } else {
              openModal('shop');
            }
          }
        });
      });

      bodyEl.querySelectorAll('[data-checkout-bundle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.activeCheckoutBundleId = btn.getAttribute('data-checkout-bundle');
          openModal('shop');
        });
      });

      const cancelCheckoutBtn = $('btnCancelCheckout');
      if (cancelCheckoutBtn) {
        cancelCheckoutBtn.addEventListener('click', () => {
          state.activeCheckoutBundleId = null;
          openModal('shop');
        });
      }

      const applePayBtn = $('btnConfirmApplePay');
      if (applePayBtn && state.activeCheckoutBundleId) {
        applePayBtn.addEventListener('click', async () => {
          await purchaseUsdBundle(state.activeCheckoutBundleId, 'apple_pay', state);
          openModal('shop');
        });
      }

      const cardPayBtn = $('btnConfirmCardPay');
      if (cardPayBtn && state.activeCheckoutBundleId) {
        cardPayBtn.addEventListener('click', async () => {
          await purchaseUsdBundle(state.activeCheckoutBundleId, 'card', state);
          openModal('shop');
        });
      }
    } else if (tab === 'zones') {
      titleEl.textContent = '🗺️ Aether Realm Sanctuaries (Fast Travel)';
      bodyEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${DATA.ZONES.map((z) => {
            const isCurrent = state.zone === z.id;
            return `
              <div class="warden-card" style="border-color:${isCurrent ? z.themeColor : 'rgba(148,163,184,0.25)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="color:${z.themeColor};font-size:0.84rem">${z.name}</strong>
                  <span style="font-size:0.68rem;color:#facc15">${z.subtitle}</span>
                </div>
                <div style="font-size:0.68rem;color:#cbd5e1">${z.desc}</div>
                <div class="mini-btn-row">
                  <button class="mini-btn" data-travel-zone="${z.id}">${isCurrent ? '📍 Current Zone' : '🌀 Travel Here'}</button>
                  <button class="mini-btn secondary" data-wild-zone="${z.id}">🌿 Scout Wild Kin</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      bodyEl.querySelectorAll('[data-travel-zone]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const zId = btn.getAttribute('data-travel-zone');
          closeModal();
          travelToZone(zId);
        });
      });
      bodyEl.querySelectorAll('[data-wild-zone]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const zId = btn.getAttribute('data-wild-zone');
          state.zone = zId;
          closeModal();
          updateHud();
          startWildEncounter();
        });
      });
    } else if (tab === 'arena') {
      const totalW = (DATA.WARDENS && DATA.WARDENS.length) || 6;
      titleEl.textContent = `👑 6 World Wardens (${state.crests.length}/${totalW} Crests), Spire & PvP Arena`;
      bodyEl.innerHTML = `
        <div class="ranch-banner" style="border-color:#c084fc">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="color:#f0abfc;font-size:0.82rem">🗼 Infinite Aether Spire (100-Floor Endgame Tower)</strong>
            <span style="color:#facc15;font-size:0.72rem;font-weight:900">Current: Floor ${state.spireFloor || 1}/100</span>
          </div>
          <div style="font-size:0.68rem;color:#cbd5e1">Climb all 100 floors of escalating S/SS-Rank Guardians & Radiant Bosses for massive Shard payouts!</div>
          <button class="mini-btn" id="btnEnterSpire" style="background:linear-gradient(135deg,#9333ea,#2563eb);padding:7px 12px">🗼 Challenge Spire Floor ${state.spireFloor || 1}</button>
        </div>
        <div style="font-size:0.75rem;color:#facc15;font-weight:800">6 World Wardens (Story Bosses)</div>
        <div class="card-grid">
          ${DATA.WARDENS.map((w) => {
            const earned = state.crests.includes(w.id);
            return `
              <div class="warden-card" style="border-color:${earned ? '#4ade80' : 'rgba(148,163,184,0.3)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="font-size:0.78rem">${w.crestIcon} ${w.name}</strong>
                  <span style="font-size:0.64rem;color:${earned ? '#4ade80' : '#facc15'}">${earned ? '✓ CREST WON' : w.crestName}</span>
                </div>
                <div style="font-size:0.64rem;color:#cbd5e1">${w.title} • Reward: ${w.rewardShards}💎</div>
                <button class="mini-btn" data-warden-id="${w.id}">⚔️ Challenge Warden</button>
              </div>
            `;
          }).join('')}
        </div>
        <div style="font-size:0.75rem;color:#38bdf8;font-weight:800;margin-top:6px">🌐 Online PvP Squad Arena Room</div>
        <div class="warden-card">
          <div style="font-size:0.68rem;color:#cbd5e1">Host your current Squad in an Arena Room or enter a 4-letter Room Code (e.g. <strong>AETH</strong> or <strong>NOVA</strong>) to duel another Tamer’s squad!</div>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="text" id="arenaCodeInput" class="code-input" placeholder="AETH" maxlength="6" value="AETH" />
            <button class="mini-btn" id="btnJoinArenaRoom" style="flex:0 0 auto;padding:8px 12px">⚔️ Duel Code</button>
            <button class="mini-btn secondary" id="btnHostArenaRoom" style="flex:0 0 auto;padding:8px 12px">📡 Host Squad</button>
          </div>
          <div id="arenaRoomStatus" style="font-size:0.68rem;color:#fde047"></div>
        </div>
      `;

      const spireBtn = $('btnEnterSpire');
      if (spireBtn) {
        spireBtn.addEventListener('click', () => startSpireBattle());
      }
      bodyEl.querySelectorAll('[data-warden-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          startWardenBattle(btn.getAttribute('data-warden-id'));
        });
      });

      const hostBtn = $('btnHostArenaRoom');
      const joinBtn = $('btnJoinArenaRoom');
      const statusEl = $('arenaRoomStatus');
      if (hostBtn) {
        hostBtn.addEventListener('click', async () => {
          try {
            if (statusEl) statusEl.textContent = 'Uploading Squad to Arena Server...';
            const res = await fetch('/api/arena/room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hostName: state.trainerName, squad: state.squad })
            });
            const data = await res.json();
            if (data.ok && statusEl) {
              statusEl.textContent = `✓ Room Created! Share Arena Code: ${data.code}`;
              const inp = $('arenaCodeInput');
              if (inp) inp.value = data.code;
            }
          } catch (e) {
            if (statusEl) statusEl.textContent = 'Could not reach Arena server.';
          }
        });
      }
      if (joinBtn) {
        joinBtn.addEventListener('click', async () => {
          const inp = $('arenaCodeInput');
          const code = (inp && inp.value ? inp.value.trim().toUpperCase() : 'AETH');
          try {
            if (statusEl) statusEl.textContent = `Connecting to Room ${code}...`;
            const res = await fetch(`/api/arena/room/${encodeURIComponent(code)}`);
            const data = await res.json();
            if (data.ok && data.squad) {
              startArenaDuel({ trainerName: data.hostName, squad: data.squad });
            } else if (statusEl) {
              statusEl.textContent = data.error || 'Room code not found.';
            }
          } catch (e) {
            if (statusEl) statusEl.textContent = 'Error connecting to room.';
          }
        });
      }
    } else if (tab === 'cloud') {
      titleEl.textContent = '☁️ Cloud Save & Cross-Device Sync';
      bodyEl.innerHTML = `
        <div class="warden-card">
          <div style="font-weight:800;font-size:0.78rem;color:#38bdf8">1. Generate 6-Character Cloud Code</div>
          <div style="font-size:0.68rem;color:#cbd5e1">Back up your Squad, Sanctuary Vault, KinDex & Warden Crests to the server.</div>
          <button class="primary-cta" id="btnCloudUpload" type="button">☁️ Upload Save & Get Code</button>
          <div id="cloudUploadResult" style="font-size:0.76rem;color:#fde047;font-weight:800;text-align:center">
            ${state.cloudCode ? `Active Cloud Code: ${state.cloudCode}` : ''}
          </div>
        </div>
        <div class="warden-card">
          <div style="font-weight:800;font-size:0.78rem;color:#4ade80">2. Restore Journey from Cloud Code</div>
          <div style="display:flex;gap:6px">
            <input type="text" id="cloudCodeInput" class="code-input" placeholder="6-CHAR CODE" maxlength="8" />
            <button class="mini-btn" id="btnCloudDownload" style="flex:0 0 auto;padding:8px 14px">📥 Load</button>
          </div>
          <div id="cloudRestoreStatus" style="font-size:0.68rem;color:#cbd5e1"></div>
        </div>
      `;

      const upBtn = $('btnCloudUpload');
      const downBtn = $('btnCloudDownload');
      if (upBtn) {
        upBtn.addEventListener('click', async () => {
          const out = $('cloudUploadResult');
          try {
            if (out) out.textContent = 'Syncing with Aether Cloud...';
            const res = await fetch('/api/cloud-save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state, code: state.cloudCode || undefined })
            });
            const data = await res.json();
            if (data.ok) {
              state.cloudCode = data.code;
              saveGame();
              if (out) out.textContent = `✓ Saved! Your Cloud Code: ${data.code}`;
              showToast(`☁️ Cloud Save synced! Code: ${data.code}`);
            }
          } catch (e) {
            if (out) out.textContent = 'Cloud sync failed.';
          }
        });
      }
      if (downBtn) {
        downBtn.addEventListener('click', async () => {
          const inp = $('cloudCodeInput');
          const status = $('cloudRestoreStatus');
          const code = inp && inp.value ? inp.value.trim().toUpperCase() : '';
          if (!code) return;
          try {
            if (status) status.textContent = 'Fetching Cloud Save...';
            const res = await fetch(`/api/cloud-save/${encodeURIComponent(code)}`);
            const data = await res.json();
            if (data.ok && data.state) {
              state = Object.assign(createInitialState(), data.state, { started: true, cloudCode: data.code });
              syncMotionFromState();
              saveGame();
              const stOverlay = $('starterOverlay');
              if (stOverlay) stOverlay.classList.add('hidden');
              closeModal();
              updateHud();
              showToast(`☁️ Restored Cloud Save (${data.code})!`);
            } else if (status) {
              status.textContent = data.error || 'Code not found.';
            }
          } catch (e) {
            if (status) status.textContent = 'Could not load Cloud Code.';
          }
        });
      }
    } else if (tab === 'ranch') {
      const allKin = state.squad.concat(state.vault);
      if (!state.breedParentA && allKin[0]) state.breedParentA = allKin[0].uid;
      if (!state.breedParentB && allKin[1]) state.breedParentB = allKin[1].uid;

      const parentA = allKin.find((k) => k.uid === state.breedParentA) || allKin[0] || null;
      const parentB = allKin.find((k) => k.uid === state.breedParentB && (!parentA || k.uid !== parentA.uid)) || allKin.find((k) => !parentA || k.uid !== parentA.uid) || null;

      let previewHtml = '<div style="font-size:0.7rem;color:#fde047">Bind at least 2 Kin in the wild to unlock Cross-Affinity Breeding!</div>';
      if (parentA && parentB && DATA.getBaseStageSpeciesId) {
        const babySpId = DATA.getBaseStageSpeciesId(parentA.speciesId);
        const babySp = DATA.getSpeciesById(babySpId);
        const babyAff = DATA.AFFINITIES[babySp.affinity];
        const babySvg = root.WILDKIN_SPRITES.renderKinSvg(babySp, 48, false);
        const bMoves = (parentB.moveSlots || []).map((m) => m.id);
        const eggMoveId = bMoves[bMoves.length - 1] || 'aetherPulse';
        const eggMove = DATA.MOVES[eggMoveId] || DATA.MOVES.aetherPulse;
        const babyLv = Math.max(5, Math.min(25, Math.floor(((parentA.level || 5) + (parentB.level || 5)) * 0.35)));
        previewHtml = `
          <div style="display:flex;align-items:center;gap:10px;background:rgba(15,23,42,0.9);padding:8px 10px;border-radius:10px;border:1px solid #4ade80">
            ${babySvg}
            <div style="flex:1">
              <div style="font-size:0.78rem;font-weight:900;color:#4ade80">🥚 Predicted Offspring: ${babySp.name} (Lv.${babyLv})</div>
              <div style="font-size:0.66rem;color:#facc15">${babyAff.icon} ${babyAff.name} • Upgraded Genetics (A / S / SS Apex +10% to +35% Stats)</div>
              <div style="font-size:0.65rem;color:#38bdf8">🧬 Inherited Egg Move from ${parentB.nickname}: <strong>${eggMove.name}</strong> • ✨ 3x Radiant Odds!</div>
            </div>
            <button class="mini-btn" id="btnBreedHatch" style="flex:0 0 auto;background:#16a34a;padding:8px 12px">🥚 Breed & Hatch (100💎)</button>
          </div>
        `;
      }

      const berries = state.inventory.heartwoodBerry || 0;
      const nectars = state.inventory.apexNectar || 0;

      titleEl.textContent = `🧬 Grandpa Rowan’s Homestead Ranch (Shards: ${state.shards}💎)`;
      bodyEl.innerHTML = `
        <div class="ranch-banner">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="color:#86efac;font-size:0.8rem">👴 Grandpa Rowan: “Raise your Kin with care, and breed strong bloodlines!”</strong>
            <button class="mini-btn secondary" id="btnRanchToStory" style="flex:0 0 auto">📜 Story Guide</button>
          </div>
          <div style="font-size:0.67rem;color:#cbd5e1">
            Feed 🍓 Heartwood Berries (<strong>x${berries}</strong>) or 🍯 Apex Nectar (<strong>x${nectars}</strong>) to raise Bond Level (up to +20% all stats & XP), or breed two Kin to hatch S/SS-Rank Offspring with inherited moves!
          </div>
        </div>

        <div style="font-size:0.75rem;color:#4ade80;font-weight:800">🥚 Homestead Breeding Sanctuary (Select Parent A & Parent B)</div>
        <div class="ranch-parent-slots">
          <div class="ranch-slot-box">
            <div style="font-size:0.66rem;color:#94a3b8;margin-bottom:4px">PARENT A (Determines Offspring Species)</div>
            <select id="selectParentA" class="code-input" style="font-size:0.72rem;letter-spacing:0;text-transform:none">
              ${allKin.map((k) => `<option value="${k.uid}" ${parentA && k.uid === parentA.uid ? 'selected' : ''}>${k.nickname} (Lv.${k.level} • ${k.geneticTier || 'B'}-Rank)</option>`).join('')}
            </select>
          </div>
          <div class="ranch-slot-box">
            <div style="font-size:0.66rem;color:#94a3b8;margin-bottom:4px">PARENT B (Passes Inherited Move & Genetics)</div>
            <select id="selectParentB" class="code-input" style="font-size:0.72rem;letter-spacing:0;text-transform:none">
              ${allKin.map((k) => `<option value="${k.uid}" ${parentB && k.uid === parentB.uid ? 'selected' : ''}>${k.nickname} (Lv.${k.level} • ${k.geneticTier || 'B'}-Rank)</option>`).join('')}
            </select>
          </div>
        </div>
        ${previewHtml}

        <div style="font-size:0.75rem;color:#38bdf8;font-weight:800;margin-top:4px">🐾 Raise, Feed & Train Active Squad</div>
        <div class="card-grid">
          ${state.squad.map((kin, idx) => {
            const sp = DATA.getSpeciesById(kin.speciesId);
            const svg = root.WILDKIN_SPRITES.renderKinSvg(sp, 42, kin.isRadiant);
            const bond = Number(kin.bondLevel || 1);
            const tier = kin.geneticTier || 'B';
            return `
              <div class="kin-card ${kin.isRadiant ? 'radiant' : ''}">
                <div class="kin-card-top">
                  ${svg}
                  <div>
                    <div style="font-weight:800;font-size:0.76rem">${kin.nickname} <span class="genetic-badge">${tier}</span></div>
                    <div style="font-size:0.65rem;color:#facc15">Lv.${kin.level} • ❤️ Bond ${bond}/10</div>
                    <div style="font-size:0.62rem;color:#cbd5e1">ATK ${kin.atk} • DEF ${kin.def} • SPD ${kin.spd}</div>
                  </div>
                </div>
                <div class="mini-btn-row">
                  <button class="mini-btn" data-feed-berry="${idx}">🍓 Berry (x${berries})</button>
                  <button class="mini-btn secondary" data-train-kin="${idx}">🏋️ Train (40💎)</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      const toStoryBtn = $('btnRanchToStory');
      if (toStoryBtn) toStoryBtn.addEventListener('click', () => openModal('story'));

      const selA = $('selectParentA');
      const selB = $('selectParentB');
      if (selA) {
        selA.addEventListener('change', () => {
          state.breedParentA = selA.value;
          openModal('ranch');
        });
      }
      if (selB) {
        selB.addEventListener('change', () => {
          state.breedParentB = selB.value;
          openModal('ranch');
        });
      }

      const breedBtn = $('btnBreedHatch');
      if (breedBtn && parentA && parentB) {
        breedBtn.addEventListener('click', () => {
          if (parentA.uid === parentB.uid) {
            showToast('Choose two different Kin as Parent A and Parent B!');
            return;
          }
          const freeBoost = Boolean(state.hatchBoostReady);
          if (!freeBoost && state.shards < 100) {
            showToast('Need 100 🪙 Aether Shards (or an 🥚 Incubator Speed Core) for Breeding!');
            return;
          }
          if (!freeBoost) state.shards -= 100;
          state.hatchBoostReady = false;
          const offspring = DATA.breedKinOffspring(parentA, parentB, freeBoost ? { guaranteedApex: true } : {});
          state.stats.kinBred = (state.stats.kinBred || 0) + 1;
          markBound(offspring.speciesId);

          addBattlePassXp(55, state);
          let dest = `Active Squad (${state.squad.length + 1}/${getMaxSquadSize(state)})`;
          if (state.squad.length < getMaxSquadSize(state)) state.squad.push(offspring);
          else {
            state.vault.push(offspring);
            dest = `Carrier Bag Reserve (${state.vault.length}/${getMaxVaultSize(state)})`;
          }
          if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
          saveGame();
          updateHud();
          openModal('ranch');
          showToast(`🥚 Hatched ${offspring.isRadiant ? '✨ RADIANT ' : ''}${offspring.nickname} (${offspring.geneticTier}-Rank, Gen ${offspring.generation}) → ${dest}!`, 3600);
        });
      }

      const applyCareToKin = (kin, bondDelta, xpGain) => {
        kin.bondLevel = Math.min(10, Number(kin.bondLevel || 1) + bondDelta);
        kin.xp = (kin.xp || 0) + xpGain;
        while (kin.xp >= (kin.xpToNext || DATA.xpForNextLevel(kin.level))) {
          kin.xp -= (kin.xpToNext || DATA.xpForNextLevel(kin.level));
          kin.level += 1;
          kin.xpToNext = DATA.xpForNextLevel(kin.level);
        }
        const sp = DATA.getSpeciesById(kin.speciesId);
        const st = DATA.calculateStatsForLevel(sp.baseStats, kin.level, kin.isRadiant, kin.geneticBonus || 0, kin.bondLevel);
        kin.maxHp = st.maxHp;
        kin.currentHp = st.maxHp;
        kin.atk = st.atk;
        kin.def = st.def;
        kin.spd = st.spd;
        if (sp.evolvesTo && kin.level >= sp.evolvesTo.level) {
          const already = evoQueue.some((e) => e.kin.uid === kin.uid);
          if (!already) evoQueue.push({ kin, fromSpeciesId: sp.id, toSpeciesId: sp.evolvesTo.id });
        }
      };

      bodyEl.querySelectorAll('[data-feed-berry]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-feed-berry'));
          const kin = state.squad[idx];
          if (!kin) return;
          if ((state.inventory.heartwoodBerry || 0) <= 0) {
            showToast('Out of 🍓 Heartwood Berries! Buy more in the Shop or use Ranch Training.');
            return;
          }
          state.inventory.heartwoodBerry -= 1;
          applyCareToKin(kin, 1, 55);
          if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
          saveGame();
          updateHud();
          openModal('ranch');
          showToast(`🍓 Fed ${kin.nickname}! Bond Lv.${kin.bondLevel}/10 & +55 XP!`);
          if (evoQueue.length > 0) {
            closeModal();
            triggerNextEvolution();
          }
        });
      });

      bodyEl.querySelectorAll('[data-train-kin]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-train-kin'));
          const kin = state.squad[idx];
          if (!kin) return;
          if (state.shards < 40) {
            showToast('Need 40💎 Shards for Grandpa Rowan’s Ranch Training!');
            return;
          }
          state.shards -= 40;
          applyCareToKin(kin, 1, 95);
          if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playLevelUp();
          saveGame();
          updateHud();
          openModal('ranch');
          showToast(`🏋️ Grandpa trained ${kin.nickname}! Lv.${kin.level} (Bond ${kin.bondLevel}/10)!`);
          if (evoQueue.length > 0) {
            closeModal();
            triggerNextEvolution();
          }
        });
      });
    } else if (tab === 'story') {
      closeHubMenuDrawer();
      updateStoryTrackerHud();
      const sTab = state.storyModalTab || 'story';
      const chapters = (DATA && DATA.STORY_CHAPTERS) || [];
      const sideQuests = (DATA && DATA.SIDE_QUESTS) || [];
      const tamerTasks = (DATA && DATA.TAMER_TASKS) || [];
      const curCh = chapters.find((c) => c.id === state.storyChapter) || chapters[0];
      titleEl.textContent = `📜 Missions, Side Quests & Tamer Tasks (Ch.${state.storyChapter || 1}/${chapters.length})`;

      const subTabsHtml = `
        <div class="market-tab-bar" style="margin-bottom:8px">
          <button type="button" class="market-tab-btn ${sTab === 'story' ? 'active' : ''}" data-stab="story">📖 Story (${chapters.length})</button>
          <button type="button" class="market-tab-btn ${sTab === 'sidequests' ? 'active' : ''}" data-stab="sidequests">🗺️ Side Quests (${sideQuests.length})</button>
          <button type="button" class="market-tab-btn ${sTab === 'tasks' ? 'active' : ''}" data-stab="tasks">🎯 Tasks (${tamerTasks.length})</button>
        </div>
      `;

      let contentHtml = '';
      if (sTab === 'story') {
        contentHtml = `
          <div class="ranch-banner">
            <strong style="color:#fde047;font-size:0.8rem">👴 Elder Vance Rowan — Heartwood Homestead Mentor</strong>
            <div style="font-size:0.68rem;color:#e2e8f0;font-style:italic">“${curCh ? curCh.grandpaQuote : 'Every great Sovereign started with a single partner Kin.'}”</div>
            <div class="mini-btn-row" style="margin-top:4px">
              <button class="mini-btn" id="btnStoryOpenRanch">🧬 Grandpa’s Ranch</button>
              <button class="mini-btn secondary" id="btnStoryOpenTrade">🔄 Kin Trade Center</button>
              <button class="mini-btn secondary" id="btnStoryHome">🏡 Visit Homestead</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${chapters.map((ch) => {
              const done = Boolean(state.claimedChapters && state.claimedChapters[ch.id]);
              const isCur = ch.id === state.storyChapter;
              return `
                <div class="warden-card" style="border-color:${done ? '#4ade80' : isCur ? '#facc15' : 'rgba(148,163,184,0.25)'}">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:0.78rem;color:${done ? '#4ade80' : isCur ? '#fde047' : '#f8fafc'}">${ch.title}</strong>
                    <span style="font-size:0.64rem;font-weight:800;color:${done ? '#4ade80' : isCur ? '#38bdf8' : '#94a3b8'}">${done ? '✓ COMPLETED' : isCur ? 'ACTIVE CHAPTER' : 'UPCOMING'}</span>
                  </div>
                  <div style="font-size:0.66rem;color:#cbd5e1"><strong>Objective:</strong> ${ch.objective || ch.objectiveText}</div>
                  <div style="font-size:0.62rem;color:#94a3b8">Reward: +${ch.rewardShards}🪙 Aether Shards • World: ${getZoneObj(ch.zone || ch.worldId).name}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (sTab === 'sidequests') {
        contentHtml = `
          <div style="display:flex;flex-direction:column;gap:7px">
            ${sideQuests.map((sq) => {
              const claimed = Boolean(state.claimedSideQuests && state.claimedSideQuests[sq.id]);
              const prog = Math.min(sq.target, evaluateQuestMetric(sq.metric, state));
              const ready = !claimed && prog >= sq.target;
              const pct = Math.round((prog / Math.max(1, sq.target)) * 100);
              return `
                <div class="warden-card" style="border-color:${claimed ? '#4ade80' : ready ? '#facc15' : 'rgba(56,189,248,0.3)'}">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                    <strong style="font-size:0.76rem;color:#e0f2fe">${sq.title}</strong>
                    <span style="font-size:0.62rem;color:#38bdf8">${sq.giver} • ${getZoneObj(sq.zone).name}</span>
                  </div>
                  <div style="font-size:0.65rem;color:#cbd5e1">${sq.objective}</div>
                  <div class="hp-bar-track" style="height:6px;margin:3px 0">
                    <div class="hp-bar-fill" style="width:${pct}%;background:${claimed ? '#4ade80' : ready ? '#facc15' : '#38bdf8'}"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:0.62rem;color:#fde047">Progress: ${prog}/${sq.target} • Bounty: +${sq.rewardShards}🪙 ${sq.rewardGems ? `+${sq.rewardGems}💎` : ''} +75 BP XP</span>
                    ${claimed
                      ? '<span style="font-size:0.64rem;color:#4ade80;font-weight:900">✓ CLAIMED</span>'
                      : ready
                        ? `<button type="button" class="mini-btn" data-claim-sq="${sq.id}" style="flex:0 0 auto;background:#16a34a;padding:4px 10px">🎁 Claim Bounty</button>`
                        : '<span style="font-size:0.62rem;color:#94a3b8">In Progress</span>'
                    }
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        contentHtml = `
          <div style="display:flex;flex-direction:column;gap:7px">
            ${tamerTasks.map((tk) => {
              const claimed = Boolean(state.claimedTasks && state.claimedTasks[tk.id]);
              const prog = Math.min(tk.target, evaluateQuestMetric(tk.metric, state));
              const ready = !claimed && prog >= tk.target;
              const pct = Math.round((prog / Math.max(1, tk.target)) * 100);
              return `
                <div class="warden-card" style="border-color:${claimed ? '#4ade80' : ready ? '#facc15' : 'rgba(168,85,247,0.35)'}">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:0.76rem;color:#f8fafc">${tk.icon} ${tk.title}</strong>
                    <span style="font-size:0.62rem;color:#d8b4fe">${prog}/${tk.target}</span>
                  </div>
                  <div style="font-size:0.65rem;color:#cbd5e1">${tk.desc}</div>
                  <div class="hp-bar-track" style="height:6px;margin:3px 0">
                    <div class="hp-bar-fill" style="width:${pct}%;background:${claimed ? '#4ade80' : '#a855f7'}"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:0.62rem;color:#fde047">Reward: +${tk.rewardShards}🪙 +${tk.rewardGems || 0}💎 +45 BP XP</span>
                    ${claimed
                      ? '<span style="font-size:0.64rem;color:#4ade80;font-weight:900">✓ COMPLETED</span>'
                      : ready
                        ? `<button type="button" class="mini-btn" data-claim-task="${tk.id}" style="flex:0 0 auto;background:#16a34a;padding:4px 10px">🎁 Claim Task</button>`
                        : '<span style="font-size:0.62rem;color:#94a3b8">Active</span>'
                    }
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      bodyEl.innerHTML = subTabsHtml + contentHtml;

      bodyEl.querySelectorAll('[data-stab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.storyModalTab = btn.getAttribute('data-stab');
          openModal('story');
        });
      });
      bodyEl.querySelectorAll('[data-claim-sq]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (claimSideQuest(btn.getAttribute('data-claim-sq'), state).ok) openModal('story');
        });
      });
      bodyEl.querySelectorAll('[data-claim-task]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (claimTamerTask(btn.getAttribute('data-claim-task'), state).ok) openModal('story');
        });
      });
      const openRanchBtn = $('btnStoryOpenRanch');
      if (openRanchBtn) openRanchBtn.addEventListener('click', () => openModal('ranch'));
      const openTradeBtn = $('btnStoryOpenTrade');
      if (openTradeBtn) openTradeBtn.addEventListener('click', () => openModal('trade'));
      const homeBtn = $('btnStoryHome');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => {
          closeModal();
          travelToZone('meadow');
        });
      }
    } else if (tab === 'pass') {
      closeHubMenuDrawer();
      const bpTier = getBattlePassLevel(state);
      const bpXp = Number(state.battlePassXp || 0);
      const loginDays = (DATA && DATA.DAILY_LOGIN_REWARDS) || [];
      const bpTiers = (DATA && DATA.BATTLE_PASS_TIERS) || [];
      titleEl.textContent = `🎖️ Season 1: Aether Awakening Pass (Tier ${bpTier}/20 • ${bpXp} BP XP)`;

      const loginGridHtml = `
        <div class="ranch-banner" style="border-color:rgba(250,204,21,0.5)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <div>
              <strong style="font-size:0.8rem;color:#fde047">📅 Daily &amp; Weekly Login Prizes (Day ${state.loginStreak || 1}/7 Streak)</strong>
              <div style="font-size:0.65rem;color:#cbd5e1">Claim daily Shards, Gems, Snare Traps, Outfits &amp; Day 7 Weekly Grand Prize!</div>
            </div>
          </div>
          <div class="login-streak-grid" style="margin-top:6px">
            ${loginDays.map((d) => {
              const claimed = Boolean(state.claimedLoginDays && state.claimedLoginDays[d.day]);
              const canClaim = !claimed && d.day <= Math.max(1, Number(state.loginStreak || 1));
              return `
                <div class="login-day-card ${d.isWeeklyGrandPrize ? 'weekly-grand' : ''} ${claimed ? 'claimed' : ''}">
                  <div style="font-size:0.62rem;font-weight:900;color:${d.isWeeklyGrandPrize ? '#fde047' : '#38bdf8'}">${d.title}</div>
                  <div style="font-size:1.1rem">${d.icon}</div>
                  <div style="font-size:0.58rem;color:#e2e8f0;line-height:1.2">${d.label}</div>
                  ${claimed
                    ? '<span style="font-size:0.58rem;color:#4ade80;font-weight:900">✓ CLAIMED</span>'
                    : `<button type="button" class="mini-btn" data-claim-login="${d.day}" style="padding:3px 6px;font-size:0.58rem;background:${canClaim ? '#16a34a' : '#0284c7'}">🎁 Claim</button>`
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const goldBannerHtml = `
        <div class="warden-card" style="border-color:#facc15;background:linear-gradient(135deg,rgba(113,63,18,0.45),rgba(15,23,42,0.92))">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <div>
              <strong style="font-size:0.8rem;color:#fde047">👑 Gold Battle Pass Track ${state.battlePassGold ? '(ACTIVE)' : '(LOCKED)'}</strong>
              <div style="font-size:0.65rem;color:#cbd5e1">Earn BP XP from every Battle (+45), Snare Trap Catch (+60), Ranch Hatch (+55) &amp; Quest (+75)!</div>
            </div>
            <div style="display:flex;gap:6px">
              <button type="button" class="mini-btn secondary" id="btnPassOpenLocker">👕 Outfits &amp; Emotes</button>
              ${!state.battlePassGold
                ? '<button type="button" class="mini-btn" id="btnUnlockGoldPass" style="background:#ca8a04;color:#0f172a;font-weight:900">👑 Unlock Gold Pass (200 💎)</button>'
                : '<span class="regen-timer-pill" style="color:#fde047;border-color:#fde047">★ GOLD PASS UNLOCKED</span>'
              }
            </div>
          </div>
        </div>
      `;

      const tiersHtml = `
        <div style="display:flex;flex-direction:column;gap:6px">
          ${bpTiers.map((t) => {
            const unlocked = bpXp >= t.xpRequired;
            const freeClaimed = Boolean(state.claimedBpFree && state.claimedBpFree[t.tier]);
            const goldClaimed = Boolean(state.claimedBpGold && state.claimedBpGold[t.tier]);
            return `
              <div class="bp-tier-row ${unlocked ? 'unlocked' : ''}">
                <div class="bp-tier-badge">
                  T${t.tier}
                  <small style="font-size:0.52rem;color:#94a3b8">${t.xpRequired} XP</small>
                </div>
                <div class="bp-reward-cell">
                  <div>
                    <div style="font-size:0.6rem;color:#38bdf8;font-weight:800">FREE TRACK</div>
                    <div style="font-size:0.66rem;color:#f8fafc">${t.free.icon} ${t.free.label}</div>
                  </div>
                  ${freeClaimed
                    ? '<span style="font-size:0.6rem;color:#4ade80;font-weight:900">✓</span>'
                    : unlocked
                      ? `<button type="button" class="mini-btn" data-claim-bp-free="${t.tier}" style="flex:0 0 auto;padding:4px 8px;font-size:0.6rem;background:#16a34a">Claim</button>`
                      : '<span style="font-size:0.58rem;color:#64748b">Locked</span>'
                  }
                </div>
                <div class="bp-reward-cell gold">
                  <div>
                    <div style="font-size:0.6rem;color:#fde047;font-weight:800">👑 GOLD TRACK</div>
                    <div style="font-size:0.66rem;color:#fef08a">${t.gold.icon} ${t.gold.label}</div>
                  </div>
                  ${goldClaimed
                    ? '<span style="font-size:0.6rem;color:#4ade80;font-weight:900">✓</span>'
                    : (unlocked && state.battlePassGold)
                      ? `<button type="button" class="mini-btn" data-claim-bp-gold="${t.tier}" style="flex:0 0 auto;padding:4px 8px;font-size:0.6rem;background:#ca8a04;color:#0f172a">Claim</button>`
                      : '<span style="font-size:0.58rem;color:#64748b">🔒</span>'
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      bodyEl.innerHTML = loginGridHtml + goldBannerHtml + tiersHtml;

      bodyEl.querySelectorAll('[data-claim-login]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const d = Number(btn.getAttribute('data-claim-login'));
          if (claimDailyLoginReward(d, state).ok) openModal('pass');
        });
      });
      bodyEl.querySelectorAll('[data-claim-bp-free]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const t = Number(btn.getAttribute('data-claim-bp-free'));
          if (claimBattlePassTier(t, 'free', state).ok) openModal('pass');
        });
      });
      bodyEl.querySelectorAll('[data-claim-bp-gold]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const t = Number(btn.getAttribute('data-claim-bp-gold'));
          if (claimBattlePassTier(t, 'gold', state).ok) openModal('pass');
        });
      });
      const goldBtn = $('btnUnlockGoldPass');
      if (goldBtn) {
        goldBtn.addEventListener('click', () => {
          if (unlockGoldBattlePass(state).ok) openModal('pass');
        });
      }
      const lockerBtn = $('btnPassOpenLocker');
      if (lockerBtn) lockerBtn.addEventListener('click', () => openModal('locker'));

    } else if (tab === 'locker') {
      closeHubMenuDrawer();
      const outfits = (DATA && DATA.TAMER_OUTFITS) || [];
      const emotes = (DATA && DATA.TAMER_EMOTES) || [];
      titleEl.textContent = '👕 3D Tamer Outfits & Floating Emotes Locker';

      bodyEl.innerHTML = `
        <div class="ranch-banner">
          <strong style="font-size:0.78rem;color:#fde047">🧥 3D Character Outfits (Changes your Tamer’s 3D Armor &amp; Cape Live!)</strong>
          <div style="font-size:0.65rem;color:#cbd5e1">Unlock more outfits via Season 1 Battle Pass &amp; Daily Login Streak!</div>
        </div>
        <div class="card-grid">
          ${outfits.map((o) => {
            const unlocked = Boolean(state.unlockedOutfits && state.unlockedOutfits[o.id]);
            const equipped = state.equippedOutfit === o.id;
            return `
              <div class="kin-card" style="border-color:${equipped ? '#4ade80' : unlocked ? '#38bdf8' : 'rgba(148,163,184,0.25)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="font-size:0.76rem;color:#f8fafc">${o.icon} ${o.name}</strong>
                  <span style="font-size:0.6rem;font-weight:800;color:${equipped ? '#4ade80' : unlocked ? '#fde047' : '#94a3b8'}">${equipped ? '✓ EQUIPPED' : unlocked ? o.rarity.toUpperCase() : '🔒 LOCKED'}</span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;margin:4px 0">
                  <span style="width:18px;height:18px;border-radius:50%;background:${o.coatColor};border:1px solid #fff"></span>
                  <span style="width:18px;height:18px;border-radius:50%;background:${o.trimColor};border:1px solid #fff"></span>
                  <span style="font-size:0.62rem;color:#94a3b8">${o.unlockSource}</span>
                </div>
                <div style="font-size:0.63rem;color:#cbd5e1">${o.desc}</div>
                <div class="mini-btn-row" style="margin-top:4px">
                  ${unlocked
                    ? `<button type="button" class="mini-btn ${equipped ? 'secondary' : ''}" data-equip-outfit="${o.id}">${equipped ? 'Equipped on 3D Tamer' : '👕 Equip 3D Outfit'}</button>`
                    : `<button type="button" class="mini-btn secondary" data-unlock-outfit-bp="${o.id}">🎖️ Unlock via Pass / 80 💎</button>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="font-size:0.78rem;color:#38bdf8;font-weight:900;margin-top:8px">😊 Floating 3D Tamer Emotes (Tap to Pop Emote Over Your 3D Character!)</div>
        <div class="card-grid">
          ${emotes.map((em) => {
            const unlocked = Boolean(state.unlockedEmotes && state.unlockedEmotes[em.id]);
            return `
              <div class="kin-card" style="border-color:${unlocked ? '#38bdf8' : 'rgba(148,163,184,0.25)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="font-size:0.8rem;color:#fde047">${em.icon} ${em.name}</strong>
                  <span style="font-size:0.62rem;color:#94a3b8">${em.unlockSource}</span>
                </div>
                <div style="font-size:0.66rem;color:#e2e8f0">Bubble: <strong>“${em.bubbleText}”</strong></div>
                <button type="button" class="mini-btn" data-fire-emote="${em.id}" style="margin-top:4px;background:#0284c7">😊 Fire Emote in 3D</button>
              </div>
            `;
          }).join('')}
        </div>
      `;

      bodyEl.querySelectorAll('[data-equip-outfit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-equip-outfit');
          if (equipOutfit(id, state).ok) openModal('locker');
        });
      });
      bodyEl.querySelectorAll('[data-unlock-outfit-bp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-unlock-outfit-bp');
          if ((state.gems || 0) >= 80) {
            state.gems -= 80;
            state.unlockedOutfits[id] = true;
            equipOutfit(id, state);
            openModal('locker');
          } else {
            openModal('pass');
          }
        });
      });
      bodyEl.querySelectorAll('[data-fire-emote]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-fire-emote');
          closeModal();
          closeLobbyScreen();
          triggerEmote(id, state);
        });
      });

    } else if (tab === 'trade') {
      closeHubMenuDrawer();
      const trades = (DATA && DATA.NPC_TRADES) || [];
      const allKin = (state.squad || []).concat(state.vault || []);
      titleEl.textContent = `🔄 Cross-World Kin Trade Center (Squad ${state.squad.length}/${getMaxSquadSize(state)})`;

      bodyEl.innerHTML = `
        <div class="ranch-banner">
          <strong style="font-size:0.8rem;color:#fde047">🔄 Start with 1 Kin — Catch, Breed &amp; Trade to Build Your Sovereign Roster!</strong>
          <div style="font-size:0.66rem;color:#cbd5e1">
            Swap Wild Kin you’ve trapped with Outpost Tamers across the 6 Worlds to receive rare Cross-World Kin with boosted <strong>A / S-Rank Genetics</strong> and bonus items!
          </div>
        </div>
        <div class="card-grid">
          ${trades.map((tr) => {
            const done = Boolean(state.completedTrades && state.completedTrades[tr.id]);
            const wantSp = DATA.getSpeciesById(tr.wantsSpeciesId);
            const offerSp = DATA.getSpeciesById(tr.offersSpeciesId);
            const hasWanted = allKin.some((k) => Number(k.speciesId) === Number(tr.wantsSpeciesId));
            const offerSvg = root.WILDKIN_SPRITES.renderKinSvg(offerSp, 44, Boolean(tr.isRadiant));
            return `
              <div class="kin-card" style="border-color:${done ? '#4ade80' : hasWanted ? '#facc15' : 'rgba(56,189,248,0.3)'}">
                <div class="kin-card-top">
                  ${offerSvg}
                  <div>
                    <div style="font-weight:900;font-size:0.76rem;color:#fde047">Receive: ${tr.offersNickname} (${offerSp.name} Lv.${tr.offersLevel})</div>
                    <div style="font-size:0.65rem;color:#4ade80">🧬 ${tr.offersGeneticTier}-Rank Genetics ${tr.isRadiant ? '• ✨ RADIANT' : ''}</div>
                    <div style="font-size:0.63rem;color:#38bdf8">Wants: <strong>${wantSp.name}</strong> • Trader: ${tr.npcName} (${getZoneObj(tr.zone).name})</div>
                  </div>
                </div>
                <div style="font-size:0.63rem;color:#cbd5e1;font-style:italic">“${tr.quote}”</div>
                <div class="mini-btn-row" style="margin-top:4px">
                  ${done
                    ? '<span style="font-size:0.65rem;color:#4ade80;font-weight:900">✓ TRADE COMPLETED</span>'
                    : hasWanted
                      ? `<button type="button" class="mini-btn" data-exec-trade="${tr.id}" style="background:#16a34a">🔄 Swap ${wantSp.name} → ${tr.offersNickname}</button>`
                      : `<button type="button" class="mini-btn secondary" data-scout-wanted="${tr.wantsSpeciesId}">🪤 Catch ${wantSp.name} in Wild to Trade</button>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      bodyEl.querySelectorAll('[data-exec-trade]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-exec-trade');
          const res = executeNpcTrade(id, state);
          if (res.ok) openModal('trade');
        });
      });
      bodyEl.querySelectorAll('[data-scout-wanted]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const spId = Number(btn.getAttribute('data-scout-wanted'));
          closeModal();
          closeLobbyScreen();
          startWildEncounter(spId, 6);
        });
      });
    } else if (tab === 'npc_dialog') {
      closeHubMenuDrawer();
      const npc = state.activeDialogNpc || {
        id: 'elder_rowan',
        name: 'Grandpa Rowan',
        type: 'ranch',
        icon: '👴',
        dialogue: [
          'Welcome to Heartwood Homestead, grandchild! Walk up to any Tamer, Ranger, or Warden across the 6 Worlds to take on their personal missions.',
          'Every world also has a 🏥 Kin Care Hospital (East) for medical checkups and a 🏬 Shopping Center (West) for fresh fruits, meals, and Snare Traps!'
        ],
        quest: {
          id: 'nq_rowan_catch',
          title: 'Homestead Scouting',
          desc: 'Catch or bind 2 Wild Kin species in your KinDex using Snare Traps.',
          stat: 'kindexCount',
          target: 2,
          rewardShards: 180,
          rewardGems: 15,
          rewardItem: 'greaterPrism',
          rewardQty: 2
        }
      };

      const lines = Array.isArray(npc.dialogue) && npc.dialogue.length > 0
        ? npc.dialogue
        : [npc.quote || `Greetings, Tamer! I am ${npc.name} of ${getZoneObj(state.zone).name}.`];

      const roleBadge = npc.type === 'warden'
        ? '👑 Realm Warden'
        : npc.type === 'tamer'
          ? '⚔️ Rival Tamer'
          : npc.type === 'ranch'
            ? '🧬 Homestead Elder & Rancher'
            : '🧭 Field Quest Guide';

      let questHtml = '';
      if (npc.quest && npc.quest.id) {
        const q = npc.quest;
        const prog = evaluateQuestMetric(q.stat || q.metric, state);
        const target = Number(q.target || 1);
        const pct = Math.max(0, Math.min(100, Math.round((prog / target) * 100)));
        const claimed = Boolean(state.claimedNpcQuests && state.claimedNpcQuests[q.id]);
        const ready = !claimed && prog >= target;
        const rewardItemObj = q.rewardItem && DATA.ITEMS ? DATA.ITEMS[q.rewardItem] : null;
        questHtml = `
          <div class="warden-card" style="border-color:${claimed ? '#4ade80' : ready ? '#facc15' : '#38bdf8'};background:rgba(15,23,42,0.92)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <strong style="font-size:0.8rem;color:#fde047">📜 Character Mission: ${q.title}</strong>
              <span style="font-size:0.66rem;font-weight:900;color:${claimed ? '#4ade80' : ready ? '#facc15' : '#38bdf8'}">
                ${claimed ? '✓ COMPLETED' : `Progress: ${Math.min(prog, target)}/${target}`}
              </span>
            </div>
            <div style="font-size:0.68rem;color:#e2e8f0;margin:4px 0">${q.desc}</div>
            <div class="hp-bar-outer" style="height:7px;margin:4px 0">
              <div class="hp-bar-fill" style="width:${pct}%;background:${claimed ? '#22c55e' : '#38bdf8'}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-top:4px">
              <div style="font-size:0.65rem;color:#86efac">
                🎁 Reward: <strong>+${q.rewardShards || 200}🪙</strong> • <strong>+${q.rewardGems || 20}💎</strong>
                ${rewardItemObj ? ` • <strong>${rewardItemObj.icon} ${rewardItemObj.name} x${q.rewardQty || 1}</strong>` : ''}
              </div>
              ${claimed
                ? '<span style="font-size:0.66rem;color:#4ade80;font-weight:900">✓ Reward Claimed</span>'
                : ready
                  ? '<button type="button" class="mini-btn" id="btnClaimNpcQuest" style="background:#16a34a;flex:0 0 auto;padding:6px 12px">🎁 Claim Mission Reward!</button>'
                  : '<span style="font-size:0.62rem;color:#94a3b8">Complete objective in the world to claim!</span>'
              }
            </div>
          </div>
        `;
      }

      let primaryActionBtn = '';
      if (npc.type === 'ranch' || npc.isGrandpa) {
        primaryActionBtn = '<button type="button" class="primary-cta" id="btnNpcOpenRanch" style="padding:9px 14px;font-size:0.78rem">🧬 Open Grandpa’s Ranch &amp; Breeding</button>';
      } else if (npc.type === 'tamer') {
        const defeated = Boolean(state.defeatedTamers && state.defeatedTamers[npc.id]);
        primaryActionBtn = `<button type="button" class="primary-cta" id="btnNpcBattleTamer" style="padding:9px 14px;font-size:0.78rem">⚔️ ${defeated ? 'Rematch' : 'Battle'} ${npc.name} (+${npc.reward || 65}🪙)</button>`;
      } else if (npc.type === 'warden') {
        primaryActionBtn = `<button type="button" class="primary-cta" id="btnNpcBattleWarden" style="padding:9px 14px;font-size:0.78rem">👑 Challenge Warden ${npc.name}</button>`;
      }

      titleEl.textContent = `${npc.icon || '💬'} ${npc.name} • ${roleBadge}`;
      bodyEl.innerHTML = `
        <div class="ranch-banner" style="border-color:rgba(250,204,21,0.5);background:linear-gradient(135deg,rgba(30,41,59,0.95),rgba(15,23,42,0.95))">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="font-size:2rem;line-height:1;background:rgba(15,23,42,0.8);padding:8px;border-radius:12px;border:1px solid rgba(250,204,21,0.4)">${npc.icon || '🧭'}</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              ${lines.map((line) => `<div style="font-size:0.74rem;color:#f8fafc;line-height:1.4">“${line}”</div>`).join('')}
            </div>
          </div>
        </div>
        ${questHtml}
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
          ${primaryActionBtn}
          <div class="mini-btn-row">
            <button type="button" class="mini-btn secondary" id="btnNpcOpenHospital">🏥 Kin Care Hospital</button>
            <button type="button" class="mini-btn secondary" id="btnNpcOpenShopping">🏬 Shopping Center</button>
            <button type="button" class="mini-btn secondary" id="btnNpcOpenZones">🗺️ 6 Worlds Map</button>
            <button type="button" class="mini-btn secondary" id="btnNpcOpenAllQuests">📜 All Quests</button>
          </div>
        </div>
      `;

      const claimBtn = $('btnClaimNpcQuest');
      if (claimBtn && npc.quest) {
        claimBtn.addEventListener('click', () => {
          if (claimNpcQuest(npc.quest, state).ok) openModal('npc_dialog');
        });
      }
      const ranchBtn = $('btnNpcOpenRanch');
      if (ranchBtn) ranchBtn.addEventListener('click', () => openModal('ranch'));
      const tamerBtn = $('btnNpcBattleTamer');
      if (tamerBtn) tamerBtn.addEventListener('click', () => startTamerBattle(npc));
      const wardenBtn = $('btnNpcBattleWarden');
      if (wardenBtn) wardenBtn.addEventListener('click', () => startWardenBattle(npc.wardenId));
      const hospBtn = $('btnNpcOpenHospital');
      if (hospBtn) hospBtn.addEventListener('click', () => { state.marketTab = 'hospital'; openModal('shop'); });
      const shopBtn = $('btnNpcOpenShopping');
      if (shopBtn) shopBtn.addEventListener('click', () => { state.marketTab = 'shopping_center'; openModal('shop'); });
      const zonesBtn = $('btnNpcOpenZones');
      if (zonesBtn) zonesBtn.addEventListener('click', () => openModal('zones'));
      const allQuestsBtn = $('btnNpcOpenAllQuests');
      if (allQuestsBtn) allQuestsBtn.addEventListener('click', () => openModal('story'));
    }
  }

  // =========================================================================
  // 10. CONTROLLER, KEYBOARD, CANVAS TAP & INITIALIZATION
  // =========================================================================

  function bindEvents() {
    if (typeof document === 'undefined') return;

    // Starter buttons
    const confirmStarterBtn = $('btnConfirmStarter', 'btn-new-game');
    if (confirmStarterBtn) {
      confirmStarterBtn.addEventListener('click', () => selectStarter(state.selectedStarterId || 1));
    }

    const continueBtn = $('btnContinueSave', 'btn-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        const saved = loadGame();
        if (saved) {
          state = saved;
          syncMotionFromState();
          ensureZoneWildSpawns(state.zone);
          const overlay = $('starterOverlay', 'starter-overlay');
          if (overlay) overlay.classList.add('hidden');
          openLobbyScreen();
          if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.startBgm('overworld');
          updateHud();
          showToast(`Welcome back! Loaded saved journey in ${getZoneObj(state.zone).name}.`);
        }
      });
    }

    const cloudRestoreBtn = $('btnOpenCloudRestore');
    if (cloudRestoreBtn) {
      cloudRestoreBtn.addEventListener('click', () => openModal('cloud'));
    }

    // Audio toggles
    const btnBgm = $('btnBgm');
    if (btnBgm) {
      btnBgm.addEventListener('click', () => {
        if (!root.WILDKIN_AUDIO) return;
        const on = root.WILDKIN_AUDIO.toggleBgm();
        btnBgm.style.borderColor = on ? '#4ade80' : '';
        showToast(on ? '🎵 Chiptune BGM Enabled' : '🎵 Chiptune BGM Paused');
      });
    }
    const btnMute = $('btnMute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        if (!root.WILDKIN_AUDIO) return;
        const muted = root.WILDKIN_AUDIO.toggleMute();
        btnMute.textContent = muted ? '🔇' : '🔊';
        showToast(muted ? '🔇 Audio Muted' : '🔊 Audio Active');
      });
    }

    // D-Pad buttons
    document.querySelectorAll('.dpad-btn[data-dir]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        movePlayer(btn.getAttribute('data-dir'));
      });
    });

    // A / B / START / SELECT buttons
    const btnA = $('btnPadA', 'btn-a');
    if (btnA) {
      btnA.addEventListener('click', () => {
        if (activeEvo) {
          advanceEvolutionStage();
        } else if (battleState) {
          executePlayerMove(0);
        } else {
          interact();
        }
      });
    }
    const btnB = $('btnPadB', 'btn-b');
    if (btnB) {
      btnB.addEventListener('click', () => {
        const modal = $('modalBackdrop');
        if (modal && !modal.classList.contains('hidden')) {
          closeModal();
        } else if (battleState) {
          fleeBattle();
        } else {
          startWildEncounter();
        }
      });
    }
    const btnSelect = $('btnSelect');
    if (btnSelect) btnSelect.addEventListener('click', () => openModal('kindex'));
    const btnStart = $('btnStart');
    if (btnStart) btnStart.addEventListener('click', () => openModal('cloud'));

    // Interactive Banner & Lead Mini
    const interactBanner = $('interactBanner');
    if (interactBanner) interactBanner.addEventListener('click', () => interact());
    const leadMini = $('leadKinMini');
    if (leadMini) leadMini.addEventListener('click', () => openModal('squad'));

    // Battle Tabs
    document.querySelectorAll('.btab[data-btab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!battleState || battleState.busy) return;
        const tab = btn.getAttribute('data-btab');
        if (tab === 'flee') {
          fleeBattle();
          return;
        }
        battleState.activeTab = tab;
        renderBattleDeck();
      });
    });

    // Evolution Next button
    const btnEvoNext = $('btnEvoNext');
    if (btnEvoNext) btnEvoNext.addEventListener('click', () => advanceEvolutionStage());

    // Quick Dock & Hub Drawer & Lobby buttons
    const dockMap = {
      btnDockSquad: () => openModal('squad'),
      btnDockPass: () => openModal('pass'),
      btnDockRanch: () => openModal('ranch'),
      btnDockTrade: () => openModal('trade'),
      btnDockStory: () => openModal('story'),
      btnDockKindex: () => openModal('kindex'),
      btnDockArena: () => openModal('arena'),
      btnDockShop: () => openModal('shop'),
      btnDockMarket: () => openModal('shop'),
      btnDockLocker: () => openModal('locker'),
      btnDockHeal: () => { closeHubMenuDrawer(); healSquadAtShrine(); },
      btnDockZones: () => openModal('zones'),
      btnDockLobby: () => openLobbyScreen(),
      btnOpenLobby: () => openLobbyScreen(),
      btnEnterLiveWorld: () => closeLobbyScreen(),
      btnOpenHubMenu: () => openHubMenuDrawer(),
      btnCloseHubMenu: () => closeHubMenuDrawer(),
      btnTopBattlePass: () => openModal('pass'),
      btnQuickPass: () => openModal('pass'),
      btnLobbyBattlePass: () => openModal('pass'),
      btnLobbyMissions: () => openModal('story'),
      btnLobbyTrade: () => openModal('trade'),
      btnLobbyLocker: () => openModal('locker'),
      btnLobbyLockerTop: () => openModal('locker'),
      btnQuickTrade: () => openModal('trade'),
      btnQuickZones: () => openModal('zones'),
      btnBattleEmote: () => triggerEmote('emote_fire', state),
      btnLobbyRanch: () => openModal('ranch'),
      btnLobbyMarket: () => openModal('shop')
    };
    Object.keys(dockMap).forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('click', dockMap[id]);
    });

    const menuDrawer = $('tamerMenuDrawer');
    if (menuDrawer) {
      menuDrawer.addEventListener('click', (e) => {
        if (e.target === menuDrawer) closeHubMenuDrawer();
      });
    }

    const btnEmoteWheel = $('btnEmoteWheel');
    const emotePop = $('emoteWheelPopover');
    if (btnEmoteWheel && emotePop) {
      btnEmoteWheel.addEventListener('click', (e) => {
        e.stopPropagation();
        const emotes = (DATA && DATA.TAMER_EMOTES) || [];
        emotePop.innerHTML = emotes.map((em) => `
          <button type="button" class="emote-wheel-btn" data-pop-emote="${em.id}" title="${em.name}">${em.icon}</button>
        `).join('');
        emotePop.classList.toggle('hidden');
        emotePop.querySelectorAll('[data-pop-emote]').forEach((b) => {
          b.addEventListener('click', (ev) => {
            ev.stopPropagation();
            triggerEmote(b.getAttribute('data-pop-emote'), state);
          });
        });
      });
    }

    // Modal Close
    const btnCloseModal = $('btnCloseModal');
    if (btnCloseModal) btnCloseModal.addEventListener('click', () => closeModal());
    const modalBackdrop = $('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    // Quick Wild Scout & 3D Camera Angle Pill Buttons
    const btnQuickWild = $("btnQuickWild");
    if (btnQuickWild) {
      btnQuickWild.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!state.started || battleState || activeEvo) return;
        startWildEncounter();
      });
    }
    const btnQuickRanch = $("btnQuickRanch");
    if (btnQuickRanch) {
      btnQuickRanch.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!state.started || battleState || activeEvo) return;
        openModal('ranch');
      });
    }
    const btnTopMarket = $("btnTopMarket");
    if (btnTopMarket) {
      btnTopMarket.addEventListener("click", (e) => {
        e.stopPropagation();
        state.marketTab = 'gems';
        openModal('shop');
      });
    }
    const btnQuickFeedNow = $("btnQuickFeedNow");
    if (btnQuickFeedNow) {
      btnQuickFeedNow.addEventListener("click", (e) => {
        e.stopPropagation();
        quickFeedOrHealKin();
      });
    }
    const btnQuickOpenMarket = $("btnQuickOpenMarket");
    if (btnQuickOpenMarket) {
      btnQuickOpenMarket.addEventListener("click", (e) => {
        e.stopPropagation();
        state.marketTab = 'recovery';
        openModal('shop');
      });
    }
    const questTrackerHud = $("questTrackerHud");
    if (questTrackerHud) {
      questTrackerHud.addEventListener("click", (e) => {
        e.stopPropagation();
        openModal('story');
      });
    }
    const btnCameraMode = $("btnCameraMode");
    if (btnCameraMode) {
      btnCameraMode.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!root.WILDKIN_3D) return;
        const label = root.WILDKIN_3D.cycleCameraMode();
        const lblEl = $("camModeLabel");
        if (lblEl) lblEl.textContent = label;
        showToast(`🎥 3D Camera: ${label}`);
      });
    }

    // Free-Flowing 3D Viewport Input: Tap-to-Move Raycasting + Touch-Drag 360° Analog Steering!
    const viewport = $("screenViewport");
    const vectorHud = $("touchVectorHud");
    const vectorBase = $("touchVectorBase");
    const vectorKnob = $("touchVectorKnob");

    if (viewport) {
      viewport.addEventListener("pointerdown", (e) => {
        if (!state.started || battleState || activeEvo) return;
        if (e.target && e.target.closest("button, .overlay-screen, .overworld-hud, .world-action-bar, .recovery-alert-banner")) return;

        dragSteer.active = true;
        dragSteer.pointerId = e.pointerId;
        dragSteer.startX = e.clientX;
        dragSteer.startY = e.clientY;
        dragSteer.vx = 0;
        dragSteer.vy = 0;
        dragSteer.moved = false;

        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (err) {}
      });

      viewport.addEventListener("pointermove", (e) => {
        if (!dragSteer.active || e.pointerId !== dragSteer.pointerId) return;
        const dx = e.clientX - dragSteer.startX;
        const dy = e.clientY - dragSteer.startY;
        const dist = Math.hypot(dx, dy);

        if (dist > 11) {
          dragSteer.moved = true;
          playerMotion.targetX = null;
          playerMotion.targetY = null;
          playerMotion.targetNpc = null;
          if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);

          const maxR = 42;
          const clamped = Math.min(dist, maxR);
          const nx = dx / dist;
          const ny = dy / dist;
          dragSteer.vx = nx * (clamped / maxR);
          dragSteer.vy = ny * (clamped / maxR);

          if (vectorHud && vectorBase && vectorKnob) {
            const vRect = viewport.getBoundingClientRect();
            vectorHud.classList.remove("hidden");
            vectorBase.style.left = `${dragSteer.startX - vRect.left}px`;
            vectorBase.style.top = `${dragSteer.startY - vRect.top}px`;
            vectorKnob.style.transform = `translate(${nx * clamped * 0.65}px, ${ny * clamped * 0.65}px)`;
          }
        }
      });

      const endPointer = (e) => {
        if (!dragSteer.active || (e.pointerId !== undefined && e.pointerId !== dragSteer.pointerId)) return;
        const wasTap = !dragSteer.moved;
        dragSteer.active = false;
        dragSteer.vx = 0;
        dragSteer.vy = 0;
        if (vectorHud) vectorHud.classList.add("hidden");

        if (wasTap && state.started && !battleState && !activeEvo) {
          let targetTile = null;
          if (root.WILDKIN_3D) {
            targetTile = root.WILDKIN_3D.screenToWorldTile(e.clientX, e.clientY, viewport);
          }
          if (!targetTile && root.WILDKIN_MAPS) {
            const rect = viewport.getBoundingClientRect();
            targetTile = {
              x: ((e.clientX - rect.left) / rect.width) * root.WILDKIN_MAPS.MAP_WIDTH,
              y: ((e.clientY - rect.top) / rect.height) * root.WILDKIN_MAPS.MAP_HEIGHT
            };
          }
          if (targetTile) {
            const tx = Math.max(0.0, Math.min(15.0, targetTile.x));
            const ty = Math.max(0.0, Math.min(11.0, targetTile.y));
            const tappedWild = (state.wildSpawns || []).find((ws) => Math.hypot(ws.x - tx, ws.y - ty) <= 1.15);
            if (tappedWild) {
              const hitSp = tappedWild.speciesId;
              const hitLv = tappedWild.level;
              const hitRad = tappedWild.isRadiant;
              relocateAndRerollRoamer(tappedWild, state.zone);
              startWildEncounter(hitSp, hitLv, hitRad);
              return;
            }
            const nearTappedNpc = findNearbyNpcFloat(tx, ty, 1.35);

            if (nearTappedNpc && Math.hypot(playerMotion.x - nearTappedNpc.x, playerMotion.y - nearTappedNpc.y) <= 1.55) {
              interactWithNpc(nearTappedNpc);
              return;
            }

            playerMotion.targetX = nearTappedNpc ? nearTappedNpc.x : tx;
            playerMotion.targetY = nearTappedNpc ? nearTappedNpc.y : ty;
            playerMotion.targetNpc = nearTappedNpc || null;

            if (root.WILDKIN_3D) {
              root.WILDKIN_3D.setTargetBeacon(playerMotion.targetX, playerMotion.targetY, true, Boolean(nearTappedNpc));
            }
            if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(560, 0.03);
          }
        }
      };

      viewport.addEventListener("pointerup", endPointer);
      viewport.addEventListener("pointercancel", endPointer);
    }

    // Smooth 60fps Keyboard Controls (WASD / Arrows / Enter / Space / Escape)
    window.addEventListener("keydown", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      const key = e.key.toLowerCase();
      if (key === "arrowup" || key === "w") {
        e.preventDefault();
        heldDirs.up = true;
      } else if (key === "arrowdown" || key === "s") {
        e.preventDefault();
        heldDirs.down = true;
      } else if (key === "arrowleft" || key === "a") {
        e.preventDefault();
        heldDirs.left = true;
      } else if (key === "arrowright" || key === "d") {
        e.preventDefault();
        heldDirs.right = true;
      } else if (key === "enter" || key === " " || key === "z") {
        e.preventDefault();
        if (activeEvo) advanceEvolutionStage();
        else if (battleState) executePlayerMove(0);
        else interact();
      } else if (key === "escape" || key === "x") {
        closeModal();
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      if (key === "arrowup" || key === "w") heldDirs.up = false;
      else if (key === "arrowdown" || key === "s") heldDirs.down = false;
      else if (key === "arrowleft" || key === "a") heldDirs.left = false;
      else if (key === "arrowright" || key === "d") heldDirs.right = false;
    });

    window.addEventListener("resize", () => {
      if (root.WILDKIN_3D) {
        root.WILDKIN_3D.resizeOverworld($("screenViewport"));
        root.WILDKIN_3D.resizeBattleArena($("battleStage"));
      }
    });
  }

  function updateContinuous3DMovement(dtSec) {
    if (!state.started || battleState || activeEvo) {
      playerMotion.speed = 0;
      return;
    }

    let dirX = 0;
    let dirY = 0;

    if (heldDirs.left) dirX -= 1;
    if (heldDirs.right) dirX += 1;
    if (heldDirs.up) dirY -= 1;
    if (heldDirs.down) dirY += 1;

    if (dirX !== 0 || dirY !== 0) {
      const len = Math.hypot(dirX, dirY);
      dirX /= len;
      dirY /= len;
      playerMotion.targetX = null;
      playerMotion.targetY = null;
      playerMotion.targetNpc = null;
      if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);
    } else if (dragSteer.active && dragSteer.moved) {
      dirX = dragSteer.vx;
      dirY = dragSteer.vy;
    } else if (playerMotion.targetX !== null && playerMotion.targetY !== null) {
      const dx = playerMotion.targetX - playerMotion.x;
      const dy = playerMotion.targetY - playerMotion.y;
      const dist = Math.hypot(dx, dy);
      const stopRadius = playerMotion.targetNpc ? 1.05 : 0.16;

      if (dist <= stopRadius) {
        const arrivedNpc = playerMotion.targetNpc;
        playerMotion.targetX = null;
        playerMotion.targetY = null;
        playerMotion.targetNpc = null;
        if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);
        if (arrivedNpc) {
          interactWithNpc(arrivedNpc);
        }
        playerMotion.speed = 0;
        return;
      }
      dirX = dx / dist;
      dirY = dy / dist;
    }

    const mag = Math.hypot(dirX, dirY);
    if (mag < 0.02) {
      playerMotion.vx = 0;
      playerMotion.vy = 0;
      playerMotion.speed = 0;
      return;
    }

    const moveSpeed = 5.4;
    const stepX = dirX * moveSpeed * dtSec;
    const stepY = dirY * moveSpeed * dtSec;

    playerMotion.vx = dirX;
    playerMotion.vy = dirY;
    playerMotion.speed = mag * moveSpeed;
    playerMotion.angle = Math.atan2(dirX, dirY);

    if (Math.abs(dirX) > Math.abs(dirY)) {
      state.pos.dir = dirX > 0 ? "right" : "left";
    } else {
      state.pos.dir = dirY > 0 ? "down" : "up";
    }

    const nextX = playerMotion.x + stepX;
    const nextY = playerMotion.y + stepY;
    let movedDist = 0;

    if (isTilePassableFloat(nextX, playerMotion.y)) {
      playerMotion.x = nextX;
      movedDist += Math.abs(stepX);
    }
    if (isTilePassableFloat(playerMotion.x, nextY)) {
      playerMotion.y = nextY;
      movedDist += Math.abs(stepY);
    }

    if (movedDist < 0.0005 && playerMotion.targetX !== null) {
      if (playerMotion.targetNpc && Math.hypot(playerMotion.x - playerMotion.targetNpc.x, playerMotion.y - playerMotion.targetNpc.y) < 1.65) {
        const npcToAct = playerMotion.targetNpc;
        playerMotion.targetX = null;
        playerMotion.targetY = null;
        playerMotion.targetNpc = null;
        if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);
        interactWithNpc(npcToAct);
      } else {
        playerMotion.targetX = null;
        playerMotion.targetY = null;
        playerMotion.targetNpc = null;
        if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);
      }
      return;
    }

    const prevGridX = state.pos.x;
    const prevGridY = state.pos.y;
    const curGridX = Math.max(0, Math.min(15, Math.round(playerMotion.x)));
    const curGridY = Math.max(0, Math.min(11, Math.round(playerMotion.y)));

    if (curGridX !== prevGridX || curGridY !== prevGridY) {
      state.pos.x = curGridX;
      state.pos.y = curGridY;
      state.stats.stepsTaken = (state.stats.stepsTaken || 0) + 1;

      const portalNpc = root.WILDKIN_MAPS ? root.WILDKIN_MAPS.getNpcAt(state.zone, curGridX, curGridY) : null;
      if (portalNpc && portalNpc.type === "portal") {
        travelToZone(portalNpc.targetZone, portalNpc.targetX, portalNpc.targetY);
        return;
      }

      const tileCode = root.WILDKIN_MAPS ? root.WILDKIN_MAPS.getTileAt(state.zone, curGridX, curGridY) : ".";
      const isWildTile = tileCode === "G" || tileCode === "W" || tileCode === "~";
      if (root.WILDKIN_AUDIO) {
        root.WILDKIN_AUDIO.playStep(isWildTile);
      }
      updateHud();
    } else {
      updateInteractPrompt();
    }

    const curTile = root.WILDKIN_MAPS ? root.WILDKIN_MAPS.getTileAt(state.zone, curGridX, curGridY) : ".";
    if ((curTile === "G" || curTile === "W" || curTile === "~") && Date.now() > (playerMotion.encounterGraceUntil || 0)) {
      playerMotion.grassDist += movedDist;
      if (playerMotion.grassDist >= 1.45) {
        playerMotion.grassDist = 0;
        if (Math.random() < 0.32) {
          playerMotion.targetX = null;
          playerMotion.targetY = null;
          playerMotion.targetNpc = null;
          if (root.WILDKIN_3D) root.WILDKIN_3D.setTargetBeacon(0, 0, false);
          startWildEncounter();
        }
      }
    }
  }

  function initGame() {
    if (typeof document === "undefined") return;
    syncMotionFromState();
    renderStarterSelection();
    bindEvents();
    updateHud();

    if (root.WILDKIN_3D) {
      root.WILDKIN_3D.initOverworld($("screenViewport"));
    }

    function loop(nowMs) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(loop);
      }
      const tNow = nowMs || performance.now();
      const dtSec = Math.min(0.05, Math.max(0.001, (tNow - lastFrameTime) * 0.001));
      lastFrameTime = tNow;
      try {

      updateContinuous3DMovement(dtSec);
      if (state.started && !battleState) {
        tickPassiveRecovery(state, dtSec);
      }
      renderOverworld();

      if (root.WILDKIN_3D && root.WILDKIN_MAPS) {
        const zoneMap = root.WILDKIN_MAPS.ZONE_MAPS[state.zone] || root.WILDKIN_MAPS.ZONE_MAPS.meadow;
        if (playerMotion.syncedZone !== state.zone) {
          root.WILDKIN_3D.syncZone(zoneMap, Object.keys(state.defeatedTamers || {}));
          ensureZoneWildSpawns(state.zone);
          playerMotion.syncedZone = state.zone;
        }
        if (!state.wildSpawns || state.wildSpawns.length === 0) {
          ensureZoneWildSpawns(state.zone);
        } else if (state.started && !battleState && !activeEvo) {
          state.wildSpawns.forEach((ws, idx) => {
            ws.timer = (ws.timer || 0) + dtSec;
            const r = 0.55;
            ws.x = ws.homeX + Math.cos(ws.timer * 0.7 + idx) * r;
            ws.y = ws.homeY + Math.sin(ws.timer * 0.7 + idx) * r;
            ws.angle = Math.atan2(-Math.sin(ws.timer * 0.7 + idx), Math.cos(ws.timer * 0.7 + idx));
            const nowLoop = Date.now();
            if (
              playerMotion.speed > 0.08 &&
              nowLoop > (playerMotion.encounterGraceUntil || 0) &&
              nowLoop > (ws.cooldownUntil || 0) &&
              Math.hypot(playerMotion.x - ws.x, playerMotion.y - ws.y) < 0.72
            ) {
              const hitSp = ws.speciesId;
              const hitLv = ws.level;
              const hitRad = ws.isRadiant;
              relocateAndRerollRoamer(ws, state.zone);
              startWildEncounter(hitSp, hitLv, hitRad);
            }
          });
          playerMotion.wildSpawns = state.wildSpawns;
        }
        const outfitObj = (DATA && DATA.TAMER_OUTFITS && DATA.TAMER_OUTFITS.find((o) => o.id === state.equippedOutfit)) || null;
        if (outfitObj && typeof root.WILDKIN_3D.syncPlayerOutfit === "function") {
          root.WILDKIN_3D.syncPlayerOutfit(outfitObj);
        }
        const lead = state.squad[0];
        const leadSpec = lead && DATA ? DATA.getSpeciesById(lead.speciesId) : null;
        root.WILDKIN_3D.syncCompanionKin(leadSpec, lead ? lead.isRadiant : false);
        root.WILDKIN_3D.renderOverworldFrame(playerMotion, tNow);

        if (battleState) {
          root.WILDKIN_3D.renderBattleFrame(tNow);
        }
      }
      } catch (loopErr) {
        console.warn("Frame loop recovered:", loopErr);
      }
    }
    loop(performance.now());
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGame);
    } else {
      initGame();
    }
  }

  // Also attach math helpers onto WILDKIN_DATA if not already attached
  if (DATA && typeof DATA === 'object') {
    if (!DATA.calculateDamage) DATA.calculateDamage = calculateDamage;
    if (!DATA.calculateCatchChance) DATA.calculateCatchChance = calculateCatchChance;
  }

  return {
    calculateDamage,
    calculateCatchChance,
    createInitialState,
    getState: () => state,
    getMaxSquadSize,
    getMaxVaultSize,
    upgradeKinBag,
    getBattlePassLevel,
    addBattlePassXp,
    claimDailyLoginReward,
    claimBattlePassTier,
    unlockGoldBattlePass,
    equipOutfit,
    syncTamerOutfit: equipOutfit,
    triggerEmote,
    triggerOverworldEmote: triggerEmote,
    executeNpcTrade,
    claimSideQuest,
    claimTamerTask,
    claimNpcQuest,
    grantEncounterGrace,
    ensureZoneWildSpawns,
    syncWildRoamers: ensureZoneWildSpawns,
    openLobbyScreen,
    closeLobbyScreen,
    openHubMenuDrawer,
    closeHubMenuDrawer,
    selectStarter,
    movePlayer,
    interact,
    healSquadAtShrine,
    tickPassiveRecovery,
    useRecoveryOrBoosterItem,
    purchaseUsdBundle,
    getKinRecoveryEtaText,
    buyShopItem,
    startWildEncounter,
    startWardenBattle,
    openModal,
    closeModal,
    saveGame,
    loadGame
  };
});
