// Auditoría mecánica: ¿cada cuarto de cada ruta/zona/posición resuelve a una coordenada real del plano (o del croquis)?
const fs = require('fs'); global.window = {}; global.Store = { norm: s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<br\s*\/?>/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() };
require('../js/data-ops.js'); require('../js/data-maps.js'); require('../js/data-picks.js');
const R6 = JSON.parse(fs.readFileSync(__dirname + '/../js/r6maps.json', 'utf8')); const R6KEY = { clubhouse: 'club' };
const clean = t => String(t || '').replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ').trim();
const OPS = window.OPS; let totalBad = 0; const rows = [];
for (const m of window.MAPS) {
  const r6 = R6[R6KEY[m.id] || m.id] || null; const p = `${__dirname}/../js/strats/${m.id}.json`;
  if (!fs.existsSync(p)) { rows.push(`${m.id.padEnd(14)} SIN ESTRATEGIAS`); continue; }
  let S; try { S = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { rows.push(`${m.id.padEnd(14)} JSON INVÁLIDO`); totalBad++; continue; }
  const resolve = (room, f) => { if (r6) { const fi = f === -1 || f === '-1' ? -1 : +f; if (r6.rooms.some(r => clean(r.en) === room && r.f === fi) || r6.rooms.some(r => clean(r.en) === room) || r6.spawns.some(s => clean(s.en) === room)) return true; return false; } for (const st of m.sites) for (const rooms of Object.values(st.geo || {})) if (rooms.some(x => x.n === room)) return true; return false; };
  let steps = 0, bad = 0, clears = 0, badC = 0, defs = 0, badD = 0, strats = 0, dups = 0; const badList = [];
  for (const s of m.sites) { const st = S.sites[s.id]; if (!st) { badList.push(`falta sitio ${s.id}`); continue; }
    (st.attack || []).forEach(a => { strats++; const ids = new Set(); a.ops.forEach(o => { if (ids.has(o.op)) dups++; ids.add(o.op); if (!resolve(o.spawn, -1)) { bad++; badList.push(`${s.id}/${a.id}/${o.op} spawn "${o.spawn}"`); } (o.path || []).forEach(x => { steps++; if (!resolve(x.room, x.f)) { bad++; badList.push(`${s.id}/${a.id}/${o.op} path "${x.room}"@${x.f}`); } }); (o.clear || []).forEach(c => { clears++; if (!resolve(c.room, c.f)) { badC++; badList.push(`${s.id}/${a.id}/${o.op} clear "${c.room}"@${c.f}`); } }); }); });
    (st.defense || []).forEach(d => { d.ops.forEach(o => { defs++; if (!resolve(o.room, o.f)) { badD++; badList.push(`${s.id}/def:${d.id}/${o.op} "${o.room}"@${o.f}`); } }); });
  }
  const picks = (window.PICKS[m.id] || []).filter(pk => !m.sites.some(s => s.id === pk.site)).length;
  totalBad += bad + badC + badD + dups + picks;
  rows.push(`${m.id.padEnd(14)} ${String(strats).padStart(2)} strats · pasos ${steps} (${bad} sin coord) · zonas ${clears} (${badC}) · def ${defs} (${badD})${dups ? ' · ops duplicados ' + dups : ''}${picks ? ' · picks inválidos ' + picks : ''}` + (badList.length ? '\n    ' + badList.slice(0, 6).join('\n    ') : ''));
}
console.log(rows.join('\n')); console.log('\nTOTAL problemas:', totalBad);
