/**
 * WILDKIN: AETHER BOUND — 6-World Overworld Tile Maps, Portals & NPCs
 * Each zone map is a 16x12 grid (columns 0..15, rows 0..11).
 *
 * Tile Legend:
 *  '#' : Impassable Tree / Cliff / Basalt / Glacier / Astral Wall
 *  '~' : Deep Water / Magma / Frozen Lake / Void Rift (Impassable)
 *  '.' : Walkable Ground / Grass / Stone
 *  'G' : Tall Wild Grass / Crystal Brush (Walkable — triggers Wild Kin encounters)
 *  'P' : Cobblestone Path / Portal Gate (Row 0 or Row 11 = Zone Portal)
 *  'S' : Wellspring Healing Shrine (Walkable — heals all Squad Kin & Stamina)
 *  'M' : Sage Mira's Sanctuary / Homestead Cabin
 *  'K' : Warden Kael (Sunleaf Meadow Boss)
 *  'N' : Warden Nerissa (Whispering Tidecove Boss)
 *  'O' : Warden Orin (Stormspire Canopy Boss)
 *  'I' : Warden Ignis (Cinderpeak Cavern Boss)
 *  'F' : Warden Freya (Frostveil Glacier Boss)
 *  'V' : Grand Warden Vesper (Astral Ruin Sanctum Boss)
 */
