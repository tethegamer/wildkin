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
        reviveLeaf: 1
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
        stepsTaken: 0
      },
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
    if (crestsEl) crestsEl.textContent = `${state.crests.length}/4`;

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

  function getAdjacentInteraction() {
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

  function animateSpriteHit(isPlayerAttacking, callback) {
    const attackerHolder = $(isPlayerAttacking ? 'playerSpriteHolder' : 'enemySpriteHolder');
    const defenderHolder = $(isPlayerAttacking ? 'enemySpriteHolder' : 'playerSpriteHolder');
    const lungeClass = isPlayerAttacking ? 'lunge-player' : 'lunge-enemy';

    if (attackerHolder) attackerHolder.classList.add(lungeClass);
    setTimeout(() => {
      if (attackerHolder) attackerHolder.classList.remove(lungeClass);
      if (defenderHolder) defenderHolder.classList.add('hit-flash');
      setTimeout(() => {
        if (defenderHolder) defenderHolder.classList.remove('hit-flash');
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

    // Check paralysis skip
    if (player.status === 'paralyze' && Math.random() < 0.22) {
      battleState.busy = true;
      setBattleLog(`⚡ ${player.nickname} is paralyzed by static and couldn’t move!`);
      setTimeout(() => executeEnemyTurn(), 750);
      return;
    }

    slot.currentStamina = Math.max(0, slot.currentStamina - 1);
    battleState.busy = true;

    if (move.category === 'status' && move.selfBuff) {
      player.buffs = player.buffs || { atk: 1, def: 1, spd: 1 };
      if (move.selfBuff.atk) player.buffs.atk = Math.min(2.2, (player.buffs.atk || 1) * move.selfBuff.atk);
      if (move.selfBuff.def) player.buffs.def = Math.min(2.2, (player.buffs.def || 1) * move.selfBuff.def);
      if (move.selfBuff.spd) player.buffs.spd = Math.min(2.2, (player.buffs.spd || 1) * move.selfBuff.spd);
      if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playBlip(780, 0.09);
      setBattleLog(`✨ ${player.nickname} used ${move.name}! Resonance boosted its stats!`);
      renderBattleUI();
      setTimeout(() => executeEnemyTurn(), 750);
      return;
    }

    const res = calculateDamage(player, enemy, move);
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playAttack(res.multiplier);

    animateSpriteHit(true, () => {
      enemy.currentHp = Math.max(0, enemy.currentHp - res.damage);
      let msg = `${player.nickname} used ${move.name}! Dealt ${res.damage} dmg!`;
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

      if (enemy.currentHp <= 0) {
        setTimeout(() => handleEnemyDefeated(), 750);
      } else {
        setTimeout(() => executeEnemyTurn(), 800);
      }
    });
  }

  function executeEnemyTurn() {
    if (!battleState) return;
    const player = state.squad[battleState.playerIndex];
    const enemy = battleState.enemySquad[battleState.enemyIndex];
    if (!enemy || enemy.currentHp <= 0) {
      battleState.busy = false;
      return;
    }

    // End-of-round burn/poison tick on enemy
    if (enemy.status === 'burn' || enemy.status === 'poison') {
      const dot = Math.max(1, Math.floor(enemy.maxHp * 0.08));
      enemy.currentHp = Math.max(0, enemy.currentHp - dot);
      if (enemy.currentHp <= 0) {
        renderBattleUI();
        setBattleLog(`${enemy.nickname} fainted from ${enemy.status.toUpperCase()} damage!`);
        setTimeout(() => handleEnemyDefeated(), 750);
        return;
      }
    }

    if (enemy.status === 'paralyze' && Math.random() < 0.25) {
      setBattleLog(`⚡ Foe ${enemy.nickname} is paralyzed and missed its turn!`);
      battleState.busy = false;
      renderBattleUI();
      return;
    }

    const eMoves = (enemy.moveSlots || []).map((ms) => DATA.MOVES[ms.id] || DATA.MOVES.clawSwipe);
    const chosenMove = eMoves[Math.floor(Math.random() * eMoves.length)] || DATA.MOVES.clawSwipe;

    if (chosenMove.category === 'status' && chosenMove.selfBuff) {
      enemy.buffs = enemy.buffs || { atk: 1, def: 1, spd: 1 };
      if (chosenMove.selfBuff.atk) enemy.buffs.atk = Math.min(2.0, (enemy.buffs.atk || 1) * chosenMove.selfBuff.atk);
      if (chosenMove.selfBuff.def) enemy.buffs.def = Math.min(2.0, (enemy.buffs.def || 1) * chosenMove.selfBuff.def);
      setBattleLog(`Foe ${enemy.nickname} used ${chosenMove.name} and fortified itself!`);
      battleState.busy = false;
      renderBattleUI();
      return;
    }

    const res = calculateDamage(enemy, player, chosenMove);
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playAttack(res.multiplier);

    animateSpriteHit(false, () => {
      player.currentHp = Math.max(0, player.currentHp - res.damage);
      let msg = `Foe ${enemy.nickname} used ${chosenMove.name}! (${res.damage} dmg)`;
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
            setBattleLog(`${player.nickname} is exhausted! Go, ${nextKin.nickname}!`);
            battleState.busy = false;
            renderBattleUI();
          }, 800);
        } else {
          setTimeout(() => {
            setBattleLog('All Squad Kin are exhausted! Retreating to the Wellspring Shrine...');
            setTimeout(() => {
              healSquadAtShrine(true);
              closeBattleOverlay();
              showToast('⛲ Rescued to Wellspring Shrine — Squad fully restored!');
            }, 1100);
          }, 700);
        }
      } else {
        battleState.busy = false;
      }
    });
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

    setBattleLog(`💠 Threw ${prismItem.name} at wild ${enemy.nickname}! (${Math.round(chance * 100)}% resonance)`);
    if (root.WILDKIN_AUDIO) root.WILDKIN_AUDIO.playPrismThrow();

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
      const newStats = DATA.calculateStatsForLevel(sp.baseStats, player.level, player.isRadiant);
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
      const stats = DATA.calculateStatsForLevel(toSp.baseStats, kin.level, kin.isRadiant);
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
                <div style="font-weight:800;font-size:0.8rem">${kin.nickname} ${kin.isRadiant ? '✨' : ''}</div>
                <div style="font-size:0.68rem;color:#facc15">Lv.${kin.level} • ${aff.icon} ${aff.name}</div>
                <div style="font-size:0.64rem;color:#cbd5e1">HP ${kin.currentHp}/${kin.maxHp} • ATK ${kin.atk}</div>
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
      titleEl.textContent = `👑 Realm Wardens (${state.crests.length}/4 Crests) & PvP Arena`;
      bodyEl.innerHTML = `
        <div style="font-size:0.75rem;color:#facc15;font-weight:800">4 Sanctuary Wardens</div>
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

    // Tap on Overworld Canvas to step toward tapped tile
    const canvas = $('gameCanvas', 'game-canvas');
    if (canvas && root.WILDKIN_MAPS) {
      canvas.addEventListener('click', (e) => {
        if (!state.started || battleState || activeEvo) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const tileX = Math.floor(cx / (canvas.width / root.WILDKIN_MAPS.MAP_WIDTH));
        const tileY = Math.floor(cy / (canvas.height / root.WILDKIN_MAPS.MAP_HEIGHT));
        const dx = tileX - state.pos.x;
        const dy = tileY - state.pos.y;
        if (dx === 0 && dy === 0) {
          interact();
        } else if (Math.abs(dx) >= Math.abs(dy)) {
          movePlayer(dx > 0 ? 'right' : 'left');
        } else {
          movePlayer(dy > 0 ? 'down' : 'up');
        }
      });
    }

    // Keyboard controls (WASD / Arrows / Enter / Space / Escape)
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        movePlayer('up');
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        movePlayer('down');
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        movePlayer('left');
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        movePlayer('right');
      } else if (key === 'enter' || key === ' ' || key === 'z') {
        e.preventDefault();
        if (activeEvo) advanceEvolutionStage();
        else if (battleState) executePlayerMove(0);
        else interact();
      } else if (key === 'escape' || key === 'x') {
        closeModal();
      }
    });
  }

  function initGame() {
    if (typeof document === 'undefined') return;
    renderStarterSelection();
    bindEvents();
    updateHud();

    function loop() {
      renderOverworld();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(loop);
      }
    }
    loop();
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
