/**
 * WILDKIN: AETHER BOUND — Crisp 16x16 Pixel-Art Sprite Engine
 * Renders bespoke pixel matrices for all 27 original Kin (normal + Radiant palettes),
 * geometric Aether Prisms, and Tamer characters onto Canvas or SVG.
 */
(function (root) {
  // Legend for 16x16 pixel strings:
  // '.' = transparent
  // 'O' = dark outline / shadow (#141824)
  // 'P' = species primary color
  // 'S' = species secondary / belly / crest highlight
  // 'A' = species accent / markings / horns
  // 'E' = eye color
  // 'W' = white gleam (#ffffff)

  const PIXEL_GRIDS = {
    // #1 Cinderkit (Ember Cub)
    1: [
      "..OO........OO..",
      ".OSSO......OSSO.",
      ".OPPOO....OOPPO.",
      ".OPPPPOOOOPPPPO.",
      "..OPPPPPPPPPPO..",
      "..OPWEPPPPWEPO..",
      "..OPPPPPPPPPPO..",
      "...OPPSSPSSPO...",
      "....OOOOOOOO....",
      "...OPPPPPPPPO...",
      "..OPPPSSSSPPPO.S",
      "..OPPPSSSSPPPOSS",
      "..OP.OOOOOO.POSP",
      "..OO.OO..OO.OOO.",
      ".....OO..OO.....",
      "................"
    ],
    // #2 Pyrolynx (Flare Stalker)
    2: [
      ".SOO........OOS.",
      "SSOAAO....OAAOSS",
      ".OPPPPOOOOPPPPO.",
      "..OPPPPPPPPPPO..",
      "..OPWEPPPPWEPO..",
      "..OPPPSSSSPPPO..",
      "...OOOOOOOOOO...",
      "..OPPPAAAAAPPO..",
      ".OPPPPSSSSPPPPOS",
      ".OPPPPSSSSPPPOSS",
      "..OPOOOOOOOO.OPO",
      "..OPO......O.OPO",
      "..OOO......O.OOO",
      "...........OO...",
      "................",
      "................"
    ],
    // #3 Solartiger (Suncrest Sovereign)
    3: [
      ".S.SOO....OOS.S.",
      "SSOOSSO..OOSSOSS",
      ".OPAAAPOOOPAAAPO",
      ".OPPPPPPPPPPPPPO",
      ".OPPWEPPPPWEPPPO",
      "..OPPPSSSSPPPPO.",
      "..OOOOSSSSOOOO..",
      ".OPAAAPPPPAAAPO.",
      "OPPPPPSSSSPPPPPO",
      "OPAAAPSSSSPAAAPO",
      "OPPPPOOOOOOPPPPO",
      ".OPPO.OO.OO.OPPO",
      ".OOO..OO.OO..OOO",
      "......OO.OO.....",
      "................",
      "................"
    ],
    // #4 Ripplefin (Wave Newt)
    4: [
      "......SSSS......",
      "....SSSSSSSS....",
      "...OOOOOOOOOO...",
      "..OPPPPPPPPPPO..",
      ".OPPWEPPPPWEPPO.",
      ".OPPPPPPPPPPPPO.",
      "..OPSSSSSSSSPO..",
      "...OOOOOOOOOO...",
      "..OPPPSSSSPPPO..",
      ".SOOPSSSSSSPOOS.",
      ".SSOOPPPPPPOOSS.",
      "...OOPO..OPOO...",
      "...OOO....OOO...",
      "......OOOO......",
      ".....OSSSSO.....",
      "................"
    ],
    // #5 Torrentscale (Reef Vanguard)
    5: [
      "....SSSSSSSS....",
      "...SOOOOOOOOS...",
      "..OOPPPPPPPPOO..",
      ".OPPWEPPPPWEPPO.",
      ".OPPPAAAAAAAPPO.",
      "..OPSSSSSSSSPO..",
      "..OOOOOOOOOOOO..",
      ".SOOPPPSSPPPOOS.",
      "SSOOPPPSSPPPOOSS",
      ".SOOPAASSPAAOOS.",
      "..OOPOOOOOOOPO..",
      "..OO.OO..OO.OO..",
      ".....OO..OO.SSO.",
      "............SSSO",
      "................",
      "................"
    ],
    // #6 Abyssaldrake (Trench Leviathan)
    6: [
      ".SS..OOOOOO..SS.",
      "SSOOOPSSSSPOOOSS",
      ".OPPPPPPPPPPPPO.",
      ".OPPWEPPPPWEPPO.",
      "..OPAAAAAAAAAPO.",
      "...OOOOOOOOOO...",
      ".OOOPPPSSPPPOOO.",
      "OPSPPPPSSPPPPSPO",
      "OPSPAAASSAAAPSPO",
      "OOOPPPPSSPPPPOOO",
      "..OOPOOOOOOOPO..",
      "..OO.OO..OO.OO..",
      ".....OO..OO.OSSO",
      "...........OSSSO",
      "................",
      "................"
    ],
    // #7 Mossling (Sprout Fawn)
    7: [
      "....SS....SS....",
      "...SSSS..SSSS...",
      "....OO....OO....",
      "..OOOOPPPPOOOO..",
      ".OPPPPPPPPPPPPO.",
      ".OPPWEPPPPWEPPO.",
      "..OPPPSSSSPPPO..",
      "...OOOOOOOOOO...",
      "...OPPPPPPPPO...",
      "..OPPPSSSSPPPO..",
      "..OPPPPPPPPPPO..",
      "..OPOOOOOOOO.O..",
      "..OO.OO..OO..O..",
      ".....OO..OO.....",
      "................",
      "................"
    ],
    // #8 Thornstag (Canopy Hart)
    8: [
      ".SS..S....S..SS.",
      ".ASS.SS..SS.SSA.",
      "..AAOOOOOOOOAA..",
      "..OOPPPPPPPPOO..",
      ".OPPWEPPPPWEPPO.",
      "..OPPPSSSSPPPO..",
      "...OOOOOOOOOO...",
      "..OPPPSSSSPPPO..",
      ".OPPPPSSSSPPPPO.",
      ".OPAAAPPPPAAAPO.",
      "..OPOOOOOOOOOPO.",
      "..OO.OO..OO..OO.",
      ".....OO..OO.....",
      ".....OO..OO.....",
      "................",
      "................"
    ],
    // #9 Sylvanarch (Elderwood Monarch)
    9: [
      "SS.AA..SS..AA.SS",
      ".SAASSSSSSSSAA.S",
      "..OOOOSSSSOOOO..",
      ".OPPPPPPPPPPPPO.",
      ".OPPWEPPPPWEPPO.",
      "..OPSSSSSSSSPO..",
      ".OOOOOSSSSOOOOO.",
      "OPAAAPSSSSPAAAPO",
      "OPPPPPSSSSPPPPPO",
      "OPAAAPPPPPAAAPPO",
      ".OOPOOOOOOOOOPO.",
      "..OO.OO..OO..OO.",
      ".....OO..OO.....",
      ".....OO..OO.....",
      "................",
      "................"
    ],
    // #10 Sparkcheep (Static Wren)
    10: [
      "......SSSS......",
      ".....SOOOOS.....",
      "....OPPPPPPO....",
      "...OPPWEPPWEPO..",
      "...OPPPPPPSSSO..",
      "....OPPPPPSSO...",
      "..OOOOPPPPOOO...",
      ".OSSSSPPPPSSSO..",
      ".OSSSSPPPPSSSO..",
      "..OOOOPPPPOOO...",
      ".....OO..OO.....",
      "....AA....AA....",
      "................",
      "................",
      "................",
      "................"
    ],
    // #11 Galecrest (Storm Kestrel)
    11: [
      ".....SSSSSS.....",
      "....SOOOOOOS....",
      "...OPPPPPPPPO...",
      "...OPPWEPPWEPO..",
      "....OPPPPPSSSO..",
      ".OOOOOPPPPPOOOO.",
      "OSSSSSPPPPSSSSSO",
      "OPPPPPSSSSPPPPPO",
      "OOOOPPSSSSPPOOOO",
      "....OOPPPPOO....",
      ".....OO..OO.....",
      "....AA....AA....",
      "................",
      "................",
      "................",
      "................"
    ],
    // #12 Thunderhawk (Fulmen Raptor)
    12: [
      "....SS.SS.SS....",
      "...SSOOOOOOSS...",
      "...OPPPPPPPPO...",
      "..OPPWEPPPPWEPO.",
      "OOOOOPPSSPPOO...",
      "OSSSSPPPPPPSSSSO",
      "OPAAAPSSSSPAAAPO",
      "OPPPPPSSSSPPPPPO",
      "OOOOPPSSSSPPOOOO",
      "...OOOPPPPOOO...",
      "....S.OO.OO.S...",
      "......AA.AA.....",
      "................",
      "................",
      "................",
      "................"
    ],
    // #13 Bramblepuff (Thistle Pom)
    13: [
      "....SSSSSSSS....",
      "..SSOOOOOOOOSS..",
      ".SOOPPPPPPPPOOS.",
      ".SOPPPPPPPPPPOS.",
      "SOPPWEPPPPWEPPOS",
      "SOPPPPSSSSPPPPOS",
      "SOPPPPSSSSPPPPOS",
      ".SOPPPPPPPPPPOS.",
      ".SOOPPPPPPPPOOS.",
      "..SSOOOOOOOOSS..",
      "....OO....OO....",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #14 Briarhound (Hedge Tracker)
    14: [
      "..OO........OO..",
      ".OAAO..SS..OAAO.",
      ".OPPPPOOOOPPPPO.",
      ".OPPWEPPPPWEPPO.",
      "..OPPPSSSSPPPO..",
      "...OOOOOOOOOO...",
      "..OPAAAPPPPAAO..",
      ".OPPPPPSSSSPPPO.",
      ".OPPPPPSSSSPPPO.",
      "..OPOOOOOOOOOPO.",
      "..OO.OO..OO..OO.",
      ".....OO..OO.....",
      "................",
      "................",
      "................",
      "................"
    ],
    // #15 Pebblecrab (Shale Scuttler)
    15: [
      "....OOOOOOOO....",
      "..OOPPSSSSPPOO..",
      ".OPPSSSSSSSSPPO.",
      ".OPPPPPPPPPPPPO.",
      "OOPPWEPPPPWEPPOO",
      "OAAOOOOOOOOOOAAO",
      "OAAPPPPPPPPPPAOO",
      ".OOOOOO..OOOOOO.",
      "..OO.OO..OO.OO..",
      ".OO..OO..OO..OO.",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #16 Basaltitan (Monolith Bastion)
    16: [
      ".....SSSSSS.....",
      "...SSOOOOOOSS...",
      "..OOPPSSSSPPOO..",
      ".OPPPPSSSSPPPPO.",
      "OOPPWEPPPPWEPPOO",
      "OAAOOOOOOOOOOAAO",
      "OAAPPPSSSSPPPAOO",
      "OAAPPPSSSSPPPAOO",
      ".OOOOOOOOOOOOOO.",
      "..OO.OO..OO.OO..",
      ".OO..OO..OO..OO.",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #17 Dewdrop (Mist Sprite)
    17: [
      ".......SS.......",
      "......SSSS......",
      ".....OOOOOO.....",
      "....OPPPPPPO....",
      "...OPPSSPSSPO...",
      "..OPPWEPPPPWEPO.",
      "..OPPPPPPPPPPO..",
      "..OPSSSSSSSSPO..",
      "...OPPPPPPPPO...",
      "....OOOOOOOO....",
      ".....SS..SS.....",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #18 Mistserpent (Siren Coil)
    18: [
      "....SS....SS....",
      "...SOOOOOOOOS...",
      "..OPPPPPPPPPPO..",
      "..OPPWEPPPPWEPO.",
      "...OPSSSSSSPO...",
      "....OOOOOOOOP...",
      "......OPPPPPO...",
      "....OOPPSSPPO...",
      "...OPPPPSSPO....",
      "..OPPSSPPPOO....",
      "..OPPPPPPO......",
      "...OOOOOOOOS....",
      "..........SSS...",
      "................",
      "................",
      "................"
    ],
    // #19 Duskmoth (Lantern Wing)
    19: [
      ".OO..........OO.",
      "OSSO..S..S..OSSO",
      "OPSSOOOOOOOOSSPO",
      "OPSSPPWEPPWEPSPO",
      "OPPPPPPPPPPPPPPO",
      ".OOPSSSSSSSSPOO.",
      "..OOPPPPPPPPOO..",
      ".OSSSSPPPPSSSSO.",
      "OSSSSSPPPPSSSSSO",
      ".OOOO.OOOO.OOOO.",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #20 Lunawraith (Astral Veil)
    20: [
      "....SSSSSSSS....",
      "..SSOOOOOOOOSS..",
      ".OOPPPPPPPPPPOO.",
      ".OPPWEPPPPWEPPO.",
      ".OPPPPSSSSPPPPO.",
      "..OOOOSSSSOOOO..",
      ".OPAAAPPPPAAAPO.",
      "OPSSSSPPPPSSSSPO",
      "OPSSSSPPPPSSSSPO",
      ".OOPPPPPPPPPPOO.",
      "...OO.OOOO.OO...",
      "......O..O......",
      "................",
      "................",
      "................",
      "................"
    ],
    // #21 Voltmouse (Dynamo Vole)
    21: [
      ".OO..........OO.",
      ".OAO........OAO.",
      "..OPOOOOOOOOOP..",
      "..OPPPPPPPPPPO..",
      "..OPPWEPPPPWEPO.",
      "..OPASPSSPPASPO.",
      "...OOOOOOOOOO..S",
      "..OPPPSSSSPPPO.S",
      "..OPPPSSSSPPPOSS",
      "...OOOOOOOOOO...",
      "...OO......OO...",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #22 Arcfox (Plasma Vulpine)
    22: [
      ".OO..........OO.",
      ".OSSO......OSSO.",
      "..OPOOOOOOOOOP..",
      "..OPPPPPPPPPPO..",
      "..OPPWEPPPPWEPO.",
      "...OPSSSSSSPO...",
      "...OOOOOOOOOO.SS",
      "..OPPPSSSSPPPOSS",
      "..OPAAAPPPPAAOS.",
      "..OPOOOOOOOOOP..",
      "..OO..OO..OO.OO.",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #23 Magmapup (Cinder Hound)
    23: [
      "..OOO......OOO..",
      ".OAAOO....OOAAO.",
      ".OPPPPPPPPPPPPO.",
      ".OPPWEPPPPWEPPO.",
      "..OPPPSSSSPPPO..",
      "..OOOOOOOOOOOO..",
      "..OSSSSSSSSSSO..",
      "..OPPPPPPPPPPO..",
      "..OPAAAPPPPAAO..",
      "..OPOOOOOOOOOP..",
      "..OO..OO..OO.OO.",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    // #24 Obsidianox (Caldera Bull)
    24: [
      "SS............SS",
      "SSO..OOOOOO..OSS",
      ".OOOOPPPPPPOOOO.",
      ".OPAAAPPPPAAAPO.",
      ".OPPWEPPPPWEPPO.",
      "..OPSSSSSSSSPO..",
      ".OOOOOOOOOOOOOO.",
      "OAAAPPPPPPPPAAAO",
      "OPPPPPSSSSPPPPPO",
      "OAAPOOOOOOOO.AAO",
      ".OO..OO..OO..OO.",
      ".....OO..OO.....",
      "................",
      "................",
      "................",
      "................"
    ],
    // #25 Craggolem (Runestone Sentinel)
    25: [
      "....OOOOOOOO....",
      "...OPAASSPAAO...",
      "..OPPPSSSSPPPO..",
      "..OPPWEPPPPWEPO.",
      "..OOOOOOOOOOOO..",
      "OOOPPPSSSSPPPOOO",
      "OPSPSSSSSSSSPSPO",
      "OPSPPPSSSSPPPSPO",
      "OOOPPPPPPPPPPOOO",
      "...OOOOOOOOOO...",
      "..OO........OO..",
      "..OO........OO..",
      "................",
      "................",
      "................",
      "................"
    ],
    // #26 Astralwyrm (Nebula Ouroboros - Mythic)
    26: [
      ".SS..OOOOOO..SS.",
      "SSOOOPSSSSPOOOSS",
      "SOPPPPPPPPPPPPOS",
      ".OPPWEPPPPWEPPO.",
      "..OPSSSSSSSAPO..",
      ".OOOOOOSSOOOOOO.",
      "OSSSSSPPPPSSSSSO",
      "OPAAAPSSSSPAAAPO",
      "OSSSSSPPPPSSSSSO",
      ".OOOOOPPPPPOOOO.",
      "....OOPSSPOO....",
      "...OOPPPPPO.....",
      "....OOOOOOSS....",
      "..........SSS...",
      "................",
      "................"
    ],
    // #27 Aetherion (Prism Sovereign - Mythic)
    27: [
      "......SSSS......",
      "..SS.SOOOOS.SS..",
      ".SOOOPSSSSPOOOS.",
      ".SOPPWEPPPPWEPOS",
      "..OPPPSSSSPPPO..",
      ".OOOOOSSSSOOOOO.",
      "OSSSSSPPPPSSSSSO",
      "OPAAAPSSSSPAAAPO",
      "OPPPPPSSSSPPPPPO",
      "OSSSSSPPPPSSSSSO",
      ".OOOOOPPPPPOOOO.",
      "...OO.OOOO.OO...",
      "......SSSS......",
      "................",
      "................",
      "................"
    ]
  };

  function getPalette(species, isRadiant) {
    const p = isRadiant && species.radiantPalette ? species.radiantPalette : species.palette;
    return {
      O: '#111522',
      P: p.primary,
      S: p.secondary,
      A: p.accent,
      E: p.eye || '#38bdf8',
      W: '#ffffff'
    };
  }

  /**
   * Draws a Kin pixel sprite onto a 2D canvas context
   */
  function drawKinSprite(ctx, species, x, y, size, opts = {}) {
    const grid = PIXEL_GRIDS[species.id] || PIXEL_GRIDS[1];
    const colors = getPalette(species, opts.isRadiant);
    const cell = size / 16;

    ctx.save();
    if (opts.flipX) {
      ctx.translate(x + size, y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(x, y);
    }

    if (opts.alpha !== undefined) {
      ctx.globalAlpha = opts.alpha;
    }

    // Subtle ground shadow
    if (opts.shadow !== false) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(size * 0.5, size * 0.86, size * 0.34, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Radiant aura sparkles
    if (opts.isRadiant) {
      ctx.fillStyle = '#fde047';
      const t = (Date.now() / 240) % (Math.PI * 2);
      const sx1 = size * 0.15 + Math.cos(t) * 4;
      const sy1 = size * 0.18 + Math.sin(t) * 4;
      const sx2 = size * 0.84 - Math.cos(t) * 4;
      const sy2 = size * 0.25 + Math.cos(t) * 4;
      ctx.fillRect(sx1, sy1, cell * 0.9, cell * 0.9);
      ctx.fillRect(sx2, sy2, cell * 0.9, cell * 0.9);
    }

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length && c < 16; c++) {
        const ch = row[c];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = opts.hitFlash ? '#ffffff' : (colors[ch] || colors.P);
        ctx.fillRect(
          Math.floor(c * cell),
          Math.floor(r * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
    ctx.restore();
  }

  /**
   * Generates an inline SVG string for UI cards, Squad icons, and KinDex
   */
  function renderKinSvg(species, size = 64, isRadiant = false) {
    const grid = PIXEL_GRIDS[species.id] || PIXEL_GRIDS[1];
    const colors = getPalette(species, isRadiant);
    let rects = '';
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length && c < 16; c++) {
        const ch = row[c];
        if (ch === '.' || ch === ' ') continue;
        const fill = colors[ch] || colors.P;
        rects += `<rect x="${c}" y="${r}" width="1.03" height="1.03" fill="${fill}" />`;
      }
    }
    if (isRadiant) {
      rects += `<rect x="1" y="1" width="1.2" height="1.2" fill="#fde047" />`;
      rects += `<rect x="13.5" y="2" width="1.2" height="1.2" fill="#38bdf8" />`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" class="kin-pixel-svg">${rects}</svg>`;
  }

  /**
   * Draws the geometric crystalline Aether Prism capture device (never a round ball)
   */
  function drawPrismDevice(ctx, x, y, size, color = '#38bdf8', tiltAngle = 0, pulseGlow = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tiltAngle);

    const r = size * 0.5;
    if (pulseGlow) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Outer Octagonal Diamond Crystal
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.85, 0);
    ctx.closePath();
    ctx.fill();

    // Inner Facets
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.78);
    ctx.lineTo(r * 0.65, 0);
    ctx.lineTo(0, r * 0.78);
    ctx.lineTo(-r * 0.65, 0);
    ctx.closePath();
    ctx.fill();

    // Central Aether Core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.22, -r * 0.22, r * 0.44, r * 0.44);

    ctx.restore();
  }

  root.WILDKIN_SPRITES = {
    PIXEL_GRIDS,
    drawKinSprite,
    renderKinSvg,
    drawPrismDevice
  };
})(typeof self !== 'undefined' ? self : this);
