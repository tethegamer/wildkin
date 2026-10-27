/**
 * WILDKIN: AETHER BOUND — Expansive Multi-Elevation 3D Overworld Maps (28x22), Portals, Hospitals, Shopping Centers & Character Quests
 * 28x22 tile maps (616 tiles per world — 3.2x larger!) across all 6 Sanctuary Worlds with:
 * - Multi-tiered 3D terrain elevation (`getElevationAt`) featuring Northern Sanctum Plateaus, Rolling Hills, Recessed River/Lava Basins & Arched Bridges (`B`)
 * - Ancient Ruin Obelisks & Watchtowers (`R`), Wildflower/Crystal Meadows (`F`), and Dense Hunting Grounds (`G`)
 * - North/South World Portals (`P`) at (13,0)/(14,0) and (13,21)/(14,21) connecting all 6 realms
 * - 🏥 Kin Care Hospital (`H`) at (21,3) & 🏬 Aether Shopping Center (`C`) at (6,3) on EVERY world map
 * - 6–7 Interactive Character NPCs per world spread across Town Plaza, Western Wilds, Eastern Ridge & Northern Sanctum!
 */
(function (root) {
  "use strict";

  const MAP_WIDTH = 28;
  const MAP_HEIGHT = 22;

  // Tile legend:
  // "." = Open Path / Ground
  // "G" = Tall Wild Grass (Wild Kin encounters)
  // "T" = Barrier (Trees / Rocks / Cliff Walls — impassable)
  // "~" = Water / Lava / Deep Chasm (impassable)
  // "S" = Healing Shrine / Kin Care Hospital
  // "H" = Kin Care Hospital (Medical Health Supplies & Squad Checkup)
  // "C" = Aether Shopping Center (Fruits, Berries, Cooked Meals, Snare Traps & Bags)
  // "M" = Merchant Plaza
  // "W" = Warden Altar
  // "P" = Zone Portal Gate
  // "F" = Decorative Flowers / Crystal Cluster (encounter possible)
  // "B" = Elevated Wooden / Basalt Bridge
  // "R" = Ancient Ruin Obelisk / Watchtower / Crystal Spire Landmark

  const TILE_TYPES = {
    ".": { name: "path", passable: true, encounter: false },
    "G": { name: "grass", passable: true, encounter: true },
    "T": { name: "tree", passable: false, encounter: false },
    "~": { name: "liquid", passable: false, encounter: false },
    "S": { name: "shrine", passable: true, encounter: false, interact: "hospital" },
    "H": { name: "hospital", passable: true, encounter: false, interact: "hospital" },
    "C": { name: "shopping_center", passable: true, encounter: false, interact: "shopping_center" },
    "M": { name: "merchant", passable: true, encounter: false, interact: "shopping_center" },
    "W": { name: "warden", passable: true, encounter: false, interact: "warden" },
    "P": { name: "portal", passable: true, encounter: false, interact: "portal" },
    "F": { name: "flower", passable: true, encounter: true },
    "B": { name: "bridge", passable: true, encounter: false },
    "R": { name: "ruin", passable: false, encounter: false }
  };

  const ZONE_MAPS = {
    meadow: {
      id: "meadow",
      name: "Sunleaf Meadow",
      palette: {
        ground: "#2d5a27",
        groundAlt: "#34662d",
        path: "#c2a675",
        pathEdge: "#9e8252",
        grass: "#1e824c",
        grassTip: "#4ade80",
        tree: "#14381f",
        treeTop: "#22c55e",
        liquid: "#0ea5e9",
        liquidShine: "#7dd3fc",
        accent: "#facc15"
      },
      spawn: { x: 13, y: 11 },
      rows: [
        "TTTTTTTTTTTTTPPTTWTTTTTTTTTT",
        "TGGGGGG....R....R....GGGGGGT",
        "TGGGGGG..............GGGGGGT",
        "TGGG..C.....F..F.....H..GGGT",
        "TGGG....................GGGT",
        "T..F....GGGG....GGGG....F..T",
        "T......GGGGGG..GGGGGG......T",
        "T..R...GGGGGG..GGGGGG...R..T",
        "T.......GGGG....GGGG.......T",
        "T..GGG................GGG..T",
        "T..GGGG....F....F....GGGG..T",
        "T..GGGG..............GGGG..T",
        "T..GGG...GGGG..GGGG...GGG..T",
        "T.......GGGGGGGGGGGG.......T",
        "T~~~BBBB~~~~BBBB~~~~BBBB~~~T",
        "T~~~BBBB~~~~BBBB~~~~BBBB~~~T",
        "T..GGG......F..F......GGG..T",
        "T..GGGG..............GGGG..T",
        "T..GGGG..R........R..GGGG..T",
        "T..GGG....GGGGGGGG....GGG..T",
        "T.........GGGGGGGG.........T",
        "TTTTTTTTTTTTTPPTTTTTTTTTTTTT"
      ],
      npcs: {
        "13,10": {
          id: "rowan",
          name: "Grandpa Rowan",
          role: "Heartwood Homestead Elder • Ranch & Breeding Master",
          icon: "👴",
          type: "ranch",
          isGrandpa: true,
          color: "#facc15",
          dialogue: [
            "“Welcome home to the expanded Heartwood Homestead, grandchild! Explore the western orchards, cross the southern river bridges, or climb the northern plateau!”",
            "“Higher worlds require stronger Kin to unlock—train your squad here, visit the 🏥 Kin Care Hospital (21,3) or 🏬 Shopping Center (6,3), and challenge Warden Kael at (17,0)!”"
          ],
          quest: {
            id: "npc_q_rowan_meadow",
            title: "Homestead Apprentice: Bind 2 Wild Kin",
            desc: "Catch or bind at least 2 different Wild Kin species using Snare Traps and show Grandpa Rowan.",
            stat: "kinBound",
            target: 2,
            rewardShards: 220,
            rewardGems: 25,
            rewardItem: "aetherPrism",
            rewardQty: 3
          }
        },
        "6,3": {
          id: "meadow_shopping_center",
          name: "Sunleaf Shopping Center",
          role: "Fruits, Berries, Cooked Meals, Snare Traps & Carrier Bags",
          icon: "🏬",
          type: "shopping_center",
          color: "#f59e0b",
          dialogue: [
            "“Welcome to the Sunleaf Shopping Center! Stock up on fresh Sunberry Rations, Heartwood Berries, Snare Traps, and Carrier Bag upgrades!”"
          ]
        },
        "21,3": {
          id: "meadow_hospital",
          name: "Sunleaf Kin Care Hospital",
          role: "Squad Medical Checkup, Vital Tonics & Revival Dew",
          icon: "🏥",
          type: "hospital",
          color: "#ef4444",
          dialogue: [
            "“Welcome to the Kin Care Hospital! We offer emergency squad recovery and medical-grade Vital Tonics, Hyper Tonics, and Phoenix Revival Dew.”"
          ]
        },
        "17,0": {
          id: "warden_kael",
          name: "Warden Kael",
          role: "Sunleaf Grove Warden",
          icon: "🌿",
          type: "warden",
          wardenId: "kael",
          color: "#22c55e",
          dialogue: [
            "“I am Kael, Guardian of the Heartwood Root! Prove the bond between you and your Kin atop this sanctum plateau to claim the Verdant Crest!”"
          ],
          quest: {
            id: "npc_q_kael_meadow",
            title: "Trial of the Grove: Win 3 Battles",
            desc: "Win 3 battles against wild Kin or Tamers to prove your readiness for the Verdant Crest.",
            stat: "battlesWon",
            target: 3,
            rewardShards: 260,
            rewardGems: 25,
            rewardItem: "hiTonic",
            rewardQty: 2
          }
        },
        "9,8": {
          id: "npc_mira",
          name: "Botanist Mira",
          role: "Orchard Fruit & Nutrition Researcher",
          icon: "👩‍🌾",
          type: "guide",
          color: "#38bdf8",
          dialogue: [
            "“Wild Kin adore fresh fruit from the 🏬 Shopping Center! Feeding a Kin a Sunberry Ration or Heartwood Berry boosts their vitality and bond.”",
            "“Can you feed any of your Kin at least 1 fruit or meal and report back to me?”"
          ],
          quest: {
            id: "npc_q_mira_fruit",
            title: "Orchard Nutrition: Feed a Kin 1 Meal or Berry",
            desc: "Feed any fruit, berry, or cooked meal from the Shopping Center or Ranch to your Kin.",
            stat: "foodFed",
            target: 1,
            rewardShards: 180,
            rewardGems: 20,
            rewardItem: "sunberryRation",
            rewardQty: 3
          }
        },
        "19,11": {
          id: "tamer_leo",
          name: "Scout Leo",
          role: "Rookie Meadow Tamer",
          icon: "🧢",
          type: "tamer",
          color: "#f97316",
          rewardShards: 120,
          dialogue: [
            "“Hey! Grandpa Rowan gave you a Starter Kin too? Let’s test our partners in a friendly Tamer battle on the eastern hills!”"
          ],
          team: [
            { speciesId: 10, level: 4 },
            { speciesId: 13, level: 5 }
          ],
          quest: {
            id: "npc_q_leo_steps",
            title: "Meadow Patrol: Explore 30 Steps",
            desc: "Patrol the tall grass and hills around Sunleaf Meadow (30 steps) and report back to Scout Leo.",
            stat: "stepsTaken",
            target: 30,
            rewardShards: 150,
            rewardGems: 15,
            rewardItem: "aetherPrism",
            rewardQty: 2
          }
        },
        "7,16": {
          id: "tamer_pip",
          name: "Bridge Ranger Pip",
          role: "Southern River Crossing Scout",
          icon: "🏹",
          type: "tamer",
          color: "#4ade80",
          rewardShards: 140,
          dialogue: [
            "“Beyond the three wooden bridges lie the Southern Wilds! Make sure your Kin are at least Lv.6 before heading through the North Gate to Tidecove!”"
          ],
          team: [
            { speciesId: 15, level: 5 },
            { speciesId: 17, level: 6 }
          ]
        }
      },
      portals: {
        "13,0": { targetZone: "tidecove", targetX: 13, targetY: 19, label: "North Gate → Whispering Tidecove (World 2 • Lv.6+)" },
        "14,0": { targetZone: "tidecove", targetX: 14, targetY: 19, label: "North Gate → Whispering Tidecove (World 2 • Lv.6+)" },
        "13,21": { targetZone: "sanctum", targetX: 13, targetY: 2, label: "South Gate → Astral Sanctum (World 6 • Lv.48+)" },
        "14,21": { targetZone: "sanctum", targetX: 14, targetY: 2, label: "South Gate → Astral Sanctum (World 6 • Lv.48+)" }
      }
    },

    tidecove: {
      id: "tidecove",
      name: "Whispering Tidecove",
      palette: {
        ground: "#164e63",
        groundAlt: "#155e75",
        path: "#fde68a",
        pathEdge: "#f59e0b",
        grass: "#0d9488",
        grassTip: "#2dd4bf",
        tree: "#0f172a",
        treeTop: "#38bdf8",
        liquid: "#0284c7",
        liquidShine: "#bae6fd",
        accent: "#38bdf8"
      },
      spawn: { x: 13, y: 19 },
      rows: [
        "TTTTTTTTTTTTTPPTTWTTTTTTTTTT",
        "T~~~~GGGG..............GGGGT",
        "T~~~~GGGG....R....R....GGGGT",
        "T~~~..C.....F..F.....H..~~~T",
        "T~~~....................~~~T",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGGGG..............GGGGT",
        "T..GGGGGG..F........F..GGGGT",
        "T..R..GGG....GGGGGG....R...T",
        "T............GGGGGG........T",
        "T..GGGG................GGGGT",
        "T..GGGG~~BBBB~~~~BBBB~~GGGGT",
        "T..GGGG~~BBBB~~~~BBBB~~GGGGT",
        "T......~~~~........~~~~....T",
        "T..GGG....GGGG..GGGG....GGGT",
        "T..GGGG...GGGG..GGGG...GGGGT",
        "T..GGGG.......FF.......GGGGT",
        "T..R...GGG..........GGG..R.T",
        "T.........F........F.......T",
        "T..........................T",
        "T....GGGG..........GGGG....T",
        "TTTTTTTTTTTTTPPTTTTTTTTTTTTT"
      ],
      npcs: {
        "6,3": {
          id: "tidecove_shopping_center",
          name: "Coral Plaza Shopping Center",
          role: "Fruits, Sea-Salt Rations, Snare Traps & Carrier Bags",
          icon: "🏬",
          type: "shopping_center",
          color: "#f59e0b",
          dialogue: [
            "“Welcome to Coral Plaza Shopping Center! Pick up tropical Sunberry Rations, Heartwood Stew, Magnetized Vault Traps, and Bag upgrades!”"
          ]
        },
        "21,3": {
          id: "tidecove_hospital",
          name: "Tidecove Kin Care Hospital",
          role: "Marine Squad Checkup, Vital Tonics & Revival Dew",
          icon: "🏥",
          type: "hospital",
          color: "#ef4444",
          dialogue: [
            "“Welcome to Tidecove Kin Care Hospital! Rest your water-weary squad or stock up on medical Vital Tonics and Revival Dew.”"
          ]
        },
        "17,0": {
          id: "warden_nerissa",
          name: "Warden Nerissa",
          role: "Abyssal Tidecove Warden",
          icon: "🌊",
          type: "warden",
          wardenId: "nerissa",
          color: "#38bdf8",
          dialogue: [
            "“The ocean yields only to calm resolve. Defeat my Tide-affinity squad to earn the Abyssal Crest and unlock Stormspire Ridge!”"
          ],
          quest: {
            id: "npc_q_nerissa_tide",
            title: "Tidal Mastery: Bind 4 Species",
            desc: "Expand your KinDex to at least 4 bound species across Meadow and Tidecove.",
            stat: "kinBound",
            target: 4,
            rewardShards: 300,
            rewardGems: 30,
            rewardItem: "greaterPrism",
            rewardQty: 2
          }
        },
        "10,9": {
          id: "npc_mariner_sol",
          name: "Captain Sol",
          role: "Lagoon Expedition Leader",
          icon: "⚓",
          type: "guide",
          color: "#38bdf8",
          dialogue: [
            "“Ahoy, Tamer! The coral lagoons here hide evolved Torrentscale and Mistserpent. You’ll need a Lv.14+ Kin or 2 Crests to brave Stormspire Ridge to the north!”"
          ],
          quest: {
            id: "npc_q_sol_lagoon",
            title: "Lagoon Expedition: Win 5 Battles",
            desc: "Win 5 total battles across the Aether Realms and report back to Captain Sol.",
            stat: "battlesWon",
            target: 5,
            rewardShards: 240,
            rewardGems: 25,
            rewardItem: "greaterPrism",
            rewardQty: 2
          }
        },
        "19,10": {
          id: "tamer_marina",
          name: "Diver Marina",
          role: "Coral Reef Tamer",
          icon: "🤿",
          type: "tamer",
          color: "#06b6d4",
          rewardShards: 195,
          dialogue: [
            "“My Tide Kin move like a riptide! Let’s see if your squad can stay afloat!”"
          ],
          team: [
            { speciesId: 17, level: 10 },
            { speciesId: 5, level: 12 }
          ],
          quest: {
            id: "npc_q_marina_breed",
            title: "Coral Bloodlines: Hatch 1 Offspring",
            desc: "Breed and hatch at least 1 Offspring Egg at Grandpa Rowan’s Ranch.",
            stat: "kinBred",
            target: 1,
            rewardShards: 250,
            rewardGems: 25,
            rewardItem: "heartwoodBerry",
            rewardQty: 3
          }
        },
        "8,17": {
          id: "tamer_kora",
          name: "Corsair Kora",
          role: "Atoll Boardwalk Duelist",
          icon: "🔱",
          type: "tamer",
          color: "#38bdf8",
          rewardShards: 210,
          dialogue: [
            "“The wild creatures in Tidecove hit harder than Meadow sprouts! Test your mettle against my reef team!”"
          ],
          team: [
            { speciesId: 15, level: 11 },
            { speciesId: 18, level: 13 }
          ]
        }
      },
      portals: {
        "13,21": { targetZone: "meadow", targetX: 13, targetY: 2, label: "South Gate → Sunleaf Meadow (World 1)" },
        "14,21": { targetZone: "meadow", targetX: 14, targetY: 2, label: "South Gate → Sunleaf Meadow (World 1)" },
        "13,0": { targetZone: "stormspire", targetX: 13, targetY: 19, label: "North Gate → Stormspire Ridge (World 3 • Lv.14+)" },
        "14,0": { targetZone: "stormspire", targetX: 14, targetY: 19, label: "North Gate → Stormspire Ridge (World 3 • Lv.14+)" }
      }
    },

    stormspire: {
      id: "stormspire",
      name: "Stormspire Ridge",
      palette: {
        ground: "#334155",
        groundAlt: "#1e293b",
        path: "#94a3b8",
        pathEdge: "#64748b",
        grass: "#ca8a04",
        grassTip: "#facc15",
        tree: "#1e1b4b",
        treeTop: "#eab308",
        liquid: "#6366f1",
        liquidShine: "#c7d2fe",
        accent: "#facc15"
      },
      spawn: { x: 13, y: 19 },
      rows: [
        "TTTTTTTTTTTTTPPTTWTTTTTTTTTT",
        "TGGGGGG....R....R....GGGGGGT",
        "TGGGGGG..............GGGGGGT",
        "TGGG..C.....F..F.....H..GGGT",
        "TGGG....................GGGT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGGGG..............GGGGT",
        "T..GGGGGG..R........R..GGGGT",
        "T....GGGG....GGGGGG....GGGGT",
        "T............GGGGGG........T",
        "T..GGGG................GGGGT",
        "T..GGGG..R....FF....R..GGGGT",
        "T..GGGG................GGGGT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGG....GGGG..GGGG..GGGGT",
        "T..GGGG....GGGG..GGGG..GGGGT",
        "T..R...GGG....FF....GGG..R.T",
        "T..........................T",
        "T....GGGG..........GGGG....T",
        "T....GGGG....F..F..GGGG....T",
        "T..........................T",
        "TTTTTTTTTTTTTPPTTTTTTTTTTTTT"
      ],
      npcs: {
        "6,3": {
          id: "stormspire_shopping_center",
          name: "Skyline Shopping Center",
          role: "High-Voltage Meals, Fruits, Snare Cages & Bags",
          icon: "🏬",
          type: "shopping_center",
          color: "#f59e0b",
          dialogue: [
            "“Welcome to Skyline Shopping Center on Stormspire Ridge! Grab Heartwood Stews, Homestead Feast Platters, and Magnetized Vault Traps!”"
          ]
        },
        "21,3": {
          id: "stormspire_hospital",
          name: "Stormspire Kin Care Hospital",
          role: "High-Altitude Medical Center & Squad Recovery",
          icon: "🏥",
          type: "hospital",
          color: "#ef4444",
          dialogue: [
            "“Welcome to Stormspire Kin Care Hospital! Let our healers discharge static shock and restore your squad to peak HP.”"
          ]
        },
        "17,0": {
          id: "warden_orin",
          name: "Warden Orin",
          role: "Sky-Forge Volt Warden",
          icon: "⚡",
          type: "warden",
          wardenId: "orin",
          color: "#facc15",
          dialogue: [
            "“Lightning never hesitates! Show me the speed of your squad atop Stormspire Crag to claim the Tempest Crest!”"
          ],
          quest: {
            id: "npc_q_orin_storm",
            title: "Thunder Peak: Win 8 Battles",
            desc: "Win 8 total battles to prove your reflexes to Warden Orin.",
            stat: "battlesWon",
            target: 8,
            rewardShards: 350,
            rewardGems: 35,
            rewardItem: "hyperTonic",
            rewardQty: 2
          }
        },
        "9,10": {
          id: "npc_ranger_lyra",
          name: "Sky-Ranger Lyra",
          role: "Magnetic Ridge Scout & Trader",
          icon: "🦅",
          type: "guide",
          color: "#facc15",
          dialogue: [
            "“Up here on Stormspire Ridge, wild Kin are Lv.16–26 with +32% boosted stats! Make sure your squad reaches Lv.24+ before entering Cinderpeak Caldera!”"
          ],
          quest: {
            id: "npc_q_lyra_trade",
            title: "Skyline Exchange: Complete 1 Kin Trade",
            desc: "Complete 1 Kin Trade with an NPC trader in the Trade Center.",
            stat: "tradesDone",
            target: 1,
            rewardShards: 280,
            rewardGems: 30,
            rewardItem: "greaterPrism",
            rewardQty: 2
          }
        },
        "18,10": {
          id: "tamer_zephyr",
          name: "Sky-Knight Zephyr",
          role: "Ridge Wind Tamer",
          icon: "⚡",
          type: "tamer",
          color: "#facc15",
          rewardShards: 280,
          dialogue: [
            "“Only swift Tamers can cross the magnetic sky-bridges to Cinderpeak Caldera! En garde!”"
          ],
          team: [
            { speciesId: 11, level: 18 },
            { speciesId: 22, level: 20 },
            { speciesId: 12, level: 22 }
          ],
          quest: {
            id: "npc_q_zephyr_evo",
            title: "Awakened Power: Evolve 1 Kin",
            desc: "Level up and evolve at least 1 Kin into its next stage.",
            stat: "evolutions",
            target: 1,
            rewardShards: 300,
            rewardGems: 30,
            rewardItem: "aetherCandy",
            rewardQty: 1
          }
        },
        "8,17": {
          id: "tamer_vane",
          name: "Tempest Guard Vane",
          role: "Highland Outpost Sentinel",
          icon: "🌩️",
          type: "tamer",
          color: "#eab308",
          rewardShards: 260,
          dialogue: [
            "“The thunder-spires amplify every Volt and Grove creature on this mountain. Let’s see how your team handles high altitude!”"
          ],
          team: [
            { speciesId: 14, level: 17 },
            { speciesId: 8, level: 19 }
          ]
        }
      },
      portals: {
        "13,21": { targetZone: "tidecove", targetX: 13, targetY: 2, label: "South Gate → Whispering Tidecove (World 2)" },
        "14,21": { targetZone: "tidecove", targetX: 14, targetY: 2, label: "South Gate → Whispering Tidecove (World 2)" },
        "13,0": { targetZone: "cinderpeak", targetX: 13, targetY: 19, label: "North Gate → Cinderpeak Caldera (World 4 • Lv.24+)" },
        "14,0": { targetZone: "cinderpeak", targetX: 14, targetY: 19, label: "North Gate → Cinderpeak Caldera (World 4 • Lv.24+)" }
      }
    },

    cinderpeak: {
      id: "cinderpeak",
      name: "Cinderpeak Caldera",
      palette: {
        ground: "#451a03",
        groundAlt: "#3b0764",
        path: "#78350f",
        pathEdge: "#9a3412",
        grass: "#b91c1c",
        grassTip: "#fb923c",
        tree: "#1c1917",
        treeTop: "#ef4444",
        liquid: "#ea580c",
        liquidShine: "#fde047",
        accent: "#f97316"
      },
      spawn: { x: 13, y: 19 },
      rows: [
        "TTTTTTTTTTTTTPPTTWTTTTTTTTTT",
        "T~~~~GGGG....R....R....GGGGT",
        "T~~~~GGGG..............GGGGT",
        "T~~~..C.....F..F.....H..~~~T",
        "T~~~....................~~~T",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGGGG..............GGGGT",
        "T..GGGGGG..R........R..GGGGT",
        "T....GGGG....GGGGGG....GGGGT",
        "T............GGGGGG........T",
        "T..GGGG................GGGGT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGG................GGGGT",
        "T..GGGG....GGGG..GGGG..GGGGT",
        "T..R...GGG.GGGG..GGGG..R...T",
        "T..............FF..........T",
        "T....GGGG..........GGGG....T",
        "T....GGGG..R....R..GGGG....T",
        "T..........................T",
        "T....GGGG..........GGGG....T",
        "TTTTTTTTTTTTTPPTTTTTTTTTTTTT"
      ],
      npcs: {
        "6,3": {
          id: "cinderpeak_shopping_center",
          name: "Obsidian Mall Shopping Center",
          role: "Flame-Roasted Meals, Fruits, Master Vaults & Bags",
          icon: "🏬",
          type: "shopping_center",
          color: "#f59e0b",
          dialogue: [
            "“Welcome to Obsidian Mall! Our flame-cooked Homestead Feast Platters and Sovereign Stasis Traps are forged right here in Cinderpeak!”"
          ]
        },
        "21,3": {
          id: "cinderpeak_hospital",
          name: "Caldera Kin Care Hospital",
          role: "Thermal Burn Clinic, Hyper Tonics & Revival Dew",
          icon: "🏥",
          type: "hospital",
          color: "#ef4444",
          dialogue: [
            "“Welcome to the Caldera Kin Care Hospital! Our cooling Aether chambers heal volcanic fatigue and restore your entire squad.”"
          ]
        },
        "17,0": {
          id: "warden_ignis",
          name: "Warden Ignis",
          role: "Obsidian Caldera Warden",
          icon: "🔥",
          type: "warden",
          wardenId: "ignis",
          color: "#f97316",
          dialogue: [
            "“From magma and ash, true strength is forged! Face my Pyre and Terra titans for the Solar Crest!”"
          ],
          quest: {
            id: "npc_q_ignis_caldera",
            title: "Crucible of Flame: Bind 8 Species",
            desc: "Bind at least 8 unique Kin species in your KinDex to earn Warden Ignis’s respect.",
            stat: "kinBound",
            target: 8,
            rewardShards: 420,
            rewardGems: 40,
            rewardItem: "feastPlatter",
            rewardQty: 2
          }
        },
        "9,9": {
          id: "npc_smith_vulkan",
          name: "Pyro-Smith Vulkan",
          role: "Master Snare Crafter",
          icon: "⚒️",
          type: "guide",
          color: "#fb923c",
          dialogue: [
            "“The wild Basaltitan, Obsidianox, and Craggolem in this caldera are Lv.26–38 with +52% armor and attack! Train to Lv.35+ before attempting Frostveil Expanse!”"
          ],
          quest: {
            id: "npc_q_vulkan_feed",
            title: "Volcanic Stamina: Feed 3 Meals or Fruits",
            desc: "Feed 3 fruits, berries, or meals to keep your squad energized in the caldera heat.",
            stat: "foodFed",
            target: 3,
            rewardShards: 320,
            rewardGems: 30,
            rewardItem: "heartwoodStew",
            rewardQty: 2
          }
        },
        "18,9": {
          id: "tamer_ember",
          name: "Pyromancer Ash",
          role: "Caldera Vanguard Tamer",
          icon: "🔥",
          type: "tamer",
          color: "#ef4444",
          rewardShards: 380,
          dialogue: [
            "“Can your Kin handle the molten fury of Cinderpeak Caldera? Show me!”"
          ],
          team: [
            { speciesId: 2, level: 28 },
            { speciesId: 16, level: 30 },
            { speciesId: 24, level: 32 }
          ]
        },
        "10,16": {
          id: "tamer_rex",
          name: "Magma Hunter Rex",
          role: "Basalt Trench Trapper",
          icon: "🌋",
          type: "tamer",
          color: "#f97316",
          rewardShards: 350,
          dialogue: [
            "“Only A-Rank and S-Rank Kin thrive near these lava vents! Let’s see what your squad is made of!”"
          ],
          team: [
            { speciesId: 23, level: 27 },
            { speciesId: 25, level: 29 }
          ]
        }
      },
      portals: {
        "13,21": { targetZone: "stormspire", targetX: 13, targetY: 2, label: "South Gate → Stormspire Ridge (World 3)" },
        "14,21": { targetZone: "stormspire", targetX: 14, targetY: 2, label: "South Gate → Stormspire Ridge (World 3)" },
        "13,0": { targetZone: "frostveil", targetX: 13, targetY: 19, label: "North Gate → Frostveil Expanse (World 5 • Lv.35+)" },
        "14,0": { targetZone: "frostveil", targetX: 14, targetY: 19, label: "North Gate → Frostveil Expanse (World 5 • Lv.35+)" }
      }
    },

    frostveil: {
      id: "frostveil",
      name: "Frostveil Expanse",
      palette: {
        ground: "#1e293b",
        groundAlt: "#0f172a",
        path: "#cbd5e1",
        pathEdge: "#94a3b8",
        grass: "#0284c7",
        grassTip: "#67e8f9",
        tree: "#0f172a",
        treeTop: "#bae6fd",
        liquid: "#38bdf8",
        liquidShine: "#f0f9ff",
        accent: "#67e8f9"
      },
      spawn: { x: 13, y: 19 },
      rows: [
        "TTTTTTTTTTTTTPPTTWTTTTTTTTTT",
        "TGGGGGG....R....R....GGGGGGT",
        "TGGGGGG..............GGGGGGT",
        "TGGG..C.....F..F.....H..GGGT",
        "TGGG....................GGGT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGGGG..............GGGGT",
        "T..GGGGGG..R........R..GGGGT",
        "T....GGGG....GGGGGG....GGGGT",
        "T............GGGGGG........T",
        "T..GGGG................GGGGT",
        "T..GGGG~~BBBB~~~~BBBB~~GGGGT",
        "T..GGGG~~BBBB~~~~BBBB~~GGGGT",
        "T......~~~~........~~~~....T",
        "T..GGGG....GGGG..GGGG..GGGGT",
        "T..GGGG....GGGG..GGGG..GGGGT",
        "T..R...GGG....FF....GGG..R.T",
        "T..........................T",
        "T....GGGG..........GGGG....T",
        "T....GGGG....F..F..GGGG....T",
        "T..........................T",
        "TTTTTTTTTTTTTPPTTTTTTTTTTTTT"
      ],
      npcs: {
        "6,3": {
          id: "frostveil_shopping_center",
          name: "Aurora Galleria Shopping Center",
          role: "Hot Stews, Berries, Apex Nectar, Traps & Bags",
          icon: "🏬",
          type: "shopping_center",
          color: "#f59e0b",
          dialogue: [
            "“Welcome to Aurora Galleria Shopping Center! Warm up your squad with hot Heartwood Stew, Apex Nectar, and Sovereign Stasis Traps!”"
          ]
        },
        "21,3": {
          id: "frostveil_hospital",
          name: "Frostveil Kin Care Hospital",
          role: "Cryo-Recovery Clinic, Full Tonics & Revival Dew",
          icon: "🏥",
          type: "hospital",
          color: "#ef4444",
          dialogue: [
            "“Welcome to Frostveil Kin Care Hospital! Step inside our heated crystal ward to heal frostbite and buy Phoenix Revival Dew.”"
          ]
        },
        "17,0": {
          id: "warden_freya",
          name: "Warden Freya",
          role: "Crystal Aurora Warden",
          icon: "❄️",
          type: "warden",
          wardenId: "freya",
          color: "#67e8f9",
          dialogue: [
            "“Beneath the aurora, only crystal clarity prevails. Challenge my Lv.42–48 apex squad for the Frostveil Crest!”"
          ],
          quest: {
            id: "npc_q_freya_frost",
            title: "Aurora Hunter: Win 12 Battles",
            desc: "Win 12 total battles across your journey to earn Warden Freya’s Glacial blessing.",
            stat: "battlesWon",
            target: 12,
            rewardShards: 500,
            rewardGems: 45,
            rewardItem: "phoenixDew",
            rewardQty: 2
          }
        },
        "9,9": {
          id: "npc_chronicler_bjorn",
          name: "Chronicler Bjorn",
          role: "Ancient Tundra Historian",
          icon: "🧔",
          type: "guide",
          color: "#67e8f9",
          dialogue: [
            "“Beyond the northern ice gate lies the Astral Sanctum (unlocks at Lv.48+ or 5 Crests), where High Warden Vesper and MythicLv.52–70 Kin await!”"
          ],
          quest: {
            id: "npc_q_bjorn_kindex",
            title: "Tundra Scholar: Bind 10 Species",
            desc: "Bind at least 10 different Kin species in your KinDex.",
            stat: "kinBound",
            target: 10,
            rewardShards: 450,
            rewardGems: 40,
            rewardItem: "masterPrism",
            rewardQty: 1
          }
        },
        "18,9": {
          id: "tamer_astrid",
          name: "Glacier Valkyrie Astrid",
          role: "Sub-Zero Apex Tamer",
          icon: "❄️",
          type: "tamer",
          color: "#38bdf8",
          rewardShards: 520,
          dialogue: [
            "“In Frostveil Expanse, every wild creature fights with +75% apex strength! Let’s see if your bloodline can endure the blizzard!”"
          ],
          team: [
            { speciesId: 18, level: 40 },
            { speciesId: 20, level: 42 },
            { speciesId: 6, level: 44 }
          ]
        }
      },
      portals: {
        "13,21": { targetZone: "cinderpeak", targetX: 13, targetY: 2, label: "South Gate → Cinderpeak Caldera (World 4)" },
        "14,21": { targetZone: "cinderpeak", targetX: 14, targetY: 2, label: "South Gate → Cinderpeak Caldera (World 4)" },
        "13,0": { targetZone: "sanctum", targetX: 13, targetY: 19, label: "North Gate → Astral Sanctum (World 6 • Lv.48+)" },
        "14,0": { targetZone: "sanctum", targetX: 14, targetY: 19, label: "North Gate → Astral Sanctum (World 6 • Lv.48+)" }
      }
    },

    sanctum: {
      id: "sanctum",
      name: "Astral Sanctum",
      palette: {
        ground: "#1e1b4b",
        groundAlt: "#090d16",
        path: "#a855f7",
        pathEdge: "#6366f1",
        grass: "#7e22ce",
        grassTip: "#f0abfc",
        tree: "#090d16",
        treeTop: "#c084fc",
        liquid: "#4f46e5",
        liquidShine: "#e0e7ff",
        accent: "#f0abfc"
      },
      spawn: { x: 13, y: 19 },
      rows: [
        "TTTTTTTTTTTTTPPTTWTTTTTTTTTT",
        "T~~~~GGGG....R....R....GGGGT",
        "T~~~~GGGG..............GGGGT",
        "T~~~..C.....F..F.....H..~~~T",
        "T~~~....................~~~T",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGGGG..............GGGGT",
        "T..GGGGGG..R........R..GGGGT",
        "T....GGGG....GGGGGG....GGGGT",
        "T............GGGGGG........T",
        "T..GGGG................GGGGT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T~~~BBBB~~~~BBBBBBBB~~~~BBBT",
        "T..GGGG................GGGGT",
        "T..GGGG....GGGG..GGGG..GGGGT",
        "T..R...GGG.GGGG..GGGG..R...T",
        "T..............FF..........T",
        "T....GGGG..........GGGG....T",
        "T....GGGG..R....R..GGGG....T",
        "T..........................T",
        "T....GGGG..........GGGG....T",
        "TTTTTTTTTTTTTPPTTTTTTTTTTTTT"
      ],
      npcs: {
        "6,3": {
          id: "sanctum_shopping_center",
          name: "Celestial Emporium Shopping Center",
          role: "Astral Feasts, Apex Nectar, Master Vaults & Bags",
          icon: "🏬",
          type: "shopping_center",
          color: "#f59e0b",
          dialogue: [
            "“Welcome to the Celestial Emporium Shopping Center! Prepare for High Warden Vesper with Homestead Feast Platters, Sovereign XP Tomes, and Sovereign Stasis Traps!”"
          ]
        },
        "21,3": {
          id: "sanctum_hospital",
          name: "Astral Kin Care Hospital",
          role: "Starlight Medical Sanctuary & Full Squad Revival",
          icon: "🏥",
          type: "hospital",
          color: "#ef4444",
          dialogue: [
            "“Welcome to the Astral Kin Care Hospital! Starlight resonance restores your entire squad and stocks Phoenix Revival Dew.”"
          ]
        },
        "17,0": {
          id: "warden_vesper",
          name: "High Warden Vesper",
          role: "Grand Sovereign of the Citadel",
          icon: "👑",
          type: "warden",
          wardenId: "vesper",
          color: "#c084fc",
          dialogue: [
            "“You have walked all six expansive realms of Aetheria. Behold the cosmic synthesis of Umbra and Volt—battle my Mythic squad for the Astral Crest!”"
          ],
          quest: {
            id: "npc_q_vesper_crown",
            title: "Sovereign Trial: Win 18 Battles",
            desc: "Triumph in 18 total battles across Aetheria to prove your worth at the Citadel.",
            stat: "battlesWon",
            target: 18,
            rewardShards: 750,
            rewardGems: 60,
            rewardItem: "apexTome",
            rewardQty: 1
          }
        },
        "9,9": {
          id: "npc_seer_nyx",
          name: "Star-Seer Nyx",
          role: "Citadel Astral Oracle",
          icon: "🔮",
          type: "guide",
          color: "#f0abfc",
          dialogue: [
            "“Wild Astralwyrm and Aetherion roam these starlight ruins at Lv.52–70 with 2.05x Sovereign stats! Only true masters can bind them!”"
          ],
          quest: {
            id: "npc_q_nyx_radiant",
            title: "Starlight Blessing: Breed 2 Offspring",
            desc: "Hatch 2 Offspring Eggs at the Ranch to channel starlight genetics.",
            stat: "kinBred",
            target: 2,
            rewardShards: 500,
            rewardGems: 50,
            rewardItem: "apexNectar",
            rewardQty: 2
          }
        },
        "18,9": {
          id: "tamer_solon",
          name: "High Arbiter Solon",
          role: "Citadel Sovereign Champion",
          icon: "🌌",
          type: "tamer",
          color: "#c084fc",
          rewardShards: 720,
          dialogue: [
            "“Before you stand before High Warden Vesper, prove your squad can survive my SS-Rank Citadel Guardians!”"
          ],
          team: [
            { speciesId: 3, level: 54 },
            { speciesId: 9, level: 56 },
            { speciesId: 26, level: 58 }
          ]
        }
      },
      portals: {
        "13,21": { targetZone: "frostveil", targetX: 13, targetY: 2, label: "South Gate → Frostveil Expanse (World 5)" },
        "14,21": { targetZone: "frostveil", targetX: 14, targetY: 2, label: "South Gate → Frostveil Expanse (World 5)" },
        "13,0": { targetZone: "meadow", targetX: 13, targetY: 19, label: "North Gate → Sunleaf Meadow (World 1)" },
        "14,0": { targetZone: "meadow", targetX: 14, targetY: 19, label: "North Gate → Sunleaf Meadow (World 1)" }
      }
    }
  };

  function getTileAt(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (ry < 0 || ry >= MAP_HEIGHT || rx < 0 || rx >= MAP_WIDTH) return "T";
    const row = map.rows[ry] || "";
    const ch = row[rx] || "T";
    if (ch === "1" || ch === "2" || ch === "3") return ".";
    return ch;
  }

  /**
   * Computes smooth 3D terrain elevation (in world Y units) at any (x, y) coordinate.
   * Supports both integer tile coords and continuous float coords for smooth walking over hills & plateaus!
   */
  function getElevationAt(zoneId, x, y) {
    const fx = Number(x) || 0;
    const fy = Number(y) || 0;
    const ch = getTileAt(zoneId, fx, fy);

    if (ch === "~") {
      return -0.22;
    }

    const biomeRelief = {
      meadow: 0.72,
      tidecove: 0.65,
      stormspire: 1.18,
      cinderpeak: 1.12,
      frostveil: 1.05,
      sanctum: 1.25
    }[zoneId] || 0.8;

    // 1. Northern Warden Sanctum & Town Terrace Plateau (rows 0..5 rise smoothly)
    let plateau = 0;
    if (fy < 6.0) {
      const t = Math.max(0, Math.min(1, (6.0 - fy) / 6.0));
      plateau = t * t * (3 - 2 * t) * (0.78 * biomeRelief);
    }

    // 2. Western & Eastern Highland Ridges (x < 7 or x > 20 rise into scenic overlooks)
    let ridge = 0;
    const distFromCenter = Math.abs(fx - 13.5);
    if (distFromCenter > 5.5) {
      const r = Math.min(1, (distFromCenter - 5.5) / 8.0);
      ridge = r * r * (0.52 * biomeRelief);
    }

    // 3. Natural rolling hills across hunting grounds
    const wave = (Math.sin(fx * 0.42) * 0.18 + Math.cos(fy * 0.36) * 0.16 + 0.16) * biomeRelief;

    if (ch === "B") {
      // Arched bridge over water/lava channels
      return 0.24 + Math.sin((fx % 4) * 0.75) * 0.08;
    }

    const total = Number((plateau + ridge + wave).toFixed(3));
    return Math.max(0.0, Math.min(1.85, total));
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
        type: "portal",
        icon: "🌀",
        targetZone: p.targetZone,
        targetX: p.targetX,
        targetY: p.targetY,
        label: p.label,
        x,
        y
      };
    }
    const ch = getTileAt(zoneId, x, y);
    if (ch === "S" || ch === "H") {
      return {
        id: `hospital_${zoneId}`,
        name: `${map.name} Kin Care Hospital`,
        role: "Squad Medical Checkup, Vital Tonics & Revival Dew",
        icon: "🏥",
        type: "hospital",
        x,
        y
      };
    }
    if (ch === "C" || ch === "M") {
      return {
        id: `shopping_${zoneId}`,
        name: `${map.name} Shopping Center`,
        role: "Fruits, Berries, Cooked Meals, Snare Traps & Bags",
        icon: "🏬",
        type: "shopping_center",
        x,
        y
      };
    }
    return null;
  }

  // Ensure each map has .grid alias for .rows, plus compatibility anchors
  Object.values(ZONE_MAPS).forEach((m) => {
    if (!m.grid) m.grid = m.rows;
  });
  if (ZONE_MAPS.meadow && ZONE_MAPS.meadow.npcs && ZONE_MAPS.meadow.npcs["13,10"]) {
    ZONE_MAPS.meadow.npcs["6,5"] = Object.assign({}, ZONE_MAPS.meadow.npcs["13,10"], { id: "rowan", isGrandpa: true });
  }

  function isWalkableTile(ch) {
    if (!ch || ch === "#" || ch === "T" || ch === "~" || ch === "R") return false;
    return true;
  }

  function getTileInfo(zoneId, x, y) {
    const map = ZONE_MAPS[zoneId] || ZONE_MAPS.meadow;
    const ch = getTileAt(zoneId, x, y);
    const key = `${x},${y}`;
    const portal = (map.portals && map.portals[key]) || null;
    const npc = getNpcAt(zoneId, x, y);
    const elevation = getElevationAt(zoneId, x, y);
    return {
      tile: ch,
      walkable: isWalkableTile(ch),
      elevation,
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
    getElevationAt,
    getNpcAt,
    getTileInfo,
    isWalkableTile
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  root.WILDKIN_MAPS = exported;
})(typeof window !== "undefined" ? window : globalThis);
