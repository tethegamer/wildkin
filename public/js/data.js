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

  // Moves Dictionary
  const MOVES = {
    clawSwipe: {
      id: 'clawSwipe', name: 'Claw Swipe', affinity: 'Terra', power: 40, accuracy: 100, stamina: 25,
      category: 'physical', desc: 'A swift slash with hardened claws.'
    },
    quickDash: {
      id: 'quickDash', name: 'Quick Dash', affinity: 'Volt', power: 40, accuracy: 100, stamina: 25,
      category: 'physical', priority: 1, desc: 'Lunges at blinding speed. Strikes first.'
    },
    emberPounce: {
      id: 'emberPounce', name: 'Ember Pounce', affinity: 'Pyre', power: 48, accuracy: 100, stamina: 20,
      category: 'physical', statusEffect: { type: 'burn', chance: 0.2 }, desc: 'Leaps cloaked in sparks. May Burn.'
    },
    flameBurst: {
      id: 'flameBurst', name: 'Flame Burst', affinity: 'Pyre', power: 68, accuracy: 95, stamina: 15,
      category: 'special', statusEffect: { type: 'burn', chance: 0.25 }, desc: 'Searing fireball that often Burns.'
    },
    solarFlare: {
      id: 'solarFlare', name: 'Solar Flare', affinity: 'Pyre', power: 92, accuracy: 90, stamina: 10,
      category: 'special', statusEffect: { type: 'burn', chance: 0.35 }, desc: 'Unleashes miniature sunfire upon the foe.'
    },
    magmaCrush: {
      id: 'magmaCrush', name: 'Magma Crush', affinity: 'Pyre', power: 80, accuracy: 95, stamina: 12,
      category: 'physical', statusEffect: { type: 'burn', chance: 0.2 }, desc: 'Molten-armored slam with heavy impact.'
    },
    rippleJet: {
      id: 'rippleJet', name: 'Ripple Jet', affinity: 'Tide', power: 46, accuracy: 100, stamina: 20,
      category: 'physical', priority: 1, desc: 'High-pressure water dart that strikes first.'
    },
    brinePulse: {
      id: 'brinePulse', name: 'Brine Pulse', affinity: 'Tide', power: 65, accuracy: 95, stamina: 15,
      category: 'special', statusEffect: { type: 'soak', chance: 0.25 }, desc: 'Crashing wave that may Soak & slow the foe.'
    },
    tidalVortex: {
      id: 'tidalVortex', name: 'Tidal Vortex', affinity: 'Tide', power: 88, accuracy: 90, stamina: 10,
      category: 'special', statusEffect: { type: 'soak', chance: 0.35 }, desc: 'Whirlpool from the deep abyss.'
    },
    rimeFang: {
      id: 'rimeFang', name: 'Rime Fang', affinity: 'Tide', power: 62, accuracy: 95, stamina: 15,
      category: 'physical', statusEffect: { type: 'soak', chance: 0.2 }, desc: 'Chilling bite that numbs movement.'
    },
    vineLash: {
      id: 'vineLash', name: 'Briar Lash', affinity: 'Grove', power: 46, accuracy: 100, stamina: 20,
      category: 'physical', desc: 'Snaps thorny vines across the target.'
    },
    sporeDrain: {
      id: 'sporeDrain', name: 'Sap Drain', affinity: 'Grove', power: 55, accuracy: 95, stamina: 15,
      category: 'special', drain: 0.4, desc: 'Absorbs life energy, healing 40% of damage dealt.'
    },
    razorCanopy: {
      id: 'razorCanopy', name: 'Briar Canopy', affinity: 'Grove', power: 72, accuracy: 95, stamina: 15,
      category: 'physical', critBonus: 0.2, desc: 'Whirling iron-leaves with a high critical rate.'
    },
    sylvanWrath: {
      id: 'sylvanWrath', name: 'Sylvan Wrath', affinity: 'Grove', power: 90, accuracy: 90, stamina: 10,
      category: 'special', statusEffect: { type: 'poison', chance: 0.3 }, desc: 'Ancient forest surge that may Poison.'
    },
    sparkPeck: {
      id: 'sparkPeck', name: 'Spark Peck', affinity: 'Volt', power: 48, accuracy: 100, stamina: 20,
      category: 'physical', statusEffect: { type: 'paralyze', chance: 0.2 }, desc: 'Electrified beak strike. May Paralyze.'
    },
    arcBolt: {
      id: 'arcBolt', name: 'Arc Bolt', affinity: 'Volt', power: 68, accuracy: 95, stamina: 15,
      category: 'special', statusEffect: { type: 'paralyze', chance: 0.25 }, desc: 'Crackling lightning arc.'
    },
    tempestDive: {
      id: 'tempestDive', name: 'Tempest Dive', affinity: 'Volt', power: 88, accuracy: 90, stamina: 10,
      category: 'physical', statusEffect: { type: 'paralyze', chance: 0.3 }, desc: 'Supersonic thunder-plummet from the sky.'
    },
    pebbleToss: {
      id: 'pebbleToss', name: 'Shale Toss', affinity: 'Terra', power: 48, accuracy: 100, stamina: 20,
      category: 'physical', desc: 'Hurls jagged stones at the enemy.'
    },
    quakeStomp: {
      id: 'quakeStomp', name: 'Quake Stomp', affinity: 'Terra', power: 70, accuracy: 95, stamina: 15,
      category: 'physical', desc: 'Shakes the battlefield with tectonic force.'
    },
    crystalSpire: {
      id: 'crystalSpire', name: 'Crystal Spire', affinity: 'Terra', power: 88, accuracy: 90, stamina: 10,
      category: 'special', critBonus: 0.2, desc: 'Erupts razor-sharp quartz pillars under the foe.'
    },
    duskDart: {
      id: 'duskDart', name: 'Dusk Wing', affinity: 'Umbra', power: 48, accuracy: 100, stamina: 20,
      category: 'special', statusEffect: { type: 'poison', chance: 0.2 }, desc: 'Scatters twilight dust that may Poison.'
    },
    voidPulse: {
      id: 'voidPulse', name: 'Astral Pulse', affinity: 'Umbra', power: 70, accuracy: 95, stamina: 15,
      category: 'special', desc: 'Warps gravity with dark starlight.'
    },
    eclipseNova: {
      id: 'eclipseNova', name: 'Eclipse Nova', affinity: 'Umbra', power: 94, accuracy: 90, stamina: 8,
      category: 'special', statusEffect: { type: 'burn', chance: 0.3 }, desc: 'Collapses a dark star upon the battlefield.'
    },
    aetherFocus: {
      id: 'aetherFocus', name: 'Aether Focus', affinity: 'Volt', power: 0, accuracy: 100, stamina: 15,
      category: 'status', selfBuff: { atk: 1.35, spd: 1.2 }, desc: 'Harmonizes Aether to raise Attack & Speed.'
    },
    ironShell: {
      id: 'ironShell', name: 'Granite Guard', affinity: 'Terra', power: 0, accuracy: 100, stamina: 15,
      category: 'status', selfBuff: { def: 1.45 }, desc: 'Hardens outer carapace to sharply boost Defense.'
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
      moves: ['sparkPeck', 'quickDash', 'arcBolt', 'aetherFocus'],
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
    }
  ];

  // Items & Capture Prisms
  const ITEMS = {
    basicPrism: {
      id: 'basicPrism',
      name: 'Basic Prism',
      category: 'prism',
      catchMod: 1.0,
      cost: 50,
      color: '#38bdf8',
      icon: '💠',
      desc: 'Standard geometric Aether Prism for binding weakened wild Kin (1.0x rate).'
    },
    greaterPrism: {
      id: 'greaterPrism',
      name: 'Greater Prism',
      category: 'prism',
      catchMod: 1.75,
      cost: 120,
      color: '#c084fc',
      icon: '🔮',
      desc: 'Resonant octo-prism with a 1.75x higher harmonic bind rate.'
    },
    masteryPrism: {
      id: 'masteryPrism',
      name: 'Apex Prism',
      category: 'prism',
      catchMod: 3.2,
      cost: 300,
      color: '#facc15',
      icon: '🌟',
      desc: 'Gold-forged sovereign prism with a massive 3.2x bind rate on rare & mythic Kin.'
    },
    dewTonic: {
      id: 'dewTonic',
      name: 'Dew Tonic',
      category: 'heal',
      healAmount: 35,
      cost: 40,
      color: '#4ade80',
      icon: '🧪',
      desc: 'Restores 35 HP to an injured Kin.'
    },
    hiTonic: {
      id: 'hiTonic',
      name: 'Hi-Tonic',
      category: 'heal',
      healAmount: 90,
      cost: 100,
      color: '#22d3ee',
      icon: '⚗️',
      desc: 'Concentrated Wellspring elixir that restores 90 HP.'
    },
    reviveLeaf: {
      id: 'reviveLeaf',
      name: 'Sylvan Revive',
      category: 'revive',
      healPercent: 0.5,
      cost: 150,
      color: '#facc15',
      icon: '🍃',
      desc: 'Revives an exhausted Kin and restores 50% of its Max HP.'
    },
    heartwoodBerry: {
      id: 'heartwoodBerry',
      name: 'Heartwood Berry',
      category: 'care',
      bondGain: 1,
      xpGain: 45,
      cost: 45,
      color: '#fb7185',
      icon: '🍓',
      desc: 'Sweet orchard berry grown at Grandpa Rowan’s Homestead. Raises a Kin’s Bond Level (+1) and grants XP.'
    },
    apexNectar: {
      id: 'apexNectar',
      name: 'Apex Royal Nectar',
      category: 'care',
      bondGain: 2,
      xpGain: 160,
      cost: 160,
      color: '#f59e0b',
      icon: '🍯',
      desc: 'Golden Aether nectar from Grandpa’s sanctuary. Boosts Bond Level (+2), restores Stamina, and grants high XP.'
    }
  };

  // 6 Explorable Worlds (24+ Hour Multi-World Progression)
  const ZONES = [
    {
      id: 'meadow',
      name: 'Sunleaf Meadow',
      worldNumber: 1,
      subtitle: 'World 1 • Lv 2–8 • Heartwood Homestead & Sanctuary',
      levelRange: [2, 8],
      recommendedLevel: 2,
      themeColor: '#22c55e',
      bgGradient: ['#132a1c', '#1e3f29'],
      wildPool: [
        { id: 10, weight: 28 }, // Sparkcheep
        { id: 13, weight: 30 }, // Bramblepuff
        { id: 15, weight: 20 }, // Pebblecrab
        { id: 17, weight: 14 }, // Dewdrop
        { id: 7,  weight: 8 }   // Wild Mossling
      ],
      wardenId: 'kael',
      desc: 'Home to Grandpa Rowan’s Heartwood Homestead & Breeding Ranch, the Wellspring Shrine, and swaying emerald meadows.'
    },
    {
      id: 'tidecove',
      name: 'Whispering Tidecove',
      worldNumber: 2,
      subtitle: 'World 2 • Lv 8–15 • Bioluminescent Archipelago',
      levelRange: [8, 15],
      recommendedLevel: 8,
      themeColor: '#38bdf8',
      bgGradient: ['#0c2238', '#123556'],
      wildPool: [
        { id: 17, weight: 26 }, // Dewdrop
        { id: 15, weight: 22 }, // Pebblecrab
        { id: 21, weight: 20 }, // Voltmouse
        { id: 4,  weight: 10 }, // Wild Ripplefin
        { id: 11, weight: 12 }, // Galecrest
        { id: 18, weight: 10 }  // Mistserpent
      ],
      wardenId: 'nerissa',
      desc: 'Crystal tidepools, coral boardwalks, and misty sea arches teeming with Tide and Volt Kin.'
    },
    {
      id: 'stormspire',
      name: 'Stormspire Canopy',
      worldNumber: 3,
      subtitle: 'World 3 • Lv 14–22 • Ancient Tempest Highland',
      levelRange: [14, 22],
      recommendedLevel: 14,
      themeColor: '#eab308',
      bgGradient: ['#1f2410', '#313816'],
      wildPool: [
        { id: 11, weight: 24 }, // Galecrest
        { id: 21, weight: 22 }, // Voltmouse
        { id: 14, weight: 20 }, // Thornback
        { id: 8,  weight: 14 }, // Briarhorn
        { id: 22, weight: 12 }, // Arcfox
        { id: 12, weight: 8 }   // Thunderhawk
      ],
      wardenId: 'orin',
      desc: 'Giant redwood sky-bridges and lightning-charged monoliths where Grandpa Rowan trained in his youth.'
    },
    {
      id: 'cinderpeak',
      name: 'Cinderpeak Cavern',
      worldNumber: 4,
      subtitle: 'World 4 • Lv 20–30 • Geothermal Caldera',
      levelRange: [20, 30],
      recommendedLevel: 20,
      themeColor: '#f97316',
      bgGradient: ['#2d120b', '#471c10'],
      wildPool: [
        { id: 23, weight: 28 }, // Magmapup
        { id: 16, weight: 18 }, // Basaltitan
        { id: 19, weight: 20 }, // Duskmoth
        { id: 1,  weight: 10 }, // Wild Cinderkit
        { id: 22, weight: 12 }, // Arcfox
        { id: 25, weight: 12 }  // Craggolem
      ],
      wardenId: 'ignis',
      desc: 'Basalt bridges over glowing magma rivers where Pyre and Terra Kin forge their strength.'
    },
    {
      id: 'frostveil',
      name: 'Frostveil Glacier',
      worldNumber: 5,
      subtitle: 'World 5 • Lv 28–40 • Aurora Crystal Peaks',
      levelRange: [28, 40],
      recommendedLevel: 28,
      themeColor: '#67e8f9',
      bgGradient: ['#0b2536', '#153e59'],
      wildPool: [
        { id: 18, weight: 24 }, // Mistserpent
        { id: 5,  weight: 20 }, // Torrentjaw
        { id: 20, weight: 18 }, // Lunawraith
        { id: 25, weight: 16 }, // Craggolem
        { id: 6,  weight: 12 }, // Abyssalking
        { id: 12, weight: 10 }  // Thunderhawk
      ],
      wardenId: 'freya',
      desc: 'Shoring ice spires under shimmering northern auroras, home to ancient Tide, Umbra, and Terra apex Kin.'
    },
    {
      id: 'sanctum',
      name: 'Astral Ruin Sanctum',
      worldNumber: 6,
      subtitle: 'World 6 • Lv 38–55 • Mythic Starlight Citadel & Spire',
      levelRange: [38, 55],
      recommendedLevel: 38,
      themeColor: '#c084fc',
      bgGradient: ['#1a1033', '#2d1b54'],
      wildPool: [
        { id: 20, weight: 24 }, // Lunawraith
        { id: 24, weight: 20 }, // Obsidianox
        { id: 25, weight: 18 }, // Craggolem
        { id: 12, weight: 16 }, // Thunderhawk
        { id: 26, weight: 13 }, // Astralwyrm (Mythic)
        { id: 27, weight: 9 }   // Aetherion (Mythic)
      ],
      wardenId: 'vesper',
      desc: 'Floating star-obelisks and the 100-Floor Aether Spire where Mythic Kin and Grand Warden Vesper await.'
    }
  ];

  // 6 Realm Wardens (World Bosses across all 6 Worlds)
  const WARDENS = [
    {
      id: 'kael',
      name: 'Warden Kael',
      title: 'Keeper of the Verdant Crest (World 1)',
      zoneId: 'meadow',
      crestName: 'Verdant Crest',
      crestIcon: '🌿',
      affinity: 'Grove',
      rewardShards: 250,
      quoteIntro: 'Grandpa Rowan told me about you! Let us see the bond between you and your Kin!',
      quoteDefeat: 'Splendid harmony! Take the Verdant Crest—Grandpa Rowan will be proud, and Tidecove awaits!',
      squad: [
        { speciesId: 13, level: 6 },
        { speciesId: 8, level: 8 }
      ]
    },
    {
      id: 'nerissa',
      name: 'Warden Nerissa',
      title: 'Mistress of the Abyssal Crest (World 2)',
      zoneId: 'tidecove',
      crestName: 'Abyssal Crest',
      crestIcon: '🌊',
      affinity: 'Tide',
      rewardShards: 420,
      quoteIntro: 'Calm waters hide crashing currents. Can your raised Kin weather the high tide?',
      quoteDefeat: 'Like a lighthouse in the storm! The Abyssal Crest belongs to you. Stormspire Canopy is now open!',
      squad: [
        { speciesId: 17, level: 12 },
        { speciesId: 18, level: 13 },
        { speciesId: 5, level: 15 }
      ]
    },
    {
      id: 'orin',
      name: 'Warden Orin',
      title: 'Sky-Caller of the Tempest Crest (World 3)',
      zoneId: 'stormspire',
      crestName: 'Tempest Crest',
      crestIcon: '⚡',
      affinity: 'Volt',
      rewardShards: 620,
      quoteIntro: 'Your grandfather Rowan and I once sparred atop these thunder ridges! Show me what he taught you!',
      quoteDefeat: 'Thunderous precision! Claim the Tempest Crest and descend into Cinderpeak Cavern!',
      squad: [
        { speciesId: 11, level: 17 },
        { speciesId: 22, level: 19 },
        { speciesId: 12, level: 21 }
      ]
    },
    {
      id: 'ignis',
      name: 'Warden Ignis',
      title: 'Forgemaster of the Solar Crest (World 4)',
      zoneId: 'cinderpeak',
      crestName: 'Solar Crest',
      crestIcon: '🔥',
      affinity: 'Pyre',
      rewardShards: 850,
      quoteIntro: 'Only diamond-hard resolve and well-bred Kin survive Cinderpeak’s crucible! Ignite your spirit!',
      quoteDefeat: 'Blazing brilliance! Take the Solar Crest—the frozen peaks of Frostveil Glacier await!',
      squad: [
        { speciesId: 16, level: 24 },
        { speciesId: 24, level: 26 },
        { speciesId: 3, level: 28 }
      ]
    },
    {
      id: 'freya',
      name: 'Warden Freya',
      title: 'Empress of the Frostveil Crest (World 5)',
      zoneId: 'frostveil',
      crestName: 'Frostveil Crest',
      crestIcon: '❄️',
      affinity: 'Tide',
      rewardShards: 1150,
      quoteIntro: 'Here beneath the aurora, only Tamers whose hearts beat as one with their Kin endure the frost!',
      quoteDefeat: 'Your warmth melts even glacier ice! Take the Frostveil Crest and ascend to the Astral Ruin Sanctum!',
      squad: [
        { speciesId: 18, level: 32 },
        { speciesId: 25, level: 34 },
        { speciesId: 9, level: 35 },
        { speciesId: 6, level: 37 }
      ]
    },
    {
      id: 'vesper',
      name: 'Grand Warden Vesper',
      title: 'Sovereign of the Astral Crest (World 6)',
      zoneId: 'sanctum',
      crestName: 'Astral Crest',
      crestIcon: '👑',
      affinity: 'Umbra',
      rewardShards: 1800,
      quoteIntro: 'Fifty years ago, Elder Rowan stood where you stand now. Prove your bloodline and claim the Astral Throne!',
      quoteDefeat: 'Unbelievable! All six World Crests resonate as one—the 100-Floor Aether Spire is yours to conquer!',
      squad: [
        { speciesId: 20, level: 40 },
        { speciesId: 12, level: 42 },
        { speciesId: 26, level: 44 },
        { speciesId: 27, level: 46 }
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

  // Grandpa Rowan’s Homestead & Multi-World Side Quests
  const SIDE_QUESTS = [
    {
      id: 'sq_orchard_bond',
      title: 'Heartwood Orchard Caretaker',
      giver: 'Grandpa Rowan',
      zone: 'meadow',
      objective: 'Raise any companion Kin to Bond Level 4+ at the Heartwood Homestead Ranch',
      rewardShards: 250,
      rewardItems: { heartwoodBerry: 4 }
    },
    {
      id: 'sq_s_rank_breeder',
      title: 'Lineage of the Ancients',
      giver: 'Grandpa Rowan',
      zone: 'meadow',
      objective: 'Breed an S-Rank or SS-Rank Offspring with an inherited Egg Move at the Breeding Ranch',
      rewardShards: 500,
      rewardItems: { apexNectar: 2, greaterPrism: 2 }
    },
    {
      id: 'sq_radiant_seeker',
      title: 'Gleam of the Astral Star',
      giver: 'Sage Mira',
      zone: 'tidecove',
      objective: 'Bind or hatch 1 Radiant (★) Kin across any World or at the Homestead Ranch',
      rewardShards: 650,
      rewardItems: { masteryPrism: 1, apexNectar: 2 }
    },
    {
      id: 'sq_canopy_collector',
      title: 'Stormspire Naturalist',
      giver: 'Sky-Ranger Lyra',
      zone: 'stormspire',
      objective: 'Register 10+ distinct species in the KinDex',
      rewardShards: 600,
      rewardItems: { greaterPrism: 4, hiTonic: 3 }
    },
    {
      id: 'sq_glacier_historian',
      title: 'Chronicles of Frostveil',
      giver: 'Chronicler Bjorn',
      zone: 'frostveil',
      objective: 'Register 18+ distinct species in the KinDex & evolve 2 Kin',
      rewardShards: 950,
      rewardItems: { masteryPrism: 2, reviveLeaf: 3 }
    },
    {
      id: 'sq_spire_vanguard',
      title: 'Ascendant of the Aether Spire',
      giver: 'Grand Warden Vesper',
      zone: 'sanctum',
      objective: 'Reach Floor 15+ in the 100-Floor Endless Aether Spire Battle Tower',
      rewardShards: 1800,
      rewardItems: { masteryPrism: 4, apexNectar: 4 }
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

  return {
    AFFINITIES,
    TYPE_CHART,
    MOVES,
    KIN_SPECIES,
    ITEMS,
    ZONES,
    WARDENS,
    GENETIC_TIERS,
    STORY_CHAPTERS,
    SIDE_QUESTS,
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
