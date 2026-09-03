// ¿Algún punto de ruta/zona cae fuera del plano? Replica roomPoint() de app.js y compara contra los límites de las imágenes de piso.
const fs = require('fs'); global.window = {}; global.Store = { norm: s => String(s || '').toLowerCase() };
require('../js/data-maps.js');
const R6 = JSON.parse(fs.readFileSync(__dirname + '/../js/r6maps.json', 'utf8')); const MAN = JSON.parse(fs.readFileSync(__dirname + '/../js/masks-manifest.json', 'utf8')); const R6KEY = { clubhouse: 'club' };
const clean = t => String(t || '').replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ').trim();
let total = 0;
for (const m of window.MAPS) {
  const r6 = R6[R6KEY[m.id] || m.id]; if (!r6) continue; const p = `${__dirname}/../js/strats/${m.id}.json`; if (!fs.existsSync(p)) continue; const S = JSON.parse(fs.readFileSync(p, 'utf8'));
  const man = MAN[m.id] || {}; let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  r6.floors.forEach(f => { const d = man[String(f.index)]; if (!d) return; minX = Math.min(minX, f.left); minY = Math.min(minY, f.top); maxX = Math.max(maxX, f.left + d.imgW); maxY = Math.max(maxY, f.top + d.imgH); });
  const roomPoint = (room, f) => { const fi = f === -1 || f === '-1' ? -1 : +f; let l = r6.rooms.find(r => clean(r.en) === room && r.f === fi) || r6.rooms.find(r => clean(r.en) === room); if (l) return { x: l.left, y: l.top, f: l.out ? -1 : l.f, src: l.f === fi ? 'exact' : 'otherfloor' }; const sp = r6.spawns.find(r => clean(r.en) === room); if (sp) return { x: sp.left, y: sp.top, f: -1, src: 'spawn' }; return null; };
  const out = [];
  for (const s of m.sites) { const st = S.sites[s.id]; if (!st) continue; for (const a of st.attack || []) for (const o of a.ops) { const chk = (room, f, kind) => { const pt = roomPoint(room, f); if (!pt) return; if (pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY) out.push(`${s.id}/${a.id}/${o.op} ${kind} "${room}"@${f} → (${pt.x},${pt.y}) FUERA [${minX}..${maxX} × ${minY}..${maxY}]`); else if (pt.src === 'otherfloor') out.push(`${s.id}/${a.id}/${o.op} ${kind} "${room}"@${f} resuelto en OTRO piso (${pt.f})`); }; chk(o.spawn, -1, 'spawn'); (o.path || []).forEach(x => chk(x.room, x.f, 'path')); (o.clear || []).forEach(c => chk(c.room, c.f, 'clear')); } }
  // labels exteriores muy lejos del edificio (posibles "puntos random")
  const far = r6.rooms.filter(r => r.out && (r.left < minX || r.left > maxX || r.top < minY || r.top > maxY)).map(r => `${clean(r.en)}(${r.left},${r.top})`);
  const sp = r6.spawns.filter(r => (r.left < minX || r.left > maxX || r.top < minY || r.top > maxY)).map(r => `${clean(r.en)}(${r.left},${r.top})`);
  if (out.length || far.length || sp.length) { console.log(`== ${m.id} bounds x[${minX},${maxX}] y[${minY},${maxY}]`); out.slice(0, 12).forEach(x => console.log('  ' + x)); if (out.length > 12) console.log(`  … ${out.length - 12} más`); if (far.length) console.log('  labels exteriores fuera de imagen: ' + far.join(' | ')); if (sp.length) console.log('  spawns fuera de imagen: ' + sp.join(' | ')); total += out.length; }
}
console.log('\nTOTAL puntos problemáticos:', total);
