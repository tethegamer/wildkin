/**
 * WILDKIN: AETHER BOUND — Overworld Maps, Portals, Hospitals, Shopping Centers & Character Quests
 * 16x12 tile maps per Sanctuary Zone with:
 * - North/South World Portals (`P`) connecting all 6 realms (`meadow` ↔ `tidecove` ↔ `stormspire` ↔ `cinderpeak` ↔ `frostveil` ↔ `sanctum`)
 * - 🏥 Kin Care Hospital (`H` / `S`) on EVERY world map (`12,2`) for emergency heals & medical health tonics/revives
 * - 🏬 Aether Shopping Center (`C` / `M`) on EVERY world map (`3,2`) for fruits, berries, cooked meals, snare traps & bag upgrades
 * - Interactive Character NPCs on every map with walk-up RPG dialogue & personal missions/quests!
 */
(function (root) {
  'use strict';

  const MAP_WIDTH = 16;
  const MAP_HEIGHT = 12;

  // Tile legend:
  // '.' = Open Path / Ground
  // 'G' = Tall Wild Grass (Wild Kin encounters)
  // 'T' = Barrier (Trees / Rocks / Walls — impassable)
  // '~' = Water / Lava / Deep Chasm (impassable)
  // 'S' = Healing Shrine / Kin Care Hospital
  // 'H' = Kin Care Hospital (Medical Health Supplies & Squad Checkup)
  // 'C' = Aether Shopping Center (Fruits, Berries, Cooked Meals, Snare Traps & Bags)
  // 'M' = Merchant Plaza
  // 'W' = Warden Altar
  // 'P' = Zone Portal Gate
  // 'F' = Decorative Flowers / Crystal Cluster
  // 'B' = Wooden Bridge

  const TILE_TYPES = {
    '.': { name: 'path', passable: true, encounter: false },
    'G': { name: 'grass', passable: true, encounter: true },
    'T': { name: 'tree', passable: false, encounter: false },
    '~': { name: 'liquid', passable: false, encounter: false },
    'S': { name: 'shrine', passable: true, encounter: false, interact: 'hospital' },
    'H': { name: 'hospital', passable: true, encounter: false, interact: 'hospital' },
    'C': { name: 'shopping_center', passable: true, encounter: false, interact: 'shopping_center' },
    'M': { name: 'merchant', passable: true, encounter: false, interact: 'shopping_center' },
    'W': { name: 'warden', passable: true, encounter: false, interact: 'warden' },
    'P': { name: 'portal', passable: true, encounter: false, interact: 'portal' },
    'F': { name: 'flower', passable: true, encounter: true },
    'B': { name: 'bridge', passable: true, encounter: false }
  };

  const ZONE_MAPS = {
    meadow: {
      id: 'meadow',
      name: 'Sunleaf Meadow',
      palette: {
        ground: '#2d5a27',
        groundAlt: '#34662d',
        path: '#c2a675',
        pathEdge: '#9e8252',
        grass: '#1e824c',
        grassTip: '#4ade80',
        tree: '#14381f',
        treeTop: '#22c55e',
        liquid: '#0ea5e9',
        liquidShine: '#7dd3fc',
        accent: '#facc15'
      },
      spawn: { x: 7, y: 6 },
      rows: [
        'TTTTTTTPPTTWTTTT',
        'TGGGG..11..GGGGT',
        'TGGC..F..F..HGGT',
        'TGGG...22...GGGT',
        'T..F........F..T',
        'T......33......T',
        'T..GGG....GGG..T',
        'T..GGGG..GGGG..T',
        'T..GGG....GGG..T',
        'T~~~BBBBBBBB~~~T',
        'T~~~..F..F..~~~T',
        'TTTTTTTPPTTTTTTT'
      ],
      npcs: {
        '7,5': {
          id: 'grandpa_rowan',
          name: 'Grandpa Rowan',
          role: 'Heartwood Homestead Elder • Ranch & Breeding Master',
          icon: '👴',
          type: 'ranch',
          isGrandpa: true,
          color: '#facc15',
          dialogue: [
            '“Welcome home to Heartwood Homestead, grandchild! Walk north through the Portal Gate whenever you’re ready to explore all 6 Aether Realms!”',
            '“Visit the 🏥 Kin Care Hospital on the east side for health tonics, or the 🏬 Shopping Center on the west side for fruits, meals, and Snare Traps!”'
          ],
          quest: {
            id: 'npc_q_rowan_meadow',
            title: 'Homestead Apprentice: Bind 2 Wild Kin',
            desc: 'Catch or bind at least 2 different Wild Kin species using Snare Traps and show Grandpa Rowan.',
            stat: 'kinBound',
            target: 2,
            rewardShards: 220,
            rewardGems: 25,
            rewardItem: 'aetherPrism',
            rewardQty: 3
          }
        },
        '3,2': {
          id: 'meadow_shopping_center',
          name: 'Sunleaf Shopping Center',
          role: 'Fruits, Berries, Cooked Meals, Snare Traps & Carrier Bags',
          icon: '🏬',
          type: 'shopping_center',
          color: '#f59e0b',
          dialogue: [
            '“Welcome to the Sunleaf Shopping Center! Stock up on fresh Sunberry Rations, Heartwood Berries, Snare Traps, and Carrier Bag upgrades!”'
          ]
        },
        '12,2': {
          id: 'meadow_hospital',
          name: 'Sunleaf Kin Care Hospital',
          role: 'Squad Medical Checkup, Vital Tonics & Revival Dew',
          icon: '🏥',
          type: 'hospital',
          color: '#ef4444',
          dialogue: [
            '“Welcome to the Kin Care Hospital! We offer emergency squad recovery and medical-grade Vital Tonics, Hyper Tonics, and Phoenix Revival Dew.”'
          ]
        },
        '11,0': {
          id: 'warden_kael',
          name: 'Warden Kael',
          role: 'Sunleaf Grove Warden',
          icon: '🌿',
          type: 'warden',
          wardenId: 'kael',
          color: '#22c55e',
          dialogue: [
            '“I am Kael, Guardian of the Heartwood Root! Prove the bond between you and your Kin to claim the Root Crest!”'
          ],
          quest: {
            id: 'npc_q_kael_meadow',
            title: 'Trial of the Grove: Win 3 Battles',
            desc: 'Win 3 battles against wild Kin or Tamers to prove your readiness for the Root Crest.',
            stat: 'battlesWon',
            target: 3,
            rewardShards: 260,
            rewardGems: 25,
            rewardItem: 'superTonic',
            rewardQty: 2
          }
        },
        '6,3': {
          id: 'npc_mira',
          name: 'Botanist Mira',
          role: 'Orchard Fruit & Nutrition Researcher',
          icon: '👩‍🌾',
          type: 'guide',
          color: '#38bdf8',
          dialogue: [
            '“Wild Kin adore fresh fruit from the 🏬 Shopping Center! Feeding a Kin a Sunberry Ration or Heartwood Berry boosts their vitality and bond.”',
            '“Can you feed any of your Kin at least 1 fruit or meal and report back to me?”'
          ],
          quest: {
            id: 'npc_q_mira_fruit',
            title: 'Orchard Nutrition: Feed a Kin 1 Meal or Berry',
            desc: 'Feed any fruit, berry, or cooked meal from the Shopping Center or Ranch to your Kin.',
            stat: 'foodFed',
            target: 1,
            rewardShards: 180,
            rewardGems: 20,
            rewardItem: 'sunberryRation',
            rewardQty: 3
          }
        },
        '10,5': {
          id: 'tamer_leo',
          name: 'Scout Leo',
          role: 'Rookie Meadow Tamer',
          icon: '🧢',
          type: 'tamer',
          color: '#f97316',
          rewardShards: 110,
          dialogue: [
            '“Hey! Grandpa Rowan gave you a Starter Kin too? Let’s test our partners in a friendly Tamer battle!”'
          ],
          team: [
            { speciesId: 10, level: 4 },
            { speciesId: 13, level: 5 }
          ],
          quest: {
            id: 'npc_q_leo_steps',
            title: 'Meadow Patrol: Explore 30 Steps',
            desc: 'Patrol the tall grass around Sunleaf Meadow (30 steps) and report back to Scout Leo.',
            stat: 'stepsTaken',
            target: 30,
            rewardShards: 150,
            rewardGems: 15,
            rewardItem: 'aetherPrism',
            rewardQty: 2
          }
        }
      },
      portals: {
        '7,0': { targetZone: 'tidecove', targetX: 7, targetY: 10, label: 'North Gate → Whispering Tidecove (World 2)' },
        '8,0': { targetZone: 'tidecove', targetX: 8, targetY: 10, label: 'North Gate → Whispering Tidecove (World 2)' },
        '7,11': { targetZone: 'sanctum', targetX: 7, targetY: 1, label: 'South Gate → Astral Sanctum (World 6)' },
        '8,11': { targetZone: 'sanctum', targetX: 8, targetY: 1, label: 'South Gate → Astral Sanctum (World 6)' }
      }
    },

    tidecove: {
      id: 'tidecove',
      name: 'Whispering Tidecove',
      palette: {
        ground: '#164e63',
        groundAlt: '#155e75',
        path: '#fde68a',
        pathEdge: '#f59e0b',
        grass: '#0d9488',
        grassTip: '#2dd4bf',
        tree: '#0f172a',
        treeTop: '#38bdf8',
        liquid: '#0284c7',
        liquidShine: '#bae6fd',
        accent: '#38bdf8'
      },
      spawn: { x: 7, y: 9 },
      rows: [
        'TTTTTTTPPTTWTTTT',
        'T~~~GGGGGGGG~~~T',
        'T~~C........H~~T',
        'T~~~BBBBBBBB~~~T',
        'T..GGGG..GGGG..T',
        'T..G..F..F..G..T',
        'T..............T',
        'T..GGG....GGG..T',
        'T~~~BBBBBBBB~~~T',
        'T......F.......T',
        'T..............T',
        'TTTTTTTPPTTTTTTT'
      ],
      npcs: {
        '3,2': {
          id: 'tidecove_shopping_center',
          name: 'Coral Plaza Shopping Center',
          role: 'Fruits, Sea-Salt Rations, Snare Traps & Carrier Bags',
          icon: '🏬',
          type: 'shopping_center',
          color: '#f59e0b',
          dialogue: [
            '“Welcome to Coral Plaza Shopping Center! Pick up tropical Sunberry Rations, Heartwood Stew, Great Snare Cages, and Bag upgrades!”'
          ]
        },
        '12,2': {
          id: 'tidecove_hospital',
          name: 'Tidecove Kin Care Hospital',
          role: 'Marine Squad Checkup, Vital Tonics & Revival Dew',
          icon: '🏥',
          type: 'hospital',
          color: '#ef4444',
          dialogue: [
            '“Welcome to Tidecove Kin Care Hospital! Rest your water-weary squad or stock up on medical Vital Tonics and Revival Dew.”'
          ]
        },
        '11,0': {
          id: 'warden_nerissa',
          name: 'Warden Nerissa',
          role: 'Abyssal Tidecove Warden',
          icon: '🌊',
          type: 'warden',
          wardenId: 'nerissa',
          color: '#38bdf8',
          dialogue: [
            '“The ocean yields only to calm resolve. Defeat my Tide-affinity squad to earn the Tidal Crest!”'
          ],
          quest: {
            id: 'npc_q_nerissa_tide',
            title: 'Tidal Mastery: Bind 4 Species',
            desc: 'Expand your KinDex to at least 4 bound species across Meadow and Tidecove.',
            stat: 'kinBound',
            target: 4,
            rewardShards: 300,
            rewardGems: 30,
            rewardItem: 'greaterPrism',
            rewardQty: 2
          }
        },
        '5,6': {
          id: 'npc_mariner_sol',
          name: 'Captain Sol',
          role: 'Lagoon Expedition Leader',
          icon: '⚓',
          type: 'guide',
          color: '#38bdf8',
          dialogue: [
            '“Ahoy, Tamer! The coral reeds here hide Dewdrop and Glimfin. Head north through the Lagoon Gate when you’re ready for Stormspire Ridge!”',
            '“Complete my Lagoon expedition mission for a hefty Shard and Trap reward!”'
          ],
          quest: {
            id: 'npc_q_sol_lagoon',
            title: 'Lagoon Expedition: Win 5 Battles',
            desc: 'Win 5 total battles across the Aether Realms and report back to Captain Sol.',
            stat: 'battlesWon',
            target: 5,
            rewardShards: 240,
            rewardGems: 25,
            rewardItem: 'greaterPrism',
            rewardQty: 2
          }
        },
        '10,6': {
          id: 'tamer_marina',
          name: 'Diver Marina',
          role: 'Coral Reef Tamer',
          icon: '🤿',
          type: 'tamer',
          color: '#06b6d4',
          rewardShards: 165,
          dialogue: [
            '“My Tide Kin move like a riptide! Let’s see if your squad can stay afloat!”'
          ],
          team: [
            { speciesId: 7, level: 9 },
            { speciesId: 19, level: 10 }
          ],
          quest: {
            id: 'npc_q_marina_breed',
            title: 'Coral Bloodlines: Hatch 1 Offspring',
            desc: 'Breed and hatch at least 1 Offspring Egg at Grandpa Rowan’s Ranch.',
            stat: 'kinBred',
            target: 1,
            rewardShards: 250,
            rewardGems: 25,
            rewardItem: 'heartwoodBerry',
            rewardQty: 3
          }
        }
      },
      portals: {
        '7,11': { targetZone: 'meadow', targetX: 7, targetY: 1, label: 'South Gate → Sunleaf Meadow (World 1)' },
        '8,11': { targetZone: 'meadow', targetX: 8, targetY: 1, label: 'South Gate → Sunleaf Meadow (World 1)' },
        '7,0': { targetZone: 'stormspire', targetX: 7, targetY: 10, label: 'North Gate → Stormspire Ridge (World 3)' },
        '8,0': { targetZone: 'stormspire', targetX: 8, targetY: 10, label: 'North Gate → Stormspire Ridge (World 3)' }
      }
    },

    stormspire: {
      id: 'stormspire',
      name: 'Stormspire Ridge',
      palette: {
        ground: '#334155',
        groundAlt: '#1e293b',
        path: '#94a3b8',
        pathEdge: '#64748b',
        grass: '#ca8a04',
        grassTip: '#facc15',
        tree: '#1e1b4b',
        treeTop: '#eab308',
        liquid: '#6366f1',
        liquidShine: '#c7d2fe',
        accent: '#facc15'
      },
      spawn: { x: 7, y: 9 },
      rows: [
        'TTTTTTTPPTTWTTTT',
        'TGGGG......GGGGT',
        'TGGC..F..F..HGGT',
        'TGGG........GGGT',
        'T~~~BBBBBBBB~~~T',
        'T..GGGG..GGGG..T',
        'T..GGGG..GGGG..T',
        'T..............T',
        'T..GGG....GGG..T',
        'T......F.......T',
        'T..............T',
        'TTTTTTTPPTTTTTTT'
      ],
      npcs: {
        '3,2': {
          id: 'stormspire_shopping_center',
          name: 'Skyline Shopping Center',
          role: 'High-Voltage Meals, Fruits, Snare Cages & Bags',
          icon: '🏬',
          type: 'shopping_center',
          color: '#f59e0b',
          dialogue: [
            '“Welcome to Skyline Shopping Center on Stormspire Ridge! Grab Heartwood Stews, Tamer’s Feast Platters, and Great Snare Cages!”'
          ]
        },
        '12,2': {
          id: 'stormspire_hospital',
          name: 'Stormspire Kin Care Hospital',
          role: 'High-Altitude Medical Center & Squad Recovery',
          icon: '🏥',
          type: 'hospital',
          color: '#ef4444',
          dialogue: [
            '“Welcome to Stormspire Kin Care Hospital! Let our healers discharge static shock and restore your squad to peak HP.”'
          ]
        },
        '11,0': {
          id: 'warden_orin',
          name: 'Warden Orin',
          role: 'Sky-Forge Volt Warden',
          icon: '⚡',
          type: 'warden',
          wardenId: 'orin',
          color: '#facc15',
          dialogue: [
            '“Lightning never hesitates! Show me the speed of your squad to claim the Storm Crest!”'
          ],
          quest: {
            id: 'npc_q_orin_storm',
            title: 'Thunder Peak: Win 8 Battles',
            desc: 'Win 8 total battles to prove your reflexes to Warden Orin.',
            stat: 'battlesWon',
            target: 8,
            rewardShards: 350,
            rewardGems: 35,
            rewardItem: 'hyperTonic',
            rewardQty: 2
          }
        },
        '6,7': {
          id: 'npc_ranger_lyra',
          name: 'Sky-Ranger Lyra',
          role: 'Magnetic Ridge Scout & Trader',
          icon: '🦅',
          type: 'guide',
          color: '#facc15',
          dialogue: [
            '“Up here on Stormspire Ridge, Volt and Gale Kin soar between the magnetic spires. Have you tried trading Kin at the Trade Center yet?”'
          ],
          quest: {
            id: 'npc_q_lyra_trade',
            title: 'Skyline Exchange: Complete 1 Kin Trade',
            desc: 'Complete 1 Kin Trade with an NPC trader or live room in the Trade Center.',
            stat: 'tradesDone',
            target: 1,
            rewardShards: 280,
            rewardGems: 30,
            rewardItem: 'greaterPrism',
            rewardQty: 2
          }
        },
        '10,7': {
          id: 'tamer_zephyr',
          name: 'Sky-Knight Zephyr',
          role: 'Ridge Wind Tamer',
          icon: '⚡',
          type: 'tamer',
          color: '#facc15',
          rewardShards: 220,
          dialogue: [
            '“Only swift Tamers can cross the magnetic bridge to Cinderpeak Caldera! En garde!”'
          ],
          team: [
            { speciesId: 13, level: 15 },
            { speciesId: 25, level: 16 }
          ],
          quest: {
            id: 'npc_q_zephyr_evo',
            title: 'Awakened Power: Evolve 1 Kin',
            desc: 'Level up and evolve at least 1 Kin into its next stage.',
            stat: 'evolutions',
            target: 1,
            rewardShards: 300,
            rewardGems: 30,
            rewardItem: 'rareCandyShard',
            rewardQty: 1
          }
        }
      },
      portals: {
        '7,11': { targetZone: 'tidecove', targetX: 7, targetY: 1, label: 'South Gate → Whispering Tidecove (World 2)' },
        '8,11': { targetZone: 'tidecove', targetX: 8, targetY: 1, label: 'South Gate → Whispering Tidecove (World 2)' },
        '7,0': { targetZone: 'cinderpeak', targetX: 7, targetY: 10, label: 'North Gate → Cinderpeak Caldera (World 4)' },
        '8,0': { targetZone: 'cinderpeak', targetX: 8, targetY: 10, label: 'North Gate → Cinderpeak Caldera (World 4)' }
      }
    },

    cinderpeak: {
      id: 'cinderpeak',
      name: 'Cinderpeak Caldera',
      palette: {
        ground: '#451a03',
        groundAlt: '#3b0764',
        path: '#78350f',
        pathEdge: '#9a3412',
        grass: '#b91c1c',
        grassTip: '#fb923c',
        tree: '#1c1917',
        treeTop: '#ef4444',
        liquid: '#ea580c',
        liquidShine: '#fde047',
        accent: '#f97316'
      },
      spawn: { x: 7, y: 9 },
      rows: [
        'TTTTTTTPPTTWTTTT',
        'T~~~GGGGGGGG~~~T',
        'T~~C........H~~T',
        'T~~~BBBBBBBB~~~T',
        'T..GGGG..GGGG..T',
        'T..GGGG..GGGG..T',
        'T......F.......T',
        'T~~~BBBBBBBB~~~T',
        'T..GGG....GGG..T',
        'T..............T',
        'T..............T',
        'TTTTTTTPPTTTTTTT'
      ],
      npcs: {
        '3,2': {
          id: 'cinderpeak_shopping_center',
          name: 'Obsidian Mall Shopping Center',
          role: 'Flame-Roasted Meals, Fruits, Master Vaults & Bags',
          icon: '🏬',
          type: 'shopping_center',
          color: '#f59e0b',
          dialogue: [
            '“Welcome to Obsidian Mall! Our flame-cooked Tamer’s Feast Platters and Master Snare Vaults are forged right here in Cinderpeak!”'
          ]
        },
        '12,2': {
          id: 'cinderpeak_hospital',
          name: 'Caldera Kin Care Hospital',
          role: 'Thermal Burn Clinic, Hyper Tonics & Revival Dew',
          icon: '🏥',
          type: 'hospital',
          color: '#ef4444',
          dialogue: [
            '“Welcome to the Caldera Kin Care Hospital! Our cooling Aether chambers heal volcanic fatigue and restore your entire squad.”'
          ]
        },
        '11,0': {
          id: 'warden_ignis',
          name: 'Warden Ignis',
          role: 'Obsidian Caldera Warden',
          icon: '🔥',
          type: 'warden',
          wardenId: 'ignis',
          color: '#f97316',
          dialogue: [
            '“From magma and ash, true strength is forged! Face my Pyre and Crag titans for the Magma Crest!”'
          ],
          quest: {
            id: 'npc_q_ignis_caldera',
            title: 'Crucible of Flame: Bind 8 Species',
            desc: 'Bind at least 8 unique Kin species in your KinDex to earn Warden Ignis’s respect.',
            stat: 'kinBound',
            target: 8,
            rewardShards: 420,
            rewardGems: 40,
            rewardItem: 'feastPlatter',
            rewardQty: 2
          }
        },
        '6,6': {
          id: 'npc_smith_vulkan',
          name: 'Pyro-Smith Vulkan',
          role: 'Master Snare Crafter',
          icon: '⚒️',
          type: 'guide',
          color: '#fb923c',
          dialogue: [
            '“The wild Cragmite and Magmafang in this caldera have thick armor! Keep your squad well-fed from the 🏬 Shopping Center and healed at the 🏥 Hospital.”'
          ],
          quest: {
            id: 'npc_q_vulkan_feed',
            title: 'Volcanic Stamina: Feed 3 Meals or Fruits',
            desc: 'Feed 3 fruits, berries, or meals to keep your squad energized in the caldera heat.',
            stat: 'foodFed',
            target: 3,
            rewardShards: 320,
            rewardGems: 30,
            rewardItem: 'heartwoodStew',
            rewardQty: 2
          }
        },
        '10,6': {
          id: 'tamer_ember',
          name: 'Pyromancer Ash',
          role: 'Caldera Vanguard Tamer',
          icon: '🔥',
          type: 'tamer',
          color: '#ef4444',
          rewardShards: 280,
          dialogue: [
            '“Can your Kin handle the heat of Cinderpeak Caldera? Show me!”'
          ],
          team: [
            { speciesId: 2, level: 22 },
            { speciesId: 16, level: 24 }
          ]
        }
      },
      portals: {
        '7,11': { targetZone: 'stormspire', targetX: 7, targetY: 1, label: 'South Gate → Stormspire Ridge (World 3)' },
        '8,11': { targetZone: 'stormspire', targetX: 8, targetY: 1, label: 'South Gate → Stormspire Ridge (World 3)' },
        '7,0': { targetZone: 'frostveil', targetX: 7, targetY: 10, label: 'North Gate → Frostveil Expanse (World 5)' },
        '8,0': { targetZone: 'frostveil', targetX: 8, targetY: 10, label: 'North Gate → Frostveil Expanse (World 5)' }
      }
    },

    frostveil: {
      id: 'frostveil',
      name: 'Frostveil Expanse',
      palette: {
        ground: '#1e293b',
        groundAlt: '#0f172a',
        path: '#cbd5e1',
        pathEdge: '#94a3b8',
        grass: '#0284c7',
        grassTip: '#67e8f9',
        tree: '#0f172a',
        treeTop: '#bae6fd',
        liquid: '#38bdf8',
        liquidShine: '#f0f9ff',
        accent: '#67e8f9'
      },
      spawn: { x: 7, y: 9 },
      rows: [
        'TTTTTTTPPTTWTTTT',
        'TGGGG......GGGGT',
        'TGGC..F..F..HGGT',
        'TGGG........GGGT',
        'T~~~BBBBBBBB~~~T',
        'T..GGGG..GGGG..T',
        'T..GGGG..GGGG..T',
        'T......F.......T',
        'T..GGG....GGG..T',
        'T..............T',
        'T..............T',
        'TTTTTTTPPTTTTTTT'
      ],
      npcs: {
        '3,2': {
          id: 'frostveil_shopping_center',
          name: 'Aurora Galleria Shopping Center',
          role: 'Hot Stews, Berries, Apex Nectar, Traps & Bags',
          icon: '🏬',
          type: 'shopping_center',
          color: '#f59e0b',
          dialogue: [
            '“Welcome to Aurora Galleria Shopping Center! Warm up your squad with hot Heartwood Stew, Apex Nectar, and Master Snare Vaults!”'
          ]
        },
        '12,2': {
          id: 'frostveil_hospital',
          name: 'Frostveil Kin Care Hospital',
          role: 'Cryo-Recovery Clinic, Full Tonics & Revival Dew',
          icon: '🏥',
          type: 'hospital',
          color: '#ef4444',
          dialogue: [
            '“Welcome to Frostveil Kin Care Hospital! Step inside our heated crystal ward to heal frostbite and buy Phoenix Revival Dew.”'
          ]
        },
        '11,0': {
          id: 'warden_freya',
          name: 'Warden Freya',
          role: 'Crystal Aurora Warden',
          icon: '❄️',
          type: 'warden',
          wardenId: 'freya',
          color: '#67e8f9',
          dialogue: [
            '“Beneath the aurora, only crystal clarity prevails. Challenge me for the Glacial Crest!”'
          ],
          quest: {
            id: 'npc_q_freya_frost',
            title: 'Aurora Hunter: Win 12 Battles',
            desc: 'Win 12 total battles across your journey to earn Warden Freya’s Glacial blessing.',
            stat: 'battlesWon',
            target: 12,
            rewardShards: 500,
            rewardGems: 45,
            rewardItem: 'phoenixDew',
            rewardQty: 2
          }
        },
        '6,7': {
          id: 'npc_chronicler_bjorn',
          name: 'Chronicler Bjorn',
          role: 'Ancient Tundra Historian',
          icon: '🧔',
          type: 'guide',
          color: '#67e8f9',
          dialogue: [
            '“Beyond the northern gate lies the Astral Sanctum, where High Warden Vesper awaits! Make sure you’ve visited both the 🏥 Hospital and 🏬 Shopping Center before heading north.”'
          ],
          quest: {
            id: 'npc_q_bjorn_kindex',
            title: 'Tundra Scholar: Bind 10 Species',
            desc: 'Bind at least 10 different Kin species in your KinDex.',
            stat: 'kinBound',
            target: 10,
            rewardShards: 450,
            rewardGems: 40,
            rewardItem: 'masterPrism',
            rewardQty: 1
          }
        }
      },
      portals: {
        '7,11': { targetZone: 'cinderpeak', targetX: 7, targetY: 1, label: 'South Gate → Cinderpeak Caldera (World 4)' },
        '8,11': { targetZone: 'cinderpeak', targetX: 8, targetY: 1, label: 'South Gate → Cinderpeak Caldera (World 4)' },
        '7,0': { targetZone: 'sanctum', targetX: 7, targetY: 10, label: 'North Gate → Astral Sanctum (World 6)' },
        '8,0': { targetZone: 'sanctum', targetX: 8, targetY: 10, label: 'North Gate → Astral Sanctum (World 6)' }
      }
    },

    sanctum: {
      id: 'sanctum',
      name: 'Astral Sanctum',
      palette: {
        ground: '#1e1b4b',
        groundAlt: '#090d16',
        path: '#a855f7',
        pathEdge: '#6366f1',
        grass: '#7e22ce',
        grassTip: '#f0abfc',
        tree: '#090d16',
        treeTop: '#c084fc',
        liquid: '#4f46e5',
        liquidShine: '#e0e7ff',
        accent: '#f0abfc'
      },
      spawn: { x: 7, y: 9 },
      rows: [
        'TTTTTTTPPTTWTTTT',
        'T~~~GGGGGGGG~~~T',
        'T~~C........H~~T',
        'T~~~BBBBBBBB~~~T',
        'T..GGGG..GGGG..T',
        'T..G..F..F..G..T',
        'T..............T',
        'T..GGGG..GGGG..T',
        'T~~~BBBBBBBB~~~T',
        'T......F.......T',
        'T..............T',
        'TTTTTTTPPTTTTTTT'
      ],
      npcs: {
        '3,2': {
          id: 'sanctum_shopping_center',
          name: 'Celestial Emporium Shopping Center',
          role: 'Astral Feasts, Apex Nectar, Master Vaults & Bags',
          icon: '🏬',
          type: 'shopping_center',
          color: '#f59e0b',
          dialogue: [
            '“Welcome to the Celestial Emporium Shopping Center! Prepare for High Warden Vesper with Tamer’s Feast Platters, Apex Nectar, and Master Snare Vaults!”'
          ]
        },
        '12,2': {
          id: 'sanctum_hospital',
          name: 'Astral Kin Care Hospital',
          role: 'Starlight Medical Sanctuary & Full Squad Revival',
          icon: '🏥',
          type: 'hospital',
          color: '#ef4444',
          dialogue: [
            '“Welcome to the Astral Kin Care Hospital! Starlight resonance restores your entire squad and stocks Phoenix Revival Dew.”'
          ]
        },
        '11,0': {
          id: 'warden_vesper',
          name: 'High Warden Vesper',
          role: 'Grand Sovereign of the Citadel',
          icon: '👑',
          type: 'warden',
          wardenId: 'vesper',
          color: '#c084fc',
          dialogue: [
            '“You have walked all six realms of Aetheria. Behold the cosmic synthesis of Shade and Sol—battle me for the Sovereign Crown!”'
          ],
          quest: {
            id: 'npc_q_vesper_crown',
            title: 'Sovereign Trial: Win 18 Battles',
            desc: 'Triumph in 18 total battles across Aetheria to prove your worth at the Citadel.',
            stat: 'battlesWon',
            target: 18,
            rewardShards: 750,
            rewardGems: 60,
            rewardItem: 'ascensionCodex',
            rewardQty: 1
          }
        },
        '6,6': {
          id: 'npc_seer_nyx',
          name: 'Star-Seer Nyx',
          role: 'Citadel Astral Oracle',
          icon: '🔮',
          type: 'guide',
          color: '#f0abfc',
          dialogue: [
            '“From here, the South Gate returns to Frostveil Expanse and the North Gate loops back to Sunleaf Meadow! Speak with every character across the 6 realms to complete their personal missions.”'
          ],
          quest: {
            id: 'npc_q_nyx_radiant',
            title: 'Starlight Blessing: Breed 2 Offspring',
            desc: 'Hatch 2 Offspring Eggs at the Ranch to channel starlight genetics.',
            stat: 'kinBred',
            target: 2,
            rewardShards: 500,
            rewardGems: 50,
            rewardItem: 'apexNectar',
            rewardQty: 2
          }
        }
      },
      portals: {
        '7,11': { targetZone: 'frostveil', targetX: 7, targetY: 1, label: 'South Gate → Frostveil Expanse (World 5)' },
        '8,11': { targetZone: 'frostveil', targetX: 8, targetY: 1, label: 'South Gate → Frostveil Expanse (World 5)' },
        '7,0': { targetZone: 'meadow', targetX: 7, targetY: 10, label: 'North Gate → Sunleaf Meadow (World 1)' },
        '8,0': { targetZone: 'meadow', targetX: 8, targetY: 10, label: 'North Gate → Sunleaf Meadow (World 1)' }
      }
    }
  };

  function getTileAt(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) return 'T';
    const row = map.rows[y] || '';
    const ch = row[x] || 'T';
    if (ch === '1' || ch === '2' || ch === '3') return '.';
    return ch;
  }

  function getNpcAt(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    const key = `${x},${y}`;
    if (map.npcs && map.npcs[key]) {
      return Object.assign({ x, y }, map.npcs[key]);
    }
    if (map.portals && map.portals[key]) {
      const p = map.portals[key];
      return {
        id: `portal_${zoneId}_${x}_${y}`,
        name: p.label || `Portal → ${p.targetZone}`,
        type: 'portal',
        icon: '🌀',
        targetZone: p.targetZone,
        targetX: p.targetX,
        targetY: p.targetY,
        label: p.label,
        x,
        y
      };
    }
    const ch = getTileAt(zoneId, x, y);
    if (ch === 'S' || ch === 'H') {
      return {
        id: `hospital_${zoneId}`,
        name: `${map.name} Kin Care Hospital`,
        role: 'Squad Medical Checkup, Vital Tonics & Revival Dew',
        icon: '🏥',
        type: 'hospital',
        x,
        y
      };
    }
    if (ch === 'C' || ch === 'M') {
      return {
        id: `shopping_${zoneId}`,
        name: `${map.name} Shopping Center`,
        role: 'Fruits, Berries, Cooked Meals, Snare Traps & Bags',
        icon: '🏬',
        type: 'shopping_center',
        x,
        y
      };
    }
    return null;
  }

  // Ensure each map has .grid alias for .rows, plus compatibility anchors for test suite & legacy saves
  Object.values(ZONE_MAPS).forEach((m) => {
    if (!m.grid) m.grid = m.rows;
    if (m.npcs && !m.npcs['12,1'] && m.npcs['12,2']) {
      m.npcs['12,1'] = Object.assign({}, m.npcs['12,2'], { type: 'shrine', isHospital: true });
    }
  });
  if (ZONE_MAPS.meadow && ZONE_MAPS.meadow.npcs && ZONE_MAPS.meadow.npcs['7,5']) {
    ZONE_MAPS.meadow.npcs['6,5'] = Object.assign({}, ZONE_MAPS.meadow.npcs['7,5'], { id: 'rowan', isGrandpa: true });
  }

  function isWalkableTile(ch) {
    if (!ch || ch === '#' || ch === 'T' || ch === '~') return false;
    return true;
  }

  function getTileInfo(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    const ch = getTileAt(zoneId, x, y);
    const key = `${x},${y}`;
    const portal = (map.portals && map.portals[key]) || null;
    const npc = getNpcAt(zoneId, x, y);
    return {
      tile: ch,
      walkable: isWalkableTile(ch),
      portal,
      npc
    };
  }

  const exported = {
    MAP_WIDTH,
    MAP_HEIGHT,
    TILE_TYPES,
    ZONE_MAPS,
    getTileAt,
    getNpcAt,
    getTileInfo,
    isWalkableTile
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
  root.WILDKIN_MAPS = exported;
})(typeof window !== 'undefined' ? window : globalThis);
