/**
 * WILDKIN: AETHER BOUND — 2D Tile Overworld Maps & Renderer
 * Tile Legend:
 *  'T' = Tree / Wall / Impassable Barrier
 *  '.' = Walkable Path / Ground
 *  'G' = Swaying Tall Grass / Wild Encounter Tile
 *  'W' = Shimmering Water / Lagoon Encounter Tile
 *  'F' = Wildflowers (Walkable)
 *  'S' = Wellspring Shrine (Interactive Healer)
 *  'M' = Prism & Tonic Merchant (Interactive Shop)
 *  'K' = Realm Warden Stand (Interactive Boss Challenge)
 *  'N' = Roaming / Stationary Tamer NPC
 *  'P' = Portal / Path to Next Zone
 *  'B' = Portal / Path to Previous Zone
 */
(function (root) {
  const MAP_WIDTH = 16;
  const MAP_HEIGHT = 12;

  const ZONE_MAPS = {
    meadow: {
      id: 'meadow',
      name: 'Sunleaf Meadow',
      palette: {
        ground: '#2d5a36',
        path: '#d4a359',
        grassBg: '#1e4626',
        grassBlade: '#4ade80',
        tree: '#14331b',
        treeTop: '#22c55e',
        water: '#0284c7'
      },
      spawn: { x: 7, y: 6 },
      grid: [
        "TTTTTTTPPTTTTTTT",
        "TGGGGGT..TFFSFFT",
        "TGGGGGT..TFF.FFT",
        "TGGGGGT..T..M..T",
        "TGG.GGT........T",
        "T......FFFFFFFFT",
        "T..N....F......P",
        "T......FFFFGGGWT",
        "TGGGGFF....GGGWT",
        "TGGGGFF..K.GGGWT",
        "TGGGGFF........T",
        "TTTTTTTTTTTTTTTT"
      ],
      npcs: {
        '12,1': { type: 'shrine', name: 'Wellspring Shrine', prompt: 'Restore full HP & Stamina' },
        '12,3': { type: 'merchant', name: 'Prism Merchant Orin', prompt: 'Buy Prisms & Tonics' },
        '3,6':  {
          type: 'tamer',
          id: 'tamer_pip',
          name: 'Scout Pip',
          quote: 'My Sparkcheep charged up in the tall grass! Let’s test our bond!',
          rewardShards: 85,
          squad: [{ speciesId: 10, level: 4 }, { speciesId: 13, level: 4 }]
        },
        '9,9':  { type: 'warden', wardenId: 'kael', name: 'Warden Kael' },
        '15,6': { type: 'portal', targetZone: 'tidecove', label: 'To Whispering Tidecove →' },
        '7,0':  { type: 'portal', targetZone: 'tidecove', label: 'To Whispering Tidecove ↑' },
        '8,0':  { type: 'portal', targetZone: 'tidecove', label: 'To Whispering Tidecove ↑' }
      }
    },

    tidecove: {
      id: 'tidecove',
      name: 'Whispering Tidecove',
      palette: {
        ground: '#1e3a5f',
        path: '#94a3b8',
        grassBg: '#0f2942',
        grassBlade: '#38bdf8',
        tree: '#0c192c',
        treeTop: '#0284c7',
        water: '#0369a1'
      },
      spawn: { x: 2, y: 6 },
      grid: [
        "TTTTTTTTTTTTTTTT",
        "TWWWWWT..TFFSFFT",
        "TWWWWWT..T..M..T",
        "TWW.WWT........T",
        "T......GGGGGGFFT",
        "B......GGGGGG..T",
        "B..N...........P",
        "T......WWWWWW..T",
        "TGGGG..WWWWWW..T",
        "TGGGG....K.....T",
        "TGGGG..........T",
        "TTTTTTTTTTTTTTTT"
      ],
      npcs: {
        '12,1': { type: 'shrine', name: 'Tidecove Wellspring', prompt: 'Restore full HP & Stamina' },
        '12,2': { type: 'merchant', name: 'Cove Trader Lyra', prompt: 'Buy Prisms & Tonics' },
        '3,6':  {
          type: 'tamer',
          id: 'tamer_marina',
          name: 'Diver Marina',
          quote: 'The lagoon’s Tide Kin are swift and slippery! Can you keep up?',
          rewardShards: 140,
          squad: [{ speciesId: 17, level: 9 }, { speciesId: 15, level: 10 }]
        },
        '9,9':  { type: 'warden', wardenId: 'nerissa', name: 'Warden Nerissa' },
        '0,5':  { type: 'portal', targetZone: 'meadow', label: '← Back to Sunleaf Meadow' },
        '0,6':  { type: 'portal', targetZone: 'meadow', label: '← Back to Sunleaf Meadow' },
        '15,6': { type: 'portal', targetZone: 'cinderpeak', label: 'To Cinderpeak Cavern →' }
      }
    },

    cinderpeak: {
      id: 'cinderpeak',
      name: 'Cinderpeak Cavern',
      palette: {
        ground: '#3b1d16',
        path: '#78716c',
        grassBg: '#28110c',
        grassBlade: '#fb923c',
        tree: '#1c0a06',
        treeTop: '#ea580c',
        water: '#dc2626'
      },
      spawn: { x: 2, y: 6 },
      grid: [
        "TTTTTTTTTTTTTTTT",
        "TGGGGGT..TFFSFFT",
        "TGGGGGT..T..M..T",
        "TGG.GGT........T",
        "T......WWWWWW..T",
        "B......WWWWWW..T",
        "B..N...........P",
        "T......GGGGGG..T",
        "TGGGG..GGGGGG..T",
        "TGGGG....K.....T",
        "TGGGG..........T",
        "TTTTTTTTTTTTTTTT"
      ],
      npcs: {
        '12,1': { type: 'shrine', name: 'Caldera Wellspring', prompt: 'Restore full HP & Stamina' },
        '12,2': { type: 'merchant', name: 'Forge Merchant Brann', prompt: 'Buy Prisms & Tonics' },
        '3,6':  {
          type: 'tamer',
          id: 'tamer_cole',
          name: 'Pyromancer Cole',
          quote: 'Down in Cinderpeak, only forged steel and blazing Kin endure!',
          rewardShards: 220,
          squad: [{ speciesId: 23, level: 15 }, { speciesId: 16, level: 16 }]
        },
        '9,9':  { type: 'warden', wardenId: 'ignis', name: 'Warden Ignis' },
        '0,5':  { type: 'portal', targetZone: 'tidecove', label: '← Back to Tidecove' },
        '0,6':  { type: 'portal', targetZone: 'tidecove', label: '← Back to Tidecove' },
        '15,6': { type: 'portal', targetZone: 'sanctum', label: 'To Astral Ruin Sanctum →' }
      }
    },

    sanctum: {
      id: 'sanctum',
      name: 'Astral Ruin Sanctum',
      palette: {
        ground: '#21153b',
        path: '#6366f1',
        grassBg: '#140b29',
        grassBlade: '#c084fc',
        tree: '#0d071c',
        treeTop: '#9333ea',
        water: '#4f46e5'
      },
      spawn: { x: 2, y: 6 },
      grid: [
        "TTTTTTTTTTTTTTTT",
        "TGGGGGT..TFFSFFT",
        "TGGGGGT..T..M..T",
        "TGG.GGT........T",
        "T......GGGGGG..T",
        "B......GGGGGG..T",
        "B..N...........T",
        "T......WWWWWW..T",
        "TGGGG..WWWWWW..T",
        "TGGGG....K.....T",
        "TGGGG..........T",
        "TTTTTTTTTTTTTTTT"
      ],
      npcs: {
        '12,1': { type: 'shrine', name: 'Astral Wellspring', prompt: 'Restore full HP & Stamina' },
        '12,2': { type: 'merchant', name: 'Starlight Peddler Nyx', prompt: 'Buy Prisms & Tonics' },
        '3,6':  {
          type: 'tamer',
          id: 'tamer_astrid',
          name: 'Oracle Astrid',
          quote: 'Have you seen the Mythic Kin drifting through these starlit ruins?',
          rewardShards: 340,
          squad: [{ speciesId: 20, level: 22 }, { speciesId: 22, level: 23 }]
        },
        '9,9':  { type: 'warden', wardenId: 'vesper', name: 'Grand Warden Vesper' },
        '0,5':  { type: 'portal', targetZone: 'cinderpeak', label: '← Back to Cinderpeak' },
        '0,6':  { type: 'portal', targetZone: 'cinderpeak', label: '← Back to Cinderpeak' }
      }
    }
  };

  function getTileAt(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) return 'T';
    return map.grid[y][x] || 'T';
  }

  function getNpcAt(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    if (!map.npcs) return null;
    const key = `${x},${y}`;
    if (map.npcs[key]) return map.npcs[key];
    // Also map tile codes directly if not explicitly keyed
    const tile = getTileAt(zoneId, x, y);
    if (tile === 'S') return { type: 'shrine', name: 'Wellspring Shrine', prompt: 'Restore full HP & Stamina' };
    if (tile === 'M') return { type: 'merchant', name: 'Prism Merchant', prompt: 'Buy Prisms & Tonics' };
    return null;
  }

  root.WILDKIN_MAPS = {
    MAP_WIDTH,
    MAP_HEIGHT,
    ZONE_MAPS,
    getTileAt,
    getNpcAt
  };
})(typeof self !== 'undefined' ? self : this);
