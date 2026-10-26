/**
 * WILDKIN: AETHER BOUND — Full 3D WebGL Engine (Three.js)
 * Features:
 * - 3D Biomes (Sunleaf Meadow, Tideglass Cove, Cinderpeak Caldera, Obsidian Sanctum)
 * - 360° Free-Flowing Tap-to-Move Raycasting + Touch-Drag Analog Steering
 * - Procedural 3D Articulated Creature Models for all 27 Kin Species + Radiant Halos
 * - High-Impact 3D Battle Arena with Dynamic Camera Cuts, Physical Lunges,
 *   Elemental Beams/Explosions, Screen Shake, and 3D Aether Prism Capture Cutscene.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.WILDKIN_3D = factory(root);
    root.Wildkin3D = root.WILDKIN_3D;
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  const TILE_SIZE = 2.0; // Each map tile is 2.0 x 2.0 units in 3D world space

  const AFFINITY_HEX = {
    Pyre: 0xff5722,
    Tide: 0x00d2ff,
    Grove: 0x22c55e,
    Volt: 0xfacc15,
    Terra: 0xd97706,
    Umbra: 0xa855f7
  };

  function getThree() {
    return root.THREE || (typeof window !== 'undefined' ? window.THREE : null);
  }

  function hexToInt(hexStr, fallback = 0x38bdf8) {
    if (typeof hexStr === 'number') return hexStr;
    if (!hexStr || typeof hexStr !== 'string') return fallback;
    const clean = hexStr.replace('#', '').trim();
    const parsed = parseInt(clean, 16);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  const _texCache = {};
  function getProceduralTexture(kind, baseHex = 0x22c55e, detailHex = 0x14532d) {
    const THREE = getThree();
    if (!THREE || typeof document === "undefined") return null;
    const key = kind + "_" + baseHex + "_" + detailHex;
    if (_texCache[key]) return _texCache[key];

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const toCss = (h) => "#" + Number(h).toString(16).padStart(6, "0");
    ctx.fillStyle = toCss(baseHex);
    ctx.fillRect(0, 0, 128, 128);

    // Deterministic pseudo-random grain so textures look natural and organic
    let seed = (Number(baseHex) ^ Number(detailHex) ^ 0x9e3779b9) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    if (kind === "grass") {
      for (let i = 0; i < 420; i++) {
        const x = rand() * 128;
        const y = rand() * 128;
        ctx.fillStyle = i % 3 === 0 ? toCss(detailHex) : "rgba(255,255,255,0.08)";
        ctx.fillRect(x, y, 2, 5);
      }
    } else if (kind === "stone") {
      ctx.strokeStyle = "rgba(15,23,42,0.28)";
      ctx.lineWidth = 2;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const bx = c * 32 + (r % 2) * 12;
          const by = r * 32;
          ctx.fillStyle = (r + c) % 2 === 0 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
          ctx.fillRect(bx + 2, by + 2, 28, 28);
          ctx.strokeRect(bx + 1, by + 1, 30, 30);
        }
      }
    } else if (kind === "scales") {
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1.4;
      for (let y = 0; y < 128; y += 16) {
        for (let x = 0; x < 128; x += 16) {
          const ox = x + ((y / 16) % 2) * 8;
          ctx.beginPath();
          ctx.arc(ox, y, 8, 0, Math.PI);
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(ox - 3, y + 2, 6, 3);
        }
      }
    } else if (kind === "bark") {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.06)";
        ctx.fillRect(rand() * 128, 0, 2 + rand() * 3, 128);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    _texCache[key] = tex;
    return tex;
  }


  // Classify each of the 27 species into a 3D body rig archetype
  function getArchetypeForSpecies(speciesId) {
    const id = Number(speciesId) || 1;
    // Winged Raptors / Sky Drakes / Astral Dragon
    if ([12, 13, 23, 24, 27].includes(id)) return 'winged';
    // Heavy Armored Golems / Beetles / Colossi
    if ([14, 17, 18, 19, 20].includes(id)) return 'golem';
    // Spectral Wraiths / Levitating Astral Forms
    if ([21, 22].includes(id)) return 'wraith';
    // Aquatic Leviathans / Hydro Beasts
    if ([4, 5, 6].includes(id)) return 'aquatic';
    // Fierce Quadrupeds / Wolves / Stags / Wildcats (1-3, 7-11, 15-16, 25-26)
    return 'quadruped';
  }

  function getScaleForSpecies(speciesId) {
    const id = Number(speciesId) || 1;
    // Final evolutions & Legendary (#27 Aetherion) are larger and more imposing
    if (id === 27) return 1.45;
    if ([3, 6, 9, 11, 13, 16, 18, 20, 22, 24, 26].includes(id)) return 1.25;
    if ([2, 5, 8].includes(id)) return 1.05;
    return 0.88;
  }

  /**
   * Builds an articulated, cel-shaded 3D model for any of the 27 Kin species.
   */
  function buildKin3DMesh(species, isRadiant = false) {
    const THREE = getThree();
    if (!THREE || !species) return null;

    const group = new THREE.Group();
    const archetype = getArchetypeForSpecies(species.id);
    const scale = getScaleForSpecies(species.id);

    const pal = species.palette || { primary: '#f97316', secondary: '#facc15', accent: '#ffffff', eye: '#38bdf8' };
    const primaryHex = isRadiant ? 0xfacc15 : hexToInt(pal.primary, 0xf97316);
    const secondaryHex = isRadiant ? 0x38bdf8 : hexToInt(pal.secondary, 0xfacc15);
    const accentHex = isRadiant ? 0xf472b6 : hexToInt(pal.accent, 0xffffff);
    const eyeHex = isRadiant ? 0x00ffff : hexToInt(pal.eye, 0x38bdf8);
    const affHex = AFFINITY_HEX[species.affinity] || primaryHex;

    const scaleTex = getProceduralTexture("scales", primaryHex, secondaryHex);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: primaryHex,
      map: scaleTex,
      bumpMap: scaleTex,
      bumpScale: 0.035,
      roughness: 0.34,
      metalness: 0.16,
      emissive: primaryHex,
      emissiveIntensity: 0.10
    });
    const secMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      roughness: 0.25,
      metalness: 0.3,
      emissive: secondaryHex,
      emissiveIntensity: 0.22
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.2,
      metalness: 0.4,
      emissive: accentHex,
      emissiveIntensity: 0.35
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeHex });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

    const rig = {
      body: new THREE.Group(),
      head: new THREE.Group(),
      limbs: [],
      wings: [],
      tail: new THREE.Group(),
      auraRings: [],
      materials: [bodyMat, secMat, accentMat]
    };
    group.add(rig.body);

    if (archetype === 'quadruped' || archetype === 'aquatic') {
      // Realistic Sculpted Organic Beast Torso + Muscular Haunches
      const torsoGeo = new THREE.SphereGeometry(0.58, 22, 16);
      const torso = new THREE.Mesh(torsoGeo, bodyMat);
      torso.scale.set(0.92, 0.78, 1.42);
      torso.position.set(0, 0.70, 0);
      torso.castShadow = true;
      rig.body.add(torso);

      // Armored Chest Mane / Elemental Plate
      const chestGeo = new THREE.DodecahedronGeometry(0.46, 0);
      const chest = new THREE.Mesh(chestGeo, secMat);
      chest.position.set(0, 0.74, 0.52);
      rig.body.add(chest);

      // Back Spines / Fins
      for (let i = 0; i < 3; i++) {
        const spineGeo = new THREE.ConeGeometry(0.14, 0.38, 5);
        const spine = new THREE.Mesh(spineGeo, accentMat);
        spine.position.set(0, 1.12, 0.25 - i * 0.4);
        spine.rotation.x = -0.25;
        rig.body.add(spine);
      }

      // Expressive Fierce Head + Snout + Glowing Eyes + Ears/Horns
      rig.head.position.set(0, 1.10, 0.68);
      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.39, 20, 16), bodyMat);
      cranium.scale.set(1.02, 0.92, 1.08);
      rig.head.add(cranium);

      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.44, 14), secMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, -0.08, 0.38);
      rig.head.add(snout);

      // Multi-layered Realistic Eyes (Glowing Iris + Dark Pupil + Specular Highlight)
      const scleraGeo = new THREE.SphereGeometry(0.095, 12, 12);
      const pupilGeo = new THREE.SphereGeometry(0.048, 10, 10);
      const specGeo = new THREE.SphereGeometry(0.024, 8, 8);
      const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      [-1, 1].forEach((side) => {
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(side * 0.22, 0.06, 0.31);
        const iris = new THREE.Mesh(scleraGeo, eyeMat);
        const pupil = new THREE.Mesh(pupilGeo, darkMat);
        pupil.position.set(0, 0, 0.065);
        const glint = new THREE.Mesh(specGeo, whiteMat);
        glint.position.set(side * 0.025, 0.03, 0.085);
        eyeGroup.add(iris, pupil, glint);
        rig.head.add(eyeGroup);
      });

      // Ears / Antlers / Fins
      const earGeo = new THREE.ConeGeometry(0.16, 0.52, 4);
      const earL = new THREE.Mesh(earGeo, accentMat);
      earL.position.set(0.28, 0.46, -0.05);
      earL.rotation.z = -0.25;
      const earR = new THREE.Mesh(earGeo, accentMat);
      earR.position.set(-0.28, 0.46, -0.05);
      earR.rotation.z = 0.25;
      rig.head.add(earL, earR);

      rig.body.add(rig.head);

      // 4 Articulated Legs
      const legPositions = [
        [0.34, 0.35, 0.45],
        [-0.34, 0.35, 0.45],
        [0.34, 0.35, -0.45],
        [-0.34, 0.35, -0.45]
      ];
      legPositions.forEach(([lx, ly, lz]) => {
        const legGroup = new THREE.Group();
        legGroup.position.set(lx, ly, lz);
        const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.56, 12), bodyMat);
        legMesh.position.y = -0.12;
        const pawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), secMat);
        pawMesh.scale.set(1.0, 0.55, 1.35);
        pawMesh.position.set(0, -0.36, 0.06);
        legGroup.add(legMesh, pawMesh);
        rig.body.add(legGroup);
        rig.limbs.push(legGroup);
      });

      // Elemental Tail
      rig.tail.position.set(0, 0.82, -0.68);
      const tailPlume = new THREE.Mesh(
        archetype === 'aquatic'
          ? new THREE.BoxGeometry(0.65, 0.16, 0.75)
          : new THREE.ConeGeometry(0.32, 0.95, 6),
        accentMat
      );
      tailPlume.position.set(0, 0.25, -0.35);
      tailPlume.rotation.x = -0.75;
      rig.tail.add(tailPlume);
      rig.body.add(rig.tail);
    } else if (archetype === 'winged') {
      // Aerodynamic Sky Drake / Raptor Body
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), bodyMat);
      core.scale.set(0.95, 1.15, 1.35);
      core.position.set(0, 1.15, 0);
      rig.body.add(core);

      // Crest Head + Beak/Jaws
      rig.head.position.set(0, 1.65, 0.48);
      const headMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), bodyMat);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.52, 4), accentMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.04, 0.38);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 4), secMat);
      crest.position.set(0, 0.36, -0.12);
      crest.rotation.x = -0.5;

      const eyeGeo = new THREE.BoxGeometry(0.15, 0.09, 0.08);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(0.2, 0.05, 0.26);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(-0.2, 0.05, 0.26);
      rig.head.add(headMesh, beak, crest, eyeL, eyeR);
      rig.body.add(rig.head);

      // Wide Articulated 3D Wings (Left & Right)
      [-1, 1].forEach((side) => {
        const wingGroup = new THREE.Group();
        wingGroup.position.set(side * 0.45, 1.28, 0.05);
        const mainBlade = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.62), secMat);
        mainBlade.position.set(side * 0.58, 0.08, -0.05);
        mainBlade.rotation.z = side * 0.18;
        const tipBlade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 4), accentMat);
        tipBlade.rotation.z = -side * (Math.PI / 2);
        tipBlade.position.set(side * 1.25, 0.14, -0.1);
        wingGroup.add(mainBlade, tipBlade);
        rig.body.add(wingGroup);
        rig.wings.push(wingGroup);
      });

      // Tail Streamers
      rig.tail.position.set(0, 0.95, -0.65);
      const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.0, 5), accentMat);
      tailFin.rotation.x = -1.1;
      tailFin.position.set(0, -0.1, -0.4);
      rig.tail.add(tailFin);
      rig.body.add(rig.tail);
    } else if (archetype === 'golem') {
      // Heavy Armored Colossus / Magma Titan
      const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), bodyMat);
      torso.scale.set(1.15, 1.05, 0.95);
      torso.position.set(0, 1.0, 0);
      rig.body.add(torso);

      // Glowing Core Reactor
      const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), accentMat);
      coreCrystal.position.set(0, 1.02, 0.58);
      rig.body.add(coreCrystal);

      // Visor Head + Twin Horns
      rig.head.position.set(0, 1.65, 0.22);
      const helm = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.46, 0.56), darkMat);
      const visorL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.06), eyeMat);
      visorL.position.set(0.16, 0.02, 0.28);
      const visorR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.06), eyeMat);
      visorR.position.set(-0.16, 0.02, 0.28);
      const hornGeo = new THREE.ConeGeometry(0.18, 0.58, 5);
      const hornL = new THREE.Mesh(hornGeo, secMat);
      hornL.position.set(0.34, 0.34, 0.08);
      hornL.rotation.z = -0.35;
      const hornR = new THREE.Mesh(hornGeo, secMat);
      hornR.position.set(-0.34, 0.34, 0.08);
      hornR.rotation.z = 0.35;
      rig.head.add(helm, visorL, visorR, hornL, hornR);
      rig.body.add(rig.head);

      // Massive Crusher Arms & Sturdy Legs
      [-1, 1].forEach((side) => {
        const armGroup = new THREE.Group();
        armGroup.position.set(side * 0.88, 1.15, 0.12);
        const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), secMat);
        const fist = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.46), bodyMat);
        fist.position.set(side * 0.12, -0.42, 0.18);
        armGroup.add(shoulder, fist);
        rig.body.add(armGroup);
        rig.limbs.push(armGroup);

        const legGroup = new THREE.Group();
        legGroup.position.set(side * 0.42, 0.38, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.44), darkMat);
        legGroup.add(leg);
        rig.body.add(legGroup);
        rig.limbs.push(legGroup);
      });
    } else {
      // 'wraith' — Levitating Astral / Umbra Phantom
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.45, 7), bodyMat);
      cloak.position.set(0, 1.05, 0);
      rig.body.add(cloak);

      rig.head.position.set(0, 1.58, 0.18);
      const mask = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), secMat);
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), eyeMat);
      eyeL.position.set(0.16, 0.04, 0.36);
      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), eyeMat);
      eyeR.position.set(-0.16, 0.04, 0.36);
      rig.head.add(mask, eyeL, eyeR);
      rig.body.add(rig.head);

      // Floating Spectral Claws
      [-1, 1].forEach((side) => {
        const handGroup = new THREE.Group();
        handGroup.position.set(side * 0.85, 1.2, 0.35);
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), accentMat);
        handGroup.add(orb);
        rig.body.add(handGroup);
        rig.limbs.push(handGroup);
      });
    }

    // Orbiting Elemental Shards / Radiant Halo Ring
    const ringGeo = new THREE.TorusGeometry(0.92, isRadiant ? 0.05 : 0.03, 8, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isRadiant ? 0xfacc15 : affHex,
      transparent: true,
      opacity: isRadiant ? 0.85 : 0.45
    });
    const auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.rotation.x = Math.PI / 2;
    auraRing.position.y = 0.08;
    group.add(auraRing);
    rig.auraRings.push(auraRing);

    if (isRadiant || species.id === 27) {
      const crownRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.035, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 })
      );
      crownRing.position.y = 1.25;
      crownRing.rotation.x = Math.PI / 3;
      group.add(crownRing);
      rig.auraRings.push(crownRing);
    }

    group.scale.setScalar(scale);
    group.userData = {
      speciesId: species.id,
      archetype,
      isRadiant,
      rig,
      baseScale: scale,
      affHex
    };

    return group;
  }

  /**
   * Animates a 3D Kin mesh (breathing, wing flapping, limb walk cycle, aura spin)
   */
  function animateKinMesh(mesh, timeSec, isMoving = false, lungePhase = 0) {
    if (!mesh || !mesh.userData || !mesh.userData.rig) return;
    const { rig, archetype } = mesh.userData;

    const bobSpeed = isMoving ? 10 : 3.2;
    const bobAmp = isMoving ? 0.12 : 0.06;
    rig.body.position.y = Math.sin(timeSec * bobSpeed) * bobAmp + (lungePhase > 0 ? Math.sin(lungePhase * Math.PI) * 0.65 : 0);

    if (rig.head) {
      rig.head.rotation.x = Math.sin(timeSec * 2.5) * 0.08;
      rig.head.rotation.y = Math.cos(timeSec * 1.8) * 0.1;
    }

    if (archetype === 'winged' && rig.wings.length === 2) {
      const flap = Math.sin(timeSec * 9.5) * 0.52;
      rig.wings[0].rotation.z = -flap;
      rig.wings[1].rotation.z = flap;
      rig.body.position.y += 0.22;
    }

    if (rig.limbs.length > 0) {
      const swingSpeed = isMoving ? 12 : 3.0;
      const swingAmp = isMoving ? 0.48 : 0.12;
      rig.limbs.forEach((limb, idx) => {
        const sign = idx % 2 === 0 ? 1 : -1;
        limb.rotation.x = Math.sin(timeSec * swingSpeed + idx) * swingAmp * sign;
      });
    }

    if (rig.tail) {
      rig.tail.rotation.y = Math.sin(timeSec * 4.5) * 0.28;
    }

    rig.auraRings.forEach((ring, i) => {
      ring.rotation.z = timeSec * (i === 0 ? 1.5 : -2.4);
      if (i > 0) ring.rotation.y = timeSec * 1.8;
    });
  }

  /**
   * Builds an articulated 3D Anime/Stylized Humanoid Tamer / Warden / NPC
   */
  function buildHumanoid3D(options = {}) {
    const THREE = getThree();
    if (!THREE) return null;

    const coatColor = hexToInt(options.coatColor || '#0284c7', 0x0284c7);
    const trimColor = hexToInt(options.trimColor || '#facc15', 0xfacc15);
    const hairColor = hexToInt(options.hairColor || '#1e293b', 0x1e293b);
    const isPlayer = Boolean(options.isPlayer);
    const isWarden = Boolean(options.isWarden);
    const isGrandpa = Boolean(options.isGrandpa);

    const group = new THREE.Group();

    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.35, metalness: 0.2 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      roughness: 0.25,
      metalness: 0.4,
      emissive: trimColor,
      emissiveIntensity: 0.25
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);

    // Sculpted Tunic Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.34, 0.80, 14), coatMat);
    torso.scale.set(1.12, 1.0, 0.78);
    torso.position.y = 0.92;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Glowing Aether Core Belt / Trim
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.46), trimMat);
    belt.position.y = 0.68;
    bodyGroup.add(belt);

    // Flowing Aether Scarf / Warden Cape
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(isWarden ? 0.82 : 0.54, isWarden ? 0.95 : 0.62, 0.1),
      trimMat
    );
    cape.position.set(0, isWarden ? 0.85 : 0.96, -0.26);
    cape.rotation.x = 0.18;
    bodyGroup.add(cape);

    // Stylized Head + Visor/Crown + Spiky Hair + Eyes
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.56;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 16), skinMat);
    head.scale.set(1.0, 1.04, 0.96);
    headGroup.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0x38bdf8 : 0x0f172a });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.05), eyeMat);
    eyeL.position.set(0.13, -0.02, 0.26);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.05), eyeMat);
    eyeR.position.set(-0.13, -0.02, 0.26);
    headGroup.add(eyeL, eyeR);

    // Hair & Explorer Visor / Warden Crown
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.58), hairMat);
    hairTop.position.set(0, 0.22, -0.02);
    headGroup.add(hairTop);

    if (isPlayer) {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.36), trimMat);
      visor.position.set(0, 0.16, 0.2);
      headGroup.add(visor);
    } else if (isGrandpa) {
      // Grandpa Rowan’s Silver Beard & Rancher Brim Hat
      const beard = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.38, 10),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
      );
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.22, 0.18);
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 16), trimMat);
      hatBrim.position.set(0, 0.28, 0);
      headGroup.add(beard, hatBrim);
    } else if (isWarden) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 5), trimMat);
      crown.position.set(0, 0.48, 0);
      headGroup.add(crown);
    }

    bodyGroup.add(headGroup);

    // Articulated Arms & Legs
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.22), coatMat);
    armL.position.set(0.46, 0.92, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.22), coatMat);
    armR.position.set(-0.46, 0.92, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.56, 0.26), darkMat);
    legL.position.set(0.17, 0.28, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.56, 0.26), darkMat);
    legR.position.set(-0.17, 0.28, 0);

    bodyGroup.add(armL, armR, legL, legR);

    // Glowing Foot Ring
    const footRing = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.62, 24),
      new THREE.MeshBasicMaterial({
        color: isPlayer ? 0x38bdf8 : trimColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      })
    );
    footRing.rotation.x = Math.PI / 2;
    footRing.position.y = 0.04;
    group.add(footRing);

    group.userData = {
      bodyGroup,
      headGroup,
      cape,
      armL,
      armR,
      legL,
      legR,
      footRing
    };

    return group;
  }

  function animateHumanoid3D(mesh, timeSec, speed = 0) {
    if (!mesh || !mesh.userData) return;
    const u = mesh.userData;
    const isMoving = speed > 0.02;
    const walkFreq = isMoving ? 13 : 2.5;
    const swing = isMoving ? Math.min(0.75, speed * 0.55) : 0.06;

    u.armL.rotation.x = Math.sin(timeSec * walkFreq) * swing;
    u.armR.rotation.x = -Math.sin(timeSec * walkFreq) * swing;
    u.legL.rotation.x = -Math.sin(timeSec * walkFreq) * swing;
    u.legR.rotation.x = Math.sin(timeSec * walkFreq) * swing;
    u.bodyGroup.position.y = isMoving ? Math.abs(Math.sin(timeSec * walkFreq)) * 0.1 : Math.sin(timeSec * 2.5) * 0.03;
    u.cape.rotation.x = 0.18 + (isMoving ? 0.35 + Math.sin(timeSec * walkFreq * 2) * 0.1 : Math.sin(timeSec * 3) * 0.05);
    u.footRing.rotation.z = timeSec * 1.5;
  }

  // ============================================================================
  // 3D OVERWORLD ENGINE (Biomes, Tap-to-Move Raycasting, Follower Kin, Camera)
  // ============================================================================
  const overworld = {
    initialized: false,
    renderer: null,
    scene: null,
    camera: null,
    raycaster: null,
    groundPlane: null,
    zoneGroup: null,
    npcGroup: null,
    playerMesh: null,
    companionMesh: null,
    companionSpeciesId: null,
    companionRadiant: false,
    targetBeacon: null,
    grassBlades: [],
    waterMeshes: [],
    portalMeshes: [],
    shrineCrystal: null,
    ambientParticles: null,
    currentZoneId: null,
    cameraMode: 0, // 0: Dynamic Follow, 1: Action Close-Up, 2: Tactical Overhead
    cameraModes: ['DYNAMIC 3D', 'ACTION CLOSE', 'TACTICAL 3D'],
    camPos: { x: 14, y: 12, z: 22 },
    camLook: { x: 14, y: 0.8, z: 12 },
    trailHistory: []
  };

  const BIOME_PALETTES = {
    meadow: {
      sky: 0x0b1d3a,
      fog: 0x0f2942,
      ground: 0x1e4d2b,
      groundAlt: 0x255c34,
      path: 0xd4a373,
      water: 0x0ea5e9,
      treeTrunk: 0x5c3a21,
      treeCrown: 0x22c55e,
      treeCrownAlt: 0x4ade80,
      tallGrass: 0x16a34a,
      grassTip: 0x86efac,
      particle: 0xfef08a,
      sunColor: 0xfffbeb,
      ambientColor: 0x60a5fa
    },
    tidecove: {
      sky: 0x06162e,
      fog: 0x08203e,
      ground: 0x0f3d56,
      groundAlt: 0x154c68,
      path: 0xe2c792,
      water: 0x06b6d4,
      treeTrunk: 0x0e7490,
      treeCrown: 0x22d3ee,
      treeCrownAlt: 0x67e8f9,
      tallGrass: 0x0891b2,
      grassTip: 0x5eead4,
      particle: 0x67e8f9,
      sunColor: 0xe0f2fe,
      ambientColor: 0x38bdf8
    },
    cinderpeak: {
      sky: 0x1c0808,
      fog: 0x2a0c0c,
      ground: 0x271c19,
      groundAlt: 0x332421,
      path: 0x573b26,
      water: 0xff4500, // Glowing molten lava!
      treeTrunk: 0x1c1917,
      treeCrown: 0xdc2626,
      treeCrownAlt: 0xf97316,
      tallGrass: 0x991b1b,
      grassTip: 0xfb923c,
      particle: 0xffedd5,
      sunColor: 0xfdba74,
      ambientColor: 0xf97316
    },
    stormspire: {
      sky: 0x0e1912,
      fog: 0x16261b,
      ground: 0x243b1e,
      groundAlt: 0x2e4a26,
      path: 0xca8a04,
      water: 0x0284c7,
      treeTrunk: 0x451a03,
      treeCrown: 0x16a34a,
      treeCrownAlt: 0xfacc15,
      tallGrass: 0x15803d,
      grassTip: 0xfef08a,
      particle: 0xfde047,
      sunColor: 0xfef9c3,
      ambientColor: 0x86efac
    },
    frostveil: {
      sky: 0x06192b,
      fog: 0x0c2942,
      ground: 0x1e3a5f,
      groundAlt: 0x254872,
      path: 0x93c5fd,
      water: 0x38bdf8,
      treeTrunk: 0x334155,
      treeCrown: 0x67e8f9,
      treeCrownAlt: 0xa5f3fc,
      tallGrass: 0x0284c7,
      grassTip: 0xe0f2fe,
      particle: 0xa5f3fc,
      sunColor: 0xe0f2fe,
      ambientColor: 0x7dd3fc
    },
    sanctum: {
      sky: 0x090418,
      fog: 0x110726,
      ground: 0x1e1338,
      groundAlt: 0x271947,
      path: 0x4c1d95,
      water: 0x9333ea,
      treeTrunk: 0x311042,
      treeCrown: 0xa855f7,
      treeCrownAlt: 0x38bdf8,
      tallGrass: 0x6b21a8,
      grassTip: 0xe879f9,
      particle: 0xf472b6,
      sunColor: 0xe9d5ff,
      ambientColor: 0xc084fc
    }
  };

  function initOverworld(viewportEl) {
    const THREE = getThree();
    if (!THREE || !viewportEl) return false;
    if (overworld.initialized && overworld.renderer) {
      resizeOverworld(viewportEl);
      return true;
    }

    let canvas = document.getElementById('world3dCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'world3dCanvas';
      canvas.className = 'world-3d-canvas';
      viewportEl.insertBefore(canvas, viewportEl.firstChild);
    }

    try {
      overworld.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      return false;
    }

    const rect = viewportEl.getBoundingClientRect();
    const w = Math.max(320, rect.width || window.innerWidth);
    const h = Math.max(320, rect.height || window.innerHeight);

    overworld.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    overworld.renderer.setSize(w, h, false);
    overworld.renderer.shadowMap.enabled = true;
    overworld.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    overworld.scene = new THREE.Scene();
    overworld.scene.background = new THREE.Color(0x0b1d3a);
    overworld.scene.fog = new THREE.FogExp2(0x0f2942, 0.022);

    overworld.camera = new THREE.PerspectiveCamera(48, w / h, 0.5, 140);
    overworld.raycaster = new THREE.Raycaster();
    overworld.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85);
    hemiLight.position.set(0, 30, 0);
    overworld.scene.add(hemiLight);
    overworld.hemiLight = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    dirLight.position.set(22, 34, 24);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 90;
    const d = 24;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    overworld.scene.add(dirLight);
    overworld.dirLight = dirLight;

    overworld.zoneGroup = new THREE.Group();
    overworld.npcGroup = new THREE.Group();
    overworld.scene.add(overworld.zoneGroup);
    overworld.scene.add(overworld.npcGroup);

    // Build 3D Player Tamer
    overworld.playerMesh = buildHumanoid3D({
      coatColor: '#0284c7',
      trimColor: '#38bdf8',
      hairColor: '#0f172a',
      isPlayer: true
    });
    overworld.scene.add(overworld.playerMesh);

    // Build 3D Tap-to-Move Target Beacon
    const beaconGroup = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.68, 28),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      })
    );
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.06;

    const innerBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.42, 1.4, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.32
      })
    );
    innerBeam.position.y = 0.7;

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    diamond.position.y = 1.15;

    beaconGroup.add(outerRing, innerBeam, diamond);
    beaconGroup.visible = false;
    beaconGroup.userData = { outerRing, innerBeam, diamond };
    overworld.scene.add(beaconGroup);
    overworld.targetBeacon = beaconGroup;

    overworld.initialized = true;
    return true;
  }

  function resizeOverworld(viewportEl) {
    if (!overworld.initialized || !overworld.renderer || !overworld.camera) return;
    const el = viewportEl || document.getElementById('screenViewport');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(300, rect.width || window.innerWidth);
    const h = Math.max(300, rect.height || window.innerHeight);
    overworld.camera.aspect = w / h;
    overworld.camera.updateProjectionMatrix();
    overworld.renderer.setSize(w, h, false);
  }

  function cycleCameraMode() {
    overworld.cameraMode = (overworld.cameraMode + 1) % overworld.cameraModes.length;
    return overworld.cameraModes[overworld.cameraMode];
  }

  /**
   * Builds the full 3D environment for a Zone (terrain tiles, swaying 3D grass,
   * 3D trees/crystals, Aether Wellspring Shrine, Merchant Pavilion, 3D Portals, NPCs)
   */
  function syncZone(zone, defeatedTrainerIds = []) {
    const THREE = getThree();
    if (!THREE || !overworld.initialized || !zone) return;

    const pal = BIOME_PALETTES[zone.id] || BIOME_PALETTES.meadow;
    overworld.scene.background.setHex(pal.sky);
    overworld.scene.fog.color.setHex(pal.fog);
    overworld.hemiLight.color.setHex(pal.ambientColor);
    overworld.dirLight.color.setHex(pal.sunColor);

    if (overworld.currentZoneId !== zone.id) {
      // Clear previous zone geometry
      while (overworld.zoneGroup.children.length > 0) {
        overworld.zoneGroup.remove(overworld.zoneGroup.children[0]);
      }
      overworld.grassBlades = [];
      overworld.waterMeshes = [];
      overworld.portalMeshes = [];
      overworld.shrineCrystal = null;

      const mapRows = zone.grid || zone.map;
      const rows = mapRows.length;
      const cols = mapRows[0].length;

      // Base Bedrock Platform
      const baseBed = new THREE.Mesh(
        new THREE.BoxGeometry(cols * TILE_SIZE + 18, 2.5, rows * TILE_SIZE + 18),
        new THREE.MeshStandardMaterial({ color: pal.ground, roughness: 0.9 })
      );
      baseBed.position.set(((cols - 1) * TILE_SIZE) / 2, -1.45, ((rows - 1) * TILE_SIZE) / 2);
      baseBed.receiveShadow = true;
      overworld.zoneGroup.add(baseBed);

      const groundGeo = new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.36, TILE_SIZE * 0.98);
      const grassTexA = getProceduralTexture("grass", pal.ground, pal.tallGrass);
      const grassTexB = getProceduralTexture("grass", pal.groundAlt, pal.tallGrass);
      const stoneTex = getProceduralTexture("stone", pal.path, pal.ground);
      const groundMatA = new THREE.MeshStandardMaterial({ color: pal.ground, map: grassTexA, bumpMap: grassTexA, bumpScale: 0.03, roughness: 0.78 });
      const groundMatB = new THREE.MeshStandardMaterial({ color: pal.groundAlt, map: grassTexB, bumpMap: grassTexB, bumpScale: 0.03, roughness: 0.78 });
      const pathMat = new THREE.MeshStandardMaterial({ color: pal.path, map: stoneTex, bumpMap: stoneTex, bumpScale: 0.04, roughness: 0.62 });
      const waterMat = new THREE.MeshStandardMaterial({
        color: pal.water,
        roughness: 0.15,
        metalness: 0.35,
        emissive: pal.water,
        emissiveIntensity: zone.id === 'cinderpeak' ? 0.65 : 0.22
      });
      const trunkMat = new THREE.MeshStandardMaterial({ color: pal.treeTrunk, roughness: 0.75 });
      const crownMatA = new THREE.MeshStandardMaterial({
        color: pal.treeCrown,
        roughness: 0.45,
        emissive: pal.treeCrown,
        emissiveIntensity: zone.id === 'sanctum' ? 0.3 : 0.08
      });
      const crownMatB = new THREE.MeshStandardMaterial({
        color: pal.treeCrownAlt,
        roughness: 0.4,
        emissive: pal.treeCrownAlt,
        emissiveIntensity: 0.18
      });
      const grassMat = new THREE.MeshStandardMaterial({
        color: pal.tallGrass,
        roughness: 0.4,
        emissive: pal.grassTip,
        emissiveIntensity: 0.15
      });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ch = mapRows[r][c];
          const wx = c * TILE_SIZE;
          const wz = r * TILE_SIZE;

          if (ch === 'W' || ch === '~') {
            const waterTile = new THREE.Mesh(
              new THREE.BoxGeometry(TILE_SIZE, 0.28, TILE_SIZE),
              waterMat
            );
            waterTile.position.set(wx, -0.18, wz);
            waterTile.userData = { baseX: wx, baseZ: wz, phase: (c + r) * 0.6 };
            overworld.zoneGroup.add(waterTile);
            overworld.waterMeshes.push(waterTile);
            continue;
          }

          const isPath = ch === 'P' || ch === 'S' || ch === 'M' || ch === 'K' || ch === 'N' || ch === 'O' || ch === 'I' || ch === 'F' || ch === 'V';
          const tileMat = isPath ? pathMat : (c + r) % 2 === 0 ? groundMatA : groundMatB;
          const tileMesh = new THREE.Mesh(groundGeo, tileMat);
          tileMesh.position.set(wx, -0.16, wz);
          tileMesh.receiveShadow = true;
          overworld.zoneGroup.add(tileMesh);

          if (ch === 'T' || ch === '#') {
            // 3D Biome Obstacle: Forest Tree / Coral Spire / Volcanic Crag / Astral Obelisk
            const treeGroup = new THREE.Group();
            treeGroup.position.set(wx, 0, wz);

            if (zone.id === 'cinderpeak' || zone.id === 'sanctum') {
              const spire = new THREE.Mesh(
                new THREE.ConeGeometry(0.78, 2.45 + ((c * 7 + r * 3) % 3) * 0.35, 6),
                trunkMat
              );
              spire.position.y = 1.2;
              spire.castShadow = true;
              const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.45, 0),
                (c + r) % 2 === 0 ? crownMatA : crownMatB
              );
              crystal.position.set(0, 1.9, 0);
              treeGroup.add(spire, crystal);
            } else {
              const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.1, 7), trunkMat);
              trunk.position.y = 0.55;
              trunk.castShadow = true;
              const tier1 = new THREE.Mesh(new THREE.ConeGeometry(0.92, 1.35, 7), crownMatA);
              tier1.position.y = 1.35;
              tier1.castShadow = true;
              const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.15, 7), crownMatB);
              tier2.position.y = 2.05;
              tier2.castShadow = true;
              treeGroup.add(trunk, tier1, tier2);
            }
            overworld.zoneGroup.add(treeGroup);
          } else if (ch === 'G') {
            // 3D Interactive Tall Grass Cluster (bends when player runs through!)
            const cluster = new THREE.Group();
            cluster.position.set(wx, 0, wz);
            for (let b = 0; b < 5; b++) {
              const angle = (b / 5) * Math.PI * 2;
              const dist = b === 0 ? 0 : 0.46;
              const blade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.78, 4), grassMat);
              blade.position.set(Math.cos(angle) * dist, 0.38, Math.sin(angle) * dist);
              blade.rotation.y = angle;
              cluster.add(blade);
            }
            cluster.userData = { wx, wz, phase: c * 0.5 + r * 0.7 };
            overworld.zoneGroup.add(cluster);
            overworld.grassBlades.push(cluster);
          } else if (ch === 'S') {
            // Towering Aether Wellspring Shrine Obelisk
            const shrineGroup = new THREE.Group();
            shrineGroup.position.set(wx, 0, wz);
            const pedestal = new THREE.Mesh(
              new THREE.CylinderGeometry(0.82, 0.95, 0.45, 8),
              new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
            );
            pedestal.position.y = 0.22;
            const crystal = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.55, 0),
              new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0ea5e9,
                emissiveIntensity: 0.75,
                roughness: 0.1,
                metalness: 0.5
              })
            );
            crystal.scale.set(0.85, 1.65, 0.85);
            crystal.position.y = 1.55;
            const halo = new THREE.Mesh(
              new THREE.TorusGeometry(0.78, 0.04, 8, 28),
              new THREE.MeshBasicMaterial({ color: 0xfacc15 })
            );
            halo.position.y = 1.55;
            shrineGroup.add(pedestal, crystal, halo);
            overworld.zoneGroup.add(shrineGroup);
            overworld.shrineCrystal = { crystal, halo };
          } else if (ch === 'M') {
            // 3D Prism & Tonic Emporium Pavilion
            const shopGroup = new THREE.Group();
            shopGroup.position.set(wx, 0, wz);
            const base = new THREE.Mesh(
              new THREE.CylinderGeometry(0.75, 0.85, 0.5, 8),
              new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 })
            );
            base.position.y = 0.25;
            const holoPrism = new THREE.Mesh(
              new THREE.DodecahedronGeometry(0.45, 0),
              new THREE.MeshStandardMaterial({
                color: 0xf472b6,
                emissive: 0xec4899,
                emissiveIntensity: 0.65,
                roughness: 0.15
              })
            );
            holoPrism.position.y = 1.45;
            shopGroup.add(base, holoPrism);
            overworld.zoneGroup.add(shopGroup);
          } else if (ch === 'F') {
            const flowerGroup = new THREE.Group();
            flowerGroup.position.set(wx, 0, wz);
            for (let f = 0; f < 3; f++) {
              const blossom = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.16, 0),
                new THREE.MeshBasicMaterial({ color: f % 2 === 0 ? 0xfacc15 : 0xf472b6 })
              );
              blossom.position.set((f - 1) * 0.42, 0.22, ((f * 2) % 3 - 1) * 0.35);
              flowerGroup.add(blossom);
            }
            overworld.zoneGroup.add(flowerGroup);
          } else if ((ch === 'P' && (r === 0 || r === rows - 1)) || ch === 'B') {
            // Spinning 3D Stargate Portal Ring
            const portalGroup = new THREE.Group();
            portalGroup.position.set(wx, 0, wz);
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.72, 0.09, 10, 28),
              new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 0.8
              })
            );
            ring.position.y = 0.95;
            const core = new THREE.Mesh(
              new THREE.CircleGeometry(0.65, 24),
              new THREE.MeshBasicMaterial({
                color: 0xa855f7,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.62
              })
            );
            core.position.y = 0.95;
            portalGroup.add(ring, core);
            overworld.zoneGroup.add(portalGroup);
            overworld.portalMeshes.push(portalGroup);
          }
        }
      }


      // If in World 1 (Sunleaf Meadow), build Grandpa Rowan’s 3D Heartwood Homestead Cabin & Breeding Corral!
      if (zone.id === "meadow") {
        const cabinGroup = new THREE.Group();
        cabinGroup.position.set(5.2 * TILE_SIZE, 0, 4.2 * TILE_SIZE);
        const barkTex = getProceduralTexture("bark", 0x78350f, 0x451a03);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x92400e, map: barkTex, roughness: 0.7 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
        const glowWindowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

        const cabinWalls = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2.0), wallMat);
        cabinWalls.position.y = 0.75;
        cabinWalls.castShadow = true;
        const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 1.25, 4), roofMat);
        cabinRoof.position.y = 2.05;
        cabinRoof.rotation.y = Math.PI / 4;
        cabinRoof.castShadow = true;
        const winL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.08), glowWindowMat);
        winL.position.set(-0.55, 0.85, 1.01);
        const winR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.08), glowWindowMat);
        winR.position.set(0.55, 0.85, 1.01);
        cabinGroup.add(cabinWalls, cabinRoof, winL, winR);
        overworld.zoneGroup.add(cabinGroup);
      }

      // Floating 3D Biome Particles (Fireflies / Embers / Astral Spores)
      const pCount = 85;
      const pGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        positions[i * 3] = Math.random() * cols * TILE_SIZE;
        positions[i * 3 + 1] = 0.5 + Math.random() * 4.5;
        positions[i * 3 + 2] = Math.random() * rows * TILE_SIZE;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: pal.particle,
        size: 0.22,
        transparent: true,
        opacity: 0.85
      });
      overworld.ambientParticles = new THREE.Points(pGeo, pMat);
      overworld.zoneGroup.add(overworld.ambientParticles);

      overworld.currentZoneId = zone.id;
    }

    // Rebuild NPCs & Wardens in 3D
    while (overworld.npcGroup.children.length > 0) {
      overworld.npcGroup.remove(overworld.npcGroup.children[0]);
    }
    const npcEntries = Array.isArray(zone.npcs)
      ? zone.npcs
      : Object.entries(zone.npcs || {}).map(([coord, obj]) => {
          const [nx, ny] = coord.split(",").map(Number);
          return Object.assign({ x: nx, y: ny }, obj);
        });

    npcEntries.forEach((npc) => {
      const role = npc.type || npc.role;
      if (role === "shrine" || role === "portal") return;
      const isWarden = Boolean(npc.wardenId || role === "warden");
      const isGrandpa = Boolean(npc.isGrandpa || npc.id === "rowan");
      const isShop = role === "merchant" || role === "shop";
      const defeated = defeatedTrainerIds.includes(npc.id);

      const npcMesh = buildHumanoid3D({
        coatColor: isGrandpa ? "#15803d" : isWarden ? "#9333ea" : isShop ? "#d97706" : defeated ? "#475569" : "#e11d48",
        trimColor: isGrandpa ? "#facc15" : isWarden ? "#facc15" : isShop ? "#38bdf8" : "#fda4af",
        hairColor: isGrandpa ? "#e2e8f0" : isWarden ? "#f8fafc" : "#1e293b",
        isWarden,
        isGrandpa
      });
      npcMesh.position.set(npc.x * TILE_SIZE, 0, npc.y * TILE_SIZE);
      npcMesh.userData.npcData = npc;
      overworld.npcGroup.add(npcMesh);
    });
  }

  function syncCompanionKin(leadSpecies, isRadiant = false) {
    if (!overworld.initialized || !overworld.scene) return;
    if (!leadSpecies) {
      if (overworld.companionMesh) overworld.companionMesh.visible = false;
      return;
    }
    if (
      overworld.companionMesh &&
      overworld.companionSpeciesId === leadSpecies.id &&
      overworld.companionRadiant === Boolean(isRadiant)
    ) {
      overworld.companionMesh.visible = true;
      return;
    }
    if (overworld.companionMesh) {
      overworld.scene.remove(overworld.companionMesh);
    }
    overworld.companionMesh = buildKin3DMesh(leadSpecies, isRadiant);
    if (overworld.companionMesh) {
      overworld.companionMesh.scale.multiplyScalar(0.62);
      overworld.scene.add(overworld.companionMesh);
      overworld.companionSpeciesId = leadSpecies.id;
      overworld.companionRadiant = Boolean(isRadiant);
    }
  }

  /**
   * Raycasts a screen tap/click (clientX, clientY) onto the 3D ground plane
   * and returns the exact float tile coordinates { x, y }.
   */
  function screenToWorldTile(clientX, clientY, viewportEl) {
    const THREE = getThree();
    if (!THREE || !overworld.initialized || !overworld.camera || !overworld.raycaster) return null;
    const el = viewportEl || document.getElementById('screenViewport');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    overworld.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), overworld.camera);
    const hitPoint = new THREE.Vector3();
    const hit = overworld.raycaster.ray.intersectPlane(overworld.groundPlane, hitPoint);
    if (!hit) return null;

    return {
      x: hitPoint.x / TILE_SIZE,
      y: hitPoint.z / TILE_SIZE
    };
  }

  function setTargetBeacon(tileX, tileY, visible = true, isInteractTarget = false) {
    if (!overworld.targetBeacon) return;
    overworld.targetBeacon.visible = Boolean(visible);
    if (visible) {
      overworld.targetBeacon.position.set(tileX * TILE_SIZE, 0, tileY * TILE_SIZE);
      const colorHex = isInteractTarget ? 0xfacc15 : 0x38bdf8;
      overworld.targetBeacon.userData.outerRing.material.color.setHex(colorHex);
      overworld.targetBeacon.userData.innerBeam.material.color.setHex(colorHex);
    }
  }

  /**
   * Renders a frame of the 3D Overworld with smooth player & companion motion
   */
  function renderOverworldFrame(playerState, timeMs) {
    if (!overworld.initialized || !overworld.renderer || !overworld.scene || !overworld.camera) return;
    const timeSec = (timeMs || performance.now()) * 0.001;

    const px = (playerState.x || 0) * TILE_SIZE;
    const pz = (playerState.y || 0) * TILE_SIZE;
    const speed = playerState.speed || 0;

    if (overworld.playerMesh) {
      overworld.playerMesh.position.set(px, 0, pz);
      if (typeof playerState.angle === 'number') {
        overworld.playerMesh.rotation.y = playerState.angle;
      }
      animateHumanoid3D(overworld.playerMesh, timeSec, speed);
    }

    // Companion Kin smoothly trails behind the Tamer
    if (overworld.companionMesh && overworld.companionMesh.visible) {
      const behindAngle = (playerState.angle || 0) + Math.PI;
      const targetCx = px + Math.sin(behindAngle) * 1.65;
      const targetCz = pz + Math.cos(behindAngle) * 1.65;
      overworld.companionMesh.position.x += (targetCx - overworld.companionMesh.position.x) * 0.14;
      overworld.companionMesh.position.z += (targetCz - overworld.companionMesh.position.z) * 0.14;
      const dx = px - overworld.companionMesh.position.x;
      const dz = pz - overworld.companionMesh.position.z;
      if (dx * dx + dz * dz > 0.01) {
        overworld.companionMesh.rotation.y = Math.atan2(dx, dz);
      }
      animateKinMesh(overworld.companionMesh, timeSec, speed > 0.02, 0);
    }

    // Animate 3D Grass Clusters (bend away when player runs through!)
    overworld.grassBlades.forEach((cluster) => {
      const dx = cluster.userData.wx - px;
      const dz = cluster.userData.wz - pz;
      const distSq = dx * dx + dz * dz;
      if (distSq < 2.2) {
        const push = (1 - Math.sqrt(distSq) / 1.5) * 0.55;
        cluster.rotation.x = dz * push;
        cluster.rotation.z = -dx * push;
      } else {
        cluster.rotation.x = Math.sin(timeSec * 2.4 + cluster.userData.phase) * 0.1;
        cluster.rotation.z = Math.cos(timeSec * 1.9 + cluster.userData.phase) * 0.08;
      }
    });

    // Animate 3D Water / Molten Lava Waves
    overworld.waterMeshes.forEach((wMesh) => {
      wMesh.position.y = -0.18 + Math.sin(timeSec * 2.8 + wMesh.userData.phase) * 0.06;
    });

    // Animate Shrine Crystal & Portals
    if (overworld.shrineCrystal) {
      overworld.shrineCrystal.crystal.rotation.y = timeSec * 1.4;
      overworld.shrineCrystal.crystal.position.y = 1.55 + Math.sin(timeSec * 2.5) * 0.12;
      overworld.shrineCrystal.halo.rotation.z = timeSec * 2.0;
      overworld.shrineCrystal.halo.rotation.x = Math.PI / 3 + Math.sin(timeSec * 1.5) * 0.25;
    }

    overworld.portalMeshes.forEach((pMesh) => {
      pMesh.rotation.y = timeSec * 1.6;
    });

    overworld.npcGroup.children.forEach((npcMesh, idx) => {
      animateHumanoid3D(npcMesh, timeSec + idx * 0.7, 0);
    });

    // Animate Target Beacon
    if (overworld.targetBeacon && overworld.targetBeacon.visible) {
      const b = overworld.targetBeacon.userData;
      const pulse = 1 + Math.sin(timeSec * 8) * 0.18;
      b.outerRing.scale.setScalar(pulse);
      b.diamond.rotation.y = timeSec * 4;
      b.diamond.position.y = 1.05 + Math.sin(timeSec * 6) * 0.16;
    }

    // Smooth Spring-Damped 3D Camera
    let offsetY = 12.5;
    let offsetZ = 10.5;
    if (overworld.cameraMode === 1) {
      // Action Close-up
      offsetY = 7.2;
      offsetZ = 7.4;
    } else if (overworld.cameraMode === 2) {
      // Tactical High Angle
      offsetY = 18.5;
      offsetZ = 11.5;
    }

    const lookAheadX = (playerState.vx || 0) * 1.8;
    const lookAheadZ = (playerState.vy || 0) * 1.8;

    const desiredCamX = px + lookAheadX * 0.6;
    const desiredCamY = offsetY;
    const desiredCamZ = pz + offsetZ + lookAheadZ * 0.5;

    overworld.camPos.x += (desiredCamX - overworld.camPos.x) * 0.12;
    overworld.camPos.y += (desiredCamY - overworld.camPos.y) * 0.12;
    overworld.camPos.z += (desiredCamZ - overworld.camPos.z) * 0.12;

    overworld.camLook.x += (px + lookAheadX - overworld.camLook.x) * 0.16;
    overworld.camLook.y = 0.65;
    overworld.camLook.z += (pz + lookAheadZ - overworld.camLook.z) * 0.16;

    overworld.camera.position.set(overworld.camPos.x, overworld.camPos.y, overworld.camPos.z);
    overworld.camera.lookAt(overworld.camLook.x, overworld.camLook.y, overworld.camLook.z);

    overworld.renderer.render(overworld.scene, overworld.camera);
  }

  // ============================================================================
  // AGGRESSIVE 3D BATTLE ARENA ENGINE (Dynamic Camera, Lunges, Beams, Explosions)
  // ============================================================================
  const battle3d = {
    initialized: false,
    renderer: null,
    scene: null,
    camera: null,
    arenaGroup: null,
    vfxGroup: null,
    playerAnchor: null,
    enemyAnchor: null,
    playerMesh: null,
    enemyMesh: null,
    playerSpeciesKey: null,
    enemySpeciesKey: null,
    pointLight: null,
    shakeIntensity: 0,
    turnPhase: 'idle', // 'idle' | 'player_turn' | 'enemy_turn'
    activeAction: null, // { type: 'attack' | 'prism', startTime, duration, ... }
    particles: [],
    shockwaves: []
  };

  const PLAYER_BASE_POS = { x: -2.45, y: 0.15, z: 2.35 };
  const ENEMY_BASE_POS = { x: 2.45, y: 0.35, z: -2.15 };

  function initBattleArena(stageEl) {
    const THREE = getThree();
    if (!THREE || !stageEl) return false;
    if (battle3d.initialized && battle3d.renderer) {
      resizeBattleArena(stageEl);
      return true;
    }

    let canvas = document.getElementById('battle3dCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'battle3dCanvas';
      canvas.className = 'battle-3d-canvas';
      stageEl.insertBefore(canvas, stageEl.firstChild);
    }

    try {
      battle3d.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      return false;
    }

    const rect = stageEl.getBoundingClientRect();
    const w = Math.max(320, rect.width || window.innerWidth);
    const h = Math.max(260, rect.height || 420);

    battle3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    battle3d.renderer.setSize(w, h, false);
    battle3d.renderer.shadowMap.enabled = true;

    battle3d.scene = new THREE.Scene();
    battle3d.scene.background = new THREE.Color(0x070b19);
    battle3d.scene.fog = new THREE.FogExp2(0x090d1e, 0.038);

    battle3d.camera = new THREE.PerspectiveCamera(50, w / h, 0.3, 100);

    const hemi = new THREE.HemisphereLight(0x60a5fa, 0x1e1b4b, 0.9);
    battle3d.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(8, 16, 10);
    keyLight.castShadow = true;
    battle3d.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-10, 8, -10);
    battle3d.scene.add(rimLight);

    battle3d.pointLight = new THREE.PointLight(0xf97316, 0, 18);
    battle3d.pointLight.position.set(0, 3, 0);
    battle3d.scene.add(battle3d.pointLight);

    battle3d.arenaGroup = new THREE.Group();
    battle3d.vfxGroup = new THREE.Group();
    battle3d.playerAnchor = new THREE.Group();
    battle3d.enemyAnchor = new THREE.Group();

    battle3d.scene.add(battle3d.arenaGroup);
    battle3d.scene.add(battle3d.playerAnchor);
    battle3d.scene.add(battle3d.enemyAnchor);
    battle3d.scene.add(battle3d.vfxGroup);

    buildBattleStadiumGeometry( 'meadow' );

    battle3d.initialized = true;
    return true;
  }

  function resizeBattleArena(stageEl) {
    if (!battle3d.initialized || !battle3d.renderer || !battle3d.camera) return;
    const el = stageEl || document.getElementById('battleStage');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(300, rect.width || window.innerWidth);
    const h = Math.max(240, rect.height || 380);
    battle3d.camera.aspect = w / h;
    battle3d.camera.updateProjectionMatrix();
    battle3d.renderer.setSize(w, h, false);
  }

  function buildBattleStadiumGeometry(zoneId) {
    const THREE = getThree();
    if (!THREE || !battle3d.arenaGroup) return;

    while (battle3d.arenaGroup.children.length > 0) {
      battle3d.arenaGroup.remove(battle3d.arenaGroup.children[0]);
    }

    const pal = BIOME_PALETTES[zoneId] || BIOME_PALETTES.meadow;
    if (battle3d.scene) {
      battle3d.scene.background.setHex(pal.sky);
      battle3d.scene.fog.color.setHex(pal.fog);
    }

    const arenaGrassTex = getProceduralTexture("grass", pal.ground, pal.tallGrass);
    const arenaStoneTex = getProceduralTexture("stone", pal.path, pal.ground);
    // Main Realistic Natural Colosseum Floor
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(10.5, 11.8, 0.7, 32),
      new THREE.MeshStandardMaterial({
        color: pal.ground,
        map: arenaGrassTex,
        bumpMap: arenaGrassTex,
        bumpScale: 0.04,
        roughness: 0.72,
        metalness: 0.12
      })
    );
    const innerStone = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 5.8, 0.12, 32),
      new THREE.MeshStandardMaterial({
        color: pal.path,
        map: arenaStoneTex,
        bumpMap: arenaStoneTex,
        bumpScale: 0.04,
        roughness: 0.65
      })
    );
    innerStone.position.y = 0.02;
    innerStone.receiveShadow = true;
    battle3d.arenaGroup.add(innerStone);
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    battle3d.arenaGroup.add(floor);

    // Glowing Center Battle Ring
    const centerRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.45, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      })
    );
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = 0.02;
    battle3d.arenaGroup.add(centerRing);

    // Player & Enemy Glowing Combat Pedestals
    const makePedestal = (x, y, z, colorHex) => {
      const pedGroup = new THREE.Group();
      pedGroup.position.set(x, y, z);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.85, 0.24, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 })
      );
      disc.position.y = -0.08;
      const neonRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.72, 0.06, 8, 32),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      neonRim.rotation.x = Math.PI / 2;
      neonRim.position.y = 0.04;
      pedGroup.add(disc, neonRim);
      battle3d.arenaGroup.add(pedGroup);
    };

    makePedestal(PLAYER_BASE_POS.x, PLAYER_BASE_POS.y, PLAYER_BASE_POS.z, 0x38bdf8);
    makePedestal(ENEMY_BASE_POS.x, ENEMY_BASE_POS.y, ENEMY_BASE_POS.z, 0xf43f5e);

    // Perimeter Stadium Pillars with Glowing Elemental Crystals
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.3;
      const dist = 8.2;
      const px = Math.cos(ang) * dist;
      const pz = Math.sin(ang) * dist;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.65, 3.6, 6),
        new THREE.MeshStandardMaterial({ color: pal.treeTrunk, roughness: 0.6 })
      );
      pillar.position.set(px, 1.5, pz);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({
          color: pal.treeCrownAlt,
          emissive: pal.treeCrown,
          emissiveIntensity: 0.75
        })
      );
      crystal.position.set(px, 3.85, pz);
      battle3d.arenaGroup.add(pillar, crystal);
    }
  }

  /**
   * Synchronizes the 3D models of the active Player Kin and Enemy Kin in the Battle Arena
   */
  function syncBattleCombatants(playerKin, enemyKin, speciesCatalog, zoneId = 'meadow') {
    if (!battle3d.initialized) return;
    buildBattleStadiumGeometry(zoneId);

    const resolveSpec = (id) => {
      if (!speciesCatalog || !id) return null;
      if (typeof speciesCatalog.getSpeciesById === "function") return speciesCatalog.getSpeciesById(id);
      if (Array.isArray(speciesCatalog)) return speciesCatalog.find((s) => s.id === Number(id));
      return speciesCatalog[id] || null;
    };
    const pSpec = playerKin ? resolveSpec(playerKin.speciesId) : null;
    const eSpec = enemyKin ? resolveSpec(enemyKin.speciesId) : null;

    const pKey = pSpec ? `${pSpec.id}_${playerKin.isRadiant ? 1 : 0}` : null;
    const eKey = eSpec ? `${eSpec.id}_${enemyKin.isRadiant ? 1 : 0}` : null;

    if (pKey !== battle3d.playerSpeciesKey) {
      while (battle3d.playerAnchor.children.length > 0) {
        battle3d.playerAnchor.remove(battle3d.playerAnchor.children[0]);
      }
      if (pSpec) {
        battle3d.playerMesh = buildKin3DMesh(pSpec, Boolean(playerKin.isRadiant));
        if (battle3d.playerMesh) {
          battle3d.playerAnchor.add(battle3d.playerMesh);
        }
      }
      battle3d.playerSpeciesKey = pKey;
    }

    if (eKey !== battle3d.enemySpeciesKey) {
      while (battle3d.enemyAnchor.children.length > 0) {
        battle3d.enemyAnchor.remove(battle3d.enemyAnchor.children[0]);
      }
      if (eSpec) {
        battle3d.enemyMesh = buildKin3DMesh(eSpec, Boolean(enemyKin.isRadiant));
        if (battle3d.enemyMesh) {
          battle3d.enemyAnchor.add(battle3d.enemyMesh);
        }
      }
      battle3d.enemySpeciesKey = eKey;
    }

    // Reset positions & face each other across the arena
    battle3d.playerAnchor.position.set(PLAYER_BASE_POS.x, PLAYER_BASE_POS.y, PLAYER_BASE_POS.z);
    battle3d.enemyAnchor.position.set(ENEMY_BASE_POS.x, ENEMY_BASE_POS.y, ENEMY_BASE_POS.z);

    const dx = ENEMY_BASE_POS.x - PLAYER_BASE_POS.x;
    const dz = ENEMY_BASE_POS.z - PLAYER_BASE_POS.z;
    const faceAngle = Math.atan2(dx, dz);
    battle3d.playerAnchor.rotation.y = faceAngle;
    battle3d.enemyAnchor.rotation.y = faceAngle + Math.PI;
    battle3d.playerAnchor.visible = Boolean(playerKin && playerKin.currentHp > 0);
    battle3d.enemyAnchor.visible = Boolean(enemyKin && enemyKin.currentHp > 0);
  }

  function spawn3DImpactExplosion(targetPos, colorHex, isBigHit = false) {
    const THREE = getThree();
    if (!THREE || !battle3d.vfxGroup) return;

    // 1. Expanding Dual 3D Shockwave Rings
    for (let r = 0; r < 2; r++) {
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.65, 28),
        new THREE.MeshBasicMaterial({
          color: r === 0 ? colorHex : 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        })
      );
      ringMesh.position.set(targetPos.x, targetPos.y + 0.8, targetPos.z);
      ringMesh.rotation.x = r === 0 ? Math.PI / 2 : Math.PI / 4;
      battle3d.vfxGroup.add(ringMesh);
      battle3d.shockwaves.push({
        mesh: ringMesh,
        life: 1.0,
        speed: isBigHit ? 14 + r * 5 : 9 + r * 4
      });
    }

    // 2. Burst of 3D Elemental Shards
    const count = isBigHit ? 38 : 24;
    const shardGeo = new THREE.OctahedronGeometry(isBigHit ? 0.22 : 0.16, 0);
    for (let i = 0; i < count; i++) {
      const shardMat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xffffff : colorHex,
        transparent: true,
        opacity: 1
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(targetPos.x, targetPos.y + 0.9, targetPos.z);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = (isBigHit ? 6.5 : 4.5) + Math.random() * 5.5;
      battle3d.vfxGroup.add(shard);
      battle3d.particles.push({
        mesh: shard,
        vx: Math.sin(phi) * Math.cos(theta) * spd,
        vy: Math.abs(Math.cos(phi)) * spd + 2.2,
        vz: Math.sin(phi) * Math.sin(theta) * spd,
        life: 1.0
      });
    }
  }

  /**
   * Triggers a high-adrenaline 3D attack sequence:
   * - Camera swoop onto attacker -> High-speed 3D physical lunge + elemental barrage
   * - Camera cut to defender impact + heavy 3D screen shake + knockback recoil!
   */

  function setBattleTurnPhase(phase = "idle") {
    battle3d.turnPhase = phase || "idle";
  }

  function playAttack3D(isPlayerAttacking, move, result, onImpactCallback) {
    const THREE = getThree();
    if (!THREE || !battle3d.initialized) {
      if (typeof onImpactCallback === 'function') onImpactCallback();
      return;
    }

    const affHex = AFFINITY_HEX[move && move.affinity] || 0x38bdf8;
    const isBigHit = Boolean(result && (result.isCrit || result.effectiveness > 1));
    const startPos = isPlayerAttacking ? { ...PLAYER_BASE_POS } : { ...ENEMY_BASE_POS };
    const endPos = isPlayerAttacking ? { ...ENEMY_BASE_POS } : { ...PLAYER_BASE_POS };

    // Create 3D Projectile / Energy Core Mesh
    const projGroup = new THREE.Group();
    const coreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(isBigHit ? 0.62 : 0.46, 1),
      new THREE.MeshBasicMaterial({ color: affHex })
    );
    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    projGroup.add(coreMesh, outerHalo);
    projGroup.position.set(startPos.x, startPos.y + 1.0, startPos.z);
    battle3d.vfxGroup.add(projGroup);

    battle3d.activeAction = {
      type: 'attack',
      isPlayerAttacking,
      affHex,
      isBigHit,
      startPos,
      endPos,
      projGroup,
      startTime: performance.now(),
      duration: 920, // Dramatic 920ms turn-by-turn combat choreography!
      impactTriggered: false,
      onImpactCallback
    };
  }

  /**
   * Triggers a 3D Aether Prism Capture Cutscene in the Battle Arena
   */
  function playPrismCapture3D(prismColorHex = 0x38bdf8, shakes = 3, caught = true, onComplete) {
    const THREE = getThree();
    if (!THREE || !battle3d.initialized) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const prismGroup = new THREE.Group();
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color: prismColorHex,
        emissive: prismColorHex,
        emissiveIntensity: 0.75,
        roughness: 0.1,
        metalness: 0.6
      })
    );
    const goldBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    prismGroup.add(crystal, goldBand);
    prismGroup.position.set(PLAYER_BASE_POS.x, PLAYER_BASE_POS.y + 1.4, PLAYER_BASE_POS.z);
    battle3d.vfxGroup.add(prismGroup);

    battle3d.activeAction = {
      type: 'prism',
      prismGroup,
      prismColorHex,
      shakes,
      caught,
      startTime: performance.now(),
      duration: 1350,
      absorbed: false,
      completed: false,
      onComplete
    };
  }

  function renderBattleFrame(timeMs) {
    if (!battle3d.initialized || !battle3d.renderer || !battle3d.scene || !battle3d.camera) return;
    const now = timeMs || performance.now();
    const timeSec = now * 0.001;

    let playerLungePhase = 0;
    let enemyLungePhase = 0;

    // Turn-Aware Cinematic Battle Camera (frames active turn party!)
    let camX = -4.2 + Math.sin(timeSec * 0.55) * 0.65;
    let camY = 3.35 + Math.cos(timeSec * 0.4) * 0.2;
    let camZ = 6.2 + Math.cos(timeSec * 0.55) * 0.45;
    let lookX = 0.25;
    let lookY = 1.05;
    let lookZ = 0.0;

    if (battle3d.turnPhase === "player_turn") {
      camX = -3.8;
      camY = 2.75;
      camZ = 5.4;
      lookX = 0.8;
      lookY = 1.1;
      lookZ = -0.6;
    } else if (battle3d.turnPhase === "enemy_turn") {
      camX = 3.6;
      camY = 2.85;
      camZ = 5.1;
      lookX = -0.8;
      lookY = 1.05;
      lookZ = 0.6;
    }

    // Process Active 3D Combat Action (Attack or Prism Capture)
    if (battle3d.activeAction) {
      const act = battle3d.activeAction;
      const elapsed = now - act.startTime;
      const t = Math.min(1, elapsed / act.duration);

      if (act.type === 'attack') {
        const attackerAnchor = act.isPlayerAttacking ? battle3d.playerAnchor : battle3d.enemyAnchor;
        const defenderAnchor = act.isPlayerAttacking ? battle3d.enemyAnchor : battle3d.playerAnchor;
        const s = act.startPos;
        const e = act.endPos;

        if (t < 0.46) {
          // Phase 1 & 2: Wind-up + High-Speed Physical Lunge & Projectile Barrage across Arena!
          const lungeT = t / 0.46;
          const easeT = lungeT * lungeT * (3 - 2 * lungeT);
          const curX = s.x + (e.x - s.x) * easeT * 0.78;
          const curZ = s.z + (e.z - s.z) * easeT * 0.78;
          const leapY = s.y + Math.sin(lungeT * Math.PI) * 1.35;

          attackerAnchor.position.set(curX, leapY, curZ);
          if (act.isPlayerAttacking) playerLungePhase = lungeT;
          else enemyLungePhase = lungeT;

          if (act.projGroup) {
            act.projGroup.position.set(
              s.x + (e.x - s.x) * lungeT,
              1.05 + Math.sin(lungeT * Math.PI) * 0.9,
              s.z + (e.z - s.z) * lungeT
            );
            act.projGroup.rotation.x += 0.28;
            act.projGroup.rotation.y += 0.35;
          }

          // Dynamic Action Camera tracks behind the lunging attacker!
          camX = curX + (act.isPlayerAttacking ? -2.6 : 2.6);
          camY = 2.65;
          camZ = curZ + (act.isPlayerAttacking ? 3.2 : -3.2);
          lookX = e.x;
          lookY = 1.15;
          lookZ = e.z;

          battle3d.pointLight.color.setHex(act.affHex);
          battle3d.pointLight.intensity = 4.5;
          battle3d.pointLight.position.copy(act.projGroup.position);
        } else {
          // Phase 3: Explosive Impact Cut + Hit-Stop + Knockback Recoil!
          if (!act.impactTriggered) {
            act.impactTriggered = true;
            if (act.projGroup) {
              battle3d.vfxGroup.remove(act.projGroup);
              act.projGroup = null;
            }
            spawn3DImpactExplosion(e, act.affHex, act.isBigHit);
            battle3d.shakeIntensity = act.isBigHit ? 0.58 : 0.34;
            if (typeof act.onImpactCallback === 'function') {
              act.onImpactCallback();
            }
          }

          const recT = (t - 0.46) / 0.54;
          // Attacker springs back to its pedestal
          attackerAnchor.position.set(
            e.x * 0.78 + (s.x - e.x * 0.78) * recT,
            s.y + Math.sin(recT * Math.PI) * 0.4,
            e.z * 0.78 + (s.z - e.z * 0.78) * recT
          );

          // Defender suffers 3D Knockback Recoil!
          const knockback = Math.sin(recT * Math.PI) * (act.isBigHit ? 0.95 : 0.55);
          const dirSign = act.isPlayerAttacking ? 1 : -1;
          defenderAnchor.position.set(
            e.x + dirSign * knockback * 0.65,
            e.y,
            e.z - dirSign * knockback * 0.65
          );

          // Dramatic Impact Camera Angle on Defender
          camX = e.x + (act.isPlayerAttacking ? -2.2 : 2.2);
          camY = 2.4;
          camZ = e.z + 3.8;
          lookX = e.x;
          lookY = 1.1;
          lookZ = e.z;

          battle3d.pointLight.intensity = (1 - recT) * 6.0;
        }

        if (t >= 1) {
          attackerAnchor.position.set(s.x, s.y, s.z);
          defenderAnchor.position.set(e.x, e.y, e.z);
          battle3d.pointLight.intensity = 0;
          battle3d.activeAction = null;
        }
      } else if (act.type === 'prism') {
        const pGroup = act.prismGroup;
        if (t < 0.35) {
          // High Parabolic Throw onto Wild Kin
          const throwT = t / 0.35;
          pGroup.position.set(
            PLAYER_BASE_POS.x + (ENEMY_BASE_POS.x - PLAYER_BASE_POS.x) * throwT,
            1.2 + Math.sin(throwT * Math.PI) * 2.8,
            PLAYER_BASE_POS.z + (ENEMY_BASE_POS.z - PLAYER_BASE_POS.z) * throwT
          );
          pGroup.rotation.x += 0.3;
          pGroup.rotation.y += 0.35;
        } else if (t < 0.85) {
          // Absorb Wild Kin & Rock on Pedestal
          if (!act.absorbed) {
            act.absorbed = true;
            spawn3DImpactExplosion(ENEMY_BASE_POS, act.prismColorHex, true);
            if (battle3d.enemyMesh) battle3d.enemyMesh.scale.setScalar(0.01);
          }
          const shakeT = (t - 0.35) / 0.5;
          pGroup.position.set(ENEMY_BASE_POS.x, ENEMY_BASE_POS.y + 0.55, ENEMY_BASE_POS.z);
          pGroup.rotation.z = Math.sin(shakeT * Math.PI * 6) * 0.45;
          camX = ENEMY_BASE_POS.x - 1.2;
          camY = 1.9;
          camZ = ENEMY_BASE_POS.z + 2.8;
          lookX = ENEMY_BASE_POS.x;
          lookY = 0.7;
          lookZ = ENEMY_BASE_POS.z;
        } else {
          if (!act.completed) {
            act.completed = true;
            spawn3DImpactExplosion(ENEMY_BASE_POS, act.caught ? 0xfacc15 : 0xf43f5e, true);
            if (!act.caught && battle3d.enemyMesh) {
              battle3d.enemyMesh.scale.setScalar(battle3d.enemyMesh.userData.baseScale || 1);
            }
          }
        }

        if (t >= 1) {
          if (act.prismGroup) battle3d.vfxGroup.remove(act.prismGroup);
          const cb = act.onComplete;
          battle3d.activeAction = null;
          if (typeof cb === 'function') cb();
        }
      }
    }

    // Animate Both 3D Kin Combatants
    if (battle3d.playerMesh) {
      animateKinMesh(battle3d.playerMesh, timeSec, playerLungePhase > 0, playerLungePhase);
    }
    if (battle3d.enemyMesh) {
      animateKinMesh(battle3d.enemyMesh, timeSec + 1.2, enemyLungePhase > 0, enemyLungePhase);
    }

    // Update 3D Shockwave Rings
    for (let i = battle3d.shockwaves.length - 1; i >= 0; i--) {
      const sw = battle3d.shockwaves[i];
      sw.life -= 0.045;
      if (sw.life <= 0) {
        battle3d.vfxGroup.remove(sw.mesh);
        battle3d.shockwaves.splice(i, 1);
      } else {
        const s = 1 + (1 - sw.life) * sw.speed;
        sw.mesh.scale.setScalar(s);
        sw.mesh.material.opacity = sw.life;
      }
    }

    // Update 3D Explosion Shards
    for (let i = battle3d.particles.length - 1; i >= 0; i--) {
      const pt = battle3d.particles[i];
      pt.life -= 0.038;
      if (pt.life <= 0) {
        battle3d.vfxGroup.remove(pt.mesh);
        battle3d.particles.splice(i, 1);
      } else {
        pt.mesh.position.x += pt.vx * 0.016;
        pt.mesh.position.y += pt.vy * 0.016;
        pt.mesh.position.z += pt.vz * 0.016;
        pt.vy -= 14 * 0.016; // Gravity
        pt.mesh.rotation.x += 0.25;
        pt.mesh.rotation.y += 0.22;
        pt.mesh.material.opacity = pt.life;
      }
    }

    // Apply Heavy 3D Camera Shake on Impact!
    if (battle3d.shakeIntensity > 0.005) {
      camX += (Math.random() - 0.5) * battle3d.shakeIntensity;
      camY += (Math.random() - 0.5) * battle3d.shakeIntensity;
      camZ += (Math.random() - 0.5) * battle3d.shakeIntensity;
      battle3d.shakeIntensity *= 0.84;
    } else {
      battle3d.shakeIntensity = 0;
    }

    battle3d.camera.position.set(camX, camY, camZ);
    battle3d.camera.lookAt(lookX, lookY, lookZ);
    battle3d.renderer.render(battle3d.scene, battle3d.camera);
  }

  return {
    initOverworld,
    resizeOverworld,
    cycleCameraMode,
    syncZone,
    syncCompanionKin,
    screenToWorldTile,
    setTargetBeacon,
    renderOverworldFrame,
    initBattleArena,
    resizeBattleArena,
    syncBattleCombatants,
    setBattleTurnPhase,
    playAttack3D,
    playPrismCapture3D,
    renderBattleFrame,
    buildKin3DMesh
  };
});
