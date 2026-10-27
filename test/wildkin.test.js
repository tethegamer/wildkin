/**
 * WILDKIN: AETHER BOUND — Comprehensive Verification & Integration Test Suite
 * Uses node:test and node:assert/strict.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Attach browser-style global for scripts that export via root.WILDKIN_*
global.self = global;
global.window = global;
global.THREE = require('three');

const WildkinData = require('../public/js/data.js');
require('../public/js/maps.js');
require('../public/js/sprites.js');
const Wildkin3D = require('../public/js/renderer3d.js');
const WildkinGame = require('../public/js/game.js');

const WildkinMaps = global.WILDKIN_MAPS;
const WildkinSprites = global.WILDKIN_SPRITES;
const app = require('../server.js');

describe('1. public/js/data.js — Kin Roster, Elemental Affinities, 6 Worlds, 6 Wardens, Genetics, Breeding & Story', () => {
  it('defines 6 elemental affinities (Pyre, Tide, Grove, Volt, Terra, Umbra)', () => {
    const keys = Object.keys(WildkinData.AFFINITIES);
    assert.deepEqual(keys, ['Pyre', 'Tide', 'Grove', 'Volt', 'Terra', 'Umbra']);
  });

  it('defines a complete 6x6 TYPE_CHART with valid multipliers', () => {
    const affinities = Object.keys(WildkinData.AFFINITIES);
    for (const atk of affinities) {
      assert.ok(WildkinData.TYPE_CHART[atk], `Missing attacker row for ${atk}`);
      for (const def of affinities) {
        const mult = WildkinData.getTypeMultiplier(atk, def);
        assert.ok([0.5, 1, 2].includes(mult), `Invalid multiplier ${mult} for ${atk} -> ${def}`);
      }
    }
    assert.equal(WildkinData.getTypeMultiplier('Pyre', 'Grove'), 2);
    assert.equal(WildkinData.getTypeMultiplier('Tide', 'Pyre'), 2);
    assert.equal(WildkinData.getTypeMultiplier('Grove', 'Tide'), 2);
    assert.equal(WildkinData.getTypeMultiplier('Volt', 'Umbra'), 0.5);
    assert.equal(WildkinData.getTypeMultiplier('Umbra', 'Volt'), 2);
  });

  it('defines all 27 original Kin species with valid base stats and moves', () => {
    assert.equal(WildkinData.KIN_SPECIES.length, 27);
    const ids = new Set();
    for (const kin of WildkinData.KIN_SPECIES) {
      assert.ok(kin.id >= 1 && kin.id <= 27);
      ids.add(kin.id);
      assert.ok(WildkinData.AFFINITIES[kin.affinity], `Invalid affinity ${kin.affinity} on #${kin.id}`);
      assert.ok(kin.baseStats.hp > 0 && kin.baseStats.atk > 0 && kin.baseStats.def > 0 && kin.baseStats.spd > 0);
      assert.ok(Array.isArray(kin.moves) && kin.moves.length >= 2);
      for (const moveId of kin.moves) {
        assert.ok(WildkinData.MOVES[moveId], `Missing move ${moveId} referenced by ${kin.name}`);
      }
    }
    assert.equal(ids.size, 27);
  });

  it('includes original renamed moves rippleJet and rimeFang', () => {
    assert.ok(WildkinData.MOVES.rippleJet, 'rippleJet move should exist');
    assert.equal(WildkinData.MOVES.rippleJet.name, 'Ripple Jet');
    assert.ok(WildkinData.MOVES.rimeFang, 'rimeFang move should exist');
    assert.equal(WildkinData.MOVES.rimeFang.name, 'Rime Fang');
  });

  it('validates all 14 evolution links point to valid target species', () => {
    const evoLinks = WildkinData.KIN_SPECIES.filter((k) => k.evolvesTo !== null);
    assert.equal(evoLinks.length, 14);
    for (const kin of evoLinks) {
      const target = WildkinData.getSpeciesById(kin.evolvesTo.id);
      assert.ok(target && target.id === kin.evolvesTo.id, `Invalid evolution target ${kin.evolvesTo.id} for ${kin.name}`);
      assert.ok(kin.evolvesTo.level >= 8, `Invalid evolution level for ${kin.name}`);
    }
  });

  it('validates all 6 playable worlds in ZONES and all 6 Wardens in WARDENS', () => {
    const expectedZoneIds = ['meadow', 'tidecove', 'stormspire', 'cinderpeak', 'frostveil', 'sanctum'];
    const expectedWardenIds = ['kael', 'nerissa', 'orin', 'ignis', 'freya', 'vesper'];

    assert.equal(WildkinData.ZONES.length, 6);
    assert.deepEqual(WildkinData.ZONES.map((z) => z.id), expectedZoneIds);
    for (let i = 0; i < WildkinData.ZONES.length; i++) {
      const zone = WildkinData.ZONES[i];
      assert.equal(zone.worldNumber, i + 1);
      assert.equal(zone.wardenId, expectedWardenIds[i]);
      const weightSum = zone.wildPool.reduce((acc, entry) => acc + entry.weight, 0);
      assert.equal(weightSum, 100, `Zone ${zone.id} wildPool weights should sum to 100`);
      for (const entry of zone.wildPool) {
        assert.ok(WildkinData.getSpeciesById(entry.id), `Invalid species ${entry.id} in ${zone.id}`);
      }
    }

    assert.equal(WildkinData.WARDENS.length, 6);
    assert.deepEqual(WildkinData.WARDENS.map((w) => w.id), expectedWardenIds);
    for (const warden of WildkinData.WARDENS) {
      assert.ok(warden.crestName && warden.rewardShards >= 250);
      assert.ok(Array.isArray(warden.squad) && warden.squad.length >= 2, `Warden ${warden.id} must have at least 2 Kin`);
      for (const member of warden.squad) {
        assert.ok(WildkinData.getSpeciesById(member.speciesId));
      }
    }
  });

  it('validates Kin genetics (geneticTier/geneRank, geneticBonus/geneScore, traitId) and Kin Breeding engine (breedKinOffspring / breedKinPair)', () => {
    assert.deepEqual(Object.keys(WildkinData.GENETIC_TIERS), ['B', 'A', 'S', 'SS']);
    assert.equal(typeof WildkinData.breedKinOffspring, 'function');
    assert.equal(typeof WildkinData.breedKinPair, 'function');

    // Stage-3 Ignisaur (#3) + Stage-3 Tsunamiadon (#6) -> Base stage #1 Cinderkit with upgraded genetics and inherited Tide move
    const parentA = WildkinData.createKinInstance(3, 20, { geneticTier: 'B', isRadiant: false });
    const parentB = WildkinData.createKinInstance(6, 20, { geneticTier: 'B', isRadiant: false });
    assert.equal(parentA.geneticTier, 'B');
    assert.equal(parentA.geneRank, 'B');
    assert.equal(parentA.geneScore, 100);
    assert.equal(parentA.traitId, 'steady_heart');

    // Generation 1 (B + B) -> Generation 2 (A-Rank, +8%)
    const gen2 = WildkinData.breedKinOffspring(parentA, parentB, { isRadiant: false });
    assert.equal(gen2.speciesId, 1, 'Offspring of #3 Ignisaur should hatch as base-stage #1 Cinderkit');
    assert.equal(gen2.geneticTier, 'A');
    assert.equal(gen2.geneRank, 'A');
    assert.equal(gen2.geneScore, 108);
    assert.equal(gen2.traitId, 'keen_instinct');
    assert.equal(gen2.generation, 2);
    assert.equal(gen2.bondLevel, 3);
    assert.ok(gen2.inheritedMove, 'Expected bred offspring to inherit an Egg Move from Parent B');
    assert.ok(gen2.moveSlots.some((m) => m.id === gen2.inheritedMove), 'Inherited Egg Move must be present in offspring moveSlots');

    // Generation 2 (A) -> Generation 3 (S-Rank, +18%) -> Generation 4 (SS-Rank Apex, +30%)
    const gen3 = WildkinData.breedKinPair(gen2, parentB, { isRadiant: false });
    assert.equal(gen3.geneticTier, 'S');
    assert.equal(gen3.geneRank, 'S');
    assert.equal(gen3.geneScore, 118);
    assert.equal(gen3.traitId, 'alpha_vigor');
    assert.equal(gen3.generation, 3);

    const gen4 = WildkinData.breedKinOffspring(gen3, gen2, { isRadiant: true });
    assert.equal(gen4.geneticTier, 'SS');
    assert.equal(gen4.geneRank, 'SS');
    assert.equal(gen4.geneScore, 130);
    assert.equal(gen4.traitId, 'apex_lineage');
    assert.equal(gen4.generation, 4);
    assert.equal(gen4.isRadiant, true);

    // Verify SS-Rank stats strictly exceed B-Rank stats at the same level
    const baseB = WildkinData.createKinInstance(1, gen4.level, { geneticTier: 'B', isRadiant: false, bondLevel: 1 });
    assert.ok(gen4.maxHp > baseB.maxHp, 'SS-Rank Radiant offspring should have significantly higher Max HP than B-Rank');
    assert.ok(gen4.atk > baseB.atk, 'SS-Rank Radiant offspring should have significantly higher ATK than B-Rank');
  });

  it('validates all 8 STORY_CHAPTERS, 18 SIDE_QUESTS (3 per world), and 12 TAMER_TASKS with valid item rewards', () => {
    assert.ok(Array.isArray(WildkinData.STORY_CHAPTERS));
    assert.equal(WildkinData.STORY_CHAPTERS.length, 8);
    for (let i = 0; i < 8; i++) {
      const ch = WildkinData.STORY_CHAPTERS[i];
      assert.equal(ch.id, i + 1);
      assert.equal(ch.chapter, i + 1);
      assert.ok(ch.title && ch.objective && ch.objectiveText && ch.grandpaQuote && ch.grandpaTip);
      assert.ok(ch.zone && ch.worldId);
      assert.ok(ch.rewardShards >= 200);
      for (const itemKey of Object.keys(ch.rewardItems)) {
        assert.ok(WildkinData.ITEMS[itemKey], `Chapter ${ch.id} references unknown reward item "${itemKey}"`);
      }
    }

    assert.ok(Array.isArray(WildkinData.SIDE_QUESTS));
    assert.equal(WildkinData.SIDE_QUESTS.length, 18);
    assert.equal(WildkinData.TAMER_TASKS.length, 12);
    for (const sq of WildkinData.SIDE_QUESTS) {
      assert.ok(sq.id && sq.title && sq.giver && sq.objective && sq.rewardShards >= 250);
      for (const itemKey of Object.keys(sq.rewardItems)) {
        assert.ok(WildkinData.ITEMS[itemKey], `Side quest ${sq.id} references unknown reward item "${itemKey}"`);
      }
    }
  });

  it('defines Food, Recovery, Revive, and Level-Up Booster items in DATA.ITEMS and USD GEM_BUNDLES', () => {
    const requiredItems = [
      'sunberryRation', 'heartwoodStew', 'feastPlatter', 'heartwoodBerry', 'apexNectar',
      'dewTonic', 'vitalTonic', 'hiTonic', 'hyperTonic', 'reviveLeaf', 'phoenixDew',
      'aetherCandy', 'apexTome', 'xpBooster2x', 'hatchAccelerator',
      'basicPrism', 'greaterPrism', 'masteryPrism'
    ];
    for (const key of requiredItems) {
      const itm = WildkinData.ITEMS[key];
      assert.ok(itm, `Missing item "${key}" in DATA.ITEMS`);
      assert.ok(itm.name && itm.icon && itm.desc, `Item "${key}" missing metadata`);
      assert.ok(itm.marketTab === 'recovery' || itm.marketTab === 'boosters', `Item "${key}" should declare marketTab`);
    }

    assert.ok(Array.isArray(WildkinData.MARKETPLACE_BUNDLES), 'Expected MARKETPLACE_BUNDLES array');
    assert.ok(Array.isArray(WildkinData.GEM_BUNDLES), 'Expected GEM_BUNDLES alias array');
    assert.equal(WildkinData.GEM_BUNDLES.length, 4);
    const expectedIds = ['starter_recovery', 'tamers_pouch', 'breeders_vault', 'sovereign_treasury'];
    assert.deepEqual(WildkinData.GEM_BUNDLES.map((b) => b.id), expectedIds);
    for (const b of WildkinData.GEM_BUNDLES) {
      assert.ok(b.priceUsd > 0 && b.priceDisplay && b.gems >= 250 && b.items);
    }
  });

  it('calculates stats and creates Kin instances properly', () => {
    const statsNormal = WildkinData.calculateStatsForLevel({ hp: 50, atk: 55, def: 45, spd: 60 }, 10, false);
    const statsRadiant = WildkinData.calculateStatsForLevel({ hp: 50, atk: 55, def: 45, spd: 60 }, 10, true);
    assert.ok(statsRadiant.maxHp > statsNormal.maxHp);
    assert.ok(statsRadiant.atk > statsNormal.atk);

    const instance = WildkinData.createKinInstance(1, 5, { isRadiant: false });
    assert.equal(instance.speciesId, 1);
    assert.equal(instance.nickname, 'Cinderkit');
    assert.equal(instance.level, 5);
    assert.equal(instance.currentHp, instance.maxHp);
  });
});

describe('2. public/js/maps.js — 6 Expansive 28x22 World Grids, 3D Elevation, Portals, Wardens & Grandpa Rowan Homestead', () => {
  it('verifies all 6 world maps are strictly 28x22 grids with 3D elevation, Hospitals, Shopping Centers, Wardens, and connected portals', () => {
    assert.equal(WildkinMaps.MAP_WIDTH, 28);
    assert.equal(WildkinMaps.MAP_HEIGHT, 22);
    assert.equal(typeof WildkinMaps.getElevationAt, 'function');
    const expectedWorlds = [
      { zoneId: 'meadow',     wardenId: 'kael',    wx: 17, wy: 0,  tile: 'W' },
      { zoneId: 'tidecove',   wardenId: 'nerissa', wx: 17, wy: 0,  tile: 'W' },
      { zoneId: 'stormspire', wardenId: 'orin',    wx: 17, wy: 0,  tile: 'W' },
      { zoneId: 'cinderpeak', wardenId: 'ignis',   wx: 17, wy: 0,  tile: 'W' },
      { zoneId: 'frostveil',  wardenId: 'freya',   wx: 17, wy: 0,  tile: 'W' },
      { zoneId: 'sanctum',    wardenId: 'vesper',  wx: 17, wy: 0,  tile: 'W' }
    ];

    for (const w of expectedWorlds) {
      const map = WildkinMaps.ZONE_MAPS[w.zoneId];
      assert.ok(map, `Missing map for ${w.zoneId}`);
      assert.equal(map.grid.length, 22, `Map ${w.zoneId} must have 22 rows`);
      for (const row of map.grid) {
        assert.equal(row.length, 28, `Map ${w.zoneId} row "${row}" must be 28 chars`);
      }

      // Every world has a Kin Care Hospital at 21,3 ('H') and Aether Shopping Center at 6,3 ('C')
      assert.equal(WildkinMaps.getTileAt(w.zoneId, 21, 3), 'H', `Expected Hospital at 21,3 in ${w.zoneId}`);
      const hospNpc = WildkinMaps.getNpcAt(w.zoneId, 21, 3);
      assert.ok(hospNpc && hospNpc.type === 'hospital', `Expected hospital NPC at 21,3 in ${w.zoneId}`);

      assert.equal(WildkinMaps.getTileAt(w.zoneId, 6, 3), 'C', `Expected Shopping Center at 6,3 in ${w.zoneId}`);
      const shopNpc = WildkinMaps.getNpcAt(w.zoneId, 6, 3);
      assert.ok(shopNpc && shopNpc.type === 'shopping_center', `Expected shopping_center NPC at 6,3 in ${w.zoneId}`);

      // Every world has its Warden NPC and tile at expected coordinates (17,0)
      assert.equal(WildkinMaps.getTileAt(w.zoneId, w.wx, w.wy), w.tile, `Expected Warden tile ${w.tile} in ${w.zoneId}`);
      const wardenNpc = WildkinMaps.getNpcAt(w.zoneId, w.wx, w.wy);
      assert.ok(wardenNpc && wardenNpc.wardenId === w.wardenId, `Expected Warden ${w.wardenId} in ${w.zoneId}`);

      // Verify 3D terrain elevation varies across the map (Northern Sanctum plateau is elevated)
      const sanctumElev = WildkinMaps.getElevationAt(w.zoneId, 13, 1);
      assert.ok(sanctumElev >= 0.4, `Expected elevated Northern Sanctum height in ${w.zoneId}, got ${sanctumElev}`);
    }
  });

  it('verifies Grandpa Rowan Homestead NPC at meadow (13,10 & compatibility 6,5), portals, bridges, and walkable tiles', () => {
    const grandpaRowan = WildkinMaps.getNpcAt('meadow', 13, 10);
    assert.ok(grandpaRowan, 'Expected Grandpa Rowan NPC at meadow 13,10');
    assert.equal(grandpaRowan.id, 'rowan');
    assert.equal(grandpaRowan.isGrandpa, true);

    const grandpaAlias = WildkinMaps.getNpcAt('meadow', 6, 5);
    assert.ok(grandpaAlias && grandpaAlias.id === 'rowan', 'Expected Grandpa Rowan compatibility lookup at meadow 6,5');

    assert.equal(WildkinMaps.getTileAt('meadow', 13, 0), 'P');
    assert.equal(WildkinMaps.getTileAt('meadow', 14, 0), 'P');

    // Check portal chain from meadow -> tidecove -> stormspire -> cinderpeak -> frostveil -> sanctum
    assert.equal(WildkinMaps.getTileInfo('meadow', 13, 0).portal.targetZone, 'tidecove');
    assert.equal(WildkinMaps.getTileInfo('tidecove', 13, 0).portal.targetZone, 'stormspire');
    assert.equal(WildkinMaps.getTileInfo('stormspire', 13, 0).portal.targetZone, 'cinderpeak');
    assert.equal(WildkinMaps.getTileInfo('cinderpeak', 13, 0).portal.targetZone, 'frostveil');
    assert.equal(WildkinMaps.getTileInfo('frostveil', 13, 0).portal.targetZone, 'sanctum');
    assert.equal(WildkinMaps.getTileInfo('sanctum', 13, 21).portal.targetZone, 'frostveil');

    if (typeof WildkinMaps.isWalkableTile === 'function') {
      assert.equal(WildkinMaps.isWalkableTile('.'), true);
      assert.equal(WildkinMaps.isWalkableTile('B'), true);
      assert.equal(WildkinMaps.isWalkableTile('F'), true);
      assert.equal(WildkinMaps.isWalkableTile('#'), false);
      assert.equal(WildkinMaps.isWalkableTile('R'), false);
    }
  });
});

describe('3. public/js/sprites.js — 16x16 Pixel Art Grids & SVG Renderer', () => {
  it('verifies all 27 PIXEL_GRIDS exist with 16 rows of strictly 16 characters each', () => {
    for (let id = 1; id <= 27; id++) {
      const grid = WildkinSprites.PIXEL_GRIDS[id];
      assert.ok(Array.isArray(grid), `Missing pixel grid for Kin #${id}`);
      assert.equal(grid.length, 16, `Kin #${id} grid must have 16 rows`);
      for (let r = 0; r < 16; r++) {
        assert.equal(grid[r].length, 16, `Kin #${id} row ${r} must be 16 chars, got ${grid[r].length}`);
      }
    }
  });

  it('verifies renderKinSvg produces valid <svg> markup', () => {
    const cinderkit = WildkinData.getSpeciesById(1);
    const svgNormal = WildkinSprites.renderKinSvg(cinderkit, 64, false);
    assert.ok(svgNormal.startsWith('<svg') && svgNormal.endsWith('</svg>'));
    assert.ok(svgNormal.includes('<rect'));

    const aetherion = WildkinData.getSpeciesById(27);
    const svgRadiant = WildkinSprites.renderKinSvg(aetherion, 64, true);
    assert.ok(svgRadiant.startsWith('<svg') && svgRadiant.endsWith('</svg>'));
  });
});

describe('4. public/js/renderer3d.js & Turn-by-Turn 3D Combat / Procedural Surface Textures / Ranch & Story Hooks', () => {
  it('exports all 16 3D overworld, raycast, and turn-by-turn combat arena APIs on WILDKIN_3D (including setBattleTurnPhase)', () => {
    const expectedFns = [
      'initOverworld',
      'resizeOverworld',
      'cycleCameraMode',
      'syncZone',
      'syncCompanionKin',
      'screenToWorldTile',
      'setTargetBeacon',
      'renderOverworldFrame',
      'initBattleArena',
      'resizeBattleArena',
      'syncBattleCombatants',
      'setBattleTurnPhase',
      'playAttack3D',
      'playPrismCapture3D',
      'renderBattleFrame',
      'buildKin3DMesh'
    ];
    for (const fn of expectedFns) {
      assert.equal(typeof Wildkin3D[fn], 'function', `Expected WILDKIN_3D.${fn} to be a function`);
    }

    // Verify setBattleTurnPhase transitions cleanly across phases without error
    assert.doesNotThrow(() => {
      Wildkin3D.setBattleTurnPhase('player_ready');
      Wildkin3D.setBattleTurnPhase('player_turn');
      Wildkin3D.setBattleTurnPhase('enemy_turn');
    });
  });

  it('builds 3D articulated Three.js meshes for all 27 Kin species (including Radiant aura) and defines procedural textures & 6-biome palettes', () => {
    for (const species of WildkinData.KIN_SPECIES) {
      const meshGroup = Wildkin3D.buildKin3DMesh(species, false);
      assert.ok(meshGroup, `Failed to build 3D mesh for ${species.name}`);
      assert.ok(meshGroup.children.length >= 2, `Expected 3D mesh children for ${species.name}`);
      assert.equal(meshGroup.userData.speciesId, species.id);
      assert.ok(meshGroup.userData.rig && meshGroup.userData.rig.body);
    }

    const radiantAetherion = Wildkin3D.buildKin3DMesh(WildkinData.getSpeciesById(27), true);
    assert.equal(radiantAetherion.userData.isRadiant, true);
    assert.ok(radiantAetherion.userData.rig.auraRings.length >= 2, 'Radiant Kin should include 3D radiant aura torus rings');

    // Verify renderer3d.js source contains procedural CanvasTexture generator and all 6 biome palettes
    const r3dSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'renderer3d.js'), 'utf8');
    assert.ok(r3dSrc.includes('THREE.CanvasTexture'), 'renderer3d.js should generate organic procedural THREE.CanvasTexture surfaces');
    assert.ok(r3dSrc.includes('getProceduralTexture'), 'renderer3d.js should implement getProceduralTexture');
    for (const zoneId of ['meadow', 'tidecove', 'stormspire', 'cinderpeak', 'frostveil', 'sanctum']) {
      assert.ok(r3dSrc.includes(`${zoneId}:`), `renderer3d.js BIOME_PALETTES should define ${zoneId}`);
    }
  });

  it('cycles 3D camera modes cleanly (Chase -> Action Low -> Tactical)', () => {
    const m1 = Wildkin3D.cycleCameraMode();
    const m2 = Wildkin3D.cycleCameraMode();
    const m3 = Wildkin3D.cycleCameraMode();
    assert.deepEqual([m1, m2, m3], ['ACTION CLOSE', 'TACTICAL 3D', 'DYNAMIC 3D']);
  });

  it('verifies index.html & game.js wire turn-by-turn battle banner, Grandpa Rowan Ranch, 8-Chapter Story HUD, and 100-Floor Spire', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    const gameSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'game.js'), 'utf8');

    // Full-screen 3D viewport & scripts
    assert.ok(html.includes('/vendor/three.min.js'), 'index.html should load /vendor/three.min.js');
    assert.ok(html.includes('/js/renderer3d.js'), 'index.html should load /js/renderer3d.js');
    assert.ok(html.includes('id="screenViewport"'), 'index.html should have #screenViewport');
    assert.ok(html.includes('id="touchVectorHud"'), 'index.html should have #touchVectorHud for analog drag steering');
    assert.ok(html.includes('id="btnCameraMode"'), 'index.html should have #btnCameraMode');
    assert.ok(html.includes('id="btnQuickWild"'), 'index.html should have #btnQuickWild');
    assert.ok(html.includes('id="battleImpactFlash"'), 'index.html should have #battleImpactFlash');
    assert.ok(html.includes('id="battleDamageLayer"'), 'index.html should have #battleDamageLayer');
    assert.equal(html.includes('id="controlsDeck"'), false, 'Legacy #controlsDeck should be removed from index.html');

    // Turn-by-turn battle choreography UI & hooks
    assert.ok(html.includes('id="battleTurnBanner"'), 'index.html should have #battleTurnBanner');
    assert.ok(gameSrc.includes('setBattleTurnBanner'), 'game.js should implement setBattleTurnBanner');
    assert.ok(gameSrc.includes('setBattleTurnPhase'), 'game.js should synchronize 3D camera with setBattleTurnPhase');

    // Grandpa Rowan Ranch, Story Quest Tracker HUD & 100-Floor Aether Spire hooks
    assert.ok(html.includes('id="questTrackerHud"'), 'index.html should have #questTrackerHud');
    assert.ok(html.includes('id="btnDockRanch"'), 'index.html should have #btnDockRanch');
    assert.ok(html.includes('id="btnDockStory"'), 'index.html should have #btnDockStory');
    assert.ok(html.includes('id="btnQuickRanch"'), 'index.html should have #btnQuickRanch');
    assert.ok(gameSrc.includes('breedKinOffspring'), 'game.js should call DATA.breedKinOffspring in Grandpa Rowan Ranch');
    assert.ok(gameSrc.includes('startSpireBattle'), 'game.js should implement 100-Floor Endless Aether Spire via startSpireBattle');

    // Continuous 60fps movement & 3D combat hooks in game.js
    assert.ok(gameSrc.includes('updateContinuous3DMovement'), 'game.js should implement updateContinuous3DMovement');
    assert.ok(gameSrc.includes('screenToWorldTile'), 'game.js should raycast taps via screenToWorldTile');
    assert.ok(gameSrc.includes('setTargetBeacon'), 'game.js should show 3D target beacon on tap-to-move');
    assert.ok(gameSrc.includes('playAttack3D'), 'game.js should trigger 3D dash/lunge/beam attacks via playAttack3D');
    assert.ok(gameSrc.includes('spawnBattleDamagePopup'), 'game.js should spawn floating 3D battle damage popups');
    // Vitality Recovery & 3-Tab Aether Marketplace UI hooks
    assert.ok(html.includes('id="recoveryAlertBanner"'), 'index.html should have #recoveryAlertBanner');
    assert.ok(html.includes('id="btnQuickFeedNow"'), 'index.html should have #btnQuickFeedNow');
    assert.ok(html.includes('id="btnQuickOpenMarket"'), 'index.html should have #btnQuickOpenMarket');
    assert.ok(html.includes('id="btnTopMarket"'), 'index.html should have #btnTopMarket');
    assert.ok(html.includes('id="btnDockShop"'), 'index.html should have #btnDockShop');
    assert.ok(html.includes('id="btnDockMarket"'), 'index.html should have #btnDockMarket');
    assert.ok(gameSrc.includes('tickPassiveRecovery'), 'game.js should implement tickPassiveRecovery');
    assert.ok(gameSrc.includes('data-mtab="recovery"'), 'game.js should render recovery marketplace tab');
    assert.ok(gameSrc.includes('data-mtab="boosters"'), 'game.js should render boosters marketplace tab');
    assert.ok(gameSrc.includes('data-mtab="gems"'), 'game.js should render gems marketplace tab');
    assert.ok(gameSrc.includes('purchaseUsdBundle'), 'game.js should implement purchaseUsdBundle checkout flow');
    assert.equal(typeof WildkinGame.selectStarter, 'function');
  });

  it('supports Passive Natural HP Regeneration (tickPassiveRecovery) and Food / Level-Up Booster items (sunberryRation, heartwoodStew, feastPlatter, phoenixDew, aetherCandy, apexTome, xpBooster2x)', () => {
    const st = WildkinGame.createInitialState(4); // Cinderkit starter
    const lead = st.squad[0];
    assert.ok(lead, 'Expected starter Kin in squad');
    const maxHp = lead.maxHp;

    // 1. Wounded Kin recovers HP via passive timed regeneration
    lead.currentHp = 5;
    st.zone = 'tidecove'; // standard wild zone (+1 HP / 8s)
    const tickRes = WildkinGame.tickPassiveRecovery(st, 16);
    assert.equal(tickRes.healedCount, 1);
    assert.ok(lead.currentHp >= 7, 'Expected passive recovery to restore at least +2 HP over 16s');

    // 2. Sunberry Ration restores 45 HP and activates 3x natural regen boost
    lead.currentHp = 2;
    st.inventory.sunberryRation = 2;
    const rationRes = WildkinGame.useRecoveryOrBoosterItem('sunberryRation', 0, st);
    assert.equal(rationRes.ok, true);
    assert.equal(lead.currentHp, maxHp);
    assert.ok(st.regenBoostUntil > Date.now(), 'Sunberry Ration should activate 3x natural regen timer');

    // 3. Phoenix Aether Dew revives a 0 HP fainted Kin to 100% HP
    lead.currentHp = 0;
    st.inventory.phoenixDew = 1;
    const dewRes = WildkinGame.useRecoveryOrBoosterItem('phoenixDew', 0, st);
    assert.equal(dewRes.ok, true);
    assert.equal(lead.currentHp, maxHp);

    // 4. Grandpa's Heartwood Stew restores 100% HP and raises Bond Level
    lead.currentHp = 1;
    const prevBond = lead.bondLevel || 1;
    st.inventory.heartwoodStew = 1;
    const stewRes = WildkinGame.useRecoveryOrBoosterItem('heartwoodStew', 0, st);
    assert.equal(stewRes.ok, true);
    assert.equal(lead.currentHp, maxHp);
    assert.ok(lead.bondLevel > prevBond, 'Heartwood Stew should increase Bond Level');

    // 5. Homestead Feast Platter heals the entire Squad to 100% HP
    const partner2 = WildkinData.createKinInstance(7, 6);
    partner2.currentHp = 0;
    lead.currentHp = 3;
    st.squad.push(partner2);
    st.inventory.feastPlatter = 1;
    const feastRes = WildkinGame.useRecoveryOrBoosterItem('feastPlatter', 0, st);
    assert.equal(feastRes.ok, true);
    assert.equal(lead.currentHp, lead.maxHp);
    assert.equal(partner2.currentHp, partner2.maxHp);

    // 6. Rare Aether Crystal (aetherCandy) grants +1 Full Level and Sovereign XP Tome (apexTome) grants +3 Full Levels
    const lvBefore = lead.level;
    st.inventory.aetherCandy = 1;
    const candyRes = WildkinGame.useRecoveryOrBoosterItem('aetherCandy', 0, st);
    assert.equal(candyRes.ok, true);
    assert.equal(lead.level, lvBefore + 1);

    st.inventory.apexTome = 1;
    const tomeRes = WildkinGame.useRecoveryOrBoosterItem('apexTome', 0, st);
    assert.equal(tomeRes.ok, true);
    assert.equal(lead.level, lvBefore + 4);

    // 7. 2x XP Surge Elixir activates 30-min XP multiplier
    st.inventory.xpBooster2x = 1;
    const xpRes = WildkinGame.useRecoveryOrBoosterItem('xpBooster2x', 0, st);
    assert.equal(xpRes.ok, true);
    assert.ok(st.xpBoostUntil > Date.now(), '2x XP Surge Elixir should set xpBoostUntil');

    // 8. Ranch Hatch Accelerator activates guaranteed S/SS free breeding hatch
    st.inventory.hatchAccelerator = 1;
    const hatchRes = WildkinGame.useRecoveryOrBoosterItem('hatchAccelerator', 0, st);
    assert.equal(hatchRes.ok, true);
    assert.equal(st.hatchBoostReady, true);

    // 9. Faster passive HP recovery at Grandpa's Homestead Sanctuary (meadow)
    lead.currentHp = 5;
    st.zone = 'meadow';
    const meadowTick = WildkinGame.tickPassiveRecovery(st, 5);
    assert.ok(meadowTick.totalHpRestored >= 3, 'Homestead Sanctuary should restore at least +3 HP over 5s');
  });

  it('starts with 1 Kin, enforces 4-Kin Active Squad limit, and expands Squad & Reserve capacity via Kin Carrier Bag upgrades (bagUpgrade1/2/3)', () => {
    const st = WildkinGame.createInitialState(1);
    assert.equal(st.squad.length, 1, 'New player must start with exactly 1 Starter Kin');
    assert.equal(WildkinGame.getMaxSquadSize(st), 4, 'Default Active Squad limit must be 4 Kin');
    assert.equal(WildkinGame.getMaxVaultSize(st), 8, 'Default Reserve Carrier Bag limit must be 8 Kin');

    // Upgrade Bag Tier 1 -> 5 Active / 16 Reserve
    const up1 = WildkinGame.upgradeKinBag('bagUpgrade1', st);
    assert.equal(up1.ok, true);
    assert.equal(st.bagTier, 1);
    assert.equal(WildkinGame.getMaxSquadSize(st), 5);
    assert.equal(WildkinGame.getMaxVaultSize(st), 16);

    // Upgrade Bag Tier 2 -> 6 Active / 28 Reserve
    const up2 = WildkinGame.upgradeKinBag('bagUpgrade2', st);
    assert.equal(up2.ok, true);
    assert.equal(st.bagTier, 2);
    assert.equal(WildkinGame.getMaxSquadSize(st), 6);
    assert.equal(WildkinGame.getMaxVaultSize(st), 28);

    // Upgrade Bag Tier 3 -> 8 Active / 52 Reserve
    const up3 = WildkinGame.upgradeKinBag('bagUpgrade3', st);
    assert.equal(up3.ok, true);
    assert.equal(st.bagTier, 3);
    assert.equal(WildkinGame.getMaxSquadSize(st), 8);
    assert.equal(WildkinGame.getMaxVaultSize(st), 52);
  });

  it('supports Season 1 Battle Pass (20 Tiers), 7-Day Daily/Weekly Login Prizes, 3D Tamer Outfits, Emotes, Cross-World Kin Trading, and 3D Wild Spawns', () => {
    assert.equal(WildkinData.BATTLE_PASS_TIERS.length, 20);
    assert.equal(WildkinData.DAILY_LOGIN_REWARDS.length, 7);
    assert.equal(WildkinData.TAMER_OUTFITS.length, 6);
    assert.equal(WildkinData.TAMER_EMOTES.length, 6);
    assert.equal(WildkinData.NPC_TRADES.length, 6);
    assert.equal(typeof Wildkin3D.syncWildSpawns, 'function');
    assert.equal(typeof Wildkin3D.syncPlayerOutfit, 'function');

    const st = WildkinGame.createInitialState(4);

    // 1. Claim Day 1 Login Reward & Day 7 Weekly Grand Prize
    const d1 = WildkinGame.claimDailyLoginReward(1, st);
    assert.equal(d1.ok, true);
    assert.equal(st.claimedLoginDays[1], true);

    const d7 = WildkinGame.claimDailyLoginReward(7, st);
    assert.equal(d7.ok, true);
    assert.equal(st.unlockedOutfits.sovereign_regalia, true, 'Day 7 Weekly Grand Prize should unlock Astral Sovereign Regalia outfit');
    assert.equal(st.unlockedEmotes.emote_crown, true, 'Day 7 Weekly Grand Prize should unlock Sovereign King emote');

    // 2. Equip 3D Outfit & Trigger Floating Emote
    const eqRes = WildkinGame.equipOutfit('sovereign_regalia', st);
    assert.equal(eqRes.ok, true);
    assert.equal(st.equippedOutfit, 'sovereign_regalia');
    const emRes = WildkinGame.triggerEmote('emote_crown', st);
    assert.equal(emRes.ok, true);

    // 3. Battle Pass XP, Free Track & Gold Track claims
    st.gems = 300;
    const goldUnlock = WildkinGame.unlockGoldBattlePass(st);
    assert.equal(goldUnlock.ok, true);
    assert.equal(st.battlePassGold, true);
    WildkinGame.addBattlePassXp(500, st);
    assert.ok(WildkinGame.getBattlePassLevel(st) >= 4);

    const bpFree = WildkinGame.claimBattlePassTier(1, 'free', st);
    assert.equal(bpFree.ok, true);
    const bpGold = WildkinGame.claimBattlePassTier(1, 'gold', st);
    assert.equal(bpGold.ok, true);

    // 4. Cross-World NPC Kin Trade (Trade Meadow #10Briarhorn for A-Rank #13 Sparkit)
    st.squad.push(WildkinData.createKinInstance(10, 6));
    const trRes = WildkinGame.executeNpcTrade('trade_meadow_volt', st);
    assert.equal(trRes.ok, true);
    assert.equal(trRes.receivedKin.speciesId, 10);
    assert.equal(trRes.receivedKin.geneticTier, 'A');
    assert.equal(st.stats.tradesDone, 1);

    // 5. Decluttered UI & Transparent 3D Battle Arena verification in index.html & styles.css
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
    assert.ok(html.includes('id="mainMenuOverlay"'), 'index.html must include separate Entry/Lobby menu #mainMenuOverlay');
    assert.ok(html.includes('id="tamerMenuDrawer"'), 'index.html must include slide-up In-Game Menu drawer #tamerMenuDrawer');
    assert.ok(html.includes('id="btnBattleTrap"'), 'index.html must include dedicated Snare Trap button #btnBattleTrap');
    assert.ok(css.includes('body.in-battle .hud-topbar'), 'styles.css must hide topbar during 3D battles');
  });

  it('verifies 18 World Side Quests (3 per world) and 12 Daily Tasks / Tamer Milestones (TAMER_TASKS) claim flows', () => {
    const worldCounts = {};
    for (const sq of WildkinData.SIDE_QUESTS) {
      const w = sq.zone || sq.worldId;
      worldCounts[w] = (worldCounts[w] || 0) + 1;
    }
    assert.deepEqual(worldCounts, {
      meadow: 3,
      tidecove: 3,
      stormspire: 3,
      frostveil: 3,
      embervault: 3,
      sanctum: 3
    }, 'Each of the 6 playable worlds must have exactly 3 Side Quests (18 total)');

    const st = WildkinGame.createInitialState(1);
    const shardsBefore = st.shards;
    const gemsBefore = st.gems;

    // Complete sq_meadow_pest_patrol (Catch 3 Wild Kin -> metric: wildCaught, target: 3)
    st.kindexBound[1] = true;
    st.kindexBound[4] = true;
    st.kindexBound[7] = true;
    const sqRes = WildkinGame.claimSideQuest('sq_meadow_pest_patrol', st);
    assert.equal(sqRes.ok, true, 'Should claim completed Side Quest sq_meadow_pest_patrol');
    assert.equal(st.claimedSideQuests.sq_meadow_pest_patrol, true);
    assert.ok(st.shards > shardsBefore, 'Side Quest should award Aether Shards');
    assert.ok(st.gems > gemsBefore, 'Side Quest should award Aether Gems');
    assert.ok(st.battlePassXp >= 75, 'Side Quest should award +75 Battle Pass XP');

    // Complete task_first_snare (Catch 2 Wild Kin -> metric: kinBound, target: 2)
    const taskRes = WildkinGame.claimTamerTask('task_first_snare', st);
    assert.equal(taskRes.ok, true, 'Should claim completed Tamer Task task_first_snare');
    assert.equal(st.claimedTasks.task_first_snare, true);
    assert.ok(st.battlePassXp >= 120, 'Tamer Task should award +45 Battle Pass XP');
  });

  it('verifies Visible Roaming 3D Wild Kin (ensureZoneWildSpawns / syncWildRoamers), 3D Mechanical Snare Trap (playSnareTrapCapture3D), and Lobby / Tamer Hub Drawer controls', () => {
    assert.equal(typeof Wildkin3D.syncWildSpawns, 'function');
    assert.equal(typeof Wildkin3D.syncWildRoamers, 'function');
    assert.equal(typeof Wildkin3D.syncPlayerOutfit, 'function');
    assert.equal(typeof Wildkin3D.syncTamerOutfit, 'function');
    assert.equal(typeof Wildkin3D.playPrismCapture3D, 'function');
    assert.equal(typeof Wildkin3D.playSnareTrapCapture3D, 'function');
    assert.equal(typeof WildkinGame.ensureZoneWildSpawns, 'function');
    assert.equal(typeof WildkinGame.syncWildRoamers, 'function');
    assert.equal(typeof WildkinGame.triggerOverworldEmote, 'function');
    assert.equal(typeof WildkinGame.openLobbyScreen, 'function');
    assert.equal(typeof WildkinGame.closeLobbyScreen, 'function');
    assert.equal(typeof WildkinGame.openHubMenuDrawer, 'function');
    assert.equal(typeof WildkinGame.closeHubMenuDrawer, 'function');
    assert.ok(Array.isArray(WildkinData.LOGIN_CALENDAR) && WildkinData.LOGIN_CALENDAR.length === 7);
    assert.ok(Array.isArray(WildkinData.NEPC_TRADES) && WildkinData.NEPC_TRADES.length === 6);

    // Spawn roaming 3D wild Kin across zones
    for (const zoneId of ['meadow', 'tidecove', 'stormspire', 'frostveil', 'embervault', 'sanctum']) {
      const spawns = WildkinGame.ensureZoneWildSpawns(zoneId);
      assert.equal(spawns.length, 8, `Zone ${zoneId} must spawn 8 visible roaming 3D wild Kin across the 28x22 map`);
      for (const ws of spawns) {
        assert.equal(ws.zone, zoneId);
        assert.ok(ws.speciesId >= 1 && ws.speciesId <= 27);
        assert.ok(ws.level >= 2);
        assert.equal(typeof ws.x, 'number');
        assert.equal(typeof ws.y, 'number');
      }
    }

    // Verify 3D Snare Trap callback execution in headless mode
    let trapDone = false;
    Wildkin3D.playSnareTrapCapture3D(0xf59e0b, 3, true, () => {
      trapDone = true;
    });
    assert.equal(trapDone, true, 'playSnareTrapCapture3D should invoke completion callback cleanly');

    // Verify World Level Locks (unlockLevel), canAccessZone, and Stronger Tiered Creature Scaling (statScale)
    const testSt = WildkinGame.createInitialState(1); // Starter Lv.5
    assert.equal(WildkinGame.getHighestKinLevel(testSt), 5);
    assert.equal(WildkinGame.canAccessZone('meadow', testSt).allowed, true);
    const tideAccess = WildkinGame.canAccessZone('tidecove', testSt);
    assert.equal(tideAccess.allowed, false, 'World 2 (tidecove, unlockLevel 6) should be locked for a Lv.5 starter with 0 crests');
    assert.equal(tideAccess.requiredLevel, 6);

    testSt.squad[0].level = 6;
    assert.equal(WildkinGame.canAccessZone('tidecove', testSt).allowed, true, 'World 2 unlocks once player has a Lv.6+ Kin');
    assert.equal(WildkinGame.canAccessZone('stormspire', testSt).allowed, false, 'World 3 (unlockLevel 14) remains locked at Lv.6');

    testSt.unlockedZones = { stormspire: true };
    assert.equal(WildkinGame.canAccessZone('stormspire', testSt).allowed, true, 'Daredevil override / unlockedZones unlocks target world');

    const worldStatScales = WildkinData.ZONES.map((z) => z.statScale);
    assert.deepEqual(worldStatScales, [1.0, 1.15, 1.32, 1.52, 1.75, 2.05]);

    const sanctumEnemy = WildkinData.createKinInstance(20, 50, { geneticTier: 'B', isRadiant: false });
    const baseHp = sanctumEnemy.maxHp;
    const baseAtk = sanctumEnemy.atk;
    WildkinGame.applyWorldStatScaling(sanctumEnemy, 'sanctum');
    assert.ok(sanctumEnemy.maxHp > Math.round(baseHp * 1.9), 'World 6 Sanctum enemy should have 2.05x scaled HP');
    assert.ok(sanctumEnemy.atk > Math.round(baseAtk * 1.9), 'World 6 Sanctum enemy should have 2.05x scaled ATK');

    // Verify transparent battle-stage / battle-arena-bg and hidden HUD rules in styles.css
    const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
    assert.ok(css.includes('body.in-battle .tamer-menu-backdrop'), 'styles.css must hide Tamer menu drawer during battle');
    assert.ok(css.includes('.battle-arena-bg') && css.includes('transparent'), 'styles.css must make .battle-arena-bg transparent so #battle3dCanvas shines through');
  });
});

describe('5. IP Hygiene Scan across all files in public/', () => {
  function listFilesRecursive(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...listFilesRecursive(full));
      } else {
        out.push(full);
      }
    }
    return out;
  }

  it('contains zero forbidden Pokémon/Nintendo trademark terms in public/', () => {
    const forbidden = [
      'pokemon',
      'pokeball',
      'pokedex',
      'pikachu',
      'pokecenter',
      'gym leader',
      'elite four',
      'nintendo',
      'game freak',
      'game boy',
      'aquajet',
      'frostfang'
    ];
    const publicDir = path.join(__dirname, '..', 'public');
    const files = listFilesRecursive(publicDir);
    assert.ok(files.length >= 6, 'Should scan all public files including renderer3d.js');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8').toLowerCase();
      for (const term of forbidden) {
        assert.equal(
          content.includes(term),
          false,
          `Forbidden trademark term "${term}" found in ${path.relative(publicDir, file)}`
        );
      }
    }
  });
});

describe('6. server.js — Express HTTP API & Three.js Vendor Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /vendor/three.min.js serves the Three.js WebGL build (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/vendor/three.min.js`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.length > 100000, 'Expected three.min.js bundle content');
  });

  it('GET /api/health returns ok: true, kinCount: 27, zones: 6', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.kinCount, 27);
    assert.equal(data.zones, 6);
  });

  it('GET /api/kindex returns complete KinDex payload with 6 zones and 6 wardens', async () => {
    const res = await fetch(`${baseUrl}/api/kindex`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.kin.length, 27);
    assert.equal(Object.keys(data.affinities).length, 6);
    assert.equal(data.zones.length, 6);
    assert.equal(data.wardens.length, 6);
  });

  it('POST & GET /api/cloud-save and /api/save alias persist and retrieve save states', async () => {
    const sampleState = {
      tamerName: 'Aria',
      aetherCoins: 750,
      crests: ['meadow'],
      party: [{ speciesId: 1, level: 8 }]
    };

    const postRes = await fetch(`${baseUrl}/api/cloud-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: sampleState })
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.ok, true);
    assert.equal(typeof postData.code, 'string');
    assert.equal(postData.code.length, 6);

    // Retrieve via case-insensitive code on /api/cloud-save/:code
    const getRes = await fetch(`${baseUrl}/api/cloud-save/${postData.code.toLowerCase()}`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.ok, true);
    assert.equal(getData.state.tamerName, 'Aria');
    assert.equal(getData.state.aetherCoins, 750);

    // Retrieve via /api/save/:code alias
    const aliasRes = await fetch(`${baseUrl}/api/save/${postData.code}`);
    assert.equal(aliasRes.status, 200);
    const aliasData = await aliasRes.json();
    assert.equal(aliasData.ok, true);
    assert.equal(aliasData.state.tamerName, 'Aria');

    // Unknown save code returns 404
    const missingRes = await fetch(`${baseUrl}/api/cloud-save/ZZZZ99`);
    assert.equal(missingRes.status, 404);
  });

  it('POST & GET /api/arena/room, /join, and /action manage PvP challenge rooms', async () => {
    const squad = [WildkinData.createKinInstance(4, 10)];
    const createRes = await fetch(`${baseUrl}/api/arena/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName: 'Tamer Sol', squad })
    });
    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.equal(createData.ok, true);
    assert.equal(typeof createData.code, 'string');
    assert.equal(createData.room.hostName, 'Tamer Sol');

    const code = createData.code;

    // GET room by code
    const getRes = await fetch(`${baseUrl}/api/arena/room/${code.toLowerCase()}`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.ok, true);
    assert.equal(getData.hostName, 'Tamer Sol');
    assert.equal(getData.squad.length, 1);

    // POST join room
    const joinRes = await fetch(`${baseUrl}/api/arena/room/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengerName: 'Tamer Nyx',
        squad: [WildkinData.createKinInstance(7, 10)]
      })
    });
    assert.equal(joinRes.status, 200);
    const joinData = await joinRes.json();
    assert.equal(joinData.ok, true);
    assert.equal(joinData.room.challengers.length, 1);
    assert.equal(joinData.room.challengers[0].challengerName, 'Tamer Nyx');

    // POST room action / battle result
    const actionRes = await fetch(`${baseUrl}/api/arena/room/${code}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'battle_complete',
        winner: 'Tamer Nyx',
        result: 'Victory in 4 turns'
      })
    });
    assert.equal(actionRes.status, 200);
    const actionData = await actionRes.json();
    assert.equal(actionData.ok, true);
    assert.equal(actionData.room.lastWinner, 'Tamer Nyx');
  });

  it('GET /api/marketplace/catalog and POST /api/marketplace/checkout return USD Gem Bundles and fulfill purchases', async () => {
    const catRes = await fetch(`${baseUrl}/api/marketplace/catalog`);
    assert.equal(catRes.status, 200);
    const catData = await catRes.json();
    assert.equal(catData.ok, true);
    assert.ok(Array.isArray(catData.bundles) && catData.bundles.length >= 4, 'Should return at least 4 USD Marketplace bundles');
    assert.ok(catData.items.sunberryRation && catData.items.heartwoodStew && catData.items.aetherCandy && catData.items.apexTome);

    const checkoutRes = await fetch(`${baseUrl}/api/marketplace/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundleId: 'starter_recovery',
        paymentMethod: 'apple_pay',
        trainerName: 'Tamer Aria'
      })
    });
    assert.equal(checkoutRes.status, 200);
    const checkoutData = await checkoutRes.json();
    assert.equal(checkoutData.ok, true);
    assert.ok(Array.isArray(catData.gemBundles) && catData.gemBundles.length === 4, 'Should also return gemBundles alias');
    assert.equal(checkoutData.order.bundleId, 'starter_recovery');
    assert.equal(checkoutData.order.granted.gems, 250);
    assert.ok(checkoutData.order.granted.items.heartwoodStew >= 5);

    // Verify sovereign_treasury VIP bundle & orders log
    const vipRes = await fetch(`${baseUrl}/api/marketplace/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundleId: 'sovereign_treasury',
        paymentMethod: 'card',
        trainerName: 'Tamer Aria'
      })
    });
    assert.equal(vipRes.status, 200);
    const vipData = await vipRes.json();
    assert.equal(vipData.ok, true);
    assert.equal(vipData.order.granted.gems, 3800);
    assert.equal(vipData.order.granted.vipShrinePass, true);

    const ordersRes = await fetch(`${baseUrl}/api/marketplace/orders`);
    assert.equal(ordersRes.status, 200);
    const ordersData = await ordersRes.json();
    assert.equal(ordersData.ok, true);
    assert.ok(ordersData.orders.length >= 2);
  });
});
