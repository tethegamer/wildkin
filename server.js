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
  const paymentMethod = String(body.paymentMethod || 'apple_pay').trim();
  const trainerName = String(body.trainerName || 'Tamer').trim().slice(0, 32) || 'Tamer';

  const bundles = Array.isArray(WildkinData.MARKETPLACE_BUNDLES) ? WildkinData.MARKETPLACE_BUNDLES : [];
  const bundle = bundles.find((b) => b.id === bundleId);
  if (!bundle) {
    return res.status(400).json({ ok: false, error: 'Unknown Marketplace bundleId' });
  }

  const orderId = 'WK-' + generateCode(8);
  const now = new Date().toISOString();
  const order = {
    orderId,
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
      vipShrinePass: Boolean(bundle.vipShrinePass)
    },
    createdAt: now
  };

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
