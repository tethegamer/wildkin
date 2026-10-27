/**
 * WILDKIN: AETHER BOUND — Core World, Creature, Move, Zone & Warden Data
 * 100% Original IP — Zero copyrighted creature names, terms, or mechanics.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WILDKIN_DATA = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const AFFINITIES = {
    Pyre: {
      id: 'Pyre',
      name: 'Pyre',
      color: '#ff6b35',
      bg: '#40180e',
      icon: '🔥',
      desc: 'Solar & Volcanic flame energy. Scorches Grove and banishes Umbra.'
    },
    Tide: {
      id: 'Tide',
      name: 'Tide',
      color: '#38bdf8',
      bg: '#0c2d48',
      icon: '🌊',
      desc: 'Abyssal & oceanic currents. Douses Pyre and erodes Terra.'
    },
    Grove: {
      id: 'Grove',
      name: 'Grove',
      color: '#4ade80',
      bg: '#0f351e',
      icon: '🌿',
      desc: 'Ancient sylvan life-force. Drinks Tide and roots into Terra.'
    },
    Volt: {
      id: 'Volt',
      name: 'Volt',
      color: '#facc15',
      bg: '#3b2f07',
      icon: '⚡',
      desc: 'Tempest & arc lightning. Conducts through Tide with blinding speed.'
    },
    Terra: {
      id: 'Terra',
      name: 'Terra',
      color: '#d97706',
      bg: '#362009',
      icon: '🪨',
      desc: 'Tectonic stone & crystal. Grounds Volt and smothers Pyre.'
    },
    Umbra: {
      id: 'Umbra',
      name: 'Umbra',
      color: '#c084fc',
      bg: '#2b124c',
      icon: '🌙',
      desc: 'Astral rift & twilight essence. Withers Grove and absorbs Volt.'
    }
  };

  // Type effectiveness matrix: TYPE_CHART[attackAffinity][defendAffinity] = multiplier
  const TYPE_CHART = {
    Pyre:  { Pyre: 0.5, Tide: 0.5, Grove: 2.0, Volt: 1.0, Terra: 0.5, Umbra: 2.0 },
    Tide:  { Pyre: 2.0, Tide: 0.5, Grove: 0.5, Volt: 0.5, Terra: 2.0, Umbra: 1.0 },
    Grove: { Pyre: 0.5, Tide: 2.0, Grove: 0.5, Volt: 1.0, Terra: 2.0, Umbra: 0.5 },
    Volt:  { Pyre: 1.0, Tide: 2.0, Grove: 0.5, Volt: 0.5, Terra: 0.5, Umbra: 0.5 },
    Terra: { Pyre: 2.0, Tide: 0.5, Grove: 0.5, Volt: 2.0, Terra: 1.0, Umbra: 1.0 },
    Umbra: { Pyre: 0.5, Tide: 1.0, Grove: 2.0, Volt: 2.0, Terra: 0.5, Umbra: 0.5 }
  };

  function getTypeMultiplier(atkAffinity, defAffinity) {
    if (!TYPE_CHART[atkAffinity] || TYPE_CHART[atkAffinity][defAffinity] === undefined) {
      return 1.0;
    }
    return TYPE_CHART[atkAffinity][defAffinity];
  }

  // Moves Dictionary — Balanced 4-Archetype Tactical System
  const MOVES = {
    clawSwipe: {
      id: 'clawSwipe', name: 'Claw Swipe', affinity: 'Terra', archetype: 'strike', power: 56, accuracy: 100, stamina: 20,
      category: 'physical', effectTag: '🎯 100% Reliable', desc: 'A swift, reliable slash with hardened claws.'
    },
    quickDash: {
      id: 'quickDash', name: 'Quick Dash', affinity: 'Volt', archetype: 'strike', power: 55, accuracy: 100, stamina: 20,
      category: 'physical', priority: 1, effectTag: '⚡ First-Strike', desc: 'Lunges at blinding speed. Always strikes first.'
    },
    emberPounce: {
      id: 'emberPounce', name: 'Ember Pounce', affinity: 'Pyre', archetype: 'strike', power: 58, accuracy: 100, stamina: 20,
      category: 'physical', statusEffect: { type: 'burn', chance: 0.25 }, effectTag: '🔥 Burn 25%', desc: 'Leaps cloaked in sparks. 25% chance to Burn.'
    },
    flameBurst: {
      id: 'flameBurst', name: 'Flame Burst', affinity: 'Pyre', archetype: 'heavy', power: 82, accuracy: 90, stamina: 10,
      category: 'special', statusEffect: { type: 'burn', chance: 0.30 }, effectTag: '🔥 Burn 30%', desc: 'Searing fireball with high STAB power.'
    },
    solarFlare: {
      id: 'solarFlare', name: 'Solar Flare', affinity: 'Pyre', archetype: 'ultimate', power: 118, accuracy: 78, stamina: 5,
      category: 'special', cooldown: 1, recoil: 0.15, statusEffect: { type: 'burn', chance: 0.35 }, effectTag: '☀️ 1T CD • 15% Recoil', desc: 'Ultimate sunfire finisher. 1-turn cooldown & 15% recoil.'
    },
    magmaCrush: {
      id: 'magmaCrush', name: 'Magma Crush', affinity: 'Pyre', archetype: 'heavy', power: 86, accuracy: 88, stamina: 10,
      category: 'physical', statusEffect: { type: 'burn', chance: 0.25 }, effectTag: '🌋 Heavy Slam', desc: 'Molten-armored slam with heavy impact.'
    },
    rippleJet: {
      id: 'rippleJet', name: 'Ripple Jet', affinity: 'Tide', archetype: 'strike', power: 56, accuracy: 100, stamina: 20,
      category: 'physical', priority: 1, effectTag: '🌊 First-Strike', desc: 'High-pressure water dart that strikes first.'
    },
    brinePulse: {
      id: 'brinePulse', name: 'Brine Pulse', affinity: 'Tide', archetype: 'heavy', power: 82, accuracy: 90, stamina: 10,
      category: 'special', statusEffect: { type: 'soak', chance: 0.30 }, effectTag: '🌊 Soak -25% Spd', desc: 'Crashing wave that Soaks & slows the foe.'
    },
    tidalVortex: {
      id: 'tidalVortex', name: 'Tidal Vortex', affinity: 'Tide', archetype: 'ultimate', power: 115, accuracy: 78, stamina: 5,
      category: 'special', cooldown: 1, recoil: 0.15, statusEffect: { type: 'soak', chance: 0.35 }, effectTag: '🌀 1T CD • 15% Recoil', desc: 'Ultimate abyssal whirlpool. 1-turn cooldown & 15% recoil.'
    },
    rimeFang: {
      id: 'rimeFang', name: 'Rime Fang', affinity: 'Tide', archetype: 'tactical', power: 52, accuracy: 96, stamina: 15,
      category: 'physical', statusEffect: { type: 'soak', chance: 0.40 }, effectTag: '❄️ Chill -25% Spd', desc: 'Chilling bite with 40% chance to slow enemy Speed.'
    },
    vineLash: {
      id: 'vineLash', name: 'Briar Lash', affinity: 'Grove', archetype: 'strike', power: 58, accuracy: 100, stamina: 20,
      category: 'physical', effectTag: '🌿 100% Reliable', desc: 'Snaps thorny vines across the target.'
    },
    sporeDrain: {
      id: 'sporeDrain', name: 'Sap Drain', affinity: 'Grove', archetype: 'tactical', power: 54, accuracy: 98, stamina: 14,
      category: 'special', drain: 0.35, effectTag: '💚 Drain 35% HP', desc: 'Absorbs life energy, healing 35% of damage dealt.'
    },
    razorCanopy: {
      id: 'razorCanopy', name: 'Briar Canopy', affinity: 'Grove', archetype: 'heavy', power: 84, accuracy: 90, stamina: 10,
      category: 'physical', critBonus: 0.25, effectTag: '💥 +25% Crit', desc: 'Whirling iron-leaves with a high critical rate.'
    },
    sylvanWrath: {
      id: 'sylvanWrath', name: 'Sylvan Wrath', affinity: 'Grove', archetype: 'ultimate', power: 116, accuracy: 78, stamina: 5,
      category: 'special', cooldown: 1, recoil: 0.15, statusEffect: { type: 'poison', chance: 0.35 }, effectTag: '🌲 1T CD • 15% Recoil', desc: 'Ultimate forest surge. 1-turn cooldown & 15% recoil.'
    },
    sparkPeck: {
      id: 'sparkPeck', name: 'Spark Peck', affinity: 'Volt', archetype: 'strike', power: 58, accuracy: 100, stamina: 20,
      category: 'physical', statusEffect: { type: 'paralyze', chance: 0.25 }, effectTag: '⚡ Stun 25%', desc: 'Electrified beak strike. 25% chance to Paralyze.'
    },
    arcBolt: {
      id: 'arcBolt', name: 'Arc Bolt', affinity: 'Volt', archetype: 'heavy', power: 82, accuracy: 90, stamina: 10,
      category: 'special', statusEffect: { type: 'paralyze', chance: 0.30 }, effectTag: '⚡ Stun 30%', desc: 'Crackling high-voltage lightning arc.'
    },
    tempestDive: {
      id: 'tempestDive', name: 'Tempest Dive', affinity: 'Volt', archetype: 'ultimate', power: 116, accuracy: 78, stamina: 5,
      category: 'physical', cooldown: 1, recoil: 0.15, statusEffect: { type: 'paralyze', chance: 0.30 }, effectTag: '🌩️ 1T CD • 15% Recoil', desc: 'Ultimate thunder-plummet. 1-turn cooldown & 15% recoil.'
    },
    pebbleToss: {
      id: 'pebbleToss', name: 'Shale Toss', affinity: 'Terra', archetype: 'strike', power: 58, accuracy: 100, stamina: 20,
      category: 'physical', effectTag: '🪨 100% Reliable', desc: 'Hurls jagged stones at the enemy with pinpoint accuracy.'
    },
    quakeStomp: {
      id: 'quakeStomp', name: 'Quake Stomp', affinity: 'Terra', archetype: 'heavy', power: 85, accuracy: 90, stamina: 10,
      category: 'physical', effectTag: '🪨 Tectonic Smash', desc: 'Shakes the battlefield with heavy tectonic force.'
    },
    crystalSpire: {
      id: 'crystalSpire', name: 'Crystal Spire', affinity: 'Terra', archetype: 'ultimate', power: 115, accuracy: 78, stamina: 5,
      category: 'special', cooldown: 1, recoil: 0.15, critBonus: 0.25, effectTag: '💎 1T CD • 15% Recoil', desc: 'Ultimate quartz eruption. 1-turn cooldown & 15% recoil.'
    },
    duskDart: {
      id: 'duskDart', name: 'Dusk Wing', affinity: 'Umbra', archetype: 'strike', power: 58, accuracy: 100, stamina: 20,
      category: 'special', statusEffect: { type: 'poison', chance: 0.25 }, effectTag: '☠️ Poison 25%', desc: 'Scatters twilight dust that may Poison.'
    },
    voidPulse: {
      id: 'voidPulse', name: 'Astral Pulse', affinity: 'Umbra', archetype: 'heavy', power: 84, accuracy: 90, stamina: 10,
      category: 'special', drain: 0.25, effectTag: '🌙 Drain 25% HP', desc: 'Warps gravity with dark starlight and siphons 25% HP.'
    },
    eclipseNova: {
      id: 'eclipseNova', animType: 'aether_beam', name: 'Eclipse Nova', affinity: 'Umbra', archetype: 'ultimate', power: 120, accuracy: 76, stamina: 5,
      category: 'special', cooldown: 1, recoil: 0.15, statusEffect: { type: 'burn', chance: 0.35 }, effectTag: '🌑 1T CD • 15% Recoil', desc: 'Ultimate collapsing star. 1-turn cooldown & 15% recoil.'
    },
    aetherFocus: {
      id: 'aetherFocus', name: 'Aether Focus', affinity: 'Volt', archetype: 'tactical', power: 0, accuracy: 100, stamina: 15,
      category: 'status', selfBuff: { atk: 1.35, spd: 1.2, crit: 0.20 }, effectTag: '🎯 +35% Atk / +20% Crit', desc: 'Harmonizes Aether to raise Attack (+35%), Speed (+20%) & Crit.'
    },
    venom_fang: {
      id: 'venom_fang', name: 'Shadow Venom Fang', affinity: 'Umbra', archetype: 'tactical', power: 55, accuracy: 95, stamina: 15,
      category: 'physical', effect: 'poison_weaken', animType: 'shadow_miasma',
      statusEffect: { type: 'poison', chance: 1.0, weaken: true }, effectTag: '☠️ Shadow Poison (-12% Atk/Def/T)',
      desc: 'Bites with toxic shadow fangs. Inflicts Shadow Poison that drains HP and weakens Attack & Defense by 12% every round.'
    },
    blight_miasma: {
      id: 'blight_miasma', name: 'Umbral Blight Cloud', affinity: 'Umbra', archetype: 'tactical', power: 45, accuracy: 100, stamina: 12,
      category: 'special', effect: 'poison_weaken', animType: 'shadow_miasma',
      statusEffect: { type: 'poison', chance: 1.0, weaken: true }, effectTag: '☠️ Toxic Decay (-12% Atk/Def/T)',
      desc: 'Blankets the foe in corrosive dark venom, stacking Toxic Decay (-HP & -12% Atk/Def per round).'
    },
    abyssal_toxin: {
      id: 'abyssal_toxin', name: 'Abyssal Neurotoxin', affinity: 'Umbra', archetype: 'heavy', power: 75, accuracy: 90, stamina: 10,
      category: 'special', effect: 'poison_weaken', bonusVsPoisoned: 1.30, animType: 'shadow_miasma',
      statusEffect: { type: 'poison', chance: 0.85, weaken: true }, effectTag: '☠️ +30% vs Poisoned',
      desc: 'Injects shadow venom that deals +30% bonus damage if the target is already poisoned and corrodes their stats each turn.'
    },
    spore_venom: {
      id: 'spore_venom', name: 'Venom Spore Lash', affinity: 'Grove', archetype: 'tactical', power: 50, accuracy: 95, stamina: 15,
      category: 'special', effect: 'poison_weaken', animType: 'shadow_miasma',
      statusEffect: { type: 'poison', chance: 0.90, weaken: true }, effectTag: '☠️ Spore Decay (-12% Atk/Def/T)',
      desc: 'Lashes with toxic spores that poison and sap the enemy strength every round.'
    },
    galeVortex: {
      id: 'galeVortex', name: 'Cyclone Tempest', affinity: 'Volt', archetype: 'heavy', power: 80, accuracy: 92, stamina: 12,
      category: 'special', animType: 'tornado', statusEffect: { type: 'soak', chance: 0.30 }, effectTag: '🌪️ Wind Tornado',
      desc: 'Summons a roaring 3D wind tornado vortex that lifts and batters the foe.'
    },
    ironShell: {
      id: 'ironShell', name: 'Granite Guard', affinity: 'Terra', archetype: 'tactical', power: 0, accuracy: 100, stamina: 15,
      category: 'status', selfBuff: { def: 1.40 }, effectTag: '🛡️ +40% Def (3T)', desc: 'Hardens outer carapace to boost Defense (+40%).'
    }
  };

  // 27 Original Kin Species
  const KIN_SPECIES = [
    // --- PYRE STARTER LINE (1-3) ---
    {
      id: 1,
      slug: 'cinderkit',
      name: 'Cinderkit',
      title: 'Ember Cub Kin',
      affinity: 'Pyre',
      starter: true,
      stage: 1,
      evolvesTo: { id: 2, level: 10 },
      baseStats: { hp: 46, atk: 54, def: 42, spd: 58 },
      catchRate: 0.45,
      moves: ['emberPounce', 'clawSwipe', 'quickDash', 'aetherFocus'],
      palette: { primary: '#ff6b35', secondary: '#fde047', accent: '#7c2d12', eye: '#38bdf8' },
      radiantPalette: { primary: '#38bdf8', secondary: '#f472b6', accent: '#1e1b4b', eye: '#fde047' },
      lore: 'Its tail tuft crackles with warm hearth-sparks. When excited, its paw pads leave glowing prints in the grass.'
    },
    {
      id: 2,
      slug: 'pyrolynx',
      name: 'Pyrolynx',
      title: 'Flare Stalker Kin',
      affinity: 'Pyre',
      stage: 2,
      evolvesTo: { id: 3, level: 22 },
      baseStats: { hp: 64, atk: 76, def: 58, spd: 80 },
      catchRate: 0.25,
      moves: ['emberPounce', 'flameBurst', 'quickDash', 'aetherFocus'],
      palette: { primary: '#ea580c', secondary: '#facc15', accent: '#431407', eye: '#22d3ee' },
      radiantPalette: { primary: '#0ea5e9', secondary: '#e879f9', accent: '#0f172a', eye: '#facc15' },
      lore: 'Streaks across volcanic ridges faster than the eye can follow, using its twin flame-ears to sense thermal currents.'
    },
    {
      id: 3,
      slug: 'solartiger',
      name: 'Solartiger',
      title: 'Suncrest Sovereign Kin',
      affinity: 'Pyre',
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 88, atk: 104, def: 80, spd: 98 },
      catchRate: 0.12,
      moves: ['solarFlare', 'flameBurst', 'magmaCrush', 'aetherFocus'],
      palette: { primary: '#dc2626', secondary: '#fef08a', accent: '#450a0a', eye: '#38bdf8' },
      radiantPalette: { primary: '#6366f1', secondary: '#fde047', accent: '#1e1b4b', eye: '#22d3ee' },
      lore: 'Crowned with a halo of pure solar plasma. Ancient murals depict Solartiger guarding the first Wellspring Shrine.'
    },

    // --- TIDE STARTER LINE (4-6) ---
    {
      id: 4,
      slug: 'ripplefin',
      name: 'Ripplefin',
      title: 'Wave Newt Kin',
      affinity: 'Tide',
      starter: true,
      stage: 1,
      evolvesTo: { id: 5, level: 10 },
      baseStats: { hp: 50, atk: 48, def: 52, spd: 50 },
      catchRate: 0.45,
      moves: ['rippleJet', 'clawSwipe', 'ironShell', 'brinePulse'],
      palette: { primary: '#38bdf8', secondary: '#bae6fd', accent: '#0369a1', eye: '#facc15' },
      radiantPalette: { primary: '#34d399', secondary: '#fef08a', accent: '#064e3b', eye: '#f43f5e' },
      lore: 'Playful and endlessly curious, its frilled crest vibrates to predict incoming rainstorms hours in advance.'
    },
    {
      id: 5,
      slug: 'torrentscale',
      name: 'Torrentscale',
      title: 'Reef Vanguard Kin',
      affinity: 'Tide',
      stage: 2,
      evolvesTo: { id: 6, level: 22 },
      baseStats: { hp: 70, atk: 68, def: 74, spd: 66 },
      catchRate: 0.25,
      moves: ['rippleJet', 'brinePulse', 'rimeFang', 'ironShell'],
      palette: { primary: '#0284c7', secondary: '#7dd3fc', accent: '#0c4a6e', eye: '#fde047' },
      radiantPalette: { primary: '#10b981', secondary: '#a7f3d0', accent: '#022c22', eye: '#fb7185' },
      lore: 'Armored in hydro-smooth plates that deflect arrows and claws alike while jetting through whitewater rapids.'
    },
    {
      id: 6,
      slug: 'abyssaldrake',
      name: 'Abyssaldrake',
      title: 'Trench Leviathan Kin',
      affinity: 'Tide',
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 96, atk: 92, def: 96, spd: 82 },
      catchRate: 0.12,
      moves: ['tidalVortex', 'brinePulse', 'rimeFang', 'ironShell'],
      palette: { primary: '#1d4ed8', secondary: '#67e8f9', accent: '#172554', eye: '#facc15' },
      radiantPalette: { primary: '#059669', secondary: '#fde047', accent: '#022c22', eye: '#f43f5e' },
      lore: 'Master of the oceanic trenches. Bioluminescent runes along its spine glow brightest under crushing pressure.'
    },

    // --- GROVE STARTER LINE (7-9) ---
    {
      id: 7,
      slug: 'mossling',
      name: 'Mossling',
      title: 'Sprout Fawn Kin',
      affinity: 'Grove',
      starter: true,
      stage: 1,
      evolvesTo: { id: 8, level: 10 },
      baseStats: { hp: 52, atk: 49, def: 50, spd: 49 },
      catchRate: 0.45,
      moves: ['vineLash', 'sporeDrain', 'clawSwipe', 'ironShell'],
      palette: { primary: '#4ade80', secondary: '#fef08a', accent: '#14532d', eye: '#fb923c' },
      radiantPalette: { primary: '#fb923c', secondary: '#fde047', accent: '#431407', eye: '#38bdf8' },
      lore: 'Sunbathes in forest clearings to sweeten the healing dew that collects on the twin leaf-buds atop its head.'
    },
    {
      id: 8,
      slug: 'thornstag',
      name: 'Thornstag',
      title: 'Canopy Hart Kin',
      affinity: 'Grove',
      stage: 2,
      evolvesTo: { id: 9, level: 22 },
      baseStats: { hp: 72, atk: 70, def: 70, spd: 68 },
      catchRate: 0.25,
      moves: ['razorCanopy', 'sporeDrain', 'vineLash', 'ironShell'],
      palette: { primary: '#22c55e', secondary: '#bef264', accent: '#052e16', eye: '#f59e0b' },
      radiantPalette: { primary: '#f97316', secondary: '#fef08a', accent: '#451a03', eye: '#22d3ee' },
      lore: 'Its antlers are living heartwood woven with emerald Aether. Where it bounds, wildflowers bloom overnight.'
    },
    {
      id: 9,
      slug: 'sylvanarch',
      name: 'Sylvanarch',
      title: 'Elderwood Monarch Kin',
      affinity: 'Grove',
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 98, atk: 90, def: 94, spd: 84 },
      catchRate: 0.12,
      moves: ['sylvanWrath', 'razorCanopy', 'sporeDrain', 'quakeStomp'],
      palette: { primary: '#15803d', secondary: '#fde047', accent: '#052e16', eye: '#38bdf8' },
      radiantPalette: { primary: '#e11d48', secondary: '#fde047', accent: '#4c0519', eye: '#38bdf8' },
      lore: 'A majestic guardian whose root-mantle links directly to the planet’s ley lines. Even tempests part before it.'
    },

    // --- VOLT AVIAN LINE (10-12) ---
    {
      id: 10,
      slug: 'sparkcheep',
      name: 'Sparkcheep',
      title: 'Static Wren Kin',
      affinity: 'Volt',
      stage: 1,
      evolvesTo: { id: 11, level: 9 },
      baseStats: { hp: 42, atk: 52, def: 38, spd: 65 },
      catchRate: 0.65,
      moves: ['sparkPeck', 'quickDash', 'clawSwipe', 'aetherFocus'],
      palette: { primary: '#facc15', secondary: '#fef9c3', accent: '#713f12', eye: '#0284c7' },
      radiantPalette: { primary: '#f472b6', secondary: '#bae6fd', accent: '#4a044e', eye: '#fde047' },
      lore: 'Fluffs its golden feathers to build static charge, then chirps a cheerful two-note spark that startles bugs.'
    },
    {
      id: 11,
      slug: 'galecrest',
      name: 'Galecrest',
      title: 'Storm Kestrel Kin',
      affinity: 'Volt',
      stage: 2,
      evolvesTo: { id: 12, level: 19 },
      baseStats: { hp: 60, atk: 72, def: 52, spd: 86 },
      catchRate: 0.35,
      moves: ['sparkPeck', 'arcBolt', 'quickDash', 'aetherFocus'],
      palette: { primary: '#eab308', secondary: '#38bdf8', accent: '#422006', eye: '#ef4444' },
      radiantPalette: { primary: '#ec4899', secondary: '#38bdf8', accent: '#500724', eye: '#fde047' },
      lore: 'Rides updrafts inside thunderheads. Tamers prize Galecrest for its loyalty and unmatched aerial scouting speed.'
    },
    {
      id: 12,
      slug: 'thunderhawk',
      name: 'Thunderhawk',
      title: 'Fulmen Raptor Kin',
      affinity: 'Volt',
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 82, atk: 98, def: 72, spd: 108 },
      catchRate: 0.15,
      moves: ['tempestDive', 'arcBolt', 'quickDash', 'aetherFocus'],
      palette: { primary: '#ca8a04', secondary: '#67e8f9', accent: '#1e1b4b', eye: '#f43f5e' },
      radiantPalette: { primary: '#c084fc', secondary: '#fde047', accent: '#2e1065', eye: '#38bdf8' },
      lore: 'Every wingbeat sounds like rolling thunder. It dives from the stratosphere wrapped in an aura of blue lightning.'
    },

    // --- MEADOW GROVE LINE (13-14) ---
    {
      id: 13,
      slug: 'bramblepuff',
      name: 'Bramblepuff',
      title: 'Thistle Pom Kin',
      affinity: 'Grove',
      stage: 1,
      evolvesTo: { id: 14, level: 8 },
      baseStats: { hp: 48, atk: 46, def: 48, spd: 44 },
      catchRate: 0.70,
      moves: ['vineLash', 'clawSwipe', 'sporeDrain', 'ironShell'],
      palette: { primary: '#84cc16', secondary: '#ecfccb', accent: '#365314', eye: '#f43f5e' },
      radiantPalette: { primary: '#f472b6', secondary: '#fef08a', accent: '#500724', eye: '#38bdf8' },
      lore: 'Rolls through Sunleaf Meadow like a tumbleweed, collecting sweet berries in its soft mossy fur.'
    },
    {
      id: 14,
      slug: 'briarhound',
      name: 'Briarhound',
      title: 'Hedge Tracker Kin',
      affinity: 'Grove',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 76, atk: 82, def: 74, spd: 78 },
      catchRate: 0.30,
      moves: ['razorCanopy', 'vineLash', 'sporeDrain', 'quickDash'],
      palette: { primary: '#4d7c0f', secondary: '#bef264', accent: '#1a2e05', eye: '#fbbf24' },
      radiantPalette: { primary: '#db2777', secondary: '#fde047', accent: '#4c0519', eye: '#38bdf8' },
      lore: 'Fiercely protective of young tamers. Its bark-plated shoulders can barge straight through solid stone walls.'
    },

    // --- TERRA CRUSTACEAN LINE (15-16) ---
    {
      id: 15,
      slug: 'pebblecrab',
      name: 'Pebblecrab',
      title: 'Shale Scuttler Kin',
      affinity: 'Terra',
      stage: 1,
      evolvesTo: { id: 16, level: 11 },
      baseStats: { hp: 54, atk: 56, def: 68, spd: 34 },
      catchRate: 0.60,
      moves: ['pebbleToss', 'clawSwipe', 'ironShell', 'quakeStomp'],
      palette: { primary: '#d97706', secondary: '#fde68a', accent: '#451a03', eye: '#38bdf8' },
      radiantPalette: { primary: '#2dd4bf', secondary: '#fef08a', accent: '#134e4a', eye: '#f43f5e' },
      lore: 'Shapes a snug fortress out of riverbank sandstone. When startled, it tucks in and looks just like a boulder.'
    },
    {
      id: 16,
      slug: 'basaltitan',
      name: 'Basaltitan',
      title: 'Monolith Bastion Kin',
      affinity: 'Terra',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 88, atk: 88, def: 106, spd: 46 },
      catchRate: 0.22,
      moves: ['crystalSpire', 'quakeStomp', 'pebbleToss', 'ironShell'],
      palette: { primary: '#b45309', secondary: '#f59e0b', accent: '#27272a', eye: '#22d3ee' },
      radiantPalette: { primary: '#0d9488', secondary: '#fde047', accent: '#042f2e', eye: '#fb7185' },
      lore: 'Carries a spire of resonant quartz on its back. One slam of its pincers can split a cavern floor in two.'
    },

    // --- TIDE COVE SERPENT LINE (17-18) ---
    {
      id: 17,
      slug: 'dewdrop',
      name: 'Dewdrop',
      title: 'Mist Sprite Kin',
      affinity: 'Tide',
      stage: 1,
      evolvesTo: { id: 18, level: 11 },
      baseStats: { hp: 52, atk: 46, def: 48, spd: 58 },
      catchRate: 0.60,
      moves: ['rippleJet', 'brinePulse', 'quickDash', 'sporeDrain'],
      palette: { primary: '#60a5fa', secondary: '#e0f2fe', accent: '#1e3a8a', eye: '#fde047' },
      radiantPalette: { primary: '#c084fc', secondary: '#fae8ff', accent: '#3b0764', eye: '#fde047' },
      lore: 'Composed of condensated sea-mist held together by a core of blue Aether. Practically invisible in fog.'
    },
    {
      id: 18,
      slug: 'mistserpent',
      name: 'Mistserpent',
      title: 'Siren Coil Kin',
      affinity: 'Tide',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 84, atk: 82, def: 78, spd: 88 },
      catchRate: 0.24,
      moves: ['tidalVortex', 'brinePulse', 'rimeFang', 'rippleJet'],
      palette: { primary: '#2563eb', secondary: '#a5f3fc', accent: '#1e1b4b', eye: '#facc15' },
      radiantPalette: { primary: '#9333ea', secondary: '#f5d0fe', accent: '#2e1065', eye: '#fde047' },
      lore: 'Glides gracefully over moonlit tides. Sailors follow its melodic hum to navigate safely around jagged reefs.'
    },

    // --- UMBRA TWILIGHT LINE (19-20) ---
    {
      id: 19,
      slug: 'duskmoth',
      name: 'Duskmoth',
      title: 'Lantern Wing Kin',
      affinity: 'Umbra',
      stage: 1,
      evolvesTo: { id: 20, level: 12 },
      baseStats: { hp: 46, atk: 54, def: 44, spd: 62 },
      catchRate: 0.55,
      moves: ['duskDart', 'sporeDrain', 'quickDash', 'voidPulse'],
      palette: { primary: '#a855f7', secondary: '#e9d5ff', accent: '#3b0764', eye: '#facc15' },
      radiantPalette: { primary: '#f43f5e', secondary: '#fecdd3', accent: '#4c0519', eye: '#38bdf8' },
      lore: 'The lunar eyespots on its wings shimmer with hypnotic starlight, lulling predators into a brief trance.'
    },
    {
      id: 20,
      slug: 'lunawraith',
      name: 'Lunawraith',
      title: 'Astral Veil Kin',
      affinity: 'Umbra',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 78, atk: 92, def: 72, spd: 94 },
      catchRate: 0.22,
      moves: ['eclipseNova', 'voidPulse', 'duskDart', 'sporeDrain'],
      palette: { primary: '#7e22ce', secondary: '#67e8f9', accent: '#1e1b4b', eye: '#fde047' },
      radiantPalette: { primary: '#be123c', secondary: '#fde047', accent: '#1f2937', eye: '#38bdf8' },
      lore: 'Drifts effortlessly between shadow and starlight. It feeds on stray anxiety, leaving calm silence in its wake.'
    },

    // --- VOLT FOX LINE (21-22) ---
    {
      id: 21,
      slug: 'voltmouse',
      name: 'Voltmouse',
      title: 'Dynamo Vole Kin',
      affinity: 'Volt',
      stage: 1,
      evolvesTo: { id: 22, level: 13 },
      baseStats: { hp: 48, atk: 56, def: 44, spd: 68 },
      catchRate: 0.55,
      moves: ['sparkPeck', 'quickDash', 'galeVortex', 'arcBolt'],
      palette: { primary: '#fbbf24', secondary: '#fef08a', accent: '#92400e', eye: '#ef4444' },
      radiantPalette: { primary: '#38bdf8', secondary: '#fde047', accent: '#0c4a6e', eye: '#f43f5e' },
      lore: 'Stores surplus electricity in the spiral markings on its flanks. Loves rubbing against metallic ore veins.'
    },
    {
      id: 22,
      slug: 'arcfox',
      name: 'Arcfox',
      title: 'Plasma Vulpine Kin',
      affinity: 'Volt',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 76, atk: 88, def: 68, spd: 102 },
      catchRate: 0.22,
      moves: ['tempestDive', 'arcBolt', 'quickDash', 'aetherFocus'],
      palette: { primary: '#f59e0b', secondary: '#38bdf8', accent: '#451a03', eye: '#22d3ee' },
      radiantPalette: { primary: '#06b6d4', secondary: '#fde047', accent: '#083344', eye: '#f43f5e' },
      lore: 'Its twin tails weave complex electromagnetic illusions, making it appear in three places at once.'
    },

    // --- PYRE CAVERN LINE (23-24) ---
    {
      id: 23,
      slug: 'magmapup',
      name: 'Magmapup',
      title: 'Cinder Hound Kin',
      affinity: 'Pyre',
      stage: 1,
      evolvesTo: { id: 24, level: 15 },
      baseStats: { hp: 58, atk: 64, def: 56, spd: 52 },
      catchRate: 0.45,
      moves: ['emberPounce', 'flameBurst', 'pebbleToss', 'ironShell'],
      palette: { primary: '#f97316', secondary: '#fca5a5', accent: '#450a0a', eye: '#fde047' },
      radiantPalette: { primary: '#a855f7', secondary: '#fde047', accent: '#2e1065', eye: '#38bdf8' },
      lore: 'Naps comfortably inside bubbling lava vents. Its collar of cooled pumice clinks softly when it trots.'
    },
    {
      id: 24,
      slug: 'obsidianox',
      name: 'Obsidianox',
      title: 'Caldera Bull Kin',
      affinity: 'Pyre',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 94, atk: 98, def: 92, spd: 64 },
      catchRate: 0.18,
      moves: ['solarFlare', 'magmaCrush', 'quakeStomp', 'ironShell'],
      palette: { primary: '#991b1b', secondary: '#fb923c', accent: '#18181b', eye: '#facc15' },
      radiantPalette: { primary: '#6b21a8', secondary: '#38bdf8', accent: '#090d16', eye: '#fde047' },
      lore: 'Horns of volcanic glass glow white-hot during battle. It guards the deep magma chambers of Cinderpeak.'
    },

    // --- RARE & MYTHIC SANCTUM KIN (25-27) ---
    {
      id: 25,
      slug: 'craggolem',
      name: 'Craggolem',
      title: 'Runestone Sentinel Kin',
      affinity: 'Terra',
      stage: 1,
      evolvesTo: null,
      baseStats: { hp: 96, atk: 90, def: 112, spd: 42 },
      catchRate: 0.18,
      moves: ['crystalSpire', 'quakeStomp', 'magmaCrush', 'ironShell'],
      palette: { primary: '#78716c', secondary: '#38bdf8', accent: '#292524', eye: '#facc15' },
      radiantPalette: { primary: '#eab308', secondary: '#22d3ee', accent: '#422006', eye: '#f43f5e' },
      lore: 'An ancient construct awakened by concentrated Aether. Glowing cyan runes bind its floating stone fists.'
    },
    {
      id: 26,
      slug: 'astralwyrm',
      name: 'Astralwyrm',
      title: 'Nebula Ouroboros Kin',
      affinity: 'Umbra',
      mythic: true,
      stage: 1,
      evolvesTo: null,
      baseStats: { hp: 102, atk: 106, def: 90, spd: 98 },
      catchRate: 0.10,
      moves: ['eclipseNova', 'voidPulse', 'tidalVortex', 'aetherFocus'],
      palette: { primary: '#6366f1', secondary: '#f472b6', accent: '#1e1b4b', eye: '#fde047' },
      radiantPalette: { primary: '#f43f5e', secondary: '#fde047', accent: '#31102f', eye: '#22d3ee' },
      lore: 'Mythic Kin born where starlight meets the Astral Ruin Sanctum. Its translucent wings hold entire constellations.'
    },
        {
      id: 27,
      slug: 'aetherion',
      name: 'Aetherion',
      title: 'Prism Sovereign Kin',
      affinity: 'Volt',
      mythic: true,
      stage: 1,
      evolvesTo: null,
      baseStats: { hp: 106, atk: 110, def: 96, spd: 108 },
      catchRate: 0.08,
      moves: ['tempestDive', 'eclipseNova', 'solarFlare', 'aetherFocus'],
      palette: { primary: '#22d3ee', secondary: '#fde047', accent: '#0f172a', eye: '#f43f5e' },
      radiantPalette: { primary: '#facc15', secondary: '#ec4899', accent: '#1e1b4b', eye: '#38bdf8' },
      lore: 'The legendary progenitor of all Aether Prisms. Only a tamer who has earned all four Warden Crests can earn its respect.'
    },

    // --- EXPANDED ELEMENTAL & AQUATIC ROSTER (28-33: 3-4+ Per Element & Rare Water Leviathans) ---
    {
      id: 28,
      slug: 'terragrif',
      name: 'Terragrif',
      title: 'Sandstone Cub Kin',
      affinity: 'Terra',
      stage: 1,
      evolvesTo: { id: 29, level: 16 },
      baseStats: { hp: 64, atk: 68, def: 72, spd: 48 },
      catchRate: 0.45,
      moves: ['pebbleToss', 'clawSwipe', 'quakeStomp', 'ironShell'],
      palette: { primary: '#d97706', secondary: '#fde68a', accent: '#451a03', eye: '#38bdf8' },
      radiantPalette: { primary: '#10b981', secondary: '#fde047', accent: '#064e3b', eye: '#f43f5e' },
      lore: 'Prowls canyon riverbeds and ancient stone bridges, sharpening its quartz talons on riverbed boulders.'
    },
    {
      id: 29,
      slug: 'monolithon',
      name: 'Monolithon',
      title: 'Tectonic Colossus Kin',
      affinity: 'Terra',
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 104, atk: 96, def: 116, spd: 44 },
      catchRate: 0.16,
      moves: ['crystalSpire', 'quakeStomp', 'magmaCrush', 'ironShell'],
      palette: { primary: '#92400e', secondary: '#38bdf8', accent: '#1c1917', eye: '#facc15' },
      radiantPalette: { primary: '#059669', secondary: '#fde047', accent: '#022c22', eye: '#38bdf8' },
      lore: 'A towering tectonic guardian whose footsteps send seismic ripples across entire valleys.'
    },
    {
      id: 30,
      slug: 'gloomfang',
      name: 'Gloomfang',
      title: 'Mire Viper Kin',
      affinity: 'Umbra',
      aquatic: true,
      stage: 1,
      evolvesTo: { id: 31, level: 16 },
      baseStats: { hp: 56, atk: 66, def: 52, spd: 68 },
      catchRate: 0.48,
      moves: ['venom_fang', 'blight_miasma', 'duskDart', 'spore_venom'],
      palette: { primary: '#7e22ce', secondary: '#4ade80', accent: '#1e1b4b', eye: '#fde047' },
      radiantPalette: { primary: '#ec4899', secondary: '#22d3ee', accent: '#31102f', eye: '#facc15' },
      lore: 'Lurks beneath murky marshlands and twilight lagoons, striking with shadow-toxin fangs that sap enemy strength.'
    },
    {
      id: 31,
      slug: 'abyssalisk',
      name: 'Abyssalisk',
      title: 'Trench Hydra Kin',
      affinity: 'Umbra',
      aquatic: true,
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 92, atk: 102, def: 84, spd: 86 },
      catchRate: 0.15,
      moves: ['abyssal_toxin', 'blight_miasma', 'eclipseNova', 'venom_fang'],
      palette: { primary: '#4c1d95', secondary: '#2dd4bf', accent: '#090d16', eye: '#f43f5e' },
      radiantPalette: { primary: '#be123c', secondary: '#38bdf8', accent: '#1f2937', eye: '#fde047' },
      lore: 'An apex deep-trench serpent shrouded in virulent shadow miasma. Rarely surfaces except when drawn by master anglers.'
    },
    {
      id: 32,
      slug: 'kelpsprite',
      name: 'Kelpsprite',
      title: 'Reef Seahorse Kin',
      affinity: 'Tide',
      aquatic: true,
      stage: 1,
      evolvesTo: { id: 18, level: 14 },
      baseStats: { hp: 54, atk: 52, def: 58, spd: 64 },
      catchRate: 0.62,
      moves: ['rippleJet', 'rippleJet', 'brinePulse', 'spore_venom'],
      palette: { primary: '#0ea5e9', secondary: '#6ee7b7', accent: '#0c4a6e', eye: '#fde047' },
      radiantPalette: { primary: '#f472b6', secondary: '#fde047', accent: '#4c0519', eye: '#38bdf8' },
      lore: 'Camouflages among swaying kelp forests and sunny fishing piers. Playfully nibbles on bobbers tossed near shore.'
    },
        {
      id: 33,
      slug: 'krakenlord',
      name: 'Krakenlord',
      title: 'Maelstrom Sovereign Kin',
      affinity: 'Tide',
      element: 'Tide',
      aquatic: true,
      mythic: true,
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 112, atk: 108, def: 98, spd: 88 },
      catchRate: 0.08,
      moves: ['tidalVortex', 'abyssal_toxin', 'brinePulse', 'rimeFang'],
      palette: { primary: '#0284c7', secondary: '#facc15', accent: '#082f49', eye: '#f43f5e' },
      radiantPalette: { primary: '#eab308', secondary: '#38bdf8', accent: '#1e1b4b', eye: '#ffffff' },
      lore: 'A mythic deep-sea sovereign that commands whirlpools and abyssal tides. Only 5% of fishing tosses ever glimpse its golden crown.'
    },
    {
      id: 34,
      slug: 'frostkit',
      name: 'Frostkit',
      title: 'Rime Fox Kin',
      affinity: 'Tide',
      element: 'Frost',
      aquatic: true,
      stage: 1,
      evolvesTo: { id: 35, level: 15 },
      baseStats: { hp: 54, atk: 58, def: 52, spd: 66 },
      catchRate: 0.52,
      moves: ['rimeFang', 'rippleJet', 'quickDash', 'brinePulse'],
      palette: { primary: '#38bdf8', secondary: '#e0f2fe', accent: '#0369a1', eye: '#facc15' },
      radiantPalette: { primary: '#c084fc', secondary: '#f3e8ff', accent: '#3b0764', eye: '#22d3ee' },
      lore: 'Skates across frozen fjords and icy fishing holes, leaving crystalline snowflakes in its wake.'
    },
    {
      id: 35,
      slug: 'glacieron',
      name: 'Glacieron',
      title: 'Permafrost Wolf Kin',
      affinity: 'Tide',
      element: 'Frost',
      aquatic: true,
      stage: 2,
      evolvesTo: { id: 36, level: 28 },
      baseStats: { hp: 82, atk: 88, def: 80, spd: 86 },
      catchRate: 0.24,
      moves: ['rimeFang', 'tidalVortex', 'brinePulse', 'ironShell'],
      palette: { primary: '#0284c7', secondary: '#bae6fd', accent: '#0c4a6e', eye: '#fde047' },
      radiantPalette: { primary: '#9333ea', secondary: '#fde047', accent: '#1e1b4b', eye: '#38bdf8' },
      lore: 'Howls with the fury of an arctic blizzard, freezing crashing waves into jagged ice spires.'
    },
    {
      id: 36,
      slug: 'cryowurm',
      name: 'Cryowurm',
      title: 'Glacier Leviathan Kin',
      affinity: 'Tide',
      element: 'Frost',
      aquatic: true,
      mythic: true,
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 108, atk: 102, def: 104, spd: 82 },
      catchRate: 0.10,
      moves: ['rimeFang', 'tidalVortex', 'crystalSpire', 'aetherFocus'],
      palette: { primary: '#0ea5e9', secondary: '#ffffff', accent: '#1e3a8a', eye: '#f43f5e' },
      radiantPalette: { primary: '#facc15', secondary: '#67e8f9', accent: '#0f172a', eye: '#ec4899' },
      lore: 'An ancient iceburg dragon slumbering beneath Frostveil Glacier. Awakens when hooked by a legendary angler.'
    },
    {
      id: 37,
      slug: 'zephyrling',
      name: 'Zephyrling',
      title: 'Breeze Finch Kin',
      affinity: 'Volt',
      element: 'Gale',
      stage: 1,
      evolvesTo: { id: 38, level: 14 },
      baseStats: { hp: 50, atk: 56, def: 46, spd: 74 },
      catchRate: 0.55,
      moves: ['galeVortex', 'quickDash', 'sparkPeck', 'aetherFocus'],
      palette: { primary: '#38bdf8', secondary: '#fef08a', accent: '#0f172a', eye: '#10b981' },
      radiantPalette: { primary: '#f43f5e', secondary: '#fde047', accent: '#31102f', eye: '#38bdf8' },
      lore: 'Rides coastal updrafts and thermal currents, whipping miniature whirlwinds with its wingtips.'
    },
    {
      id: 38,
      slug: 'stratoswing',
      name: 'Stratoswing',
      title: 'Cyclone Falcon Kin',
      affinity: 'Volt',
      element: 'Gale',
      stage: 2,
      evolvesTo: { id: 39, level: 27 },
      baseStats: { hp: 78, atk: 88, def: 70, spd: 104 },
      catchRate: 0.24,
      moves: ['galeVortex', 'tempestDive', 'quickDash', 'arcBolt'],
      palette: { primary: '#0284c7', secondary: '#fde047', accent: '#1e293b', eye: '#34d399' },
      radiantPalette: { primary: '#eab308', secondary: '#38bdf8', accent: '#090d16', eye: '#f43f5e' },
      lore: 'Dives from the stratosphere at supersonic speeds, Summoning roaring tornadoes across the battlefield.'
    },
    {
      id: 39,
      slug: 'tempestroc',
      name: 'Tempestroc',
      title: 'Hurricane Sovereign Kin',
      affinity: 'Volt',
      element: 'Gale',
      mythic: true,
      stage: 3,
      evolvesTo: null,
      baseStats: { hp: 98, atk: 106, def: 86, spd: 112 },
      catchRate: 0.10,
      moves: ['galeVortex', 'tempestDive', 'arcBolt', 'aetherFocus'],
      palette: { primary: '#0ea5e9', secondary: '#facc15', accent: '#0f172a', eye: '#ffffff' },
      radiantPalette: { primary: '#ec4899', secondary: '#fde047', accent: '#1e1b4b', eye: '#22d3ee' },
      lore: 'Lord of the Stormspire skies. A single beat of its wings unleashes a category-five gale vortex.'
    },
    {
      id: 40,
      slug: 'starlighton',
      name: 'Starlighton',
      title: 'Nebula Fawn Kin',
      affinity: 'Umbra',
      element: 'Aether',
      stage: 1,
      evolvesTo: { id: 41, level: 18 },
      baseStats: { hp: 62, atk: 68, def: 64, spd: 76 },
      catchRate: 0.35,
      moves: ['voidPulse', 'aetherFocus', 'quickDash', 'eclipseNova'],
      palette: { primary: '#818cf8', secondary: '#fde047', accent: '#1e1b4b', eye: '#38bdf8' },
      radiantPalette: { primary: '#f472b6', secondary: '#fef08a', accent: '#31102f', eye: '#22d3ee' },
      lore: 'Born from condensed starlight near Aether shrines. Its crystalline antlers refract cosmic beams.'
    },
    {
      id: 41,
      slug: 'celestigon',
      name: 'Celestigon',
      title: 'Astral Seraph Kin',
      affinity: 'Volt',
      element: 'Aether',
      mythic: true,
      stage: 2,
      evolvesTo: null,
      baseStats: { hp: 100, atk: 108, def: 94, spd: 104 },
      catchRate: 0.10,
      moves: ['eclipseNova', 'tempestDive', 'solarFlare', 'aetherFocus'],
      palette: { primary: '#6366f1', secondary: '#facc15', accent: '#0f172a', eye: '#22d3ee' },
      radiantPalette: { primary: '#fde047', secondary: '#f43f5e', accent: '#1e1b4b', eye: '#38bdf8' },
      lore: 'Channels pure cosmic Aether beams capable of cleaving dimensional rifts.'
    }
  ];

  KIN_SPECIES.forEach((s) => {
    if (s.id === 18) s.element = 'Frost';
    else if (s.id === 11) s.element = 'Gale';
    else if (s.id === 26 || s.id === 27) s.element = 'Aether';
    else if (!s.element) s.element = s.affinity;
  });

  // Items, Food Recovery, Level-Up Boosters & Capture Prisms
  const ITEMS = {
    // 1. Food & Natural Recovery
    sunberryRation: {
      id: 'sunberryRation',
      name: 'Sunberry Ration',
      category: 'food',
      marketTab: 'recovery',
      healAmount: 45,
      regenBoostSec: 300,
      bondGain: 1,
      cost: 55,
      gemCost: 8,
      color: '#fb923c',
      icon: '🍖',
      desc: 'Hearty trail ration that restores 45 HP immediately and speeds up natural HP regeneration by 3x for 5 minutes.'
    },
    heartwoodStew: {
      id: 'heartwoodStew',
      name: 'Grandpa’s Heartwood Stew',
      category: 'food',
      marketTab: 'recovery',
      healPercent: 1.0,
      canRevive: true,
      bondGain: 1,
      cost: 140,
      gemCost: 18,
      color: '#f97316',
      icon: '🍲',
      desc: 'Grandpa Rowan’s warm homestead recipe! Restores 100% HP, revives exhausted Kin, and cures all status effects.'
    },
    feastPlatter: {
      id: 'feastPlatter',
      name: 'Homestead Feast Platter',
      category: 'food',
      marketTab: 'recovery',
      squadFullHeal: true,
      canRevive: true,
      bondGain: 1,
      cost: 320,
      gemCost: 40,
      color: '#facc15',
      icon: '🍱',
      desc: 'Banquet for your entire party! Instantly restores 100% HP & Move Stamina to all 6 Squad Kin.'
    },
    heartwoodBerry: {
      id: 'heartwoodBerry',
      name: 'Heartwood Berry',
      category: 'care',
      marketTab: 'recovery',
      healAmount: 25,
      bondGain: 1,
      xpGain: 45,
      cost: 45,
      gemCost: 6,
      color: '#fb7185',
      icon: '🍓',
      desc: 'Sweet orchard berry grown at Grandpa Rowan’s Homestead. Restores 25 HP, raises Bond Level (+1), and grants +45 XP.'
    },
    apexNectar: {
      id: 'apexNectar',
      name: 'Apex Royal Nectar',
      category: 'care',
      marketTab: 'recovery',
      healAmount: 80,
      bondGain: 2,
      xpGain: 160,
      cost: 160,
      gemCost: 22,
      color: '#f59e0b',
      icon: '🍯',
      desc: 'Golden Aether nectar from Grandpa’s sanctuary. Restores 80 HP & Stamina, boosts Bond Level (+2), and grants +160 XP.'
    },

    // 2. Medical Tonics & Revives
    dewTonic: {
      id: 'dewTonic',
      name: 'Vital Dew Tonic',
      category: 'heal',
      marketTab: 'recovery',
      healAmount: 35,
      cost: 40,
      gemCost: 5,
      color: '#4ade80',
      icon: '🧪',
      desc: 'Field tonic that restores 35 HP and clears status ailments on an injured Kin.'
    },
    vitalTonic: {
      id: 'vitalTonic',
      name: 'Vital Tonic',
      category: 'heal',
      marketTab: 'recovery',
      healAmount: 35,
      cost: 40,
      gemCost: 5,
      color: '#4ade80',
      icon: '🧪',
      desc: 'Restores 35 HP to an injured Kin in or out of battle.'
    },
    hiTonic: {
      id: 'hiTonic',
      name: 'Hi-Tonic',
      category: 'heal',
      marketTab: 'recovery',
      healAmount: 90,
      cost: 100,
      gemCost: 12,
      color: '#22d3ee',
      icon: '⚗️',
      desc: 'Concentrated Wellspring elixir that restores 90 HP.'
    },
    hyperTonic: {
      id: 'hyperTonic',
      name: 'Hyper Tonic',
      category: 'heal',
      marketTab: 'recovery',
      healAmount: 120,
      cost: 120,
      gemCost: 15,
      color: '#38bdf8',
      icon: '💉',
      desc: 'High-potency medical infusion that restores 120 HP and cures status effects.'
    },
    reviveLeaf: {
      id: 'reviveLeaf',
      name: 'Sylvan Revive',
      category: 'revive',
      marketTab: 'recovery',
      healPercent: 0.5,
      canRevive: true,
      cost: 150,
      gemCost: 20,
      color: '#facc15',
      icon: '🍃',
      desc: 'Revives an exhausted (0 HP) Kin and restores 50% of its Max HP.'
    },
    phoenixDew: {
      id: 'phoenixDew',
      name: 'Phoenix Aether Dew',
      category: 'revive',
      marketTab: 'recovery',
      healPercent: 1.0,
      canRevive: true,
      restoreStamina: true,
      cost: 240,
      gemCost: 30,
      color: '#f43f5e',
      icon: '🔥',
      desc: 'Mythic phoenix essence that revives a fainted Kin to 100% HP & full Move Stamina instantly, even mid-battle!'
    },

    // 3. Level-Up, XP & Breeding Speed-Up Boosters
    aetherCandy: {
      id: 'aetherCandy',
      name: 'Rare Aether Crystal',
      category: 'booster',
      marketTab: 'boosters',
      levelGain: 1,
      cost: 260,
      gemCost: 32,
      color: '#38bdf8',
      icon: '💎',
      desc: 'Crystallized Aether energy that instantly levels up any Kin by +1 Full Level and recalculates all stats!'
    },
    apexTome: {
      id: 'apexTome',
      name: 'Sovereign XP Tome',
      category: 'booster',
      marketTab: 'boosters',
      levelGain: 3,
      bondGain: 1,
      cost: 680,
      gemCost: 80,
      color: '#c084fc',
      icon: '📘',
      desc: 'Ancient codex penned by Grandpa Rowan. Instantly grants +3 Full Levels and +1 Bond Level to any Kin!'
    },
    xpBooster2x: {
      id: 'xpBooster2x',
      name: '2x XP Surge Elixir (30m)',
      category: 'booster',
      marketTab: 'boosters',
      xpBoostSec: 1800,
      cost: 240,
      gemCost: 28,
      color: '#eab308',
      icon: '⚡',
      desc: 'Doubles all XP earned from wild encounters, Wardens, and the Aether Spire for 30 minutes!'
    },
    hatchAccelerator: {
      id: 'hatchAccelerator',
      name: 'Incubator Speed Core',
      category: 'booster',
      marketTab: 'boosters',
      hatchBoost: true,
      cost: 220,
      gemCost: 26,
      color: '#4ade80',
      icon: '🥚',
      desc: 'Guarantees S-Rank or SS-Rank Apex Genetics on your next Breeding Sanctuary hatch and waives the shard fee!'
    },

    // 4. Snare Traps (Mechanical & Elemental Wild Kin Capture Cages)
    basicPrism: {
      id: 'basicPrism',
      name: 'Copper Snare Trap',
      category: 'prism',
      trapType: 'copper',
      marketTab: 'boosters',
      catchMod: 1.0,
      cost: 50,
      gemCost: 6,
      color: '#38bdf8',
      icon: '🪤',
      desc: 'Launches a collapsible bronze claw-cage snare trap onto a weakened Wild Kin (1.0x catch rate).'
    },
    greaterPrism: {
      id: 'greaterPrism',
      name: 'Magnetized Vault Trap',
      category: 'prism',
      trapType: 'magnet',
      marketTab: 'boosters',
      catchMod: 1.8,
      cost: 120,
      gemCost: 15,
      color: '#c084fc',
      icon: '🪤',
      desc: 'High-tension electromagnetic snare cage with a 1.8x capture lock strength.'
    },
    masteryPrism: {
      id: 'masteryPrism',
      name: 'Sovereign Stasis Trap',
      category: 'prism',
      trapType: 'sovereign',
      marketTab: 'boosters',
      catchMod: 3.5,
      cost: 300,
      gemCost: 38,
      color: '#facc15',
      icon: '🪤',
      desc: 'Ancient Grandpa-forged stasis cage that locks down rare & mythic Wild Kin (3.5x catch rate).'
    },

    // 5. Expandable Kin Carrier Bag Upgrades (Start with 4 Active / 8 Reserve -> Upgrade to 8 Active / 52 Reserve!)
    bagUpgrade1: {
      id: 'bagUpgrade1',
      name: 'Reinforced Tamer Satchel',
      category: 'bag',
      marketTab: 'boosters',
      bagTier: 1,
      maxSquadSize: 5,
      maxVaultSize: 16,
      cost: 350,
      gemCost: 45,
      color: '#38bdf8',
      icon: '🎒',
      desc: 'Upgrades your Kin Carrier Bag: carry up to 5 Active Squad Kin (up from 4) and 16 Reserve Kin!'
    },
    bagUpgrade2: {
      id: 'bagUpgrade2',
      name: 'Expedition Kin Pack',
      category: 'bag',
      marketTab: 'boosters',
      bagTier: 2,
      maxSquadSize: 6,
      maxVaultSize: 28,
      cost: 800,
      gemCost: 95,
      color: '#c084fc',
      icon: '🎒',
      desc: 'Upgrades your Kin Carrier Bag: carry up to 6 Active Squad Kin and 28 Reserve Kin!'
    },
    bagUpgrade3: {
      id: 'bagUpgrade3',
      name: 'Grandmaster Spatial Harness',
      category: 'bag',
      marketTab: 'boosters',
      bagTier: 3,
      maxSquadSize: 8,
      maxVaultSize: 52,
      cost: 1800,
      gemCost: 210,
      color: '#facc15',
      icon: '🎒',
      desc: 'Sovereign dimensional harness: carry up to 8 Active Squad Kin and 52 Reserve Kin!'
    },

    // 6. Tiered Fishing Poles (Higher Rod Level = Higher Rarity & Evolution Stage Water Creatures!)
    bambooPole: {
      id: 'bambooPole',
      name: 'Bamboo Reed Pole',
      category: 'rod',
      marketTab: 'boosters',
      rodTier: 1,
      maxStage: 1,
      rarityCap: 'Common Stage 1 Water Kin (B / A-Rank)',
      allowedGeneticTiers: ['B', 'A'],
      catchPool: [4, 15, 17, 13],
      levelBonus: 0,
      radiantChance: 0.02,
      cost: 120,
      gemCost: 15,
      usdPrice: 0.99,
      priceDisplay: '$0.99',
      color: '#4ade80',
      icon: '🎣',
      desc: 'Lv.1 Starter Fishing Pole. Cast near water (~) to hook Common Stage 1 Water & Tide Kin (Ripplefin, Pebblecrab, Dewdrop) with B or A-Rank genetics.'
    },
    carbonRod: {
      id: 'carbonRod',
      name: 'Carbon Aether Rod',
      category: 'rod',
      marketTab: 'boosters',
      rodTier: 2,
      maxStage: 2,
      rarityCap: 'Rare Stage 2 Evolved Water Kin (A / S-Rank)',
      allowedGeneticTiers: ['A', 'S'],
      catchPool: [5, 18, 16, 22, 4, 17],
      levelBonus: 4,
      radiantChance: 0.07,
      cost: 420,
      gemCost: 45,
      usdPrice: 2.99,
      priceDisplay: '$2.99',
      color: '#38bdf8',
      icon: '🎣',
      desc: 'Lv.2 Pro Fishing Rod! Unlocks Rare Stage 2 Evolved Water & Tide Kin (Torrentscale, Mistserpent, Basaltitan) with guaranteed A/S-Rank genetics (+4 Lv bonus & 2.5x Radiant odds)!'
    },
    leviathanRod: {
      id: 'leviathanRod',
      name: 'Sovereign Leviathan Rod',
      category: 'rod',
      marketTab: 'boosters',
      rodTier: 3,
      maxStage: 3,
      rarityCap: 'Mythic Stage 3 Apex Leviathans (S / SS-Rank)',
      allowedGeneticTiers: ['S', 'SS'],
      catchPool: [6, 26, 27, 18, 16, 5],
      levelBonus: 8,
      radiantChance: 0.18,
      cost: 1100,
      gemCost: 110,
      usdPrice: 6.99,
      priceDisplay: '$6.99',
      color: '#facc15',
      icon: '🎣',
      desc: 'Lv.3 Master Fishing Rod! Hooks Mythic & Stage 3 Apex Water Leviathans (Abyssaldrake, Astralwyrm, Aetherion, Mistserpent) with guaranteed S/SS-Rank genetics, +8 Lv bonus & 18% Radiant hook rate!'
    }
  };

  // Ensure every item in ITEMS has a direct cash ($ USD) price for Marketplace cash checkout
  const ITEM_USD_PRICES = {
    sunberryRation: 0.99,
    heartwoodStew: 1.49,
    feastPlatter: 2.49,
    spicedSkewers: 0.99,
    glacierBerryTart: 1.49,
    vitalTonic: 0.99,
    hiTonic: 1.49,
    maxElixir: 2.49,
    phoenixDew: 1.99,
    aetherCandy: 1.99,
    apexTome: 3.99,
    xpBooster2x: 1.99,
    hatchAccelerator: 1.99,
    basicPrism: 0.99,
    greaterPrism: 1.49,
    masteryPrism: 2.99,
    bagUpgrade1: 1.99,
    bagUpgrade2: 3.49,
    bagUpgrade3: 5.99,
    bambooPole: 0.99,
    carbonRod: 2.99,
    leviathanRod: 6.99
  };

  ITEMS.spicedSkewers = {
    id: "spicedSkewers",
    name: "Cinderpeak Spiced Skewers",
    icon: "🍢",
    category: "food",
    marketTab: "recovery",
    cost: 75,
    gemCost: 8,
    healAmount: 85,
    bondGain: 1,
    xpGain: 35,
    restoreStamina: true,
    color: "#fb923c",
    desc: "Flame-grilled skewers that restore 85 HP, full Stamina, +1 Bond & +35 XP."
  };
  ITEMS.geneticCatalyst = {
    id: "geneticCatalyst",
    name: "S-Rank Lineage Catalyst",
    icon: "🧬",
    category: "booster",
    marketTab: "boosters",
    cost: 420,
    gemCost: 40,
    hatchBoost: true,
    color: "#c084fc",
    desc: "Awakens dormant bloodlines so your next Ranch Breeding hatch is FREE & guaranteed S/SS-Rank!"
  };
  ITEMS.aetherPrism = ITEMS.basicPrism;
  ITEMS.masterPrism = ITEMS.masteryPrism;
  ITEMS.copperTrap = ITEMS.basicPrism;
  ITEMS.magnetTrap = ITEMS.greaterPrism;
  ITEMS.sovereignTrap = ITEMS.masteryPrism;

  // Real-Money / USD Gem & Recovery Bundles for the Aether Marketplace
  const MARKETPLACE_BUNDLES = [
    {
      id: 'starter_recovery',
      name: 'Starter Recovery Pack',
      priceUsd: 1.99,
      priceDisplay: '$1.99',
      gems: 250,
      shardsBonus: 300,
      items: { heartwoodStew: 5, aetherCandy: 3, sunberryRation: 5 },
      badge: 'BEST FOR NEW TAMERS',
      color: '#4ade80',
      icon: '🍖',
      desc: '250 💎 Aether Gems + 300 🪙 Shards + 5x Grandpa’s Heartwood Stew + 3x Rare Aether Crystals (+1 Lv) + 5x Sunberry Rations.'
    },
    {
      id: 'tamers_pouch',
      name: 'Tamer’s Vitality Pouch',
      priceUsd: 4.99,
      priceDisplay: '$4.99',
      gems: 700,
      shardsBonus: 800,
      items: { feastPlatter: 2, xpBooster2x: 1, phoenixDew: 3 },
      badge: 'FAST RECOVERY',
      color: '#38bdf8',
      icon: '🍱',
      desc: '700 💎 Aether Gems + 800 🪙 Shards + 2x Homestead Feast Platters (Full Squad Heal) + 1x 2x XP Surge Elixir + 3x Phoenix Dew.'
    },
    {
      id: 'breeders_vault',
      name: 'Breeder’s Level-Up Vault',
      priceUsd: 9.99,
      priceDisplay: '$9.99',
      gems: 1600,
      shardsBonus: 2000,
      items: { apexTome: 3, masteryPrism: 2, hatchAccelerator: 2 },
      badge: 'MOST POPULAR',
      color: '#c084fc',
      icon: '📘',
      desc: '1,600 💎 Aether Gems + 2,000 🪙 Shards + 3x Sovereign XP Tomes (+9 Levels!) + 2x Apex Prisms + 2x Incubator Speed Cores.'
    },
    {
      id: 'sovereign_treasury',
      name: 'Sovereign Apex Treasury',
      priceUsd: 19.99,
      priceDisplay: '$19.99',
      gems: 3800,
      shardsBonus: 5000,
      items: { aetherCandy: 10, masteryPrism: 5, feastPlatter: 5, apexTome: 2 },
      vipShrinePass: true,
      badge: 'BEST VALUE • VIP PASS',
      color: '#facc15',
      icon: '👑',
      desc: '3,800 💎 Aether Gems + 5,000 🪙 Shards + 10x Rare Aether Crystals + 2x XP Tomes + 5x Apex Prisms + Permanent VIP Instant Shrine Pass!'
    },
    {
      id: 'angler_master_pack',
      name: 'Master Angler Rod Pack',
      priceUsd: 4.99,
      priceDisplay: '$4.99',
      gems: 350,
      shardsBonus: 400,
      rodTier: 3,
      items: { leviathanRod: 1, carbonRod: 1, greaterPrism: 5 },
      badge: 'LV.3 LEVIATHAN ROD',
      color: '#38bdf8',
      icon: '🎣',
      desc: 'Instant Lv.3 Sovereign Leviathan Rod + Lv.2 Carbon Rod + 5x Magnetized Vault Traps + 350 💎 Gems + 400 🪙 Shards! Catch Mythic S/SS-Rank Water Leviathans immediately!'
    },
    {
      id: 'sovereign_bag_pack',
      name: 'Max Carrier Bag Expansion Pack',
      priceUsd: 3.99,
      priceDisplay: '$3.99',
      gems: 250,
      shardsBonus: 300,
      bagTier: 3,
      items: { bagUpgrade3: 1, masteryPrism: 3, feastPlatter: 2 },
      badge: '8 SQUAD • 52 RESERVE',
      color: '#facc15',
      icon: '🎒',
      desc: 'Instant Tier 3 Grandmaster Spatial Harness (8 Active Squad / 52 Reserve Kin) + 3x Sovereign Stasis Traps + 2x Feast Platters + 250 💎 Gems!'
    }
  ];

  // 6 Explorable Worlds (24+ Hour Multi-World Progression with Level Locks & Tiered Creature Scaling)
  const ZONES = [
    {
      id: "meadow",
      name: "Sunleaf Meadow",
      worldNumber: 1,
      subtitle: "World 1 • Lv 2–8 • Heartwood Homestead & Sanctuary",
      unlockLevel: 1,
      levelRange: [2, 8],
      recommendedLevel: 2,
      statScale: 1.0,
      dangerTier: 1,
      difficultyLabel: "★☆☆☆☆☆ • Beginner Sanctuary",
      themeColor: "#22c55e",
      bgGradient: ["#132a1c", "#1e3f29"],
      wildPool: [
        { id: 10, weight: 28 }, // Sparkcheep
        { id: 13, weight: 30 }, // Bramblepuff
        { id: 15, weight: 20 }, // Pebblecrab
        { id: 17, weight: 14 }, // Dewdrop
        { id: 7,  weight: 8 }   // Wild Mossling
      ],
      wardenId: "kael",
      desc: "Home to Grandpa Rowan’s Heartwood Homestead & Breeding Ranch, the Kin Care Hospital, and rolling emerald hills."
    },
    {
      id: "tidecove",
      name: "Whispering Tidecove",
      worldNumber: 2,
      subtitle: "World 2 • Lv 8–16 • Bioluminescent Archipelago",
      unlockLevel: 6,
      levelRange: [8, 16],
      recommendedLevel: 8,
      statScale: 1.15,
      dangerTier: 2,
      difficultyLabel: "★★☆☆☆☆ • Coastal Wilds (+15% Enemy Power)",
      themeColor: "#38bdf8",
      bgGradient: ["#0c2238", "#123556"],
      wildPool: [
        { id: 17, weight: 26 }, // Dewdrop
        { id: 15, weight: 22 }, // Pebblecrab
        { id: 21, weight: 20 }, // Voltmouse
        { id: 4,  weight: 10 }, // Wild Ripplefin
        { id: 11, weight: 12 }, // Galecrest
        { id: 18, weight: 10 }  // Mistserpent
      ],
      wardenId: "nerissa",
      desc: "Crystal tidepools, coral boardwalks, and misty sea cliffs teeming with stronger Tide and Volt Kin."
    },
    {
      id: "stormspire",
      name: "Stormspire Canopy",
      worldNumber: 3,
      subtitle: "World 3 • Lv 16–26 • Ancient Tempest Highland",
      unlockLevel: 14,
      levelRange: [16, 26],
      recommendedLevel: 16,
      statScale: 1.32,
      dangerTier: 3,
      difficultyLabel: "★★★☆☆☆ • High-Voltage Highlands (+32% Enemy Power)",
      themeColor: "#eab308",
      bgGradient: ["#1f2410", "#313816"],
      wildPool: [
        { id: 11, weight: 24 }, // Galecrest
        { id: 21, weight: 22 }, // Voltmouse
        { id: 14, weight: 20 }, // Thornback
        { id: 8,  weight: 14 }, // Briarhorn
        { id: 22, weight: 12 }, // Arcfox
        { id: 12, weight: 8 }   // Thunderhawk
      ],
      wardenId: "orin",
      desc: "Giant redwood sky-bridges and lightning-charged monoliths where fierce evolved Stage 2 & 3 Kin patrol."
    },
    {
      id: "cinderpeak",
      name: "Cinderpeak Cavern",
      worldNumber: 4,
      subtitle: "World 4 • Lv 26–38 • Geothermal Caldera",
      unlockLevel: 24,
      levelRange: [26, 38],
      recommendedLevel: 26,
      statScale: 1.52,
      dangerTier: 4,
      difficultyLabel: "★★★★☆☆ • Volcanic Crucible (+52% Enemy Power)",
      themeColor: "#f97316",
      bgGradient: ["#2d120b", "#471c10"],
      wildPool: [
        { id: 23, weight: 28 }, // Magmapup
        { id: 16, weight: 18 }, // Basaltitan
        { id: 19, weight: 20 }, // Duskmoth
        { id: 1,  weight: 10 }, // Wild Cinderkit
        { id: 22, weight: 12 }, // Arcfox
        { id: 25, weight: 12 }  // Craggolem
      ],
      wardenId: "ignis",
      desc: "Basalt bridges over glowing magma rivers where aggressive high-level Pyre and Terra Kin forge their strength."
    },
    {
      id: "frostveil",
      name: "Frostveil Glacier",
      worldNumber: 5,
      subtitle: "World 5 • Lv 38–52 • Aurora Crystal Peaks",
      unlockLevel: 35,
      levelRange: [38, 52],
      recommendedLevel: 38,
      statScale: 1.75,
      dangerTier: 5,
      difficultyLabel: "★★★★★☆ • Sub-Zero Apex Tundra (+75% Enemy Power)",
      themeColor: "#67e8f9",
      bgGradient: ["#0b2536", "#153e59"],
      wildPool: [
        { id: 18, weight: 24 }, // Mistserpent
        { id: 5,  weight: 20 }, // Torrentjaw
        { id: 20, weight: 18 }, // Lunawraith
        { id: 25, weight: 16 }, // Craggolem
        { id: 6,  weight: 12 }, // Abyssalking
        { id: 12, weight: 10 }  // Thunderhawk
      ],
      wardenId: "freya",
      desc: "Towering ice spires under shimmering northern auroras, home to elite S-Rank Tide, Umbra, and Terra apex Kin."
    },
    {
      id: "sanctum",
      name: "Astral Ruin Sanctum",
      worldNumber: 6,
      subtitle: "World 6 • Lv 52–70 • Mythic Starlight Citadel & Spire",
      unlockLevel: 48,
      levelRange: [52, 70],
      recommendedLevel: 52,
      statScale: 2.05,
      dangerTier: 6,
      difficultyLabel: "★★★★★★ • Sovereign Endgame Realm (+105% Enemy Power)",
      themeColor: "#c084fc",
      bgGradient: ["#1a1033", "#2d1b54"],
      wildPool: [
        { id: 20, weight: 24 }, // Lunawraith
        { id: 24, weight: 20 }, // Obsidianox
        { id: 25, weight: 18 }, // Craggolem
        { id: 12, weight: 16 }, // Thunderhawk
        { id: 26, weight: 13 }, // Astralwyrm (Mythic)
        { id: 27, weight: 9 }   // Aetherion (Mythic)
      ],
      wardenId: "vesper",
      desc: "Floating star-obelisks and the 100-Floor Aether Spire where Mythic SS-Rank Kin and Grand Warden Vesper await."
    }
  ];

  // 6 Realm Wardens (World Bosses across all 6 Worlds)
  const WARDENS = [
    {
      id: "kael",
      name: "Warden Kael",
      title: "Keeper of the Verdant Crest (World 1)",
      zoneId: "meadow",
      crestName: "Verdant Crest",
      crestIcon: "🌿",
      affinity: "Grove",
      rewardShards: 280,
      quoteIntro: "Grandpa Rowan told me about you! Let us see the bond between you and your Kin!",
      quoteDefeat: "Splendid harmony! Take the Verdant Crest—Grandpa Rowan will be proud, and Tidecove awaits!",
      squad: [
        { speciesId: 13, level: 6 },
        { speciesId: 8, level: 8 }
      ]
    },
    {
      id: "nerissa",
      name: "Warden Nerissa",
      title: "Mistress of the Abyssal Crest (World 2)",
      zoneId: "tidecove",
      crestName: "Abyssal Crest",
      crestIcon: "🌊",
      affinity: "Tide",
      rewardShards: 480,
      quoteIntro: "Calm waters hide crashing currents. Can your raised Kin weather the high tide?",
      quoteDefeat: "Like a lighthouse in the storm! The Abyssal Crest belongs to you. Stormspire Canopy is now open!",
      squad: [
        { speciesId: 17, level: 13 },
        { speciesId: 18, level: 15 },
        { speciesId: 5, level: 16 }
      ]
    },
    {
      id: "orin",
      name: "Warden Orin",
      title: "Sky-Caller of the Tempest Crest (World 3)",
      zoneId: "stormspire",
      crestName: "Tempest Crest",
      crestIcon: "⚡",
      affinity: "Volt",
      rewardShards: 780,
      quoteIntro: "Your grandfather Rowan and I once sparred atop these thunder ridges! Show me what he taught you!",
      quoteDefeat: "Thunderous precision! Claim the Tempest Crest and descend into Cinderpeak Cavern!",
      squad: [
        { speciesId: 11, level: 21 },
        { speciesId: 22, level: 23 },
        { speciesId: 12, level: 26 }
      ]
    },
    {
      id: "ignis",
      name: "Warden Ignis",
      title: "Forgemaster of the Solar Crest (World 4)",
      zoneId: "cinderpeak",
      crestName: "Solar Crest",
      crestIcon: "🔥",
      affinity: "Pyre",
      rewardShards: 1150,
      quoteIntro: "Only diamond-hard resolve and well-bred Kin survive Cinderpeak’s crucible! Ignite your spirit!",
      quoteDefeat: "Blazing brilliance! Take the Solar Crest—the frozen peaks of Frostveil Glacier await!",
      squad: [
        { speciesId: 16, level: 32 },
        { speciesId: 24, level: 35 },
        { speciesId: 3, level: 38 }
      ]
    },
    {
      id: "freya",
      name: "Warden Freya",
      title: "Empress of the Frostveil Crest (World 5)",
      zoneId: "frostveil",
      crestName: "Frostveil Crest",
      crestIcon: "❄️",
      affinity: "Tide",
      rewardShards: 1650,
      quoteIntro: "Here beneath the aurora, only Tamers whose hearts beat as one with their Kin endure the frost!",
      quoteDefeat: "Your warmth melts even glacier ice! Take the Frostveil Crest and ascend to the Astral Ruin Sanctum!",
      squad: [
        { speciesId: 18, level: 44 },
        { speciesId: 25, level: 47 },
        { speciesId: 9, level: 49 },
        { speciesId: 6, level: 52 }
      ]
    },
    {
      id: "vesper",
      name: "Grand Warden Vesper",
      title: "Sovereign of the Astral Crest (World 6)",
      zoneId: "sanctum",
      crestName: "Astral Crest",
      crestIcon: "👑",
      affinity: "Umbra",
      rewardShards: 2600,
      quoteIntro: "Fifty years ago, Elder Rowan stood where you stand now. Prove your bloodline and claim the Astral Throne!",
      quoteDefeat: "Unbelievable! All six World Crests resonate as one—the 100-Floor Aether Spire is yours to conquer!",
      squad: [
        { speciesId: 20, level: 58 },
        { speciesId: 12, level: 61 },
        { speciesId: 26, level: 64 },
        { speciesId: 27, level: 68 }
      ]
    }
  ];

  // Genetic Potential Tiers for Wild & Bred Kin
  const GENETIC_TIERS = {
    B:  { tier: 'B',  label: 'B-Rank (Standard)', bonus: 1.0,  color: '#94a3b8' },
    A:  { tier: 'A',  label: 'A-Rank (Superior +8%)', bonus: 1.08, color: '#38bdf8' },
    S:  { tier: 'S',  label: 'S-Rank (Alpha +18%)', bonus: 1.18, color: '#c084fc' },
    SS: { tier: 'SS', label: 'SS-Rank (Apex +30%)', bonus: 1.30, color: '#facc15' }
  };

  // 8-Chapter Storyline Campaign ("The Legacy of Heartwood Homestead" — 24+ Hours of Progression)
  const STORY_CHAPTERS = [
    {
      id: 1,
      chapter: 1,
      key: 'ch1_apprentice',
      title: 'Ch. 1: Grandfather’s Apprentice',
      worldId: 'meadow',
      zone: 'meadow',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Having moved to Heartwood Homestead to live with your legendary grandfather Rowan, your first lesson is to step into the tall emerald grass of Sunleaf Meadow, battle wild Kin, and bind a second companion into an Aether Prism.',
      grandpaTip: '"Welcome home, kiddo! Take the partner Kin I raised for you, walk into the swaying dark-green grass in Sunleaf Meadow, weaken a wild Kin in turn-based battle, and throw an Aether Prism to bind it!"',
      grandpaQuote: '"Welcome home, kiddo! Take the partner Kin I raised for you, walk into the swaying dark-green grass in Sunleaf Meadow, weaken a wild Kin in turn-based battle, and throw an Aether Prism to bind it!"',
      objectiveText: 'Bind 1 Wild Kin in Sunleaf Meadow (2+ total Kin owned) & win 2 battles',
      objective: 'Bind 1 Wild Kin in Sunleaf Meadow (2+ total Kin owned) & win 2 battles',
      rewardShards: 200,
      rewardItems: { basicPrism: 3, heartwoodBerry: 3 },
      rewardLabel: '200💎 + 3 Aether Prisms + 3 Heartwood Berries'
    },
    {
      id: 2,
      chapter: 2,
      key: 'ch2_raising',
      title: 'Ch. 2: Raising, Bonding & The First Crest',
      worldId: 'meadow',
      zone: 'meadow',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Grandpa Rowan teaches that true Tamers don’t just catch Kin—they raise and bond with them at the Homestead Ranch. Feed or train a Kin to Bond Lv. 2+, then challenge Warden Kael in southeastern Sunleaf Meadow.',
      grandpaTip: '"Open our Homestead Ranch (🧬 Ranch button or visit me by the cabin) to feed Heartwood Berries and raise your Kin’s Bond Level! Once your squad is strong, defeat Warden Kael for the Verdant Crest!"',
      grandpaQuote: '"Open our Homestead Ranch (🧬 Ranch button or visit me by the cabin) to feed Heartwood Berries and raise your Kin’s Bond Level! Once your squad is strong, defeat Warden Kael for the Verdant Crest!"',
      objectiveText: 'Raise any Kin to Bond Lv. 2+ at Grandpa’s Ranch & earn the Verdant Crest from Warden Kael',
      objective: 'Raise any Kin to Bond Lv. 2+ at Grandpa’s Ranch & earn the Verdant Crest from Warden Kael',
      rewardShards: 350,
      rewardItems: { greaterPrism: 2, heartwoodBerry: 4 },
      rewardLabel: '350💎 + 2 Greater Prisms + 4 Heartwood Berries'
    },
    {
      id: 3,
      chapter: 3,
      key: 'ch3_breeding',
      title: 'Ch. 3: The Secret of Kin Breeding',
      worldId: 'meadow',
      zone: 'meadow',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'With your first Crest earned, Grandpa Rowan unlocks the Homestead Breeding Sanctuary! Pairing two Kin hatches an Offspring Egg with elevated Genetic Potential (A/S/SS Rank), an inherited cross-affinity move, and 3x Radiant odds.',
      grandpaTip: '"Now for my greatest secret: Kin Breeding! Pair any two of your Kin in the 🧬 Ranch Breeding Sanctuary to hatch a high-genetics Offspring that inherits moves from both parents!"',
      grandpaQuote: '"Now for my greatest secret: Kin Breeding! Pair any two of your Kin in the 🧬 Ranch Breeding Sanctuary to hatch a high-genetics Offspring that inherits moves from both parents!"',
      objectiveText: 'Breed any 2 Kin at Grandpa’s Ranch to hatch 1 Offspring Egg',
      objective: 'Breed any 2 Kin at Grandpa’s Ranch to hatch 1 Offspring Egg',
      rewardShards: 450,
      rewardItems: { greaterPrism: 3, apexNectar: 2 },
      rewardLabel: '450💎 + 3 Greater Prisms + 2 Apex Royal Nectar'
    },
    {
      id: 4,
      chapter: 4,
      key: 'ch4_tidecove',
      title: 'Ch. 4: Voyage to Whispering Tidecove (World 2)',
      worldId: 'tidecove',
      zone: 'tidecove',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Step through the northern World Gate or use the Worlds map to travel to Whispering Tidecove. Tame aquatic and electric Kin, expand your KinDex to 5+ species, and defeat Warden Nerissa.',
      grandpaTip: '"Each World houses rarer Kin and tougher Wardens. Travel to World 2: Whispering Tidecove, register at least 5 KinDex species, and claim Nerissa’s Abyssal Crest!"',
      grandpaQuote: '"Each World houses rarer Kin and tougher Wardens. Travel to World 2: Whispering Tidecove, register at least 5 KinDex species, and claim Nerissa’s Abyssal Crest!"',
      objectiveText: 'Register 5+ KinDex Species & defeat Warden Nerissa in Whispering Tidecove',
      objective: 'Register 5+ KinDex Species & defeat Warden Nerissa in Whispering Tidecove',
      rewardShards: 600,
      rewardItems: { greaterPrism: 3, hiTonic: 3 },
      rewardLabel: '600💎 + 3 Greater Prisms + 3 Hi-Tonics'
    },
    {
      id: 5,
      chapter: 5,
      key: 'ch5_stormspire',
      title: 'Ch. 5: Ascent of Stormspire Canopy (World 3)',
      worldId: 'stormspire',
      zone: 'stormspire',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Venture into the thunder-swept redwoods of World 3: Stormspire Canopy. Evolve a Kin into its higher form and defeat Grandpa Rowan’s old rival, Warden Orin, for the Tempest Crest.',
      grandpaTip: '"When your Kin reach Lv 12–16, they ascend into stronger evolutions! Evolve at least one Kin and best my old friend Warden Orin in World 3: Stormspire Canopy!"',
      grandpaQuote: '"When your Kin reach Lv 12–16, they ascend into stronger evolutions! Evolve at least one Kin and best my old friend Warden Orin in World 3: Stormspire Canopy!"',
      objectiveText: 'Trigger 1+ Kin Evolution & defeat Warden Orin for the Tempest Crest',
      objective: 'Trigger 1+ Kin Evolution & defeat Warden Orin for the Tempest Crest',
      rewardShards: 850,
      rewardItems: { masteryPrism: 1, hiTonic: 4, apexNectar: 2 },
      rewardLabel: '850💎 + 1 Apex Prism + 4 Hi-Tonics + 2 Apex Nectar'
    },
    {
      id: 6,
      chapter: 6,
      key: 'ch6_cinderpeak',
      title: 'Ch. 6: Crucible of Cinderpeak Cavern (World 4)',
      worldId: 'cinderpeak',
      zone: 'cinderpeak',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Brave the volcanic magma rivers of World 4: Cinderpeak Cavern. Train a Kin to Level 20+ and overcome Forgemaster Warden Ignis to claim the Solar Crest.',
      grandpaTip: '"Cinderpeak’s heat tests both stamina and genetics. Breed an S-Rank Kin if you need an edge, train a partner to Lv 20+, and defeat Warden Ignis!"',
      grandpaQuote: '"Cinderpeak’s heat tests both stamina and genetics. Breed an S-Rank Kin if you need an edge, train a partner to Lv 20+, and defeat Warden Ignis!"',
      objectiveText: 'Raise a Kin to Level 20+ & defeat Warden Ignis for the Solar Crest',
      objective: 'Raise a Kin to Level 20+ & defeat Warden Ignis for the Solar Crest',
      rewardShards: 1100,
      rewardItems: { masteryPrism: 2, reviveLeaf: 3 },
      rewardLabel: '1,100💎 + 2 Apex Prisms + 3 Sylvan Revives'
    },
    {
      id: 7,
      chapter: 7,
      key: 'ch7_frostveil',
      title: 'Ch. 7: Aurora of Frostveil Glacier (World 5)',
      worldId: 'frostveil',
      zone: 'frostveil',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Cross the shimmering ice bridges of World 5: Frostveil Glacier. Breed or raise an S-Rank/SS-Rank Kin, register 12+ species in your KinDex, and defeat Warden Freya for the Frostveil Crest.',
      grandpaTip: '"Only five Tamers in history have conquered Frostveil Glacier. Register 12+ KinDex species and defeat Warden Freya under the northern lights!"',
      grandpaQuote: '"Only five Tamers in history have conquered Frostveil Glacier. Register 12+ KinDex species and defeat Warden Freya under the northern lights!"',
      objectiveText: 'Register 12+ KinDex Species & defeat Warden Freya for the Frostveil Crest',
      objective: 'Register 12+ KinDex Species & defeat Warden Freya for the Frostveil Crest',
      rewardShards: 1500,
      rewardItems: { masteryPrism: 3, apexNectar: 3 },
      rewardLabel: '1,500💎 + 3 Apex Prisms + 3 Apex Royal Nectar'
    },
    {
      id: 8,
      chapter: 8,
      key: 'ch8_sovereign',
      title: 'Ch. 8: Astral Sanctum & The 100-Floor Aether Spire',
      worldId: 'sanctum',
      zone: 'sanctum',
      npcSpeaker: 'Grandpa Rowan',
      lore: 'Enter World 6: Astral Ruin Sanctum, defeat Grand Warden Vesper to unite all 6 World Crests, and climb the Infinite 100-Floor Aether Spire to fulfill Grandpa Rowan’s lifelong dream!',
      grandpaTip: '"You’ve grown into the finest Tamer I have ever known. Defeat Grand Warden Vesper in the Astral Sanctum and ascend the 100-Floor Aether Spire!"',
      grandpaQuote: '"You’ve grown into the finest Tamer I have ever known. Defeat Grand Warden Vesper in the Astral Sanctum and ascend the 100-Floor Aether Spire!"',
      objectiveText: 'Unite all 6 World Crests & reach Floor 5+ in the 100-Floor Aether Spire',
      objective: 'Unite all 6 World Crests & reach Floor 5+ in the 100-Floor Aether Spire',
      rewardShards: 3000,
      rewardItems: { masteryPrism: 5, apexNectar: 5 },
      rewardLabel: '3,000💎 + 5 Apex Prisms + Grand Sovereign Title'
    }
  ];

  // Grandpa Rowan’s Homestead & Multi-World Side Quests (18 Rich Quests Across All 6 Worlds)
  const SIDE_QUESTS = [
    // SUNLEAF MEADOW (3 Quests)
    {
      id: 'sq_orchard_bond',
      title: 'Heartwood Orchard Caretaker',
      giver: 'Grandpa Rowan',
      zone: 'meadow',
      lore: '"A true Tamer wins with trust, not force. Spend time feeding and caring for your partner at our Homestead Ranch!"',
      objective: 'Raise any companion Kin to Bond Level 4+ at the Heartwood Homestead Ranch',
      metric: 'maxBondLevel',
      target: 4,
      rewardShards: 250,
      rewardGems: 15,
      rewardItems: { heartwoodBerry: 4, basicPrism: 3 }
    },
    {
      id: 'sq_s_rank_breeder',
      title: 'Lineage of the Ancients',
      giver: 'Grandpa Rowan',
      zone: 'meadow',
      lore: '"Pair two strong Kin in the Nursery Sanctuary to awaken dormant S-Rank or SS-Rank genetics!"',
      objective: 'Breed an S-Rank or SS-Rank Offspring with an inherited Egg Move at the Breeding Ranch',
      metric: 'sRankBred',
      target: 1,
      rewardShards: 500,
      rewardGems: 25,
      rewardItems: { apexNectar: 2, greaterPrism: 2 }
    },
    {
      id: 'sq_meadow_pest_patrol',
      title: 'Orchard Acorn Defense',
      giver: 'Scout Pip',
      zone: 'meadow',
      lore: '"Wild Thornbits and Mosslets keep raiding Grandpa’s berry crates! Snare or defeat Wild Kin in the tall grass!"',
      objective: 'Catch at least 3 Wild Kin using Snare Traps',
      metric: 'wildCaught',
      target: 3,
      rewardShards: 300,
      rewardGems: 15,
      rewardItems: { basicPrism: 5, sunberryRation: 4 }
    },

    // TIDEGLASS COVE (3 Quests)
    {
      id: 'sq_radiant_seeker',
      title: 'Gleam of the Astral Star',
      giver: 'Sage Mira',
      zone: 'tidecove',
      lore: '"Once in a blue tide, a Wild Kin is born shimmering with Radiant starlight. Find or hatch one!"',
      objective: 'Bind or hatch 1 Radiant (★) Kin across any World or at the Homestead Ranch',
      metric: 'radiantCount',
      target: 1,
      rewardShards: 650,
      rewardGems: 35,
      rewardItems: { masteryPrism: 1, apexNectar: 2 }
    },
    {
      id: 'sq_tide_lighthouse',
      title: 'Lighthouse Reef Rescue',
      giver: 'Diver Kora',
      zone: 'tidecove',
      lore: '"The coral beacons of Tideglass Cove need a Tide-affinity guardian. Bind a Tide Kin and win battles along the reef!"',
      objective: 'Win 6 Battles across your journey',
      metric: 'battlesWon',
      target: 6,
      rewardShards: 420,
      rewardGems: 20,
      rewardItems: { greaterPrism: 3, spicedSkewers: 3 }
    },
    {
      id: 'sq_tide_angler',
      title: 'Abyssal Lagoon Survey',
      giver: 'Captain Brine',
      zone: 'tidecove',
      lore: '"My nets keep getting tangled by feisty reef Kin! Help me catalog 5 different species in your KinDex."',
      objective: 'Register 5+ distinct species in your KinDex',
      metric: 'kindexCount',
      target: 5,
      rewardShards: 380,
      rewardGems: 20,
      rewardItems: { heartwoodStew: 2, basicPrism: 4 }
    },

    // STORMSPIRE CANOPY (3 Quests)
    {
      id: 'sq_canopy_collector',
      title: 'Stormspire Naturalist',
      giver: 'Sky-Ranger Lyra',
      zone: 'stormspire',
      lore: '"High in the thunder-charged redwood canopy, diverse Kin thrive. Expand your KinDex to 10 species!"',
      objective: 'Register 10+ distinct species in the KinDex',
      metric: 'kindexCount',
      target: 10,
      rewardShards: 600,
      rewardGems: 30,
      rewardItems: { greaterPrism: 4, hiTonic: 3 }
    },
    {
      id: 'sq_storm_relay',
      title: 'Thunder-Rod Calibration',
      giver: 'Engineer Talia',
      zone: 'stormspire',
      lore: '"Our sky-bridges run on static cores! Catch 6 Wild Kin with Snare Traps to help us calibrate the relay!"',
      objective: 'Catch 6+ Wild Kin using Snare Traps',
      metric: 'wildCaught',
      target: 6,
      rewardShards: 550,
      rewardGems: 25,
      rewardItems: { greaterPrism: 3, aetherCandy: 2 }
    },
    {
      id: 'sq_storm_skybridge',
      title: 'Vanguard of the Canopy',
      giver: 'Warden Vane',
      zone: 'stormspire',
      lore: '"Prove your squad can weather the lightning squalls! Earn at least 2 World Warden Crests."',
      objective: 'Defeat 2+ World Wardens and claim their Crests',
      metric: 'badgesCount',
      target: 2,
      rewardShards: 700,
      rewardGems: 35,
      rewardItems: { bagUpgrade1: 1, heartwoodStew: 3 }
    },

    // FROSTVEIL EXPANSE (3 Quests)
    {
      id: 'sq_glacier_historian',
      title: 'Chronicles of Frostveil',
      giver: 'Chronicler Bjorn',
      zone: 'frostveil',
      lore: '"Ancient ice tablets speak of Kin that transcend their base form. Catalog 18 species and evolve 2 Kin!"',
      objective: 'Register 18+ distinct species in the KinDex & evolve 2 Kin',
      metric: 'kindexCount',
      target: 18,
      rewardShards: 950,
      rewardGems: 45,
      rewardItems: { masteryPrism: 2, reviveLeaf: 3 }
    },
    {
      id: 'sq_frost_expedition',
      title: 'Cryo-Cavern Supplies',
      giver: 'Mountaineer Freya',
      zone: 'frostveil',
      lore: '"The sub-zero winds drain vitality fast. Cook and feed 5 Campfire Rations or Stews to keep your squad warm!"',
      objective: 'Feed 5+ Food Rations or Stews to your Kin',
      metric: 'foodFed',
      target: 5,
      rewardShards: 620,
      rewardGems: 30,
      rewardItems: { feastPlatter: 2, greaterPrism: 3 }
    },
    {
      id: 'sq_frost_evolution',
      title: 'Awakening the Glacier Bloodline',
      giver: 'Elder Kaelen',
      zone: 'frostveil',
      lore: '"Only seasoned Tamers witness true metamorphosis. Evolve at least 2 Kin through combat or Aether Crystals!"',
      objective: 'Evolve 2+ Kin into their higher stages',
      metric: 'evolutionsTriggered',
      target: 2,
      rewardShards: 800,
      rewardGems: 40,
      rewardItems: { aetherCandy: 3, greaterPrism: 3 }
    },

    // EMBERVAULT CALDERA (3 Quests)
    {
      id: 'sq_ember_forge',
      title: 'Magma Anvil Tempering',
      giver: 'Forgemaster Ignis',
      zone: 'embervault',
      lore: '"My Obsidian Anvil needs the heat of 15 victorious battles to temper Sovereign Stasis Traps!"',
      objective: 'Win 15+ Battles across the Six Worlds',
      metric: 'battlesWon',
      target: 15,
      rewardShards: 900,
      rewardGems: 45,
      rewardItems: { masteryPrism: 2, apexTome: 1 }
    },
    {
      id: 'sq_ember_genetics',
      title: 'Crucible of Lineage',
      giver: 'Alchemist Pyra',
      zone: 'embervault',
      lore: '"Hatch 3 eggs at Grandpa’s Ranch so we can study how volcanic affinities pass down Egg Moves!"',
      objective: 'Hatch 3+ Offspring Eggs at Grandpa’s Ranch',
      metric: 'eggsHatched',
      target: 3,
      rewardShards: 850,
      rewardGems: 40,
      rewardItems: { geneticCatalyst: 1, hatchAccelerator: 2 }
    },
    {
      id: 'sq_ember_collector',
      title: 'Master Trapper of the Caldera',
      giver: 'Bounty Hunter Rex',
      zone: 'embervault',
      lore: '"Snare 10 Wild Kin in mechanical traps to prove your aim in the basalt trenches!"',
      objective: 'Catch 10+ Wild Kin using Snare Traps',
      metric: 'wildCaught',
      target: 10,
      rewardShards: 1100,
      rewardGems: 50,
      rewardItems: { masteryPrism: 3, feastPlatter: 2 }
    },

    // AETHER SANCTUM (3 Quests)
    {
      id: 'sq_spire_vanguard',
      title: 'Ascendant of the Aether Spire',
      giver: 'Grand Warden Vesper',
      zone: 'sanctum',
      lore: '"Climb to Floor 15 of the Endless Aether Spire Battle Tower to stand among the Astral Vanguard!"',
      objective: 'Reach Floor 15+ in the 100-Floor Endless Aether Spire Battle Tower',
      metric: 'spireFloor',
      target: 15,
      rewardShards: 1800,
      rewardGems: 80,
      rewardItems: { masteryPrism: 4, apexNectar: 4 }
    },
    {
      id: 'sq_sanctum_warden_conquest',
      title: 'Six-World Sovereign',
      giver: 'High Arbiter Solon',
      zone: 'sanctum',
      lore: '"Unite the Six Worlds by earning all 6 Warden Crests from Meadow to Sanctum!"',
      objective: 'Earn all 6 World Warden Crests',
      metric: 'badgesCount',
      target: 6,
      rewardShards: 2200,
      rewardGems: 100,
      rewardItems: { apexTome: 2, masteryPrism: 4 }
    },
    {
      id: 'sq_sanctum_encyclopedia',
      title: 'Grand Archivist of Aetheria',
      giver: 'Oracle Celestia',
      zone: 'sanctum',
      lore: '"Complete the ultimate record of life across the floating realms by binding 20+ distinct species!"',
      objective: 'Register 20+ distinct Kin species in your KinDex',
      metric: 'kindexCount',
      target: 20,
      rewardShards: 2500,
      rewardGems: 120,
      rewardItems: { bagUpgrade3: 1, masteryPrism: 5, apexTome: 2 }
    }
  ];

  // 12 Trackable Daily Tasks & Tamer Bounties
  const TAMER_TASKS = [
    {
      id: 'task_first_snare',
      title: 'Snare Novice',
      category: 'Trapping',
      icon: '🪤',
      desc: 'Throw a Snare Trap in battle and catch 1 Wild Kin.',
      metric: 'wildCaught',
      target: 1,
      rewardShards: 120,
      rewardGems: 10,
      rewardItems: { basicPrism: 3 },
      bpXp: 50
    },
    {
      id: 'task_trap_hunter',
      title: 'Wild Trap Specialist',
      category: 'Trapping',
      icon: '🪤',
      desc: 'Catch 5 Wild Kin across any World using Snare Traps.',
      metric: 'wildCaught',
      target: 5,
      rewardShards: 300,
      rewardGems: 20,
      rewardItems: { greaterPrism: 2 },
      bpXp: 80
    },
    {
      id: 'task_trap_thrower',
      title: 'Mechanical Trapper',
      category: 'Trapping',
      icon: '⚙️',
      desc: 'Deploy 8 Snare Traps during Wild Kin encounters.',
      metric: 'trapsThrown',
      target: 8,
      rewardShards: 260,
      rewardGems: 15,
      rewardItems: { greaterPrism: 2 },
      bpXp: 65
    },
    {
      id: 'task_combat_victor',
      title: 'Meadow Skirmisher',
      category: 'Combat',
      icon: '⚔️',
      desc: 'Win 3 Battles against Wild Kin or Rival Tamers.',
      metric: 'battlesWon',
      target: 3,
      rewardShards: 180,
      rewardGems: 12,
      rewardItems: { sunberryRation: 3 },
      bpXp: 50
    },
    {
      id: 'task_combat_veteran',
      title: 'Seasoned Duelist',
      category: 'Combat',
      icon: '🛡️',
      desc: 'Win 10 Battles across the Six Worlds.',
      metric: 'battlesWon',
      target: 10,
      rewardShards: 450,
      rewardGems: 25,
      rewardItems: { heartwoodStew: 2, aetherCandy: 1 },
      bpXp: 90
    },
    {
      id: 'task_campfire_chef',
      title: 'Campfire Gourmet',
      category: 'Vitality',
      icon: '🍖',
      desc: 'Feed 3 Food Rations or Stews to recover your Kin’s HP.',
      metric: 'foodFed',
      target: 3,
      rewardShards: 200,
      rewardGems: 15,
      rewardItems: { spicedSkewers: 2 },
      bpXp: 55
    },
    {
      id: 'task_ranch_breeder',
      title: 'Homestead Breeder',
      category: 'Ranch',
      icon: '🥚',
      desc: 'Hatch 1 Offspring Egg at Grandpa Rowan’s Breeding Sanctuary.',
      metric: 'eggsHatched',
      target: 1,
      rewardShards: 320,
      rewardGems: 20,
      rewardItems: { heartwoodBerry: 3, hatchAccelerator: 1 },
      bpXp: 75
    },
    {
      id: 'task_kin_trader',
      title: 'Cross-World Trader',
      category: 'Trade',
      icon: '🔄',
      desc: 'Complete 1 Kin Trade at the Kin Trade Center.',
      metric: 'kinTraded',
      target: 1,
      rewardShards: 350,
      rewardGems: 25,
      rewardItems: { aetherCandy: 2 },
      bpXp: 80
    },
    {
      id: 'task_full_squad',
      title: 'Full 4-Kin Squad',
      category: 'Collection',
      icon: '🐾',
      desc: 'Grow your team from 1 starter Kin to a full 4-Kin Active Squad!',
      metric: 'totalKinOwned',
      target: 4,
      rewardShards: 400,
      rewardGems: 30,
      rewardItems: { greaterPrism: 3, heartwoodStew: 2 },
      bpXp: 100
    },
    {
      id: 'task_bag_upgrader',
      title: 'Pack Mule Expansion',
      category: 'Equipment',
      icon: '🎒',
      desc: 'Upgrade your Kin Carrier Bag capacity at least once.',
      metric: 'bagTier',
      target: 1,
      rewardShards: 450,
      rewardGems: 30,
      rewardItems: { masteryPrism: 1 },
      bpXp: 90
    },
    {
      id: 'task_warden_challenger',
      title: 'Crest Conqueror',
      category: 'Bosses',
      icon: '👑',
      desc: 'Defeat your first World Warden and earn a Warden Crest.',
      metric: 'badgesCount',
      target: 1,
      rewardShards: 500,
      rewardGems: 35,
      rewardItems: { aetherCandy: 2, greaterPrism: 2 },
      bpXp: 100
    },
    {
      id: 'task_spire_climber',
      title: 'Spire Challenger',
      category: 'Endgame',
      icon: '🗼',
      desc: 'Reach Floor 5+ in the Endless Aether Spire.',
      metric: 'spireFloor',
      target: 5,
      rewardShards: 600,
      rewardGems: 40,
      rewardItems: { masteryPrism: 2, feastPlatter: 1 },
      bpXp: 120
    }
  ];

  // Unlockable 3D Tamer Outfits (Changes 3D Character Coat, Trim & Visor Colors Live!)
  const TAMER_OUTFITS = [
    {
      id: 'homestead_tunic',
      name: 'Homestead Ranger Tunic',
      icon: '🧥',
      rarity: 'Starter',
      coatColor: 0x0284c7,
      trimColor: 0xfacc15,
      hairColor: 0x1e293b,
      cssColor: '#0284c7',
      unlockSource: 'Default Starter Outfit',
      defaultUnlocked: true,
      desc: 'Grandpa Rowan’s classic cobalt explorer tunic with sun-gold Aether trim.'
    },
    {
      id: 'crimson_vanguard',
      name: 'Crimson Vanguard Cloak',
      icon: '🧣',
      rarity: 'Rare',
      coatColor: 0xe11d48,
      trimColor: 0xfde047,
      hairColor: 0x0f172a,
      cssColor: '#e11d48',
      unlockSource: 'Day 5 Daily Login / Battle Pass Tier 3',
      defaultUnlocked: false,
      desc: 'Blazing ember-red vanguard cloak worn by Embervault champions.'
    },
    {
      id: 'tideglass_diver',
      name: 'Tideglass Reef Suit',
      icon: '🤿',
      rarity: 'Rare',
      coatColor: 0x0d9488,
      trimColor: 0x38bdf8,
      hairColor: 0x1e1b4b,
      cssColor: '#0d9488',
      unlockSource: 'Battle Pass Tier 6',
      defaultUnlocked: false,
      desc: 'Hydro-streamlined aquamarine suit with bioluminescent reef trim.'
    },
    {
      id: 'stormspire_neon',
      name: 'Stormspire Volt Jacket',
      icon: '⚡',
      rarity: 'Epic',
      coatColor: 0x7c3aed,
      trimColor: 0x4ade80,
      hairColor: 0x312e81,
      cssColor: '#7c3aed',
      unlockSource: 'Battle Pass Tier 10',
      defaultUnlocked: false,
      desc: 'High-voltage violet canopy jacket threaded with neon storm-conductors.'
    },
    {
      id: 'obsidian_void',
      name: 'Obsidian Shadow Armor',
      icon: '🛡️',
      rarity: 'Epic',
      coatColor: 0x1e293b,
      trimColor: 0xc084fc,
      hairColor: 0x4c1d95,
      cssColor: '#c084fc',
      unlockSource: 'Battle Pass Tier 15',
      defaultUnlocked: false,
      desc: 'Stealth forged obsidian plate pulsing with purple Aether runes.'
    },
    {
      id: 'astral_sovereign',
      name: 'Astral Sovereign Regalia',
      icon: '👑',
      rarity: 'Mythic',
      coatColor: 0xf59e0b,
      trimColor: 0x38bdf8,
      hairColor: 0xfef08a,
      cssColor: '#facc15',
      unlockSource: 'Day 7 Weekly Grand Prize / Battle Pass Tier 20',
      defaultUnlocked: false,
      desc: 'Radiant gold-and-celestial armor of the Grand Champion of Aetheria.'
    }
  ];

  // Unlockable 3D Floating Emotes (Usable in 3D Overworld & 3D Battles!)
  const TAMER_EMOTES = [
    {
      id: 'emote_wave',
      name: 'Howdy Tamer!',
      icon: '👋',
      bubbleText: '👋 Hey there!',
      defaultUnlocked: true,
      unlockSource: 'Default Emote'
    },
    {
      id: 'emote_fire',
      name: 'Fire Up!',
      icon: '🔥',
      bubbleText: '🔥 FIRED UP!',
      defaultUnlocked: true,
      unlockSource: 'Day 3 Login / Battle Pass Tier 2'
    },
    {
      id: 'emote_hype',
      name: 'Aether Surge!',
      icon: '⚡',
      bubbleText: '⚡ LET’S GO!',
      defaultUnlocked: false,
      unlockSource: 'Battle Pass Tier 5'
    },
    {
      id: 'emote_cool',
      name: 'Too Easy',
      icon: '😎',
      bubbleText: '😎 TOO EASY!',
      defaultUnlocked: false,
      unlockSource: 'Battle Pass Tier 9'
    },
    {
      id: 'emote_gem',
      name: 'Diamond Bind',
      icon: '💎',
      bubbleText: '💎 RADIANT FLEX!',
      defaultUnlocked: false,
      unlockSource: 'Battle Pass Tier 14'
    },
    {
      id: 'emote_crown',
      name: 'Sovereign King',
      icon: '👑',
      bubbleText: '👑 SOVEREIGN GG!',
      defaultUnlocked: false,
      unlockSource: 'Day 7 Weekly Grand Prize / Battle Pass Tier 18'
    }
  ];

  // 7-Day Daily Login Streak + Day 7 Weekly Grand Prize
  const DAILY_LOGIN_REWARDS = [
    {
      day: 1,
      title: 'Day 1: Trapper’s Kickoff',
      icon: '🪤',
      shards: 200,
      gems: 20,
      items: { basicPrism: 3, sunberryRation: 3 },
      desc: '200 🪙 Shards + 20 💎 Gems + 3x Copper Snare Traps + 3x Sunberry Rations'
    },
    {
      day: 2,
      title: 'Day 2: Homestead Stew Pot',
      icon: '🍲',
      shards: 250,
      gems: 50,
      items: { heartwoodStew: 3, basicPrism: 2 },
      desc: '3x Grandpa’s Heartwood Stew + 50 💎 Gems + 250 🪙 Shards'
    },
    {
      day: 3,
      title: 'Day 3: Flame & Magnetize',
      icon: '🔥',
      shards: 300,
      gems: 35,
      items: { greaterPrism: 2 },
      unlockEmote: 'emote_fire',
      desc: 'Unlocks 🔥 "Fire Up!" Emote + 2x Magnetized Vault Traps + 300 🪙 Shards'
    },
    {
      day: 4,
      title: 'Day 4: Crystal Surge',
      icon: '🍬',
      shards: 350,
      gems: 45,
      items: { aetherCandy: 2, spicedSkewers: 3 },
      desc: '2x Rare Aether Crystals (+2 Levels) + 350 🪙 Shards + 45 💎 Gems'
    },
    {
      day: 5,
      title: 'Day 5: Crimson Vanguard',
      icon: '🧣',
      shards: 400,
      gems: 60,
      items: { greaterPrism: 3 },
      unlockOutfit: 'crimson_vanguard',
      desc: 'Unlocks 🧣 "Crimson Vanguard Cloak" 3D Outfit + 3x Magnetized Traps + 60 💎 Gems'
    },
    {
      day: 6,
      title: 'Day 6: Sovereign Scholar',
      icon: '📘',
      shards: 500,
      gems: 150,
      items: { apexTome: 1, feastPlatter: 2 },
      desc: '150 💎 Gems + 1x Sovereign XP Tome (+3 Levels!) + 2x Feast Platters'
    },
    {
      day: 7,
      title: 'WEEKLY GRAND PRIZE',
      icon: '👑',
      isGrandPrize: true,
      shards: 1000,
      gems: 250,
      items: { masteryPrism: 2, bagUpgrade1: 1 },
      unlockOutfit: 'astral_sovereign',
      unlockEmote: 'emote_crown',
      desc: '👑 "Astral Sovereign Regalia" 3D Outfit + 👑 "Sovereign" Emote + 2x Sovereign Stasis Traps + 🎒 Satchel Upgrade + 250 💎 Gems!'
    }
  ];

  // Season 1: Aether Awakening Battle Pass (20 Tiers, 100 BP XP per Tier)
  const BATTLE_PASS_TIERS = [
    { tier: 1, xpRequired: 0, freeDesc: '150 🪙 Shards + 3x Copper Snare Traps', goldDesc: '50 💎 Gems + 2x Rare Aether Crystals', freeReward: { shards: 150, items: { basicPrism: 3 } }, goldReward: { gems: 50, items: { aetherCandy: 2 } } },
    { tier: 2, xpRequired: 100, freeDesc: '🔥 Emote: "Fire Up!" + 2x Sunberry Rations', goldDesc: '2x Grandpa’s Heartwood Stew', freeReward: { shards: 100, items: { sunberryRation: 2 }, unlockEmote: 'emote_fire' }, goldReward: { gems: 30, items: { heartwoodStew: 2 } } },
    { tier: 3, xpRequired: 200, freeDesc: '2x Magnetized Vault Traps + 200 🪙', goldDesc: '🧣 3D Outfit: Crimson Vanguard Cloak', freeReward: { shards: 200, items: { greaterPrism: 2 } }, goldReward: { gems: 40, unlockOutfit: 'crimson_vanguard' } },
    { tier: 4, xpRequired: 300, freeDesc: '1x Rare Aether Crystal (+1 Lv) + 250 🪙', goldDesc: '1x 2x XP Surge Elixir + 60 💎', freeReward: { shards: 250, items: { aetherCandy: 1 } }, goldReward: { gems: 60, items: { xpBooster2x: 1 } } },
    { tier: 5, xpRequired: 400, freeDesc: '⚡ Emote: "Aether Surge!" + 30 💎 Gems', goldDesc: '🎒 Reinforced Tamer Satchel (+Bag Slots)', freeReward: { gems: 30, unlockEmote: 'emote_hype' }, goldReward: { gems: 50, items: { bagUpgrade1: 1 } } },
    { tier: 6, xpRequired: 500, freeDesc: '🤿 3D Outfit: Tideglass Reef Suit', goldDesc: '3x Magnetized Vault Traps + 300 🪙', freeReward: { shards: 200, unlockOutfit: 'tideglass_diver' }, goldReward: { shards: 300, items: { greaterPrism: 3 } } },
    { tier: 7, xpRequired: 600, freeDesc: '2x Grandpa’s Heartwood Stew + 300 🪙', goldDesc: '1x Incubator Speed Core + 75 💎', freeReward: { shards: 300, items: { heartwoodStew: 2 } }, goldReward: { gems: 75, items: { hatchAccelerator: 1 } } },
    { tier: 8, xpRequired: 700, freeDesc: '3x Magnetized Vault Traps', goldDesc: '1x Sovereign XP Tome (+3 Levels)', freeReward: { shards: 250, items: { greaterPrism: 3 } }, goldReward: { gems: 50, items: { apexTome: 1 } } },
    { tier: 9, xpRequired: 800, freeDesc: '😎 Emote: "Too Easy!" + 350 🪙', goldDesc: '2x Homestead Feast Platters', freeReward: { shards: 350, unlockEmote: 'emote_cool' }, goldReward: { gems: 60, items: { feastPlatter: 2 } } },
    { tier: 10, xpRequired: 900, freeDesc: '⚡ 3D Outfit: Stormspire Volt Jacket', goldDesc: '1x Sovereign Stasis Trap + 100 💎', freeReward: { shards: 400, unlockOutfit: 'stormspire_neon' }, goldReward: { gems: 100, items: { masteryPrism: 1 } } },
    { tier: 11, xpRequired: 1000, freeDesc: '2x Rare Aether Crystals + 400 🪙', goldDesc: '1x S-Rank Lineage Catalyst', freeReward: { shards: 400, items: { aetherCandy: 2 } }, goldReward: { gems: 70, items: { geneticCatalyst: 1 } } },
    { tier: 12, xpRequired: 1100, freeDesc: '1x Homestead Feast Platter + 50 💎', goldDesc: '🎒 Expedition Kin Pack (6 Active Squad!)', freeReward: { gems: 50, items: { feastPlatter: 1 } }, goldReward: { gems: 90, items: { bagUpgrade2: 1 } } },
    { tier: 13, xpRequired: 1200, freeDesc: '3x Magnetized Vault Traps + 450 🪙', goldDesc: '2x Sovereign XP Tomes (+6 Levels)', freeReward: { shards: 450, items: { greaterPrism: 3 } }, goldReward: { gems: 80, items: { apexTome: 2 } } },
    { tier: 14, xpRequired: 1300, freeDesc: '💎 Emote: "Diamond Bind!" + 500 🪙', goldDesc: '2x Sovereign Stasis Traps', freeReward: { shards: 500, unlockEmote: 'emote_gem' }, goldReward: { gems: 90, items: { masteryPrism: 2 } } },
    { tier: 15, xpRequired: 1400, freeDesc: '🛡️ 3D Outfit: Obsidian Shadow Armor', goldDesc: '150 💎 Gems + 2x S-Rank Lineage Catalysts', freeReward: { shards: 500, unlockOutfit: 'obsidian_void' }, goldReward: { gems: 150, items: { geneticCatalyst: 2 } } },
    { tier: 16, xpRequired: 1500, freeDesc: '1x Sovereign Stasis Trap + 550 🪙', goldDesc: '3x Homestead Feast Platters', freeReward: { shards: 550, items: { masteryPrism: 1 } }, goldReward: { gems: 100, items: { feastPlatter: 3 } } },
    { tier: 17, xpRequired: 1600, freeDesc: '1x Sovereign XP Tome (+3 Levels)', goldDesc: '3x Rare Aether Crystals + 120 💎', freeReward: { shards: 600, items: { apexTome: 1 } }, goldReward: { gems: 120, items: { aetherCandy: 3 } } },
    { tier: 18, xpRequired: 1700, freeDesc: '👑 Emote: "Sovereign GG!" + 80 💎', goldDesc: '2x Sovereign Stasis Traps + 800 🪙', freeReward: { gems: 80, unlockEmote: 'emote_crown' }, goldReward: { shards: 800, items: { masteryPrism: 2 } } },
    { tier: 19, xpRequired: 1800, freeDesc: '2x Sovereign Stasis Traps + 750 🪙', goldDesc: '🎒 Grandmaster Spatial Harness (8 Squad!)', freeReward: { shards: 750, items: { masteryPrism: 2 } }, goldReward: { gems: 150, items: { bagUpgrade3: 1 } } },
    { tier: 20, xpRequired: 1900, freeDesc: '👑 3D Outfit: Astral Sovereign Regalia + 1,000 🪙', goldDesc: '300 💎 Gems + 3x Sovereign Stasis Traps + 2x XP Tomes', freeReward: { shards: 1000, items: { masteryPrism: 1 }, unlockOutfit: 'astral_sovereign' }, goldReward: { gems: 300, items: { masteryPrism: 3, apexTome: 2 } } }
  ];

  // Cross-World NPC Kin Trade Center Offers (Start with 1 Kin -> Catch, Breed, or Trade to grow your squad!)
  const NPC_TRADES = [
    {
      id: 'trade_meadow_volt',
      npcName: 'Scout Pip',
      zone: 'meadow',
      zoneName: 'Sunleaf Meadow',
      wantsAffinity: 'Grove',
      wantsDesc: 'Any Grove-Affinity Kin (or any duplicate Kin)',
      offerSpeciesId: 10, // Sparkit (Volt)
      offerNickname: 'Zappy',
      offerLevel: 7,
      offerGeneticTier: 'A',
      offerIsRadiant: false,
      bonusItem: 'basicPrism',
      quote: '"I caught an extra A-Rank Sparkit near the canopy border! Trade me any Meadow Kin so we both grow our teams!"'
    },
    {
      id: 'trade_cove_ember',
      npcName: 'Sailor Kora',
      zone: 'tidecove',
      zoneName: 'Tideglass Cove',
      wantsAffinity: 'Tide',
      wantsDesc: 'Any Tide-Affinity Kin (or any Lv.6+ Kin)',
      offerSpeciesId: 1, // Emberkit (Ember)
      offerNickname: 'Blazeclaw',
      offerLevel: 10,
      offerGeneticTier: 'A',
      offerIsRadiant: false,
      bonusItem: 'heartwoodStew',
      quote: '"Sea air is chilly! Trade me a Tide Kin and I’ll give you my A-Rank Emberkit plus a pot of Heartwood Stew!"'
    },
    {
      id: 'trade_canopy_tide',
      npcName: 'Sky-Trader Venn',
      zone: 'stormspire',
      zoneName: 'Stormspire Canopy',
      wantsAffinity: 'Volt',
      wantsDesc: 'Any Volt-Affinity Kin (or any Lv.10+ Kin)',
      offerSpeciesId: 4, // Aquapup (Tide)
      offerNickname: 'Riptide',
      offerLevel: 14,
      offerGeneticTier: 'S',
      offerIsRadiant: false,
      bonusItem: 'greaterPrism',
      quote: '"Need a water specialist for Embervault? Swap me a Volt Kin for my S-Rank Aquapup!"'
    },
    {
      id: 'trade_frost_grove',
      npcName: 'Researcher Astrid',
      zone: 'frostveil',
      zoneName: 'Frostveil Expanse',
      wantsAffinity: 'Frost',
      wantsDesc: 'Any Frost-Affinity Kin (or any Lv.14+ Kin)',
      offerSpeciesId: 7, // Mosslet (Grove)
      offerNickname: 'Bramble',
      offerLevel: 18,
      offerGeneticTier: 'S',
      offerIsRadiant: false,
      bonusItem: 'aetherCandy',
      quote: '"My greenhouse needs a Frost specimen! I’ll trade you a rare S-Rank Mosslet holding an Aether Crystal!"'
    },
    {
      id: 'trade_ember_frost',
      npcName: 'Forgemaster Ignis',
      zone: 'embervault',
      zoneName: 'Embervault Caldera',
      wantsAffinity: 'Ember',
      wantsDesc: 'Any Ember-Affinity Kin (or any Lv.18+ Kin)',
      offerSpeciesId: 13, // Frostlynx
      offerNickname: 'Glacierfang',
      offerLevel: 22,
      offerGeneticTier: 'S',
      offerIsRadiant: true,
      bonusItem: 'masteryPrism',
      quote: '"This Radiant (★) Frostlynx keeps cooling my magma forge! Trade me an Ember Kin and he’s yours!"'
    },
    {
      id: 'trade_sanctum_aether',
      npcName: 'Envoy Lyra',
      zone: 'sanctum',
      zoneName: 'Aether Sanctum',
      wantsAffinity: 'Aether',
      wantsDesc: 'Any Kin Lv.20+ (Astral Lineage Exchange)',
      offerSpeciesId: 19, // Lumisprite
      offerNickname: 'Starweaver',
      offerLevel: 26,
      offerGeneticTier: 'SS',
      offerIsRadiant: true,
      bonusItem: 'apexTome',
      quote: '"An SS-Rank Radiant Lumisprite from the upper Sanctum! Worthy of a true Sovereign Tamer!"'
    }
  ];

  function getSpeciesById(id) {
    return KIN_SPECIES.find((k) => k.id === Number(id)) || KIN_SPECIES[0];
  }

  function calculateStatsForLevel(baseStats, level, isRadiant, geneticBonus = 1.0, bondLevel = 1) {
    const radMult = isRadiant ? 1.08 : 1.0;
    const genMult = typeof geneticBonus === 'number' && geneticBonus > 0 ? geneticBonus : 1.0;
    const bondMult = 1 + Math.max(0, (Number(bondLevel) || 1) - 1) * 0.025; // up to +22.5% at Bond Lv 10
    const mult = radMult * genMult * bondMult;
    const maxHp = Math.floor(((baseStats.hp * 2 * level) / 38 + level + 14) * mult);
    const atk = Math.floor(((baseStats.atk * 1.8 * level) / 42 + 8) * mult);
    const def = Math.floor(((baseStats.def * 1.8 * level) / 42 + 8) * mult);
    const spd = Math.floor(((baseStats.spd * 1.8 * level) / 42 + 8) * mult);
    return { maxHp, atk, def, spd };
  }

  function xpForNextLevel(level) {
    return Math.floor(24 + Math.pow(level, 2.15) * 6);
  }

  function createKinInstance(speciesId, level, opts = {}) {
    const species = getSpeciesById(speciesId);
    const isRadiant = opts.isRadiant !== undefined ? Boolean(opts.isRadiant) : (Math.random() < 0.04); // 1-in-25 Radiant!
    const geneticTier = opts.geneticTier || 'B';
    const tierInfo = GENETIC_TIERS[geneticTier] || GENETIC_TIERS.B;
    const geneticBonus = opts.geneticBonus !== undefined ? Number(opts.geneticBonus) : tierInfo.bonus;
    const bondLevel = Math.max(1, Math.min(10, Number(opts.bondLevel) || 1));
    const generation = Math.max(1, Number(opts.generation) || 1);

    const stats = calculateStatsForLevel(species.baseStats, level, isRadiant, geneticBonus, bondLevel);
    const rawMoveIds = Array.isArray(opts.moveIds) && opts.moveIds.length > 0
      ? opts.moveIds.slice(0, 4)
      : (species.moves || ['clawSwipe']).slice(0, 4);
    const moveSlots = rawMoveIds.map((mId) => {
      const m = MOVES[mId] || MOVES.clawSwipe;
      return { id: m.id, currentStamina: m.stamina, maxStamina: m.stamina };
    });
    return {
      uid: opts.uid || ('kin_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36)),
      speciesId: species.id,
      nickname: opts.nickname || species.name,
      level: level,
      xp: 0,
      xpToNext: xpForNextLevel(level),
      currentHp: stats.maxHp,
      maxHp: stats.maxHp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      isRadiant: isRadiant,
      geneticTier: tierInfo.tier,
      geneRank: tierInfo.tier,
      geneticBonus: geneticBonus,
      geneScore: Math.round(geneticBonus * 100),
      traitId: opts.traitId || (tierInfo.tier === 'SS' ? 'apex_lineage' : tierInfo.tier === 'S' ? 'alpha_vigor' : tierInfo.tier === 'A' ? 'keen_instinct' : 'steady_heart'),
      bondLevel: bondLevel,
      generation: generation,
      inheritedMove: opts.inheritedMove || null,
      parentNames: opts.parentNames || null,
      status: null, // 'burn' | 'paralyze' | 'soak' | 'poison' | null
      moveSlots: moveSlots,
      caughtZone: opts.caughtZone || 'Sanctuary'
    };
  }

  // Find the base (stage-1) species of an evolutionary line for breeding offspring
  function getBaseStageSpeciesId(speciesId) {
    let current = getSpeciesById(speciesId);
    for (let guard = 0; guard < 4; guard++) {
      const prev = KIN_SPECIES.find((s) => s.evolvesTo && s.evolvesTo.id === current.id);
      if (!prev) break;
      current = prev;
    }
    return current.id;
  }

  /**
   * Breeds two parent Kin at Grandpa Rowan’s Homestead Sanctuary.
   * Produces a high-potential Offspring with upgraded Genetic Tier (A -> S -> SS),
   * an inherited move from Parent B, scaled starting level, and 3x Radiant chance!
   */
  function breedKinOffspring(parentA, parentB, opts = {}) {
    if (!parentA || !parentB) return null;
    const baseSpeciesId = getBaseStageSpeciesId(parentA.speciesId);
    const baseSpec = getSpeciesById(baseSpeciesId);

    const tierOrder = ['B', 'A', 'S', 'SS'];
    const idxA = Math.max(0, tierOrder.indexOf(parentA.geneticTier || 'B'));
    const idxB = Math.max(0, tierOrder.indexOf(parentB.geneticTier || 'B'));
    const bestIdx = Math.max(idxA, idxB);
    const nextTier = tierOrder[Math.min(tierOrder.length - 1, bestIdx + 1)];
    const tierInfo = GENETIC_TIERS[nextTier] || GENETIC_TIERS.A;

    // Inherit a signature move from Parent B
    const parentBMoves = Array.isArray(parentB.moveSlots) ? parentB.moveSlots.map((m) => m.id) : [];
    const baseMoves = (baseSpec.moves || ['clawSwipe']).slice(0, 4);
    let inheritedMove = null;
    for (let i = parentBMoves.length - 1; i >= 0; i--) {
      const mId = parentBMoves[i];
      if (MOVES[mId] && !baseMoves.includes(mId)) {
        inheritedMove = mId;
        break;
      }
    }
    if (!inheritedMove && parentBMoves.length > 0) {
      inheritedMove = parentBMoves[parentBMoves.length - 1];
    }

    const finalMoves = baseMoves.slice(0, 4);
    if (inheritedMove && !finalMoves.includes(inheritedMove)) {
      if (finalMoves.length >= 4) finalMoves[3] = inheritedMove;
      else finalMoves.push(inheritedMove);
    }

    const avgParentLv = Math.floor(((Number(parentA.level) || 5) + (Number(parentB.level) || 5)) / 2);
    const childLevel = Math.max(5, Math.min(25, Math.floor(avgParentLv * 0.6)));
    const radiantChance = (parentA.isRadiant || parentB.isRadiant) ? 0.25 : 0.14;
    const isRadiant = opts.isRadiant !== undefined ? Boolean(opts.isRadiant) : (Math.random() < radiantChance);
    const generation = Math.max(Number(parentA.generation) || 1, Number(parentB.generation) || 1) + 1;

    return createKinInstance(baseSpeciesId, childLevel, {
      isRadiant,
      geneticTier: nextTier,
      geneticBonus: tierInfo.bonus,
      bondLevel: 3, // Hatched at Grandpa’s Ranch with a warm initial bond!
      generation,
      moveIds: finalMoves,
      inheritedMove,
      parentNames: [parentA.nickname || 'Parent A', parentB.nickname || 'Parent B'],
      caughtZone: 'Heartwood Breeding Ranch'
    });
  }

  DAILY_LOGIN_REWARDS.forEach((d) => {
    if (!d.label) d.label = d.desc;
    if (!d.outfitId && d.unlockOutfit) d.outfitId = d.unlockOutfit;
    if (!d.emoteId && d.unlockEmote) d.emoteId = d.unlockEmote;
    if (d.isGrandPrize) d.isWeeklyGrandPrize = true;
  });

  BATTLE_PASS_TIERS.forEach((t) => {
    if (!t.free && t.freeReward) {
      t.free = Object.assign({ label: t.freeDesc, icon: "🎁", outfitId: t.freeReward.unlockOutfit, emoteId: t.freeReward.unlockEmote }, t.freeReward);
    }
    if (!t.gold && t.goldReward) {
      t.gold = Object.assign({ label: t.goldDesc, icon: "👑", outfitId: t.goldReward.unlockOutfit, emoteId: t.goldReward.unlockEmote }, t.goldReward);
    }
  });

  NPC_TRADES.forEach((tr) => {
    if (!tr.offersSpeciesId) tr.offersSpeciesId = tr.offerSpeciesId;
    if (!tr.offersNickname) tr.offersNickname = tr.offerNickname;
    if (!tr.offersLevel) tr.offersLevel = tr.offerLevel;
    if (!tr.offersGeneticTier) tr.offersGeneticTier = tr.offerGeneticTier;
    if (tr.isRadiant === undefined) tr.isRadiant = Boolean(tr.offerIsRadiant);
    if (!tr.wantsSpeciesId) {
      const matchMap = {
        trade_meadow_volt: 10,
        trade_cove_ember: 4,
        trade_canopy_tide: 13,
        trade_frost_grove: 16,
        trade_ember_umbra: 1,
        trade_sanctum_apex: 19
      };
      tr.wantsSpeciesId = matchMap[tr.id] || 7;
    }
  });

  return {
    AFFINITIES,
    TYPE_CHART,
    MOVES,
    KIN_SPECIES,
    SPECIES: KIN_SPECIES,
    ITEMS,
    MARKETPLACE_BUNDLES,
    GEM_BUNDLES: MARKETPLACE_BUNDLES,
    ZONES,
    WARDENS,
    GENETIC_TIERS,
    STORY_CHAPTERS,
    SIDE_QUESTS,
    TAMER_TASKS,
    TAMER_OUTFITS,
    TAMER_EMOTES,
    DAILY_LOGIN_REWARDS,
    LOGIN_CALENDAR: DAILY_LOGIN_REWARDS,
    BATTLE_PASS_TIERS,
    NPC_TRADES,
    NEPC_TRADES: NPC_TRADES,
    getTypeMultiplier,
    getSpeciesById,
    getBaseStageSpeciesId,
    calculateStatsForLevel,
    xpForNextLevel,
    createKinInstance,
    breedKinOffspring,
    breedKinPair: breedKinOffspring
  };
});
