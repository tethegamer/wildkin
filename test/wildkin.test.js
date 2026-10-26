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

const WildkinData = require('../public/js/data.js');
require('../public/js/maps.js');
require('../public/js/sprites.js');

const WildkinMaps = global.WILDKIN_MAPS;
const WildkinSprites = global.WILDKIN_SPRITES;
const app = require('../server.js');

describe('1. public/js/data.js — Kin Roster, Elemental Affinities & Battle Math', () => {
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

  it('defines items, 4 zones with encounter weights summing to 100, and 4 wardens', () => {
    assert.ok(WildkinData.ITEMS.basicPrism);
    assert.ok(WildkinData.ITEMS.masteryPrism);
    assert.equal(WildkinData.ZONES.length, 4);
    for (const zone of WildkinData.ZONES) {
      const weightSum = zone.wildPool.reduce((acc, entry) => acc + entry.weight, 0);
      assert.equal(weightSum, 100, `Zone ${zone.id} wildPool weights should sum to 100`);
    }
    assert.equal(WildkinData.WARDENS.length, 4);
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

    if (typeof WildkinData.calculateDamage === 'function') {
      const dmg = WildkinData.calculateDamage(instance, instance, WildkinData.MOVES.emberDart);
      assert.ok(dmg && dmg.damage >= 1);
    }
    if (typeof WildkinData.calculateCatchChance === 'function') {
      const chance = WildkinData.calculateCatchChance(instance, WildkinData.ITEMS.basicPrism);
      assert.ok(chance > 0 && chance <= 1);
    }
  });
});

describe('2. public/js/maps.js — Zone Grids, Portals & NPC Coordinates', () => {
  it('verifies all 4 zone maps are strictly 16x12 grids', () => {
    assert.equal(WildkinMaps.MAP_WIDTH, 16);
    assert.equal(WildkinMaps.MAP_HEIGHT, 12);
    const zoneIds = ['meadow', 'tidecove', 'cinderpeak', 'sanctum'];
    for (const id of zoneIds) {
      const map = WildkinMaps.ZONE_MAPS[id];
      assert.ok(map, `Missing map for ${id}`);
      assert.equal(map.grid.length, 12, `Map ${id} must have 12 rows`);
      for (const row of map.grid) {
        assert.equal(row.length, 16, `Map ${id} row "${row}" must be 16 chars`);
      }
    }
  });

  it('verifies meadow Shrine is at 12,1 (tile === "S") and north portals at 7,0 & 8,0 are "P"', () => {
    assert.equal(WildkinMaps.getTileAt('meadow', 12, 1), 'S');
    const shrineNpc = WildkinMaps.getNpcAt('meadow', 12, 1);
    assert.ok(shrineNpc, 'Expected Shrine NPC entry at meadow 12,1');
    assert.equal(shrineNpc.type, 'shrine');

    assert.equal(WildkinMaps.getTileAt('meadow', 7, 0), 'P');
    assert.equal(WildkinMaps.getTileAt('meadow', 8, 0), 'P');

    const wardenKael = WildkinMaps.getNpcAt('meadow', 9, 9);
    assert.ok(wardenKael && wardenKael.wardenId === 'kael');

    if (typeof WildkinMaps.isWalkableTile === 'function') {
      assert.equal(WildkinMaps.isWalkableTile('.'), true);
      assert.equal(WildkinMaps.isWalkableTile('T'), false);
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

describe('4. IP Hygiene Scan across all files in public/', () => {
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
    assert.ok(files.length >= 5, 'Should scan public files');

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

describe('5. server.js — Express HTTP API Integration Tests', () => {
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

  it('GET /api/health returns ok: true, kinCount: 27, zones: 4', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.kinCount, 27);
    assert.equal(data.zones, 4);
  });

  it('GET /api/kindex returns complete KinDex payload', async () => {
    const res = await fetch(`${baseUrl}/api/kindex`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.kin.length, 27);
    assert.equal(Object.keys(data.affinities).length, 6);
    assert.equal(data.zones.length, 4);
    assert.equal(data.wardens.length, 4);
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
});
