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
    }
  };

  // 4 Explorable Zones
  const ZONES = [
    {
      id: 'meadow',
      name: 'Sunleaf Meadow',
      subtitle: 'Lv 2–7 • Verdant Starter Sanctuary',
      levelRange: [2, 7],
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
      desc: 'Swaying emerald tall grass, the central Wellspring Shrine, and Sage Mira’s Sanctuary.'
    },
    {
      id: 'tidecove',
      name: 'Whispering Tidecove',
      subtitle: 'Lv 7–14 • Bioluminescent Lagoon',
      levelRange: [7, 14],
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
      desc: 'Crystal tidepools and misty boardwalks teeming with Tide and Volt Kin.'
    },
    {
      id: 'cinderpeak',
      name: 'Cinderpeak Cavern',
      subtitle: 'Lv 13–22 • Geothermal Caldera',
      levelRange: [13, 22],
      recommendedLevel: 14,
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
      id: 'sanctum',
      name: 'Astral Ruin Sanctum',
      subtitle: 'Lv 20–32 • Mythic Starlight Citadel',
      levelRange: [20, 32],
      recommendedLevel: 21,
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
      desc: 'Floating obelisks at the edge of the sky where Mythic Kin and Grand Warden Vesper await.'
    }
  ];

  // 4 Realm Wardens (Bosses)
  const WARDENS = [
    {
      id: 'kael',
      name: 'Warden Kael',
      title: 'Keeper of the Verdant Crest',
      zoneId: 'meadow',
      crestName: 'Verdant Crest',
      crestIcon: '🌿',
      affinity: 'Grove',
      rewardShards: 220,
      quoteIntro: 'The forest tests every new Tamer! Show me the bond between you and your Kin!',
      quoteDefeat: 'Splendid harmony! Take the Verdant Crest—the Tidecove paths are yours to walk.',
      squad: [
        { speciesId: 13, level: 6 },
        { speciesId: 8, level: 8 }
      ]
    },
    {
      id: 'nerissa',
      name: 'Warden Nerissa',
      title: 'Mistress of the Abyssal Crest',
      zoneId: 'tidecove',
      crestName: 'Abyssal Crest',
      crestIcon: '🌊',
      affinity: 'Tide',
      rewardShards: 380,
      quoteIntro: 'Calm waters hide crashing currents. Can your squad weather the high tide?',
      quoteDefeat: 'Like a lighthouse in the storm! The Abyssal Crest belongs to you.',
      squad: [
        { speciesId: 17, level: 12 },
        { speciesId: 18, level: 13 },
        { speciesId: 5, level: 15 }
      ]
    },
    {
      id: 'ignis',
      name: 'Warden Ignis',
      title: 'Forgemaster of the Solar Crest',
      zoneId: 'cinderpeak',
      crestName: 'Solar Crest',
      crestIcon: '🔥',
      affinity: 'Pyre',
      rewardShards: 600,
      quoteIntro: 'Only diamond-hard resolve survives Cinderpeak’s crucible! Ignite your spirit!',
      quoteDefeat: 'Blazing brilliance! Take the Solar Crest and ascend to the Astral Sanctum!',
      squad: [
        { speciesId: 16, level: 18 },
        { speciesId: 24, level: 20 },
        { speciesId: 3, level: 22 }
      ]
    },
    {
      id: 'vesper',
      name: 'Grand Warden Vesper',
      title: 'Sovereign of the Astral Crest',
      zoneId: 'sanctum',
      crestName: 'Astral Crest',
      crestIcon: '👑',
      affinity: 'Umbra',
      rewardShards: 1200,
      quoteIntro: 'Beyond flame, tide, and grove lies the Astral Rift. Prove you are worthy of Aetherion!',
      quoteDefeat: 'Unbelievable! All four Warden Crests resonate as one—you are a true Realm Champion!',
      squad: [
        { speciesId: 20, level: 25 },
        { speciesId: 12, level: 26 },
        { speciesId: 26, level: 28 },
        { speciesId: 27, level: 30 }
      ]
    }
  ];

  function getSpeciesById(id) {
    return KIN_SPECIES.find((k) => k.id === Number(id)) || KIN_SPECIES[0];
  }

  function calculateStatsForLevel(baseStats, level, isRadiant) {
    const mult = isRadiant ? 1.08 : 1.0;
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
    const stats = calculateStatsForLevel(species.baseStats, level, isRadiant);
    const moveSlots = (species.moves || ['clawSwipe']).slice(0, 4).map((mId) => {
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
      status: null, // 'burn' | 'paralyze' | 'soak' | 'poison' | null
      moveSlots: moveSlots,
      caughtZone: opts.caughtZone || 'Sanctuary'
    };
  }

  return {
    AFFINITIES,
    TYPE_CHART,
    MOVES,
    KIN_SPECIES,
    ITEMS,
    ZONES,
    WARDENS,
    getTypeMultiplier,
    getSpeciesById,
    calculateStatsForLevel,
    xpForNextLevel,
    createKinInstance
  };
});
