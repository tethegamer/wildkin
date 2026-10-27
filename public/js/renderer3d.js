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
  // Smooth rounded capsule helper (cylinder + top/bottom hemispheres, zero sharp boxy edges)
  function createSmoothCapsule(THREE, radiusTop, radiusBot, height, mat, segs = 16) {
    const grp = new THREE.Group();
    const cylH = Math.max(0.04, height - radiusTop - radiusBot);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBot, cylH, segs), mat);
    cyl.castShadow = true;
    grp.add(cyl);
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(radiusTop, segs, Math.max(8, Math.floor(segs * 0.75))), mat);
    topCap.position.y = cylH * 0.5;
    topCap.castShadow = true;
    grp.add(topCap);
    const botCap = new THREE.Mesh(new THREE.SphereGeometry(radiusBot, segs, Math.max(8, Math.floor(segs * 0.75))), mat);
    botCap.position.y = -cylH * 0.5;
    botCap.castShadow = true;
    grp.add(botCap);
    return grp;
  }

  // Expressive 3DS/Switch style layered eyes (sclera + colored iris + dark pupil + dual white catchlights)
  function addExpressiveEyes3D(THREE, parentGroup, eyeMat, darkMat, spreadX, posY, posZ, radius = 0.095) {
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const scleraGeo = new THREE.SphereGeometry(radius, 16, 14);
    const irisGeo = new THREE.SphereGeometry(radius * 0.78, 14, 12);
    const pupilGeo = new THREE.SphereGeometry(radius * 0.46, 12, 10);
    const glintBigGeo = new THREE.SphereGeometry(radius * 0.25, 10, 8);
    const glintSmallGeo = new THREE.SphereGeometry(radius * 0.13, 8, 8);

    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * spreadX, posY, posZ);
      const sclera = new THREE.Mesh(scleraGeo, whiteMat);
      sclera.scale.set(0.95, 1.12, 0.68);
      const iris = new THREE.Mesh(irisGeo, eyeMat);
      iris.scale.set(0.92, 1.08, 0.72);
      iris.position.set(0, 0, radius * 0.26);
      const pupil = new THREE.Mesh(pupilGeo, darkMat);
      pupil.scale.set(0.9, 1.05, 0.7);
      pupil.position.set(0, 0, radius * 0.52);
      const glint1 = new THREE.Mesh(glintBigGeo, whiteMat);
      glint1.position.set(side * radius * 0.24, radius * 0.28, radius * 0.76);
      const glint2 = new THREE.Mesh(glintSmallGeo, whiteMat);
      glint2.position.set(-side * radius * 0.18, -radius * 0.2, radius * 0.74);
      eyeGroup.add(sclera, iris, pupil, glint1, glint2);
      parentGroup.add(eyeGroup);
    });
  }

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

    // Smooth, vibrant 3DS/Switch cel-inspired satin shading
    const bodyMat = new THREE.MeshStandardMaterial({
      color: primaryHex,
      roughness: 0.36,
      metalness: 0.08,
      emissive: primaryHex,
      emissiveIntensity: 0.12
    });
    const secMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      roughness: 0.32,
      metalness: 0.12,
      emissive: secondaryHex,
      emissiveIntensity: 0.18
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.24,
      metalness: 0.22,
      emissive: accentHex,
      emissiveIntensity: 0.32
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: secondaryHex,
      roughness: 0.42,
      metalness: 0.05,
      emissive: secondaryHex,
      emissiveIntensity: 0.10
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeHex });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 });

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

    // Soft ground contact shadow disc under every Kin
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.36, side: THREE.DoubleSide })
    );
    shadowDisc.rotation.x = Math.PI / 2;
    shadowDisc.position.y = 0.02;
    group.add(shadowDisc);

    if (archetype === 'quadruped' || archetype === 'aquatic') {
      // Smooth sculpted organic torso + chest + rounded belly patch
      const torso = new THREE.Mesh(new THREE.SphereGeometry(0.56, 28, 22), bodyMat);
      torso.scale.set(0.94, 0.84, 1.38);
      torso.position.set(0, 0.72, 0);
      torso.castShadow = true;
      rig.body.add(torso);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 18), bellyMat);
      belly.scale.set(0.82, 0.72, 1.18);
      belly.position.set(0, 0.64, 0.16);
      rig.body.add(belly);

      // Plush rounded collar / elemental ruff around neck
      const chestRuff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), secMat);
      chestRuff.scale.set(1.08, 0.85, 0.92);
      chestRuff.position.set(0, 0.86, 0.48);
      rig.body.add(chestRuff);

      // Smooth dorsal fins / rounded elemental tufts along spine
      for (let i = 0; i < 3; i++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 16), accentMat);
        spine.position.set(0, 1.14 - i * 0.04, 0.22 - i * 0.38);
        spine.rotation.x = -0.35;
        rig.body.add(spine);
      }

      // Expressive 3DS/Switch Creature Head + Rounded Muzzle + Cheeks + Ears
      rig.head.position.set(0, 1.16, 0.66);
      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 22), bodyMat);
      cranium.scale.set(1.06, 0.98, 1.04);
      cranium.castShadow = true;
      rig.head.add(cranium);

      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), secMat);
      muzzle.scale.set(1.05, 0.76, 1.15);
      muzzle.position.set(0, -0.09, 0.32);
      rig.head.add(muzzle);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), darkMat);
      nose.scale.set(1.2, 0.8, 0.9);
      nose.position.set(0, -0.03, 0.54);
      rig.head.add(nose);

      addExpressiveEyes3D(THREE, rig.head, eyeMat, darkMat, 0.21, 0.06, 0.33, 0.105);

      // Smooth rounded ears / horns with inner ear detail
      [-1, 1].forEach((side) => {
        const earGroup = new THREE.Group();
        earGroup.position.set(side * 0.27, 0.34, -0.04);
        earGroup.rotation.z = -side * 0.32;
        earGroup.rotation.x = 0.12;
        const outerEar = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.52, 18), bodyMat);
        outerEar.castShadow = true;
        const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 14), accentMat);
        innerEar.position.set(0, -0.02, 0.05);
        earGroup.add(outerEar, innerEar);
        rig.head.add(earGroup);
      });

      rig.body.add(rig.head);

      // 4 Smooth Articulated Capsule Limbs + Rounded Paws
      const legPositions = [
        [0.33, 0.44, 0.44],
        [-0.33, 0.44, 0.44],
        [0.34, 0.44, -0.44],
        [-0.34, 0.44, -0.44]
      ];
      legPositions.forEach(([lx, ly, lz]) => {
        const legGroup = new THREE.Group();
        legGroup.position.set(lx, ly, lz);
        const upperLeg = createSmoothCapsule(THREE, 0.14, 0.11, 0.46, bodyMat, 16);
        upperLeg.position.y = -0.14;
        const pawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), secMat);
        pawMesh.scale.set(1.05, 0.62, 1.32);
        pawMesh.position.set(0, -0.36, 0.06);
        legGroup.add(upperLeg, pawMesh);
        rig.body.add(legGroup);
        rig.limbs.push(legGroup);
      });

      // Multi-segment S-Curve Plume Tail
      rig.tail.position.set(0, 0.82, -0.66);
      const tailBase = createSmoothCapsule(THREE, 0.14, 0.18, 0.55, secMat, 16);
      tailBase.position.set(0, 0.16, -0.22);
      tailBase.rotation.x = -0.75;
      const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), accentMat);
      tailTip.scale.set(0.88, 1.35, 1.15);
      tailTip.position.set(0, 0.38, -0.48);
      tailTip.rotation.x = -0.45;
      rig.tail.add(tailBase, tailTip);
      rig.body.add(rig.tail);
    } else if (archetype === 'winged') {
      // Smooth Aerodynamic Avian / Sky-Drake Body
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.54, 28, 22), bodyMat);
      core.scale.set(0.92, 1.12, 1.28);
      core.position.set(0, 1.18, 0);
      core.castShadow = true;
      rig.body.add(core);

      const breast = new THREE.Mesh(new THREE.SphereGeometry(0.44, 22, 18), bellyMat);
      breast.scale.set(0.84, 0.95, 1.05);
      breast.position.set(0, 1.12, 0.22);
      rig.body.add(breast);

      // Sculpted Avian/Dragon Head + Curved Beak + Feathered Crest
      rig.head.position.set(0, 1.68, 0.44);
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.37, 26, 20), bodyMat);
      headMesh.scale.set(0.98, 0.96, 1.08);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.46, 18), accentMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.04, 0.38);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 16), secMat);
      crest.position.set(0, 0.34, -0.10);
      crest.rotation.x = -0.55;
      rig.head.add(headMesh, beak, crest);
      addExpressiveEyes3D(THREE, rig.head, eyeMat, darkMat, 0.19, 0.05, 0.27, 0.095);
      rig.body.add(rig.head);

      // Feathered Multi-Pinion Curved 3D Wings (No flat boxes!)
      [-1, 1].forEach((side) => {
        const wingGroup = new THREE.Group();
        wingGroup.position.set(side * 0.42, 1.28, 0.04);
        const wingArm = createSmoothCapsule(THREE, 0.11, 0.09, 1.15, bodyMat, 14);
        wingArm.rotation.z = side * (Math.PI / 2 - 0.18);
        wingArm.position.set(side * 0.52, 0.12, 0);
        wingGroup.add(wingArm);

        for (let f = 0; f < 4; f++) {
          const feather = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.78 - f * 0.08, 14),
            f % 2 === 0 ? secMat : accentMat
          );
          feather.scale.set(0.55, 1.0, 1.35);
          feather.position.set(side * (0.34 + f * 0.26), -0.06 + f * 0.04, -0.14 - f * 0.05);
          feather.rotation.z = side * (1.25 + f * 0.12);
          feather.rotation.x = -0.35;
          wingGroup.add(feather);
        }
        rig.body.add(wingGroup);
        rig.wings.push(wingGroup);
      });

      // Flowing Feathered Tail Fan
      rig.tail.position.set(0, 0.96, -0.62);
      for (let t = -1; t <= 1; t++) {
        const plume = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.92, 16), t === 0 ? accentMat : secMat);
        plume.scale.set(0.65, 1.0, 1.2);
        plume.rotation.x = -1.15;
        plume.rotation.z = t * 0.28;
        plume.position.set(t * 0.16, -0.08, -0.38);
        rig.tail.add(plume);
      }
      rig.body.add(rig.tail);
    } else if (archetype === 'golem') {
      // Smooth Rounded Guardian Colossus (Like Golurk / Metagross / Tyranitar — zero sharp boxes!)
      const torso = new THREE.Mesh(new THREE.SphereGeometry(0.76, 28, 22), bodyMat);
      torso.scale.set(1.14, 1.02, 0.96);
      torso.position.set(0, 1.02, 0);
      torso.castShadow = true;
      rig.body.add(torso);

      const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 18), secMat);
      chestPlate.scale.set(1.12, 0.68, 0.55);
      chestPlate.position.set(0, 1.12, 0.52);
      rig.body.add(chestPlate);

      const coreCrystal = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), accentMat);
      coreCrystal.scale.set(1.0, 1.15, 0.65);
      coreCrystal.position.set(0, 1.08, 0.76);
      rig.body.add(coreCrystal);

      // Smooth Domed Guardian Head + Curved Horns + Glowing Eyes
      rig.head.position.set(0, 1.68, 0.18);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), bodyMat);
      helm.scale.set(1.12, 0.88, 1.02);
      rig.head.add(helm);
      addExpressiveEyes3D(THREE, rig.head, eyeMat, darkMat, 0.19, 0.02, 0.34, 0.095);

      [-1, 1].forEach((side) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.54, 16), accentMat);
        horn.position.set(side * 0.34, 0.28, 0.04);
        horn.rotation.z = -side * 0.42;
        rig.head.add(horn);
      });
      rig.body.add(rig.head);

      // Rounded Shoulder Pauldrons, Capsule Forearms & Sturdy Rounded Legs
      [-1, 1].forEach((side) => {
        const armGroup = new THREE.Group();
        armGroup.position.set(side * 0.86, 1.18, 0.10);
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), secMat);
        const forearm = createSmoothCapsule(THREE, 0.20, 0.24, 0.62, bodyMat, 16);
        forearm.position.set(side * 0.12, -0.42, 0.14);
        armGroup.add(shoulder, forearm);
        rig.body.add(armGroup);
        rig.limbs.push(armGroup);

        const legGroup = new THREE.Group();
        legGroup.position.set(side * 0.42, 0.44, 0);
        const leg = createSmoothCapsule(THREE, 0.22, 0.25, 0.56, darkMat, 16);
        leg.position.y = -0.10;
        legGroup.add(leg);
        rig.body.add(legGroup);
        rig.limbs.push(legGroup);
      });
    } else {
      // 'wraith' — Smooth Ethereal Levitating Spirit (Like Gardevoir / Mismagius / Chandelure)
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.42, 24), bodyMat);
      cloak.position.set(0, 1.04, 0);
      cloak.castShadow = true;
      rig.body.add(cloak);

      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.11, 14, 24), secMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 1.38, 0.04);
      rig.body.add(collar);

      rig.head.position.set(0, 1.62, 0.14);
      const mask = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 20), secMat);
      mask.scale.set(1.04, 0.96, 0.98);
      const wisps = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 18), accentMat);
      wisps.position.set(0, 0.38, -0.08);
      wisps.rotation.x = -0.35;
      rig.head.add(mask, wisps);
      addExpressiveEyes3D(THREE, rig.head, eyeMat, darkMat, 0.16, 0.02, 0.32, 0.095);
      rig.body.add(rig.head);

      [-1, 1].forEach((side) => {
        const handGroup = new THREE.Group();
        handGroup.position.set(side * 0.78, 1.18, 0.30);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 16), accentMat);
        orb.scale.set(0.85, 1.15, 0.95);
        handGroup.add(orb);
        rig.body.add(handGroup);
        rig.limbs.push(handGroup);
      });
    }

    // Subtle Elemental Pedestal Ring
    const ringGeo = new THREE.TorusGeometry(0.88, isRadiant ? 0.045 : 0.025, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isRadiant ? 0xfacc15 : affHex,
      transparent: true,
      opacity: isRadiant ? 0.85 : 0.42
    });
    const auraRing = new THREE.Mesh(ringGeo, ringMat);
    auraRing.rotation.x = Math.PI / 2;
    auraRing.position.y = 0.06;
    group.add(auraRing);
    rig.auraRings.push(auraRing);

    if (isRadiant || species.id === 27) {
      const crownRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.032, 10, 28),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 })
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
   * Animates a 3D Kin mesh with smooth, lively 3DS/Switch breathing, squash-and-stretch, head look, and tail sway
   */
  function animateKinMesh(mesh, timeSec, isMoving = false, lungePhase = 0) {
    if (!mesh || !mesh.userData || !mesh.userData.rig) return;
    const { rig, archetype } = mesh.userData;

    const bobSpeed = isMoving ? 9.5 : 2.8;
    const bobAmp = isMoving ? 0.11 : 0.055;
    const breath = Math.sin(timeSec * bobSpeed);
    rig.body.position.y = breath * bobAmp + (lungePhase > 0 ? Math.sin(lungePhase * Math.PI) * 0.55 : 0);

    // Subtle organic breathing squash-and-stretch so models never look stiff
    const squash = 1 + breath * (isMoving ? 0.045 : 0.025);
    rig.body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    if (rig.head) {
      rig.head.rotation.x = Math.sin(timeSec * 2.4) * 0.09 + (lungePhase > 0 ? -0.22 : 0);
      rig.head.rotation.y = Math.cos(timeSec * 1.6) * 0.14;
      rig.head.rotation.z = Math.sin(timeSec * 1.9) * 0.05;
    }

    if (archetype === 'winged' && rig.wings.length === 2) {
      const flap = Math.sin(timeSec * 8.5) * 0.48;
      rig.wings[0].rotation.z = -flap;
      rig.wings[1].rotation.z = flap;
      rig.body.position.y += 0.20;
    }

    if (rig.limbs.length > 0) {
      const swingSpeed = isMoving ? 11 : 2.6;
      const swingAmp = isMoving ? 0.46 : 0.10;
      rig.limbs.forEach((limb, idx) => {
        const sign = idx % 2 === 0 ? 1 : -1;
        limb.rotation.x = Math.sin(timeSec * swingSpeed + idx * 1.2) * swingAmp * sign;
      });
    }

    if (rig.tail) {
      rig.tail.rotation.y = Math.sin(timeSec * 4.2) * 0.34;
      rig.tail.rotation.x = Math.cos(timeSec * 2.8) * 0.10;
    }

    rig.auraRings.forEach((ring, i) => {
      ring.rotation.z = timeSec * (i === 0 ? 1.4 : -2.2);
      if (i > 0) ring.rotation.y = timeSec * 1.6;
    });
  }

  /**
   * Builds a smooth, rounded 3DS/Switch-era Stylized Humanoid Tamer / Warden / NPC (zero boxy primitives!)
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

    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.38, metalness: 0.12 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      roughness: 0.28,
      metalness: 0.28,
      emissive: trimColor,
      emissiveIntensity: 0.22
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.45 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.42 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });

    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);

    // Smooth Rounded Jacket Torso
    const torso = createSmoothCapsule(THREE, 0.27, 0.31, 0.84, coatMat, 18);
    torso.scale.set(1.12, 1.0, 0.82);
    torso.position.y = 0.92;
    bodyGroup.add(torso);

    // Rounded Aether Belt & Buckle
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.33, 0.12, 18), trimMat);
    belt.scale.set(1.12, 1.0, 0.84);
    belt.position.y = 0.68;
    bodyGroup.add(belt);

    // Smooth Flowing Scarf / Warden Mantle
    const cape = new THREE.Mesh(
      new THREE.ConeGeometry(isWarden ? 0.52 : 0.36, isWarden ? 0.96 : 0.64, 16),
      trimMat
    );
    cape.scale.set(1.15, 1.0, 0.32);
    cape.position.set(0, isWarden ? 0.84 : 0.96, -0.25);
    cape.rotation.x = 0.22;
    bodyGroup.add(cape);

    // Smooth Anime/Switch Head + Layered Expressive Eyes + Sculpted Hair Dome & Tufts
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.56;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 20), skinMat);
    head.scale.set(1.02, 1.02, 0.98);
    head.castShadow = true;
    headGroup.add(head);

    const eyeColorMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0x0284c7 : 0x1e293b });
    addExpressiveEyes3D(THREE, headGroup, eyeColorMat, darkMat, 0.125, -0.02, 0.25, 0.068);

    // Sculpted Rounded Hair Cap + Anime Bang Tufts
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 22, 18), hairMat);
    hairCap.scale.set(1.05, 0.88, 1.05);
    hairCap.position.set(0, 0.10, -0.03);
    headGroup.add(hairCap);

    for (let t = -1; t <= 1; t++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 12), hairMat);
      tuft.position.set(t * 0.14, 0.18, 0.24);
      tuft.rotation.x = 0.55;
      tuft.rotation.z = -t * 0.25;
      headGroup.add(tuft);
    }

    if (isPlayer) {
      // Rounded Tamer Cap & Curved Brim
      const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.335, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), coatMat);
      capDome.position.set(0, 0.08, -0.01);
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.05, 18, 1, false, -Math.PI * 0.45, Math.PI * 0.9), trimMat);
      visor.position.set(0, 0.14, 0.14);
      visor.rotation.x = 0.18;
      headGroup.add(capDome, visor);
    } else if (isGrandpa) {
      const beard = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.38, 16),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
      );
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.22, 0.18);
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 22), trimMat);
      hatBrim.position.set(0, 0.26, 0);
      const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.30, 18, 14), coatMat);
      hatTop.scale.set(1, 0.75, 1);
      hatTop.position.set(0, 0.34, 0);
      headGroup.add(beard, hatBrim, hatTop);
    } else if (isWarden) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.44, 16), trimMat);
      crown.position.set(0, 0.46, 0);
      headGroup.add(crown);
    }

    bodyGroup.add(headGroup);

    // Smooth Capsule Arms + Hands & Capsule Legs + Rounded Boots
    const makeArm = (side) => {
      const armGrp = new THREE.Group();
      armGrp.position.set(side * 0.42, 1.16, 0);
      const sleeve = createSmoothCapsule(THREE, 0.105, 0.095, 0.52, coatMat, 14);
      sleeve.position.y = -0.20;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), skinMat);
      hand.position.y = -0.44;
      armGrp.add(sleeve, hand);
      return armGrp;
    };
    const armL = makeArm(1);
    const armR = makeArm(-1);

    const makeLeg = (side) => {
      const legGrp = new THREE.Group();
      legGrp.position.set(side * 0.16, 0.54, 0);
      const pant = createSmoothCapsule(THREE, 0.115, 0.105, 0.48, darkMat, 14);
      pant.position.y = -0.20;
      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), coatMat);
      boot.scale.set(0.95, 0.68, 1.38);
      boot.position.set(0, -0.44, 0.05);
      legGrp.add(pant, boot);
      return legGrp;
    };
    const legL = makeLeg(1);
    const legR = makeLeg(-1);

    bodyGroup.add(armL, armR, legL, legR);

    const footRing = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.58, 28),
      new THREE.MeshBasicMaterial({
        color: isPlayer ? 0x38bdf8 : trimColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.58
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
      footRing,
      coatMat,
      trimMat,
      hairMat
    };

    return group;
  }

  function animateHumanoid3D(mesh, timeSec, speed = 0) {
    if (!mesh || !mesh.userData) return;
    const u = mesh.userData;
    const isMoving = speed > 0.02;
    const walkFreq = isMoving ? 12.5 : 2.4;
    const swing = isMoving ? Math.min(0.72, speed * 0.52) : 0.07;

    u.armL.rotation.x = Math.sin(timeSec * walkFreq) * swing;
    u.armR.rotation.x = -Math.sin(timeSec * walkFreq) * swing;
    u.legL.rotation.x = -Math.sin(timeSec * walkFreq) * swing;
    u.legR.rotation.x = Math.sin(timeSec * walkFreq) * swing;
    u.bodyGroup.position.y = isMoving ? Math.abs(Math.sin(timeSec * walkFreq)) * 0.09 : Math.sin(timeSec * 2.4) * 0.03;
    if (u.headGroup) {
      u.headGroup.rotation.y = isMoving ? 0 : Math.sin(timeSec * 1.4) * 0.10;
    }
    u.cape.rotation.x = 0.22 + (isMoving ? 0.32 + Math.sin(timeSec * walkFreq * 2) * 0.1 : Math.sin(timeSec * 2.8) * 0.05);
    u.footRing.rotation.z = timeSec * 1.4;
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
    overworld.scene.fog = new THREE.FogExp2(0x0f2942, 0.014);

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
    const d = 38;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    overworld.scene.add(dirLight);
    overworld.dirLight = dirLight;

    overworld.zoneGroup = new THREE.Group();
    overworld.npcGroup = new THREE.Group();
    overworld.wildGroup = new THREE.Group();
    overworld.wildMeshes = new Map();
    overworld.scene.add(overworld.zoneGroup);
    overworld.scene.add(overworld.npcGroup);
    overworld.scene.add(overworld.wildGroup);

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
  function getWorldElevation(zoneId, tileX, tileY) {
    if (root.WILDKIN_MAPS && typeof root.WILDKIN_MAPS.getElevationAt === "function") {
      return root.WILDKIN_MAPS.getElevationAt(zoneId || overworld.currentZoneId || "meadow", tileX, tileY);
    }
    return 0;
  }

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

      const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65, metalness: 0.1 });
      const ruinMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.3 });
      const runeGlowMat = new THREE.MeshBasicMaterial({ color: pal.particle || 0x38bdf8 });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ch = mapRows[r][c];
          const wx = c * TILE_SIZE;
          const wz = r * TILE_SIZE;
          const elev = getWorldElevation(zone.id, c, r);

          if (ch === "~") {
            const waterTile = new THREE.Mesh(
              new THREE.BoxGeometry(TILE_SIZE, 0.28, TILE_SIZE),
              waterMat
            );
            waterTile.position.set(wx, -0.22, wz);
            waterTile.userData = { baseX: wx, baseZ: wz, phase: (c + r) * 0.6 };
            overworld.zoneGroup.add(waterTile);
            overworld.waterMeshes.push(waterTile);
            continue;
          }

          if (ch === "B") {
            // Recessed water/lava beneath the bridge + elevated 3D arched bridge deck & rails
            const underWater = new THREE.Mesh(
              new THREE.BoxGeometry(TILE_SIZE, 0.28, TILE_SIZE),
              waterMat
            );
            underWater.position.set(wx, -0.22, wz);
            underWater.userData = { baseX: wx, baseZ: wz, phase: (c + r) * 0.6 };
            overworld.zoneGroup.add(underWater);
            overworld.waterMeshes.push(underWater);

            const bridgeGroup = new THREE.Group();
            bridgeGroup.position.set(wx, elev, wz);
            const deck = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.18, TILE_SIZE * 0.98), bridgeMat);
            deck.position.y = -0.09;
            deck.receiveShadow = true;
            deck.castShadow = true;
            const railL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, TILE_SIZE * 0.96), bridgeMat);
            railL.position.set(-TILE_SIZE * 0.42, 0.18, 0);
            const railR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, TILE_SIZE * 0.96), bridgeMat);
            railR.position.set(TILE_SIZE * 0.42, 0.18, 0);
            bridgeGroup.add(deck, railL, railR);
            overworld.zoneGroup.add(bridgeGroup);
            continue;
          }

          const isPath = ch === "." || ch === "P" || ch === "S" || ch === "H" || ch === "C" || ch === "M" || ch === "W" || ch === "R" || ch === "K" || ch === "N" || ch === "O" || ch === "I" || ch === "F" || ch === "V";
          const tileMat = isPath ? pathMat : (c + r) % 2 === 0 ? groundMatA : groundMatB;
          const blockH = Math.max(0.36, 0.76 + elev);
          const tileGeo = elev > 0.04 ? new THREE.BoxGeometry(TILE_SIZE * 0.98, blockH, TILE_SIZE * 0.98) : groundGeo;
          const tileMesh = new THREE.Mesh(tileGeo, tileMat);
          tileMesh.position.set(wx, elev - (elev > 0.04 ? blockH * 0.5 : 0.18), wz);
          tileMesh.receiveShadow = true;
          overworld.zoneGroup.add(tileMesh);

          if (ch === "T" || ch === "#") {
            const treeGroup = new THREE.Group();
            treeGroup.position.set(wx, elev, wz);

            if (zone.id === "cinderpeak" || zone.id === "sanctum") {
              const spire = new THREE.Mesh(
                new THREE.ConeGeometry(0.76, 2.35 + ((c * 7 + r * 3) % 3) * 0.3, 16),
                trunkMat
              );
              spire.position.y = 1.15;
              spire.castShadow = true;
              const crystal = new THREE.Mesh(
                new THREE.SphereGeometry(0.42, 18, 14),
                (c + r) % 2 === 0 ? crownMatA : crownMatB
              );
              crystal.scale.set(0.85, 1.35, 0.85);
              crystal.position.set(0, 1.95, 0);
              treeGroup.add(spire, crystal);
            } else {
              const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.15, 14), trunkMat);
              trunk.position.y = 0.56;
              trunk.castShadow = true;
              const tier1 = new THREE.Mesh(new THREE.SphereGeometry(0.88, 20, 16), crownMatA);
              tier1.scale.set(1.05, 0.88, 1.05);
              tier1.position.y = 1.42;
              tier1.castShadow = true;
              const tier2 = new THREE.Mesh(new THREE.SphereGeometry(0.64, 18, 14), crownMatB);
              tier2.scale.set(1.0, 0.92, 1.0);
              tier2.position.y = 2.08;
              tier2.castShadow = true;
              treeGroup.add(trunk, tier1, tier2);
            }
            overworld.zoneGroup.add(treeGroup);
          } else if (ch === "G") {
            const cluster = new THREE.Group();
            cluster.position.set(wx, elev, wz);
            for (let b = 0; b < 5; b++) {
              const angle = (b / 5) * Math.PI * 2;
              const dist = b === 0 ? 0 : 0.44;
              const blade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.78, 12), grassMat);
              blade.position.set(Math.cos(angle) * dist, 0.38, Math.sin(angle) * dist);
              blade.rotation.y = angle;
              cluster.add(blade);
            }
            cluster.userData = { wx, wz, elev, phase: c * 0.5 + r * 0.7 };
            overworld.zoneGroup.add(cluster);
            overworld.grassBlades.push(cluster);
          } else if (ch === "R") {
            // 3D Ancient Aether Ruin Obelisk / Watchtower Pillar Landmark
            const ruinGroup = new THREE.Group();
            ruinGroup.position.set(wx, elev, wz);
            const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 0.38, 8), ruinMat);
            plinth.position.y = 0.19;
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 1.85, 8), ruinMat);
            pillar.position.y = 1.1;
            pillar.castShadow = true;
            const runeOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), runeGlowMat);
            runeOrb.position.y = 2.35;
            ruinGroup.add(plinth, pillar, runeOrb);
            overworld.zoneGroup.add(ruinGroup);
          } else if (ch === "W") {
            // 3D Warden Sanctum Dais & Elemental Crest Altar
            const altarGroup = new THREE.Group();
            altarGroup.position.set(wx, elev, wz);
            const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.25, 0.32, 16), ruinMat);
            dais.position.y = 0.16;
            const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 12, 28), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            haloRing.rotation.x = Math.PI / 2;
            haloRing.position.y = 0.34;
            altarGroup.add(dais, haloRing);
            overworld.zoneGroup.add(altarGroup);
          } else if (ch === "S" || ch === "H") {
            // 3D KIN CARE HOSPITAL (Rounded Aether Sanctuary Dome + Glowing Medical Cross + Glass Doors!)
            const hospGroup = new THREE.Group();
            hospGroup.position.set(wx, elev, wz);
            const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 });
            const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.32, metalness: 0.18, emissive: 0xdc2626, emissiveIntensity: 0.18 });
            const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

            const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 1.35, 24), wallMat);
            baseCyl.position.y = 0.68;
            baseCyl.castShadow = true;
            const domeRoof = new THREE.Mesh(new THREE.SphereGeometry(1.22, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), roofMat);
            domeRoof.position.y = 1.32;
            domeRoof.castShadow = true;
            const trimRing = new THREE.Mesh(new THREE.TorusGeometry(1.21, 0.07, 12, 28), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
            trimRing.rotation.x = Math.PI / 2;
            trimRing.position.y = 1.32;

            const door = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.85, 16, 1, false, -0.5, 1.0), glassMat);
            door.position.set(0, 0.44, 0.82);
            const signDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20), roofMat);
            signDisc.rotation.x = Math.PI / 2;
            signDisc.position.set(0, 1.65, 1.05);
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.10), crossMat);
            crossV.position.set(0, 1.65, 1.07);
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.10), crossMat);
            crossH.position.set(0, 1.65, 1.07);

            const crystal = new THREE.Mesh(
              new THREE.SphereGeometry(0.28, 16, 14),
              new THREE.MeshBasicMaterial({ color: 0x4ade80 })
            );
            crystal.position.y = 2.75;
            const halo = new THREE.Mesh(
              new THREE.TorusGeometry(0.52, 0.04, 10, 24),
              new THREE.MeshBasicMaterial({ color: 0xfacc15 })
            );
            halo.position.y = 2.75;

            hospGroup.add(baseCyl, domeRoof, trimRing, door, signDisc, crossV, crossH, crystal, halo);
            overworld.zoneGroup.add(hospGroup);
            overworld.shrineCrystal = { crystal, halo };
          } else if (ch === "C" || ch === "M") {
            // 3D AETHER SHOPPING CENTER (Grand Department Rotunda with Blue/Gold Domed Roof & Awning!)
            const mallGroup = new THREE.Group();
            mallGroup.position.set(wx, elev, wz);
            const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.38, metalness: 0.1 });
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.22, emissive: 0x0369a1, emissiveIntensity: 0.2 });
            const awningMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, emissive: 0xd97706, emissiveIntensity: 0.22 });
            const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

            const mainHall = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.28, 1.42, 24), wallMat);
            mainHall.position.y = 0.71;
            mainHall.castShadow = true;
            const mallRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.32, 0.65, 24), roofMat);
            mallRoof.position.y = 1.72;
            mallRoof.castShadow = true;
            const awning = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.42, 0.22, 24), awningMat);
            awning.position.y = 1.08;
            const shopOrb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), awningMat);
            shopOrb.position.y = 2.32;
            const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.14), winMat);
            shopDoor.position.set(0, 0.42, 1.20);

            mallGroup.add(mainHall, mallRoof, awning, shopOrb, shopDoor);
            overworld.zoneGroup.add(mallGroup);
          } else if (ch === "F") {
            const flowerGroup = new THREE.Group();
            flowerGroup.position.set(wx, elev, wz);
            for (let f = 0; f < 3; f++) {
              const blossom = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 12, 10),
                new THREE.MeshBasicMaterial({ color: f % 2 === 0 ? 0xfacc15 : 0xf472b6 })
              );
              blossom.position.set((f - 1) * 0.42, 0.20, ((f * 2) % 3 - 1) * 0.35);
              flowerGroup.add(blossom);
            }
            overworld.zoneGroup.add(flowerGroup);
          } else if (ch === "P") {
            const portalGroup = new THREE.Group();
            portalGroup.position.set(wx, elev, wz);
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.82, 0.11, 14, 32),
              new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 0.9
              })
            );
            ring.position.y = 1.05;
            const core = new THREE.Mesh(
              new THREE.CircleGeometry(0.74, 28),
              new THREE.MeshBasicMaterial({
                color: 0xa855f7,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.68
              })
            );
            core.position.y = 1.05;
            portalGroup.add(ring, core);
            overworld.zoneGroup.add(portalGroup);
            overworld.portalMeshes.push(portalGroup);
          }
        }
      }

      if (zone.id === "meadow") {
        const cabinGroup = new THREE.Group();
        const cabElev = getWorldElevation("meadow", 11.2, 8.8);
        cabinGroup.position.set(11.2 * TILE_SIZE, cabElev, 8.8 * TILE_SIZE);
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

      const pCount = 130;
      const pGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        positions[i * 3] = Math.random() * cols * TILE_SIZE;
        positions[i * 3 + 1] = 0.6 + Math.random() * 5.2;
        positions[i * 3 + 2] = Math.random() * rows * TILE_SIZE;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
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
      if (role === "shrine" || role === "portal" || role === "hospital" || role === "shopping_center" || npc.id === "rowan") return;
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
      const npcElev = getWorldElevation(zone.id, npc.x, npc.y);
      npcMesh.position.set(npc.x * TILE_SIZE, npcElev, npc.y * TILE_SIZE);
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
  function syncPlayerOutfit(outfitObj) {
    if (!overworld.playerMesh || !overworld.playerMesh.userData || !outfitObj) return;
    const u = overworld.playerMesh.userData;
    const coatHex = hexToInt(outfitObj.coatColor || 0x0284c7, 0x0284c7);
    const trimHex = hexToInt(outfitObj.trimColor || 0xfacc15, 0xfacc15);
    const hairHex = hexToInt(outfitObj.hairColor || 0x0f172a, 0x0f172a);
    if (u.coatMat && u.coatMat.color) u.coatMat.color.setHex(coatHex);
    if (u.trimMat && u.trimMat.color) {
      u.trimMat.color.setHex(trimHex);
      if (u.trimMat.emissive) u.trimMat.emissive.setHex(trimHex);
    }
    if (u.hairMat && u.hairMat.color) u.hairMat.color.setHex(hairHex);
  }

  function syncWildSpawns(wildSpawns = [], getSpeciesFn = null) {
    const THREE = getThree();
    if (!THREE || !overworld.initialized || !overworld.wildGroup) return;
    while (overworld.wildGroup.children.length > 0) {
      overworld.wildGroup.remove(overworld.wildGroup.children[0]);
    }
    overworld.wildMeshes = new Map();
    if (!Array.isArray(wildSpawns)) return;

    wildSpawns.forEach((sp, idx) => {
      if (!sp || sp.caught || sp.defeated) return;
      const species = typeof getSpeciesFn === "function" ? getSpeciesFn(sp.speciesId) : (sp.species || { id: sp.speciesId, name: "Wild Kin", affinity: "Grove" });
      const wrapper = new THREE.Group();
      const kinMesh = buildKin3DMesh(species, Boolean(sp.isRadiant));
      if (kinMesh) {
        kinMesh.scale.setScalar(0.62);
        kinMesh.userData.baseScale = 0.62;
        wrapper.add(kinMesh);
      }
      const ringColor = sp.isRadiant ? 0xfacc15 : 0x4ade80;
      const wildRing = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.62, 24),
        new THREE.MeshBasicMaterial({
          color: ringColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72
        })
      );
      wildRing.rotation.x = Math.PI / 2;
      wildRing.position.y = 0.05;
      wrapper.add(wildRing);

      const wildGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshBasicMaterial({ color: sp.isRadiant ? 0xfacc15 : 0xf43f5e })
      );
      wildGem.position.y = 1.45;
      wrapper.add(wildGem);

      const spElev = getWorldElevation(overworld.currentZoneId, sp.x || 4, sp.y || 4);
      wrapper.position.set((sp.x || 4) * TILE_SIZE, spElev, (sp.y || 4) * TILE_SIZE);
      wrapper.userData = { kinMesh, wildRing, wildGem, spawnId: sp.id || ("w_" + idx), phase: idx * 1.1 };
      overworld.wildGroup.add(wrapper);
      overworld.wildMeshes.set(wrapper.userData.spawnId, wrapper);
    });
  }

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
      const bElev = getWorldElevation(overworld.currentZoneId, tileX, tileY);
      overworld.targetBeacon.position.set(tileX * TILE_SIZE, bElev, tileY * TILE_SIZE);
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
    const playerElev = getWorldElevation(overworld.currentZoneId, playerState.x || 0, playerState.y || 0);
    const speed = playerState.speed || 0;

    if (overworld.groundPlane) {
      overworld.groundPlane.constant = -playerElev;
    }

    if (overworld.playerMesh) {
      overworld.playerMesh.position.set(px, playerElev, pz);
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
      overworld.companionMesh.position.y = getWorldElevation(
        overworld.currentZoneId,
        overworld.companionMesh.position.x / TILE_SIZE,
        overworld.companionMesh.position.z / TILE_SIZE
      );
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

    if (overworld.wildGroup && overworld.wildGroup.children.length > 0) {
      const spawnsList = Array.isArray(playerState.wildSpawns) ? playerState.wildSpawns : [];
      overworld.wildGroup.children.forEach((wrapper, idx) => {
        const u = wrapper.userData || {};
        const match = spawnsList.find((s) => s.id === u.spawnId) || spawnsList[idx];
        if (match) {
          const tx = (match.x || 0) * TILE_SIZE;
          const tz = (match.y || 0) * TILE_SIZE;
          wrapper.position.x += (tx - wrapper.position.x) * 0.18;
          wrapper.position.z += (tz - wrapper.position.z) * 0.18;
          wrapper.position.y = getWorldElevation(
            overworld.currentZoneId,
            wrapper.position.x / TILE_SIZE,
            wrapper.position.z / TILE_SIZE
          );
          if (typeof match.angle === "number") {
            wrapper.rotation.y = match.angle;
          }
        }
        if (u.kinMesh) {
          animateKinMesh(u.kinMesh, timeSec + (u.phase || 0), true, 0);
        }
        if (u.wildGem) {
          u.wildGem.rotation.y = timeSec * 3.2;
          u.wildGem.position.y = 1.42 + Math.sin(timeSec * 4 + (u.phase || 0)) * 0.1;
        }
      });
    }

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
    const desiredCamY = offsetY + playerElev * 0.85;
    const desiredCamZ = pz + offsetZ + lookAheadZ * 0.5;

    overworld.camPos.x += (desiredCamX - overworld.camPos.x) * 0.12;
    overworld.camPos.y += (desiredCamY - overworld.camPos.y) * 0.12;
    overworld.camPos.z += (desiredCamZ - overworld.camPos.z) * 0.12;

    overworld.camLook.x += (px + lookAheadX - overworld.camLook.x) * 0.16;
    overworld.camLook.y = 0.65 + playerElev * 0.85;
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

    let callbackFired = false;
    const safeImpact = () => {
      if (callbackFired) return;
      callbackFired = true;
      if (typeof onImpactCallback === 'function') onImpactCallback();
    };
    setTimeout(safeImpact, 520);

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
      onImpactCallback: safeImpact
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
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.85
    });
    const energyMat = new THREE.MeshStandardMaterial({
      color: prismColorHex,
      emissive: prismColorHex,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.6
    });
    // Mechanical Base Claw Ring & Upper Lock Ring
    const baseJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.14, 12), cageMat);
    baseJaw.position.y = -0.28;
    const topClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.12, 12), cageMat);
    topClamp.position.y = 0.28;
    // 6 Vertical Snare Containment Bars
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.56, 8), energyMat);
      bar.position.set(Math.cos(ang) * 0.42, 0, Math.sin(ang) * 0.42);
      prismGroup.add(bar);
    }
    const stasisCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), energyMat);
    const lockHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.045, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    prismGroup.add(baseJaw, topClamp, stasisCore, lockHalo);
    prismGroup.position.set(PLAYER_BASE_POS.x, PLAYER_BASE_POS.y + 1.4, PLAYER_BASE_POS.z);
    battle3d.vfxGroup.add(prismGroup);

    let prismDone = false;
    const safeComplete = () => {
      if (prismDone) return;
      prismDone = true;
      if (typeof onComplete === 'function') onComplete();
    };
    setTimeout(safeComplete, 1450);

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
      onComplete: safeComplete
    };
  }

  function renderBattleFrame(timeMs) {
    if (!battle3d.initialized || !battle3d.renderer || !battle3d.scene || !battle3d.camera) return;
    const now = timeMs || performance.now();
    const timeSec = now * 0.001;

    let playerLungePhase = 0;
    let enemyLungePhase = 0;

    // Responsive framing for mobile portrait vs desktop landscape so BOTH creatures are always in frame!
    const aspect = battle3d.camera.aspect || 1;
    const portraitPullback = aspect < 0.85 ? 2.4 : aspect < 1.1 ? 1.2 : 0.0;

    // Grounded 3DS/Switch 3/4 Tactical Battle Camera (No jarring side-flip cuts!)
    let targetCamX = -3.65 + Math.sin(timeSec * 0.45) * 0.22;
    let targetCamY = 3.55 + portraitPullback * 0.38 + Math.cos(timeSec * 0.35) * 0.08;
    let targetCamZ = 6.35 + portraitPullback * 1.15 + Math.cos(timeSec * 0.45) * 0.18;
    let targetLookX = 0.15;
    let targetLookY = 0.92;
    let targetLookZ = 0.05;

    if (battle3d.turnPhase === "player_turn") {
      targetCamX = -3.85;
      targetCamY = 3.45 + portraitPullback * 0.35;
      targetCamZ = 6.25 + portraitPullback * 1.1;
      targetLookX = 0.25;
      targetLookY = 0.95;
      targetLookZ = -0.05;
    } else if (battle3d.turnPhase === "enemy_turn") {
      // Subtle shift while keeping player on lower-left and enemy on upper-right (never flips sides!)
      targetCamX = -3.15;
      targetCamY = 3.65 + portraitPullback * 0.35;
      targetCamZ = 6.45 + portraitPullback * 1.1;
      targetLookX = 0.45;
      targetLookY = 0.98;
      targetLookZ = -0.20;
    }

    // Process Active 3D Combat Action (Attack or Snare Trap Capture)
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
          // Wind-up + Smooth Physical Lunge & Elemental Projectile across Arena
          const lungeT = t / 0.46;
          const easeT = lungeT * lungeT * (3 - 2 * lungeT);
          const curX = s.x + (e.x - s.x) * easeT * 0.72;
          const curZ = s.z + (e.z - s.z) * easeT * 0.72;
          const leapY = s.y + Math.sin(lungeT * Math.PI) * 0.95;

          attackerAnchor.position.set(curX, leapY, curZ);
          if (act.isPlayerAttacking) playerLungePhase = lungeT;
          else enemyLungePhase = lungeT;

          if (act.projGroup) {
            act.projGroup.position.set(
              s.x + (e.x - s.x) * lungeT,
              1.02 + Math.sin(lungeT * Math.PI) * 0.65,
              s.z + (e.z - s.z) * lungeT
            );
            act.projGroup.rotation.x += 0.25;
            act.projGroup.rotation.y += 0.32;
          }

          // Gentle, readable camera dolly-in toward the action center (no wild camera teleport!)
          targetCamX = -3.35;
          targetCamY = 3.25 + portraitPullback * 0.3;
          targetCamZ = 5.75 + portraitPullback * 0.95;
          targetLookX = (curX + e.x) * 0.35;
          targetLookY = 1.02;
          targetLookZ = (curZ + e.z) * 0.35;

          battle3d.pointLight.color.setHex(act.affHex);
          battle3d.pointLight.intensity = 4.2;
          if (act.projGroup) battle3d.pointLight.position.copy(act.projGroup.position);
        } else {
          // Impact + Hit-Stop + Defender Recoil (Camera stays steady with crisp impact shake!)
          if (!act.impactTriggered) {
            act.impactTriggered = true;
            if (act.projGroup) {
              battle3d.vfxGroup.remove(act.projGroup);
              act.projGroup = null;
            }
            spawn3DImpactExplosion(e, act.affHex, act.isBigHit);
            battle3d.shakeIntensity = act.isBigHit ? 0.38 : 0.22;
            if (typeof act.onImpactCallback === 'function') {
              act.onImpactCallback();
            }
          }

          const recT = (t - 0.46) / 0.54;
          const easeBack = 1 - Math.pow(1 - recT, 2);
          attackerAnchor.position.set(
            s.x + (e.x - s.x) * 0.72 * (1 - easeBack),
            s.y + Math.sin(recT * Math.PI) * 0.28,
            s.z + (e.z - s.z) * 0.72 * (1 - easeBack)
          );

          const knockback = Math.sin(recT * Math.PI) * (act.isBigHit ? 0.65 : 0.38);
          const dirSign = act.isPlayerAttacking ? 1 : -1;
          defenderAnchor.position.set(
            e.x + dirSign * knockback * 0.55,
            e.y,
            e.z - dirSign * knockback * 0.55
          );

          targetCamX = -3.45;
          targetCamY = 3.35 + portraitPullback * 0.32;
          targetCamZ = 5.95 + portraitPullback * 1.0;
          targetLookX = e.x * 0.35;
          targetLookY = 1.0;
          targetLookZ = e.z * 0.35;

          battle3d.pointLight.intensity = (1 - recT) * 5.0;
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
          const throwT = t / 0.35;
          pGroup.position.set(
            PLAYER_BASE_POS.x + (ENEMY_BASE_POS.x - PLAYER_BASE_POS.x) * throwT,
            1.2 + Math.sin(throwT * Math.PI) * 2.4,
            PLAYER_BASE_POS.z + (ENEMY_BASE_POS.z - PLAYER_BASE_POS.z) * throwT
          );
          pGroup.rotation.x += 0.28;
          pGroup.rotation.y += 0.32;
        } else if (t < 0.85) {
          if (!act.absorbed) {
            act.absorbed = true;
            spawn3DImpactExplosion(ENEMY_BASE_POS, act.prismColorHex, true);
            if (battle3d.enemyMesh) battle3d.enemyMesh.scale.setScalar(0.01);
          }
          const shakeT = (t - 0.35) / 0.5;
          pGroup.position.set(ENEMY_BASE_POS.x, ENEMY_BASE_POS.y + 0.55, ENEMY_BASE_POS.z);
          pGroup.rotation.z = Math.sin(shakeT * Math.PI * 6) * 0.38;
          targetCamX = -2.2;
          targetCamY = 2.85 + portraitPullback * 0.25;
          targetCamZ = 4.85 + portraitPullback * 0.8;
          targetLookX = ENEMY_BASE_POS.x * 0.65;
          targetLookY = 0.85;
          targetLookZ = ENEMY_BASE_POS.z * 0.65;
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

    // Smoothly damp camera position & look target so there is NEVER a sudden cut or jarring pan
    if (!battle3d.camCurrentPos) {
      battle3d.camCurrentPos = { x: targetCamX, y: targetCamY, z: targetCamZ };
      battle3d.camCurrentLook = { x: targetLookX, y: targetLookY, z: targetLookZ };
    } else {
      const lerpFactor = 0.12;
      battle3d.camCurrentPos.x += (targetCamX - battle3d.camCurrentPos.x) * lerpFactor;
      battle3d.camCurrentPos.y += (targetCamY - battle3d.camCurrentPos.y) * lerpFactor;
      battle3d.camCurrentPos.z += (targetCamZ - battle3d.camCurrentPos.z) * lerpFactor;
      battle3d.camCurrentLook.x += (targetLookX - battle3d.camCurrentLook.x) * lerpFactor;
      battle3d.camCurrentLook.y += (targetLookY - battle3d.camCurrentLook.y) * lerpFactor;
      battle3d.camCurrentLook.z += (targetLookZ - battle3d.camCurrentLook.z) * lerpFactor;
    }

    let finalCamX = battle3d.camCurrentPos.x;
    let finalCamY = battle3d.camCurrentPos.y;
    let finalCamZ = battle3d.camCurrentPos.z;

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
        pt.vy -= 14 * 0.016;
        pt.mesh.rotation.x += 0.25;
        pt.mesh.rotation.y += 0.22;
        pt.mesh.material.opacity = pt.life;
      }
    }

    // Subtle Crisp Impact Shake
    if (battle3d.shakeIntensity > 0.005) {
      finalCamX += (Math.random() - 0.5) * battle3d.shakeIntensity;
      finalCamY += (Math.random() - 0.5) * battle3d.shakeIntensity;
      finalCamZ += (Math.random() - 0.5) * battle3d.shakeIntensity;
      battle3d.shakeIntensity *= 0.82;
    } else {
      battle3d.shakeIntensity = 0;
    }

    battle3d.camera.position.set(finalCamX, finalCamY, finalCamZ);
    battle3d.camera.lookAt(battle3d.camCurrentLook.x, battle3d.camCurrentLook.y, battle3d.camCurrentLook.z);
    battle3d.renderer.render(battle3d.scene, battle3d.camera);
  }

  return {
    initOverworld,
    resizeOverworld,
    cycleCameraMode,
    syncZone,
    syncCompanionKin,
    syncWildSpawns,
    syncWildRoamers: syncWildSpawns,
    syncPlayerOutfit,
    syncTamerOutfit: syncPlayerOutfit,
    screenToWorldTile,
    setTargetBeacon,
    renderOverworldFrame,
    initBattleArena,
    resizeBattleArena,
    syncBattleCombatants,
    setBattleTurnPhase,
    playAttack3D,
    playPrismCapture3D,
    playSnareTrapCapture3D: playPrismCapture3D,
    renderBattleFrame,
    buildKin3DMesh
  };
});