(function (root, factory) {
  const api = factory();
  root.WILDKIN_MAPS = api;
  root.WildkinMaps = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TILE_TYPES = {
    '#': { walkable: false, encounterRate: 0, label: 'Barrier' },
    '~': { walkable: false, encounterRate: 0, label: 'Deep Hazard' },
    '.': { walkable: true,  encounterRate: 0, label: 'Clear Ground' },
    'P': { walkable: true,  encounterRate: 0, label: 'Stone Path / Gate' },
    'G': { walkable: true,  encounterRate: 0.20, label: 'Wild Kin Habitat' },
    'S': { walkable: true,  encounterRate: 0, isShrine: true, label: 'Wellspring Shrine' },
    'M': { walkable: true,  encounterRate: 0, npc: 'mira', label: 'Sage Mira' },
    'K': { walkable: true,  encounterRate: 0, wardenId: 'kael', label: 'Warden Kael' },
    'N': { walkable: true,  encounterRate: 0, wardenId: 'nerissa', label: 'Warden Nerissa' },
    'O': { walkable: true,  encounterRate: 0, wardenId: 'orin', label: 'Warden Orin' },
    'I': { walkable: true,  encounterRate: 0, wardenId: 'ignis', label: 'Warden Ignis' },
    'F': { walkable: true,  encounterRate: 0, wardenId: 'freya', label: 'Warden Freya' },
    'V': { walkable: true,  encounterRate: 0, wardenId: 'vesper', label: 'Grand Warden Vesper' }
  };

  const ZONE_MAPS = {
    meadow: {
      id: 'meadow',
      name: 'Sunleaf Meadow',
      width: 16,
      height: 12,
      spawn: { x: 7, y: 6 },
      grid: [
        '#######PP#######',
        '#GGG..P..P..S..#',
        '#GGG..P..P.....#',
        '#..M..PPPP..GGG#',
        '#....P....P.GGG#',
        '#G...P....P..GG#',
        '#....PPPPPP....#',
        '#GGG...PP...~~~#',
        '#GGGG..PP...~~~#',
        '#GGG...PPK.....#',
        '#......PP..GGGG#',
        '################'
      ],
      portals: {
        '7,0': { targetZone: 'tidecove', targetX: 7, targetY: 10, label: 'North Gate → World 2: Whispering Tidecove' },
        '8,0': { targetZone: 'tidecove', targetX: 8, targetY: 10, label: 'North Gate → World 2: Whispering Tidecove' }
      },
      npcs: [
        {
          id: 'rowan',
          name: 'Grandpa Rowan',
          role: 'Elder Tamer & Ranch Master',
          isGrandpa: true,
          x: 6,
          y: 5,
          dialog: 'Welcome home to Heartwood Homestead, kiddo! I spent fifty years taming and breeding Wildkin across all six Worlds. Open our 🧬 Ranch to raise Bond Levels or breed high-genetics Offspring, and check your 📜 Story Journal for your next chapter!'
        },
        {
          id: 'mira',
          name: 'Sage Mira',
          role: 'Aether Scholar',
          x: 3,
          y: 3,
          dialog: 'Walk into the dark emerald tall grass to encounter wild Kin! Lower their HP in turn-based combat and throw an Aether Prism to bind them to your squad.'
        },
        {
          id: 'kael',
          name: 'Warden Kael',
          role: 'Verdant Crest Warden',
          wardenId: 'kael',
          x: 9,
          y: 9,
          dialog: 'Grandpa Rowan told me about your arrival! Challenge me when your squad is ready for the Verdant Crest!'
        }
      ]
    },

    tidecove: {
      id: 'tidecove',
      name: 'Whispering Tidecove',
      width: 16,
      height: 12,
      spawn: { x: 7, y: 10 },
      grid: [
        '#######PP#######',
        '#~~~..P..P..S..#',
        '#~~~..P..P..GGG#',
        '#GGG..PPPP..GGG#',
        '#GGG.P~~~~P....#',
        '#....P~~~~P.GGG#',
        '#....PPPPPP.GGG#',
        '#~~~...PP...N..#',
        '#~~~...PP......#',
        '#GGG...PP..GGGG#',
        '#GGG..PPPP.GGGG#',
        '#######PP#######'
      ],
      portals: {
        '7,0':  { targetZone: 'stormspire', targetX: 7, targetY: 10, label: 'Sky-Lift Gate → World 3: Stormspire Canopy' },
        '8,0':  { targetZone: 'stormspire', targetX: 8, targetY: 10, label: 'Sky-Lift Gate → World 3: Stormspire Canopy' },
        '7,11': { targetZone: 'meadow',     targetX: 7, targetY: 1,  label: 'South Trail → World 1: Sunleaf Meadow' },
        '8,11': { targetZone: 'meadow',     targetX: 8, targetY: 1,  label: 'South Trail → World 1: Sunleaf Meadow' }
      },
      npcs: [
        {
          id: 'nerissa',
          name: 'Warden Nerissa',
          role: 'Abyssal Crest Warden',
          wardenId: 'nerissa',
          x: 12,
          y: 7,
          dialog: 'The tide waits for no Tamer! Show me the bond Grandpa Rowan taught you!'
        },
        {
          id: 'mariner_sol',
          name: 'Mariner Sol',
          role: 'Cove Guide',
          x: 5,
          y: 3,
          dialog: 'Volt and Grove Kin hold a 2x Elemental Advantage over the Tide Kin of Whispering Tidecove!'
        }
      ]
    },

    stormspire: {
      id: 'stormspire',
      name: 'Stormspire Canopy',
      width: 16,
      height: 12,
      spawn: { x: 7, y: 10 },
      grid: [
        '#######PP#######',
        '#GGG..P..P..S..#',
        '#GGG..P..P..GGG#',
        '#.....PPPP..GGG#',
        '#..~~P....P~~..#',
        '#G.~~P....P~~.G#',
        '#GGG.PPPPPP.GGG#',
        '#GGG...PP...O..#',
        '#......PP......#',
        '#GGGG..PP..GGGG#',
        '#GGG..PPPP..GGG#',
        '#######PP#######'
      ],
      portals: {
        '7,0':  { targetZone: 'cinderpeak', targetX: 7, targetY: 10, label: 'Caldera Tunnel → World 4: Cinderpeak Cavern' },
        '8,0':  { targetZone: 'cinderpeak', targetX: 8, targetY: 10, label: 'Caldera Tunnel → World 4: Cinderpeak Cavern' },
        '7,11': { targetZone: 'tidecove',   targetX: 7, targetY: 1,  label: 'Descent → World 2: Whispering Tidecove' },
        '8,11': { targetZone: 'tidecove',   targetX: 8, targetY: 1,  label: 'Descent → World 2: Whispering Tidecove' }
      },
      npcs: [
        {
          id: 'orin',
          name: 'Warden Orin',
          role: 'Tempest Crest Warden',
          wardenId: 'orin',
          x: 12,
          y: 7,
          dialog: 'Your grandfather Rowan and I sparred on these lightning ridges forty years ago! Show me your squad!'
        },
        {
          id: 'ranger_lyra',
          name: 'Sky-Ranger Lyra',
          role: 'Canopy Scout',
          x: 4,
          y: 3,
          dialog: 'Thunderhawk and Arcfox prowl the upper canopy! Terra Kin resist Volt strikes and counter hard.'
        }
      ]
    },

    cinderpeak: {
      id: 'cinderpeak',
      name: 'Cinderpeak Cavern',
      width: 16,
      height: 12,
      spawn: { x: 7, y: 10 },
      grid: [
        '#######PP#######',
        '#GGG..P..P..S..#',
        '#GGG..P..P..~~~#',
        '#~~~..PPPP..~~~#',
        '#~~~.P....P.GGG#',
        '#GGG.P....P.GGG#',
        '#GGG.PPPPPP....#',
        '#......PP...I..#',
        '#~~~...PP...~~~#',
        '#GGG...PP..GGGG#',
        '#GGG..PPPP.GGGG#',
        '#######PP#######'
      ],
      portals: {
        '7,0':  { targetZone: 'frostveil',  targetX: 7, targetY: 10, label: 'Glacier Pass → World 5: Frostveil Glacier' },
        '8,0':  { targetZone: 'frostveil',  targetX: 8, targetY: 10, label: 'Glacier Pass → World 5: Frostveil Glacier' },
        '7,11': { targetZone: 'stormspire', targetX: 7, targetY: 1,  label: 'Ridge Path → World 3: Stormspire Canopy' },
        '8,11': { targetZone: 'stormspire', targetX: 8, targetY: 1,  label: 'Ridge Path → World 3: Stormspire Canopy' }
      },
      npcs: [
        {
          id: 'ignis',
          name: 'Warden Ignis',
          role: 'Solar Crest Warden',
          wardenId: 'ignis',
          x: 12,
          y: 7,
          dialog: 'Only diamond-hard resolve and well-bred Kin survive Cinderpeak’s volcanic forge!'
        }
      ]
    },

    frostveil: {
      id: 'frostveil',
      name: 'Frostveil Glacier',
      width: 16,
      height: 12,
      spawn: { x: 7, y: 10 },
      grid: [
        '#######PP#######',
        '#~~~..P..P..S..#',
        '#GGG..P..P..GGG#',
        '#GGG..PPPP..GGG#',
        '#....P~~~~P....#',
        '#GGG.P~~~~P.GGG#',
        '#GGG.PPPPPP.GGG#',
        '#~~~...PP...F..#',
        '#~~~...PP......#',
        '#GGG...PP..GGGG#',
        '#GGG..PPPP.GGGG#',
        '#######PP#######'
      ],
      portals: {
        '7,0':  { targetZone: 'sanctum',    targetX: 7, targetY: 10, label: 'Astral Rift → World 6: Astral Ruin Sanctum' },
        '8,0':  { targetZone: 'sanctum',    targetX: 8, targetY: 10, label: 'Astral Rift → World 6: Astral Ruin Sanctum' },
        '7,11': { targetZone: 'cinderpeak', targetX: 7, targetY: 1,  label: 'Thermal Descent → World 4: Cinderpeak Cavern' },
        '8,11': { targetZone: 'cinderpeak', targetX: 8, targetY: 1,  label: 'Thermal Descent → World 4: Cinderpeak Cavern' }
      },
      npcs: [
        {
          id: 'freya',
          name: 'Warden Freya',
          role: 'Frostveil Crest Warden',
          wardenId: 'freya',
          x: 12,
          y: 7,
          dialog: 'Beneath the northern aurora, only Tamers with unbreakable Bond Levels prevail!'
        },
        {
          id: 'elder_bjorn',
          name: 'Chronicler Bjorn',
          role: 'Old Friend of Rowan',
          x: 4,
          y: 4,
          dialog: 'Rowan’s grandchild! Your grandfather and I once discovered a Radiant Abyssalking in these very ice caves.'
        }
      ]
    },

    sanctum: {
      id: 'sanctum',
      name: 'Astral Ruin Sanctum',
      width: 16,
      height: 12,
      spawn: { x: 7, y: 10 },
      grid: [
        '################',
        '#GGG...V....S..#',
        '#GGG..PPPP.....#',
        '#~~~..P..P..GGG#',
        '#~~~.P....P.GGG#',
        '#GGG.P....P.~~~#',
        '#GGG.PPPPPP.~~~#',
        '#......PP...GGG#',
        '#GGGG..PP...GGG#',
        '#GGGG..PP..GGGG#',
        '#.....PPPP.....#',
        '#######PP#######'
      ],
      portals: {
        '7,11': { targetZone: 'frostveil', targetX: 7, targetY: 1, label: 'Starlight Descent → World 5: Frostveil Glacier' },
        '8,11': { targetZone: 'frostveil', targetX: 8, targetY: 1, label: 'Starlight Descent → World 5: Frostveil Glacier' }
      },
      npcs: [
        {
          id: 'vesper',
          name: 'Grand Warden Vesper',
          role: 'Sovereign of the Astral Crest',
          wardenId: 'vesper',
          x: 7,
          y: 1,
          dialog: 'You stand at the apex of the six Worlds. Defeat my Mythic squad to claim the Astral Crest and unlock the 100-Floor Aether Spire!'
        }
      ]
    }
  };

  function getZoneMap(zoneId) {
    return ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
  }

  function getTileChar(zoneId, x, y) {
    const map = getZoneMap(zoneId);
    if (y < 0 || y >= map.height || x < 0 || x >= map.width) return '#';
    const row = map.grid[y] || '';
    return row[x] || '#';
  }

  function getTileInfo(zoneId, x, y) {
    const ch = getTileChar(zoneId, x, y);
    const base = TILE_TYPES[ch] || TILE_TYPES['.'];
    const map = getZoneMap(zoneId);
    const key = `${x},${y}`;
    const portal = map.portals && map.portals[key] ? map.portals[key] : null;
    const npc = (map.npcs || []).find((n) => n.x === x && n.y === y) || null;
    return {
      char: ch,
      ...base,
      portal,
      npc
    };
  }

  const MAP_WIDTH = 16;
  const MAP_HEIGHT = 12;

  function getTileAt(zoneId, x, y) {
    return getTileChar(zoneId, x, y);
  }

  function getNpcAt(zoneId, x, y) {
    const map = getZoneMap(zoneId);
    const found = (map.npcs || []).find((n) => n.x === x && n.y === y);
    if (found) return found;
    const ch = getTileChar(zoneId, x, y);
    if (ch === 'S') {
      return { id: 'shrine', name: 'Wellspring Shrine', type: 'shrine', x, y };
    }
    return null;
  }

  function isWalkableTile(ch) {
    const t = TILE_TYPES[ch];
    return Boolean(t && t.walkable);
  }

  return {
    MAP_WIDTH,
    MAP_HEIGHT,
    TILE_TYPES,
    ZONE_MAPS,
    getZoneMap,
    getTileChar,
    getTileAt,
    getNpcAt,
    isWalkableTile,
    getTileInfo
  };
});
