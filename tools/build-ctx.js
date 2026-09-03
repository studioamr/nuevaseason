// Genera tools/ctx/<mapId>.json con TODO lo que un agente necesita para escribir estrategias de un mapa
const fs = require('fs'); global.window = {}; global.Store = { norm: s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<br\s*\/?>/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() };
require('../js/data-ops.js'); require('../js/data-maps.js');
const R6 = JSON.parse(fs.readFileSync(__dirname + '/../js/r6maps.json', 'utf8'));
const R6KEY = { clubhouse: 'club' };
const flKey = n => { n = String((n && n.full) || n || '').toLowerCase(); if (/basement/.test(n)) return 'b'; if (/roof/.test(n)) return 'r'; const m = n.match(/(\d)/); return m ? m[1] : n; };
const clean = s => String(s || '').replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ').trim();
for (const m of window.MAPS) {
  const r6 = R6[R6KEY[m.id] || m.id] || null; const ctx = { id: m.id, name: m.n, pool: m.pool, hasBlueprint: !!r6 };
  if (r6) {
    ctx.floors = r6.floors.map(f => ({ idx: f.index, key: flKey(f.name), name: clean(f.name.full) }));
    ctx.rooms = r6.rooms.map(r => ({ f: r.f, en: clean(r.en), es: clean(r.es) })).filter((r, i, a) => a.findIndex(x => x.en === r.en && x.f === r.f) === i);
    ctx.spawns = r6.spawns.map(s => ({ letter: s.letter, en: clean(s.en), es: clean(s.es) }));
    ctx.bombSets = {}; r6.bombs.forEach(b => { (ctx.bombSets[b.set] = ctx.bombSets[b.set] || []).push({ f: b.f, letter: b.letter, nearest: (() => { let best = null, bd = 1e9; r6.rooms.filter(x => x.f === b.f).forEach(x => { const d = Math.hypot(x.left - b.left, x.top - b.top); if (d < bd) { bd = d; best = clean(x.en); } }); return best; })() }); });
    ctx.hatches = r6.hatches.map(h => { let best = null, bd = 1e9; r6.rooms.filter(x => x.f === h.f).forEach(x => { const d = Math.hypot(x.left - h.left, x.top - h.top); if (d < bd) { bd = d; best = clean(x.en); } }); return { f: h.f, near: best }; });
  } else {
    ctx.floors = m.floors.map(f => ({ idx: f.id, key: f.id, name: f.n }));
    ctx.rooms = [];
    for (const s of m.sites) for (const [fl, rooms] of Object.entries(s.geo || {})) for (const r of rooms) { if (!ctx.rooms.some(x => x.en === r.n && String(x.f) === String(fl))) ctx.rooms.push({ f: fl, en: r.n, es: r.n }); }
    ctx.spawns = [{ letter: 'A', en: 'Exterior', es: 'Exterior' }];
  }
  ctx.sites = m.sites.map(s => ({ id: s.id, name: s.n, fl: s.fl, floorIdx: r6 ? (ctx.floors.find(f => f.key === String(s.fl)) || {}).idx : s.fl, rooms: s.rooms, verify: !!s.verify, vectors: s.atk.vectors.map(v => ({ id: v.id, n: v.n, kind: v.kind, path: v.path, roles: v.roles })), plan: s.atk.plan, def: s.def }));
  ctx.ops = { atk: window.OPS.filter(o => o.side === 'atk').map(o => ({ id: o.id, n: o.n, roles: o.roles, g: o.g })), def: window.OPS.filter(o => o.side === 'def').map(o => ({ id: o.id, n: o.n, g: o.g })) };
  fs.writeFileSync(`${__dirname}/ctx/${m.id}.json`, JSON.stringify(ctx, null, 1));
}
console.log('ctx written for', window.MAPS.length, 'maps');
