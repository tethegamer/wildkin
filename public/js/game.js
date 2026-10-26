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
      inventory: {
        basicPrism: 5,
        greaterPrism: 1,
        masteryPrism: 0,
        dewTonic: 3,
        hiTonic: 1,
        reviveLeaf: 1,
        heartwoodBerry: 2,
        apexNectar: 0
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
        evolutions: 0
      },
      storyChapter: 1,
      claimedChapters: {},
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
    syncedZone: null
  };

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
    return ch !== "T";
  }

  function findNearbyNpcFloat(fx, fy, maxRadius = 1.35) {
    if (!root.WILDKIN_MAPS) return null;
    const mapObj = root.WILDKIN_MAPS.ZONE_MAPS[state.zone];
    if (!mapObj || !mapObj.npcs) return null;
    let best = null;
    let bestDist = maxRadius;
    Object.entries(mapObj.npcs).forEach(([coord, npc]) => {
      const [nx, ny] = coord.split(",").map(Number);
      const d = Math.hypot(fx - nx, fy - ny);
      if (d <= bestDist) {
        bestDist = d;
        best = Object.assign({ x: nx, y: ny }, npc);
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

  function markBound(speciesId) {
    const id = Number(speciesId);
    state.kindexSeen[id] = true;
    state.kindexBound[id] = true;
    state.stats.kinBound = Object.keys(state.kindexBound).length;
  }

  // =========================================================================
  // 3. OVERWORLD PIXEL TILE & CHARACTER SPRITE HELPERS
  // =========================================================================

  function drawTile(ctx, code, px, py, size, palette, tick) {
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
    } else if (code === 'S') {
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
    } else if (code === 'M') {
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
    if (shardsEl) shardsEl.textContent = String(state.shards);

    const crestsEl = $('hudCrests');
    const totalWardens = (DATA && DATA.WARDENS && DATA.WARDENS.length) || 6;
    if (crestsEl) crestsEl.textContent = `${state.crests.length}/${totalWardens}`;
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
        leadMini.innerHTML = `${svg} <span>${lead.nickname} <small style="color:#facc15">Lv.${lead.level}</small> (${lead.currentHp}/${lead.maxHp})</span>`;
      } else {
        leadMini.textContent = 'No Partner Bound';
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
    if (npc.type === 'shrine') {
      icon = '⛲';
      label = `${npc.name}: Heal Squad (A)`;
    } else if (npc.type === 'merchant') {
      icon = '🛒';
      label = `${npc.name}: Open Shop (A)`;
    } else if (npc.type === 'tamer') {
      icon = '⚔️';
      label = `Battle ${npc.name} (A)`;
    } else if (npc.type === 'warden') {
      icon = '👑';
      label = `Challenge ${npc.name} (A)`;
    } else if (npc.type === 'ranch' || npc.isGrandpa) {
      icon = '🧬';
      label = `${npc.name}: Homestead Ranch & Story (A)`;
    } else if (npc.type === 'portal') {
      icon = '🌀';
      label = npc.label || 'Travel to Next Zone';
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

  function selectStarter(speciesId) {
    const id = Number(speciesId || state.selectedStarterId || 1);
    state = createInitialState(id);
    syncMotionFromState();
    const overlay = $('starterOverlay', 'starter-overlay') || $('title-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (root.WILDKIN_AUDIO) {
      root.WILDKIN_AUDIO.playLevelUp();
      root.WILDKIN_AUDIO.startBgm('overworld');
    }
    saveGame();
    updateHud();
    const sp = DATA.getSpeciesById(id);
    showToast(`💠 Bound ${sp.name} (Lv.5)! Welcome to Sunleaf Meadow!`);
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

  function healSquadAtShrine(silent = false) {
    state.squad.forEach((kin) => {
      kin.currentHp = kin.maxHp;
      kin.status = null;
      (kin.moveSlots || []).forEach((ms) => {
        const m = DATA.MOVES[ms.id];
        ms.currentStamina = m ? m.stamina : ms.maxStamina;
      });
    });
    if (root.WILDKIN_AUDIO && !silent) {
      root.WILDKIN_AUDIO.playShrineHeal();
    }
    saveGame();
    updateHud();
    if (!silent) {
      showToast('⛲ Wellspring Shrine restored all Squad HP, Stamina & Status!');
    }
  }

  function travelToZone(targetZoneId) {
    const map = root.WILDKIN_MAPS && root.WILDKIN_MAPS.ZONE_MAPS[targetZoneId];
    if (!map) return;
    state.zone = targetZoneId;
    state.pos.x = map.spawn.x;
    state.pos.y = map.spawn.y;
    state.pos.dir = 'down';
    syncMotionFromState();
    const zInfo = getZoneObj(targetZoneId);
    const hint = $('zoneHint');
    if (hint) hint.textContent = `${zInfo.name} (${zInfo.subtitle})`;
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(740, 0.08);
    saveGame();
    updateHud();
    showToast(`🗺️ Entered ${zInfo.name}!`);
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
      travelToZone(npcAtTarget.targetZone);
      return true;
    }

    // Impassable tiles: 'T' (Tree/Wall), or NPC tiles ('S','M','K','N') triggers interaction
    if (targetTile === 'T') {
      updateInteractPrompt();
      return false;
    }
    if (targetTile === 'S' || targetTile === 'M' || targetTile === 'K' || targetTile === 'N') {
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
    if (npc.type === 'shrine') {
      healSquadAtShrine();
    } else if (npc.type === 'ranch' || npc.isGrandpa) {
      openModal('ranch');
    } else if (npc.type === 'merchant') {
      openModal('shop');
    } else if (npc.type === 'portal') {
      travelToZone(npc.targetZone);
    } else if (npc.type === 'tamer') {
      startTamerBattle(npc);
    } else if (npc.type === 'warden') {
      startWardenBattle(npc.wardenId);
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

    const enemySquad = (tamerNpc.squad || [{ speciesId: 10, level: 4 }]).map((s) =>
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
      logText: `${tamerNpc.name}: “${tamerNpc.quote}”`
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
    }
    renderBattleUI();
  }

  function closeBattleOverlay() {
    const overlay = $('battleOverlay', 'battle-layer');
    if (overlay) overlay.classList.add('hidden');
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

    // Sprites
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
    } else if (battleState.activeTab === 'pack') {
      const itemKeys = ['basicPrism', 'greaterPrism', 'masteryPrism', 'dewTonic', 'hiTonic', 'reviveLeaf'];
      deck.innerHTML = itemKeys.map((key) => {
        const item = DATA.ITEMS[key];
        const count = state.inventory[key] || 0;
        const extra = item.category === 'prism'
          ? (battleState.mode === 'wild' ? `${Math.round(calculateCatchChance(enemy, item) * 100)}% Bind` : 'Wild Only')
          : `+${item.healAmount || '50%'} HP`;
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

    if (item.category === 'revive') {
      const target = state.squad.find((k) => k.currentHp <= 0) || player;
      target.currentHp = Math.max(1, Math.floor(target.maxHp * (item.healPercent || 0.5)));
      target.status = null;
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
      setBattleLog(`🍃 Used ${item.name} on ${target.nickname}! Restored to ${target.currentHp} HP!`);
    } else {
      const healed = Math.min(player.maxHp - player.currentHp, item.healAmount || 35);
      player.currentHp = Math.min(player.maxHp, player.currentHp + (item.healAmount || 35));
      player.status = null;
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playShrineHeal();
      setBattleLog(`🧪 Used ${item.name}! ${player.nickname} recovered ${healed} HP & cured status!`);
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

    setBattleTurnBanner('phase-player', 'TURN 1 • AETHER PRISM', `Binding wild ${enemy.nickname} (${Math.round(chance * 100)}%)`);
    setBattleLog(`💠 Threw ${prismItem.name} at wild ${enemy.nickname}! (${Math.round(chance * 100)}% resonance)`);
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
    markBound(enemy.speciesId);

    const captured = Object.assign({}, enemy, {
      currentHp: enemy.maxHp,
      status: null,
      caughtZone: getZoneObj(state.zone).name
    });

    let dest = 'Squad';
    if (state.squad.length < 6) {
      state.squad.push(captured);
    } else {
      state.vault.push(captured);
      dest = 'Sanctuary Vault';
    }

    const bonusShards = 25 + enemy.level * 5;
    state.shards += bonusShards;
    const xpGain = 22 + enemy.level * 12;
    grantXpToActiveKin(xpGain);

    setBattleLog(`🌟 BOUND! ${enemy.nickname} joined your ${dest}! (+${bonusShards}💎, +${xpGain} XP)`);
    renderBattleUI();
    setTimeout(() => {
      const eHolder = $('enemySpriteHolder');
      if (eHolder) eHolder.style.opacity = '1';
      closeBattleOverlay();
      showToast(`💠 Bound ${enemy.nickname} (Lv.${enemy.level}) → ${dest}!`);
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
    player.xp = (player.xp || 0) + xpAmount;
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

  function buyShopItem(itemId) {
    if (!DATA || !DATA.ITEMS[itemId]) return false;
    const item = DATA.ITEMS[itemId];
    if (state.shards < item.cost) {
      showToast(`Need ${item.cost}💎 Aether Shards to buy ${item.name}!`);
      return false;
    }
    state.shards -= item.cost;
    state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(720, 0.06);
    saveGame();
    updateHud();
    showToast(`🛒 Purchased ${item.icon} ${item.name}! (x${state.inventory[itemId]})`);
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
      titleEl.textContent = `🐾 Squad (${state.squad.length}/6) & Sanctuary Vault (${state.vault.length})`;
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
              </div>
            </div>
            <div class="mini-btn-row">
              ${!isVault && idx > 0 ? `<button class="mini-btn" data-lead-idx="${idx}">Make Lead</button>` : ''}
              ${!isVault && state.squad.length > 1 ? `<button class="mini-btn secondary" data-to-vault="${idx}">To Vault</button>` : ''}
              ${isVault && state.squad.length < 6 ? `<button class="mini-btn" data-to-squad="${idx}">To Squad</button>` : ''}
            </div>
          </div>
        `;
      };

      bodyEl.innerHTML = `
        <div style="font-size:0.75rem;color:#38bdf8;font-weight:800">Active Squad (Max 6)</div>
        <div class="card-grid">${state.squad.map((k, i) => renderKinCard(k, i, false)).join('')}</div>
        <div style="font-size:0.75rem;color:#c084fc;font-weight:800;margin-top:6px">Sanctuary Vault (${state.vault.length} Stored)</div>
        ${state.vault.length === 0
          ? `<div style="font-size:0.72rem;color:#94a3b8">Extra bound Kin are safely stored here when your Squad is full.</div>`
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
      bodyEl.querySelectorAll('[data-to-squad]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-to-squad'));
          if (state.squad.length >= 6) return;
          const moved = state.vault.splice(i, 1)[0];
          state.squad.push(moved);
          saveGame();
          updateHud();
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
    } else if (tab === 'shop') {
      titleEl.textContent = `🛒 Prism & Tonic Emporium (Balance: ${state.shards}💎)`;
      bodyEl.innerHTML = `
        <div class="card-grid">
          ${Object.values(DATA.ITEMS).map((item) => {
            const owned = state.inventory[item.id] || 0;
            return `
              <div class="shop-card">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="font-size:0.78rem">${item.icon} ${item.name}</strong>
                  <span style="color:#facc15;font-weight:800;font-size:0.74rem">${item.cost}💎</span>
                </div>
                <div style="font-size:0.64rem;color:#cbd5e1">${item.desc}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
                  <small style="color:#94a3b8">In Pack: x${owned}</small>
                  <button class="mini-btn" data-buy-id="${item.id}" style="flex:0 0 auto">Buy +1</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      bodyEl.querySelectorAll('[data-buy-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-buy-id');
          if (buyShopItem(id)) openModal('shop');
        });
      });
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
          if (state.shards < 100) {
            showToast('Need 100💎 Aether Shards for Breeding Sanctuary incubation!');
            return;
          }
          state.shards -= 100;
          const offspring = DATA.breedKinOffspring(parentA, parentB);
          state.stats.kinBred = (state.stats.kinBred || 0) + 1;
          markBound(offspring.speciesId);

          let dest = 'Squad';
          if (state.squad.length < 6) state.squad.push(offspring);
          else {
            state.vault.push(offspring);
            dest = 'Sanctuary Vault';
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
      updateStoryTrackerHud();
      const chapters = (DATA && DATA.STORY_CHAPTERS) || [];
      const sideQuests = (DATA && DATA.SIDE_QUESTS) || [];
      const curCh = chapters.find((c) => c.id === state.storyChapter) || chapters[0];
      titleEl.textContent = `📜 Grandpa Rowan’s Tamer Chronicle (Chapter ${state.storyChapter || 1}/${chapters.length})`;
      bodyEl.innerHTML = `
        <div class="ranch-banner">
          <strong style="color:#fde047;font-size:0.82rem">👴 Elder Vance Rowan — Heartwood Homestead Mentor</strong>
          <div style="font-size:0.7rem;color:#e2e8f0;font-style:italic">“${curCh ? curCh.grandpaQuote : 'Every great Sovereign started with a single partner Kin.'}”</div>
          <div class="mini-btn-row" style="margin-top:4px">
            <button class="mini-btn" id="btnStoryOpenRanch">🧬 Open Grandpa’s Ranch</button>
            <button class="mini-btn secondary" id="btnStoryHome">🏡 Visit Homestead (World 1)</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${chapters.map((ch) => {
            const done = Boolean(state.claimedChapters && state.claimedChapters[ch.id]);
            const isCur = ch.id === state.storyChapter;
            return `
              <div class="warden-card" style="border-color:${done ? '#4ade80' : isCur ? '#facc15' : 'rgba(148,163,184,0.25)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <strong style="font-size:0.8rem;color:${done ? '#4ade80' : isCur ? '#fde047' : '#f8fafc'}">${ch.title}</strong>
                  <span style="font-size:0.65rem;font-weight:800;color:${done ? '#4ade80' : isCur ? '#38bdf8' : '#94a3b8'}">${done ? '✓ COMPLETED' : isCur ? 'ACTIVE QUEST' : 'UPCOMING'}</span>
                </div>
                <div style="font-size:0.68rem;color:#cbd5e1"><strong>Objective:</strong> ${ch.objective || ch.objectiveText}</div>
                <div style="font-size:0.64rem;color:#94a3b8">Reward: +${ch.rewardShards}💎 Aether Shards • World: ${getZoneObj(ch.zone || ch.worldId).name}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
          <strong style="font-size:0.78rem;color:#38bdf8">🧭 Multi-World Side Quests (${sideQuests.length})</strong>
          ${sideQuests.map((sq) => `
            <div class="warden-card" style="border-color:rgba(56,189,248,0.28)">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:0.76rem;color:#e0f2fe">${sq.title}</strong>
                <span style="font-size:0.62rem;color:#38bdf8">${sq.giver} • ${getZoneObj(sq.zone).name}</span>
              </div>
              <div style="font-size:0.66rem;color:#cbd5e1">${sq.objective}</div>
              <div style="font-size:0.62rem;color:#94a3b8">Bounty: +${sq.rewardShards}💎 Aether Shards</div>
            </div>
          `).join('')}
        </div>
      `;

      const openRanchBtn = $('btnStoryOpenRanch');
      if (openRanchBtn) openRanchBtn.addEventListener('click', () => openModal('ranch'));
      const homeBtn = $('btnStoryHome');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => {
          closeModal();
          travelToZone('meadow');
        });
      }
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
          const overlay = $('starterOverlay', 'starter-overlay');
          if (overlay) overlay.classList.add('hidden');
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

    // Quick Dock buttons
    const dockMap = {
      btnDockSquad: () => openModal('squad'),
      btnDockRanch: () => openModal('ranch'),
      btnDockStory: () => openModal('story'),
      btnDockKindex: () => openModal('kindex'),
      btnDockArena: () => openModal('arena'),
      btnDockShop: () => openModal('shop'),
      btnDockHeal: () => healSquadAtShrine(),
      btnDockZones: () => openModal('zones')
    };
    Object.keys(dockMap).forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('click', dockMap[id]);
    });

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
        if (e.target && e.target.closest("button, .overlay-screen, .overworld-hud, .world-action-bar")) return;

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
            const tx = Math.max(0.6, Math.min(14.8, targetTile.x));
            const ty = Math.max(0.2, Math.min(10.6, targetTile.y));
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
        travelToZone(portalNpc.targetZone);
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
    if (curTile === "G" || curTile === "W" || curTile === "~") {
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
      const tNow = nowMs || performance.now();
      const dtSec = Math.min(0.05, Math.max(0.001, (tNow - lastFrameTime) * 0.001));
      lastFrameTime = tNow;

      updateContinuous3DMovement(dtSec);
      renderOverworld();

      if (root.WILDKIN_3D && root.WILDKIN_MAPS) {
        const zoneMap = root.WILDKIN_MAPS.ZONE_MAPS[state.zone] || root.WILDKIN_MAPS.ZONE_MAPS.meadow;
        if (playerMotion.syncedZone !== state.zone) {
          root.WILDKIN_3D.syncZone(zoneMap, Object.keys(state.defeatedTamers || {}));
          playerMotion.syncedZone = state.zone;
        }
        const lead = state.squad[0];
        const leadSpec = lead && DATA ? DATA.getSpeciesById(lead.speciesId) : null;
        root.WILDKIN_3D.syncCompanionKin(leadSpec, lead ? lead.isRadiant : false);
        root.WILDKIN_3D.renderOverworldFrame(playerMotion, tNow);

        if (battleState) {
          root.WILDKIN_3D.renderBattleFrame(tNow);
        }
      }

      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(loop);
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
    selectStarter,
    movePlayer,
    interact,
    healSquadAtShrine,
    buyShopItem,
    startWildEncounter,
    startWardenBattle,
    openModal,
    closeModal,
    saveGame,
    loadGame
  };
});
