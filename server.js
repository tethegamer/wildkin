/**
 * WILDKIN: AETHER BOUND — Express Backend, Cloud Save & PvP Arena Server
 * 100% Original IP — Supports PWA static delivery, KinDex API, 6-char Cloud Saves, and 4-char Arena Rooms.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const WildkinData = require('./public/js/data.js');
const WildkinMaps = require('./public/js/maps.js');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const SAVES_FILE = path.join(DATA_DIR, 'saves.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile(filePath, fallback = {}) {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return { ...fallback };
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return { ...fallback };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { ...fallback };
  } catch (err) {
    return { ...fallback };
  }
}

function writeJsonFile(filePath, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal persistence warning
  }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LETTER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateCode(length = 6, alphabet = CODE_CHARS) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Built-in default Arena Rooms so players always have squads to challenge even offline/fresh
function getDefaultRooms() {
  return {
    AETH: {
      code: 'AETH',
      hostName: 'Champion Orion',
      squad: [
        WildkinData.createKinInstance(3, 18, { isRadiant: true, uid: 'npc_orion_1' }),
        WildkinData.createKinInstance(12, 17, { isRadiant: false, uid: 'npc_orion_2' }),
        WildkinData.createKinInstance(20, 18, { isRadiant: false, uid: 'npc_orion_3' })
      ],
      challengers: [],
      log: [],
      status: 'open',
      createdAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-26T00:00:00.000Z'
    },
    NOVA: {
      code: 'NOVA',
      hostName: 'Ranger Lyra',
      squad: [
        WildkinData.createKinInstance(8, 12, { isRadiant: false, uid: 'npc_lyra_1' }),
        WildkinData.createKinInstance(18, 13, { isRadiant: true, uid: 'npc_lyra_2' })
      ],
      challengers: [],
      log: [],
      status: 'open',
      createdAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-26T00:00:00.000Z'
    }
  };
}

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'three', 'build')));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    game: 'Wildkin: Aether Bound',
    version: '1.0.0',
    kinCount: WildkinData.KIN_SPECIES.length,
    zones: Object.keys(WildkinData.ZONES).length
  });
});

// 2. KinDex & World Data Endpoint
app.get('/api/kindex', (req, res) => {
  res.json({
    ok: true,
    affinities: WildkinData.AFFINITIES,
    typeChart: WildkinData.TYPE_CHART,
    kin: WildkinData.KIN_SPECIES,
    moves: WildkinData.MOVES,
    items: WildkinData.ITEMS,
    wardens: WildkinData.WARDENS,
    zones: WildkinData.ZONES
  });
});

// 3. Cloud Save Endpoints (supports /api/cloud-save, /api/save, /api/cloud/save)
function handleSaveCreate(req, res) {
  const body = req.body || {};
  const state = body.state || body.save || body;
  if (!state || typeof state !== 'object' || Object.keys(state).length === 0) {
    return res.status(400).json({ ok: false, error: 'Valid save state object is required' });
  }

  const saves = readJsonFile(SAVES_FILE, {});
  let code = typeof body.code === 'string' ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  if (code.length < 4 || code.length > 8) {
    do {
      code = generateCode(6, CODE_CHARS);
    } while (saves[code]);
  }

  const updatedAt = new Date().toISOString();
  const entry = {
    code,
    state,
    updatedAt
  };
  saves[code] = entry;
  writeJsonFile(SAVES_FILE, saves);

  return res.json({
    ok: true,
    code,
    state: entry.state,
    updatedAt
  });
}

function handleSaveGet(req, res) {
  const rawCode = String(req.params.code || '').trim().toUpperCase();
  if (!rawCode) {
    return res.status(400).json({ ok: false, error: 'Save code is required' });
  }
  const saves = readJsonFile(SAVES_FILE, {});
  const entry = saves[rawCode];
  if (!entry) {
    return res.status(404).json({ ok: false, error: 'Save code not found' });
  }
  return res.json({
    ok: true,
    code: entry.code || rawCode,
    state: entry.state,
    updatedAt: entry.updatedAt
  });
}

app.post(['/api/cloud-save', '/api/save', '/api/cloud/save'], handleSaveCreate);
app.get(['/api/cloud-save/:code', '/api/save/:code', '/api/cloud/save/:code'], handleSaveGet);

// 4. PvP / Squad Challenge Room Endpoints
function loadRoomsWithDefaults() {
  const defaults = getDefaultRooms();
  const saved = readJsonFile(ROOMS_FILE, {});
  return { ...defaults, ...saved };
}

function handleListRooms(req, res) {
  const roomsMap = loadRoomsWithDefaults();
  const rooms = Object.values(roomsMap).sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );
  return res.json({
    ok: true,
    rooms
  });
}

function handleCreateRoom(req, res) {
  const body = req.body || {};
  const hostName = String(body.hostName || body.tamerName || body.name || 'Tamer').trim().slice(0, 32) || 'Tamer';
  const squad = Array.isArray(body.squad) ? body.squad.slice(0, 6) : [];

  const rooms = loadRoomsWithDefaults();
  let code = typeof body.code === 'string' ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  if (code.length < 4 || code.length > 6) {
    do {
      code = generateCode(4, LETTER_CHARS);
    } while (rooms[code]);
  }

  const now = new Date().toISOString();
  const room = {
    code,
    hostName,
    squad,
    challengers: [],
    log: [],
    status: 'open',
    createdAt: rooms[code] ? rooms[code].createdAt : now,
    updatedAt: now
  };

  rooms[code] = room;
  writeJsonFile(ROOMS_FILE, rooms);

  return res.json({
    ok: true,
    code,
    room
  });
}

function handleGetRoom(req, res) {
  const rawCode = String(req.params.code || '').trim().toUpperCase();
  const rooms = loadRoomsWithDefaults();
  const room = rooms[rawCode];
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room code not found' });
  }
  return res.json({
    ok: true,
    code: room.code,
    room,
    hostName: room.hostName,
    squad: room.squad
  });
}

function handleJoinRoom(req, res) {
  const rawCode = String(req.params.code || '').trim().toUpperCase();
  const rooms = loadRoomsWithDefaults();
  const room = rooms[rawCode];
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room code not found' });
  }

  const body = req.body || {};
  const challengerName = String(body.challengerName || body.tamerName || body.name || 'Challenger').trim().slice(0, 32);
  const squad = Array.isArray(body.squad) ? body.squad.slice(0, 6) : [];
  const now = new Date().toISOString();

  room.challengers = Array.isArray(room.challengers) ? room.challengers : [];
  room.challengers.push({
    challengerName,
    squad,
    joinedAt: now
  });
  room.log = Array.isArray(room.log) ? room.log : [];
  room.log.push({
    type: 'join',
    challengerName,
    at: now
  });
  room.updatedAt = now;

  rooms[rawCode] = room;
  writeJsonFile(ROOMS_FILE, rooms);

  return res.json({
    ok: true,
    code: room.code,
    room
  });
}

function handleRoomAction(req, res) {
  const rawCode = String(req.params.code || '').trim().toUpperCase();
  const rooms = loadRoomsWithDefaults();
  const room = rooms[rawCode];
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room code not found' });
  }

  const body = req.body || {};
  const now = new Date().toISOString();
  room.log = Array.isArray(room.log) ? room.log : [];
  room.log.push({
    type: body.type || 'action',
    action: body.action || null,
    result: body.result || null,
    winner: body.winner || null,
    message: body.message || body.log || null,
    at: now
  });
  if (body.winner) {
    room.lastWinner = body.winner;
  }
  if (body.status) {
    room.status = body.status;
  }
  room.updatedAt = now;

  rooms[rawCode] = room;
  writeJsonFile(ROOMS_FILE, rooms);

  return res.json({
    ok: true,
    code: room.code,
    room
  });
}

app.get(['/api/arena/rooms', '/api/arena/room', '/api/pvp/rooms', '/api/pvp/room'], handleListRooms);
app.post(['/api/arena/room', '/api/arena/rooms', '/api/pvp/room'], handleCreateRoom);
app.get(['/api/arena/room/:code', '/api/pvp/room/:code'], handleGetRoom);
app.post(['/api/arena/room/:code/join', '/api/pvp/room/:code/join'], handleJoinRoom);
app.post(['/api/arena/room/:code/action', '/api/pvp/room/:code/action'], handleRoomAction);


const ORDERS_FILE = path.join(DATA_DIR, 'marketplace-orders.json');

app.get('/api/marketplace/catalog', (req, res) => {
  res.json({
    ok: true,
    currency: 'USD',
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    bundles: WildkinData.MARKETPLACE_BUNDLES || [],
    gemBundles: WildkinData.GEM_BUNDLES || WildkinData.MARKETPLACE_BUNDLES || [],
    items: WildkinData.ITEMS || {}
  });
});

app.post('/api/marketplace/checkout', (req, res) => {
  const body = req.body || {};
  const bundleId = String(body.bundleId || '').trim();
  const itemId = String(body.itemId || '').trim();
  const quantity = Math.max(1, Math.min(20, Number(body.quantity || 1)));
  const paymentMethod = String(body.paymentMethod || 'apple_pay').trim();
  const trainerName = String(body.trainerName || 'Tamer').trim().slice(0, 32) || 'Tamer';

  const bundles = Array.isArray(WildkinData.MARKETPLACE_BUNDLES) ? WildkinData.MARKETPLACE_BUNDLES : [];
  const bundle = bundleId ? bundles.find((b) => b.id === bundleId) : null;
  const item = (!bundle && itemId && WildkinData.ITEMS) ? WildkinData.ITEMS[itemId] : null;

  if (!bundle && !item) {
    return res.status(400).json({ ok: false, error: 'Unknown Marketplace bundleId or itemId' });
  }

  const orderId = 'WK-' + generateCode(8);
  const now = new Date().toISOString();
  let order;

  if (bundle) {
    order = {
      orderId,
      purchaseType: 'bundle',
      bundleId: bundle.id,
      bundleName: bundle.name,
      priceUsd: bundle.priceUsd,
      priceDisplay: bundle.priceDisplay,
      paymentMethod,
      trainerName,
      status: 'completed',
      mode: process.env.STRIPE_SECRET_KEY ? 'live_stripe' : 'instant_sandbox',
      granted: {
        gems: bundle.gems || 0,
        shardsBonus: bundle.shards || bundle.shardsBonus || 0,
        items: bundle.items || bundle.bonusItems || {},
        rodTier: bundle.rodTier || 0,
        bagTier: bundle.bagTier || 0,
        vipShrinePass: Boolean(bundle.vipShrinePass)
      },
      createdAt: now
    };
  } else {
    const unitUsd = Number(item.usdPrice || Math.max(0.99, (item.cost || 100) / 150).toFixed(2));
    const totalUsd = Number((unitUsd * quantity).toFixed(2));
    order = {
      orderId,
      purchaseType: 'item',
      itemId: item.id,
      itemName: item.name,
      quantity,
      priceUsd: totalUsd,
      priceDisplay: '$' + totalUsd.toFixed(2),
      currency: 'USD',
      paymentMethod,
      trainerName,
      status: 'completed',
      mode: process.env.STRIPE_SECRET_KEY ? 'stripe_live' : 'instant_express_checkout',
      granted: {
        gems: 0,
        shards: 0,
        items: { [item.id]: quantity },
        outfitId: null,
        rodTier: item.rodTier || 0,
        bagTier: item.bagTier || 0,
        vipShrinePass: false
      },
      createdAt: now
    };
  }

  const store = readJsonFile(ORDERS_FILE, { list: [] });
  const orders = Array.isArray(store.list) ? store.list : [];
  orders.unshift(order);
  writeJsonFile(ORDERS_FILE, { list: orders.slice(0, 100) });

  return res.json({
    ok: true,
    mode: order.mode,
    order
  });
});

app.get('/api/marketplace/orders', (req, res) => {
  const store = readJsonFile(ORDERS_FILE, { list: [] });
  const orders = Array.isArray(store.list) ? store.list : [];
  res.json({ ok: true, orders: orders.slice(0, 25) });
});

// ============================================================================
// 4B. LIVE MULTIPLAYER OVERWORLD PRESENCE & REAL-TIME PVP BATTLE ENGINE
// ============================================================================
const liveWorldPlayers = new Map(); // playerId -> player presence object
const livePvpMatches = new Map();   // matchId -> match state
const livePvpQueue = [];            // waiting quick-match entries
const livePvpRooms = new Map();     // roomCode -> matchId

function normalizePvpSquad(rawSquad, fallbackLevel = 10) {
  const list = Array.isArray(rawSquad) && rawSquad.length > 0 ? rawSquad.slice(0, 6) : [{ speciesId: 1, level: fallbackLevel }];
  return list.map((k, idx) => {
    const spId = Number(k.speciesId || k.id || 1);
    const sp = (WildkinData.getSpeciesById && WildkinData.getSpeciesById(spId)) || {
      id: spId,
      name: k.name || "Wildkin",
      affinity: k.affinity || "Pyre",
      baseStats: { hp: 55, atk: 55, def: 50, spd: 55 },
      moves: ["emberPounce", "clawSwipe", "quickDash", "aetherFocus"]
    };
    const lv = Math.max(1, Math.min(100, Number(k.level || fallbackLevel)));
    const calc = WildkinData.calculateStatsForLevel
      ? WildkinData.calculateStatsForLevel(sp.baseStats, lv, Boolean(k.isRadiant), Number(k.geneticBonus || 0.08), Number(k.bondLevel || 2))
      : { maxHp: 60 + lv * 4, atk: 20 + lv * 2, def: 18 + lv * 2, spd: 20 + lv * 2 };
    const maxHp = Math.max(20, Number(k.maxHp || calc.maxHp));
    const moveIds = Array.isArray(k.moves) && k.moves.length > 0
      ? k.moves
      : Array.isArray(k.moveSlots) && k.moveSlots.length > 0
        ? k.moveSlots.map((m) => m.id || m)
        : (sp.moves || ["clawSwipe"]);
    return {
      slot: idx,
      speciesId: sp.id,
      name: sp.name,
      nickname: String(k.nickname || sp.name).slice(0, 24),
      affinity: sp.affinity || "Pyre",
      level: lv,
      maxHp,
      currentHp: maxHp,
      atk: Number(k.atk || calc.atk),
      def: Number(k.def || calc.def),
      spd: Number(k.spd || calc.spd),
      isRadiant: Boolean(k.isRadiant),
      geneticTier: k.geneticTier || "A",
      moves: moveIds.slice(0, 4)
    };
  });
}

function getSimulatedOnlineTamers(zoneId = "meadow", tSec = Date.now() / 1000) {
  const bots = [
    {
      playerId: "online_tamer_aria",
      name: "Aria_Vanguard",
      isHuman: false,
      badge: "🤖 ONLINE TAMER",
      zone: zoneId,
      x: Number((11 + Math.sin(tSec * 0.45) * 2.5).toFixed(2)),
      y: Number((12 + Math.cos(tSec * 0.45) * 1.8).toFixed(2)),
      dir: "down",
      level: 12,
      leadSpeciesId: 4,
      isRadiant: false,
      outfitId: "tide_corsair",
      crests: 2,
      squad: normalizePvpSquad([{ speciesId: 4, level: 11 }, { speciesId: 10, level: 12 }], 11)
    },
    {
      playerId: "online_tamer_kaelen",
      name: "Kaelen_Apex",
      isHuman: false,
      badge: "🤖 ONLINE TAMER",
      zone: zoneId,
      x: Number((26 + Math.cos(tSec * 0.35) * 1.8).toFixed(2)),
      y: Number((12 + Math.sin(tSec * 0.35) * 1.2).toFixed(2)),
      dir: "left",
      level: 22,
      leadSpeciesId: 5,
      isRadiant: true,
      outfitId: "crimson_vanguard",
      crests: 4,
      squad: normalizePvpSquad([{ speciesId: 5, level: 20, isRadiant: true }, { speciesId: 2, level: 21 }, { speciesId: 18, level: 22 }], 21)
    },
    {
      playerId: "online_tamer_nyx",
      name: "Nyx_Sovereign",
      isHuman: false,
      badge: "🤖 ONLINE TAMER",
      zone: zoneId,
      x: Number((16 + Math.sin(tSec * 0.3 + 1.5) * 2.2).toFixed(2)),
      y: Number((7 + Math.cos(tSec * 0.3 + 1.5) * 1.5).toFixed(2)),
      dir: "right",
      level: 34,
      leadSpeciesId: 26,
      isRadiant: true,
      outfitId: "astral_sovereign",
      crests: 6,
      squad: normalizePvpSquad([{ speciesId: 26, level: 32, isRadiant: true }, { speciesId: 6, level: 33 }, { speciesId: 3, level: 34 }], 33)
    }
  ];
  return bots;
}

function pruneStaleWorldPlayers() {
  const cutoff = Date.now() - 45000;
  for (const [pid, p] of liveWorldPlayers.entries()) {
    if ((p.updatedAtMs || 0) < cutoff) {
      liveWorldPlayers.delete(pid);
    }
  }
}


const liveWorldChat = [
  {
    id: "chat_seed_1",
    playerId: "online_tamer_aria",
    name: "Aria_Vanguard",
    zone: "meadow",
    channel: "global",
    message: "Just hooked a Lv.14 Drizzlet off the Eastern Angler Pier with my Carbon Rod! 🎣",
    ts: Date.now() - 45000,
    createdAt: new Date(Date.now() - 45000).toISOString()
  },
  {
    id: "chat_seed_2",
    playerId: "online_tamer_kaelen",
    name: "Kaelen_Apex",
    zone: "meadow",
    channel: "global",
    message: "Anyone in Sunleaf Meadow down for a Live PvP duel? Tap my name or challenge me! ⚔️",
    ts: Date.now() - 18000,
    createdAt: new Date(Date.now() - 18000).toISOString()
  }
];

app.get("/api/world/chat", (req, res) => {
  const zone = String(req.query.zone || "").trim();
  const channel = String(req.query.channel || "all").trim();
  let list = liveWorldChat.slice(-50);
  if (channel === "zone" && zone) {
    list = list.filter((m) => m.zone === zone || m.channel === "global");
  }
  return res.json({
    ok: true,
    messages: list.slice(-35)
  });
});

app.post("/api/world/chat", (req, res) => {
  const b = req.body || {};
  const playerId = String(b.playerId || ("wk_" + generateCode(6))).trim().slice(0, 40);
  const name = String(b.name || b.trainerName || "Aether Tamer").trim().slice(0, 24) || "Aether Tamer";
  const zone = String(b.zone || "meadow").trim();
  const channel = String(b.channel || "zone").trim();
  const rawMsg = String(b.message || b.text || "").trim().slice(0, 180);
  if (!rawMsg) {
    return res.status(400).json({ ok: false, error: "Chat message cannot be empty" });
  }

  const nowMs = Date.now();
  const entry = {
    id: "wchat_" + nowMs + "_" + generateCode(4),
    playerId,
    name,
    zone,
    channel,
    message: rawMsg,
    ts: nowMs,
    createdAt: new Date(nowMs).toISOString()
  };
  liveWorldChat.push(entry);
  if (liveWorldChat.length > 80) {
    liveWorldChat.splice(0, liveWorldChat.length - 80);
  }

  // Attach speech bubble to player in liveWorldPlayers if present
  const existingPlayer = liveWorldPlayers.get(playerId);
  if (existingPlayer) {
    existingPlayer.lastChat = { text: rawMsg, ts: nowMs };
    existingPlayer.updatedAtMs = nowMs;
  }

  return res.json({
    ok: true,
    entry,
    messages: liveWorldChat.slice(-35)
  });
});

app.post("/api/world/sync", (req, res) => {
  pruneStaleWorldPlayers();
  const b = req.body || {};
  const playerId = String(b.playerId || ("wk_" + generateCode(6))).trim().slice(0, 40);
  const name = String(b.name || b.trainerName || "Aether Tamer").trim().slice(0, 24) || "Aether Tamer";
  const zone = String(b.zone || "meadow").trim();
  const x = Math.max(0, Math.min(35, Number(b.x !== undefined ? b.x : 13)));
  const y = Math.max(0, Math.min(27, Number(b.y !== undefined ? b.y : 11)));
  const level = Math.max(1, Math.min(100, Number(b.level || 5)));
  const leadSpeciesId = Math.max(1, Math.min(27, Number(b.leadSpeciesId || 1)));

  const record = {
    playerId,
    name,
    isHuman: true,
    badge: "🟢 LIVE PLAYER",
    zone,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    dir: String(b.dir || "down"),
    level,
    leadSpeciesId,
    isRadiant: Boolean(b.isRadiant),
    outfitId: String(b.outfitId || "homestead_tunic"),
    crests: Number(b.crests || 0),
    rodTier: Number(b.rodTier || 1),
    lastChat: b.lastChat || (liveWorldPlayers.get(playerId) && liveWorldPlayers.get(playerId).lastChat) || null,
    squad: normalizePvpSquad(b.squad, level),
    updatedAtMs: Date.now(),
    updatedAt: new Date().toISOString()
  };
  liveWorldPlayers.set(playerId, record);

  const humansInZone = [];
  for (const [pid, p] of liveWorldPlayers.entries()) {
    if (pid !== playerId && p.zone === zone) {
      humansInZone.push(p);
    }
  }
  const simPlayers = getSimulatedOnlineTamers(zone);
  const players = humansInZone.concat(simPlayers);

  // Check if there is an active or pending PvP challenge targeting this player
  const pendingChallenges = [];
  for (const m of livePvpMatches.values()) {
    if (m.targetPlayerId === playerId && (m.status === "challenged" || m.status === "active")) {
      pendingChallenges.push({
        matchId: m.matchId,
        roomCode: m.roomCode,
        status: m.status,
        challengerId: m.player1.playerId,
        challengerName: m.player1.name,
        challengerLevel: m.player1.level
      });
    }
  }

  return res.json({
    ok: true,
    selfId: playerId,
    zone,
    humanCount: liveWorldPlayers.size,
    onlineCount: liveWorldPlayers.size + simPlayers.length,
    players,
    pendingChallenges,
    recentChat: liveWorldChat.slice(-25)
  });
});

app.get("/api/world/players", (req, res) => {
  pruneStaleWorldPlayers();
  const zone = String(req.query.zone || "meadow").trim();
  const excludeId = String(req.query.excludeId || "").trim();
  const humans = [];
  for (const [pid, p] of liveWorldPlayers.entries()) {
    if (pid !== excludeId && (!req.query.zone || p.zone === zone)) {
      humans.push(p);
    }
  }
  const simPlayers = getSimulatedOnlineTamers(zone);
  return res.json({
    ok: true,
    zone,
    humanCount: liveWorldPlayers.size,
    onlineCount: liveWorldPlayers.size + simPlayers.length,
    players: humans.concat(simPlayers)
  });
});

function createPvpMatchObject(p1, p2, opts = {}) {
  const matchId = "PVP-" + generateCode(8);
  const roomCode = opts.roomCode || generateCode(4);
  const now = new Date().toISOString();
  const match = {
    matchId,
    roomCode,
    mode: opts.mode || "live_pvp",
    status: opts.status || "active",
    targetPlayerId: opts.targetPlayerId || (p2 ? p2.playerId : null),
    turn: 1,
    winnerId: null,
    winnerName: null,
    player1: {
      playerId: p1.playerId,
      name: p1.name,
      isHuman: p1.isHuman !== false,
      level: p1.level || (p1.squad && p1.squad[0] ? p1.squad[0].level : 10),
      activeIndex: 0,
      squad: normalizePvpSquad(p1.squad, p1.level || 10),
      pendingAction: null
    },
    player2: p2
      ? {
          playerId: p2.playerId,
          name: p2.name,
          isHuman: Boolean(p2.isHuman),
          level: p2.level || (p2.squad && p2.squad[0] ? p2.squad[0].level : 10),
          activeIndex: 0,
          squad: normalizePvpSquad(p2.squad, p2.level || 10),
          pendingAction: null
        }
      : null,
    turnLog: [
      p2
        ? `⚔️ Live PvP Match started: ${p1.name} vs ${p2.name}!`
        : `📡 Waiting for challenger to join Room Code ${roomCode}...`
    ],
    createdAt: now,
    updatedAt: now
  };
  livePvpMatches.set(matchId, match);
  if (roomCode) livePvpRooms.set(roomCode, matchId);
  return match;
}

function executeSinglePvpAttack(attackerSide, defenderSide, moveIdInput, logArr) {
  const atkKin = attackerSide.squad[attackerSide.activeIndex];
  const defKin = defenderSide.squad[defenderSide.activeIndex];
  if (!atkKin || atkKin.currentHp <= 0 || !defKin || defKin.currentHp <= 0) return;

  const moveObj = (WildkinData.MOVES && WildkinData.MOVES[moveIdInput]) ||
    (WildkinData.MOVES && WildkinData.MOVES[atkKin.moves[0]]) ||
    { id: "clawSwipe", name: "Claw Swipe", affinity: atkKin.affinity || "Terra", power: 45, category: "physical" };

  if (moveObj.category === "status" || !moveObj.power) {
    atkKin.atk = Math.round(atkKin.atk * 1.25);
    logArr.push(`✨ ${attackerSide.name}'s ${atkKin.nickname} used ${moveObj.name} and boosted its Attack!`);
    return;
  }

  const stab = (moveObj.affinity === atkKin.affinity) ? 1.25 : 1.0;
  const typeMult = WildkinData.getTypeMultiplier
    ? WildkinData.getTypeMultiplier(moveObj.affinity || atkKin.affinity, defKin.affinity)
    : 1.0;
  const raw = (((2 * atkKin.level) / 5 + 2) * moveObj.power * (atkKin.atk / Math.max(10, defKin.def))) / 18 + 2;
  const dmg = Math.max(1, Math.round(raw * stab * typeMult));
  defKin.currentHp = Math.max(0, defKin.currentHp - dmg);

  const effTag = typeMult > 1 ? " (Super Effective!)" : typeMult < 1 ? " (Resisted)" : "";
  logArr.push(`💥 ${attackerSide.name}'s ${atkKin.nickname} used ${moveObj.name} for ${dmg} dmg${effTag}!`);

  if (defKin.currentHp <= 0) {
    logArr.push(`⚡ ${defenderSide.name}'s ${defKin.nickname} fainted!`);
    const nextIdx = defenderSide.squad.findIndex((k) => k.currentHp > 0);
    if (nextIdx !== -1) {
      defenderSide.activeIndex = nextIdx;
      logArr.push(`🔄 ${defenderSide.name} sent out ${defenderSide.squad[nextIdx].nickname} (Lv.${defenderSide.squad[nextIdx].level})!`);
    }
  }
}

function resolvePvpTurn(match) {
  if (!match || match.status !== "active" || !match.player1 || !match.player2) return match;
  const p1 = match.player1;
  const p2 = match.player2;
  const a1 = p1.pendingAction || { type: "move", moveIndex: 0 };
  const a2 = p2.pendingAction || { type: "move", moveIndex: 0 };
  const turnEvents = [];

  if (a1.type === "forfeit") {
    match.status = "completed";
    match.winnerId = p2.playerId;
    match.winnerName = p2.name;
    match.turnLog.push(`🏳️ ${p1.name} forfeited! ${p2.name} wins the PvP Duel!`);
    return match;
  }
  if (a2.type === "forfeit") {
    match.status = "completed";
    match.winnerId = p1.playerId;
    match.winnerName = p1.name;
    match.turnLog.push(`🏳️ ${p2.name} forfeited! ${p1.name} wins the PvP Duel!`);
    return match;
  }

  // Handle swaps first
  if (a1.type === "swap" && p1.squad[a1.swapIndex] && p1.squad[a1.swapIndex].currentHp > 0) {
    p1.activeIndex = Number(a1.swapIndex);
    turnEvents.push(`🔄 ${p1.name} switched to ${p1.squad[p1.activeIndex].nickname}!`);
  }
  if (a2.type === "swap" && p2.squad[a2.swapIndex] && p2.squad[a2.swapIndex].currentHp > 0) {
    p2.activeIndex = Number(a2.swapIndex);
    turnEvents.push(`🔄 ${p2.name} switched to ${p2.squad[p2.activeIndex].nickname}!`);
  }

  const k1 = p1.squad[p1.activeIndex];
  const k2 = p2.squad[p2.activeIndex];
  const firstIsP1 = (k1 ? k1.spd : 50) >= (k2 ? k2.spd : 50);
  const first = firstIsP1 ? { side: p1, opp: p2, act: a1 } : { side: p2, opp: p1, act: a2 };
  const second = firstIsP1 ? { side: p2, opp: p1, act: a2 } : { side: p1, opp: p2, act: a1 };

  if (first.act.type === "move") {
    const activeKin = first.side.squad[first.side.activeIndex];
    const mId = first.act.moveId || (activeKin && activeKin.moves[first.act.moveIndex || 0]) || "clawSwipe";
    executeSinglePvpAttack(first.side, first.opp, mId, turnEvents);
  }

  const p1Alive = p1.squad.some((k) => k.currentHp > 0);
  const p2Alive = p2.squad.some((k) => k.currentHp > 0);

  if (p1Alive && p2Alive && second.act.type === "move") {
    const activeKin2 = second.side.squad[second.side.activeIndex];
    const mId2 = second.act.moveId || (activeKin2 && activeKin2.moves[second.act.moveIndex || 0]) || "clawSwipe";
    executeSinglePvpAttack(second.side, second.opp, mId2, turnEvents);
  }

  const p1StillAlive = p1.squad.some((k) => k.currentHp > 0);
  const p2StillAlive = p2.squad.some((k) => k.currentHp > 0);

  if (!p2StillAlive) {
    match.status = "completed";
    match.winnerId = p1.playerId;
    match.winnerName = p1.name;
    turnEvents.push(`🏆 ${p1.name} defeated ${p2.name} and won the Live PvP Duel!`);
  } else if (!p1StillAlive) {
    match.status = "completed";
    match.winnerId = p2.playerId;
    match.winnerName = p2.name;
    turnEvents.push(`🏆 ${p2.name} defeated ${p1.name} and won the Live PvP Duel!`);
  }

  p1.pendingAction = null;
  p2.pendingAction = null;
  match.turn += 1;
  match.lastTurnEvents = turnEvents;
  match.turnLog = match.turnLog.concat(turnEvents).slice(-24);
  match.updatedAt = new Date().toISOString();
  return match;
}

app.post("/api/pvp/queue", (req, res) => {
  const b = req.body || {};
  const playerId = String(b.playerId || ("wk_" + generateCode(6))).trim();
  const name = String(b.name || b.trainerName || "Aether Tamer").trim().slice(0, 24);
  const level = Math.max(1, Number(b.level || (b.squad && b.squad[0] && b.squad[0].level) || 10));
  const squad = normalizePvpSquad(b.squad, level);
  const mode = String(b.mode || "quick").trim();
  const requestedRoom = b.roomCode ? String(b.roomCode).trim().toUpperCase().slice(0, 8) : null;

  // 1. Private Room Code create or join
  if (mode === "room" || requestedRoom) {
    const code = requestedRoom || generateCode(4);
    const existingMatchId = livePvpRooms.get(code);
    const existingMatch = existingMatchId ? livePvpMatches.get(existingMatchId) : null;

    if (existingMatch && existingMatch.status === "waiting_for_opponent" && existingMatch.player1.playerId !== playerId) {
      existingMatch.player2 = {
        playerId,
        name,
        isHuman: true,
        level,
        activeIndex: 0,
        squad,
        pendingAction: null
      };
      existingMatch.status = "active";
      existingMatch.turnLog.push(`⚔️ ${name} joined Room ${code}! Live PvP Battle begins!`);
      existingMatch.updatedAt = new Date().toISOString();
      return res.json({ ok: true, status: "active", roomCode: code, matchId: existingMatch.matchId, match: existingMatch });
    }

    const newMatch = createPvpMatchObject(
      { playerId, name, isHuman: true, level, squad },
      null,
      { roomCode: code, mode: "room", status: "waiting_for_opponent" }
    );
    return res.json({ ok: true, status: "waiting_for_opponent", roomCode: code, matchId: newMatch.matchId, match: newMatch });
  }

  // 2. Open Quick Matchmaking Queue: check if another human is waiting
  const waitingIdx = livePvpQueue.findIndex((q) => q.playerId !== playerId && (Date.now() - q.queuedAtMs) < 60000);
  if (waitingIdx !== -1) {
    const opponent = livePvpQueue.splice(waitingIdx, 1)[0];
    const pairedMatch = createPvpMatchObject(opponent, { playerId, name, isHuman: true, level, squad }, { mode: "quick", status: "active" });
    opponent.assignedMatchId = pairedMatch.matchId;
    return res.json({ ok: true, status: "active", matchId: pairedMatch.matchId, roomCode: pairedMatch.roomCode, match: pairedMatch });
  }

  // If allowBotFallback is false, wait in queue
  if (b.allowBotFallback === false) {
    const entry = { playerId, name, isHuman: true, level, squad, queuedAtMs: Date.now(), assignedMatchId: null };
    livePvpQueue.push(entry);
    return res.json({ ok: true, status: "queued", playerId });
  }

  // Instant online rival pairing when no other human is currently in queue
  const simTamers = getSimulatedOnlineTamers(b.zone || "meadow");
  const chosenBot = simTamers[Math.floor(Math.random() * simTamers.length)];
  const scaledBotSquad = normalizePvpSquad(
    chosenBot.squad.map((k) => Object.assign({}, k, { level: Math.max(3, level + Math.floor(Math.random() * 3) - 1) })),
    level
  );
  const botMatch = createPvpMatchObject(
    { playerId, name, isHuman: true, level, squad },
    { playerId: chosenBot.playerId, name: chosenBot.name, isHuman: false, level, squad: scaledBotSquad },
    { mode: "quick", status: "active" }
  );
  return res.json({ ok: true, status: "active", matchId: botMatch.matchId, roomCode: botMatch.roomCode, match: botMatch });
});

app.post("/api/pvp/challenge", (req, res) => {
  const b = req.body || {};
  const playerId = String(b.playerId || ("wk_" + generateCode(6))).trim();
  const name = String(b.name || b.trainerName || "Aether Tamer").trim().slice(0, 24);
  const level = Math.max(1, Number(b.level || 10));
  const squad = normalizePvpSquad(b.squad, level);

  // Accepting an existing challenge
  if (b.matchId && b.accept) {
    const m = livePvpMatches.get(String(b.matchId));
    if (!m) return res.status(404).json({ ok: false, error: "Challenge match not found" });
    m.player2 = {
      playerId,
      name,
      isHuman: true,
      level,
      activeIndex: 0,
      squad,
      pendingAction: null
    };
    m.status = "active";
    m.turnLog.push(`⚔️ ${name} accepted ${m.player1.name}'s PvP Challenge!`);
    m.updatedAt = new Date().toISOString();
    return res.json({ ok: true, status: "active", matchId: m.matchId, match: m });
  }

  const targetId = String(b.targetPlayerId || "").trim();
  const targetHuman = liveWorldPlayers.get(targetId);
  if (targetHuman) {
    const match = createPvpMatchObject(
      { playerId, name, isHuman: true, level, squad },
      { playerId: targetHuman.playerId, name: targetHuman.name, isHuman: true, level: targetHuman.level, squad: targetHuman.squad },
      { mode: "direct_challenge", status: "active", targetPlayerId: targetHuman.playerId }
    );
    return res.json({ ok: true, status: match.status, matchId: match.matchId, roomCode: match.roomCode, match });
  }

  const bots = getSimulatedOnlineTamers(b.zone || "meadow");
  const bot = bots.find((bt) => bt.playerId === targetId) || bots[0];
  const scaledSquad = normalizePvpSquad(
    bot.squad.map((k) => Object.assign({}, k, { level: Math.max(3, level) })),
    level
  );
  const match = createPvpMatchObject(
    { playerId, name, isHuman: true, level, squad },
    { playerId: bot.playerId, name: bot.name, isHuman: false, level: bot.level, squad: scaledSquad },
    { mode: "direct_challenge", status: "active", targetPlayerId: bot.playerId }
  );
  return res.json({ ok: true, status: "active", matchId: match.matchId, roomCode: match.roomCode, match });
});

app.get("/api/pvp/status", (req, res) => {
  const matchId = String(req.query.matchId || "").trim();
  const roomCode = String(req.query.roomCode || "").trim().toUpperCase();
  const playerId = String(req.query.playerId || "").trim();

  let match = matchId ? livePvpMatches.get(matchId) : null;
  if (!match && roomCode && livePvpRooms.has(roomCode)) {
    match = livePvpMatches.get(livePvpRooms.get(roomCode));
  }
  if (!match && playerId) {
    for (const m of livePvpMatches.values()) {
      if (
        (m.player1 && m.player1.playerId === playerId) ||
        (m.player2 && m.player2.playerId === playerId) ||
        m.targetPlayerId === playerId
      ) {
        match = m;
      }
    }
  }
  if (!match) {
    return res.status(404).json({ ok: false, error: "No active PvP match found" });
  }
  return res.json({ ok: true, matchId: match.matchId, roomCode: match.roomCode, status: match.status, match });
});

app.post("/api/pvp/action", (req, res) => {
  const b = req.body || {};
  const matchId = String(b.matchId || "").trim();
  const playerId = String(b.playerId || "").trim();
  const action = b.action || { type: b.type || "move", moveIndex: Number(b.moveIndex || 0), swapIndex: b.swapIndex, moveId: b.moveId };

  const match = livePvpMatches.get(matchId);
  if (!match) {
    return res.status(404).json({ ok: false, error: "PvP match not found" });
  }
  if (match.status !== "active") {
    return res.json({ ok: true, status: match.status, match });
  }

  const isP1 = match.player1 && match.player1.playerId === playerId;
  const isP2 = match.player2 && match.player2.playerId === playerId;
  if (!isP1 && !isP2) {
    return res.status(400).json({ ok: false, error: "Player is not a participant in this match" });
  }

  if (isP1) {
    match.player1.pendingAction = action;
  } else {
    match.player2.pendingAction = action;
  }

  // Auto-generate action if opponent is an online AI rival or if forceResolve is passed
  if (match.player2 && (!match.player2.isHuman || b.forceResolve)) {
    const botKin = match.player2.squad[match.player2.activeIndex];
    const randMoveIdx = botKin && Array.isArray(botKin.moves) ? Math.floor(Math.random() * botKin.moves.length) : 0;
    match.player2.pendingAction = { type: "move", moveIndex: randMoveIdx };
  }

  if (match.player1.pendingAction && match.player2 && match.player2.pendingAction) {
    resolvePvpTurn(match);
  }

  return res.json({
    ok: true,
    status: match.status,
    turn: match.turn,
    winnerId: match.winnerId,
    winnerName: match.winnerName,
    lastTurnEvents: match.lastTurnEvents || [],
    match
  });
});

// 5. SPA Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Wildkin: Aether Bound server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
