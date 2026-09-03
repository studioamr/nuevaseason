// Uso: node tools/validate-strats.js <mapId>   → imprime OK o la lista de errores. Exit 1 si hay errores.
const fs = require('fs'); const id = process.argv[2]; if (!id) { console.error('mapId requerido'); process.exit(2); }
const ctx = JSON.parse(fs.readFileSync(`${__dirname}/ctx/${id}.json`, 'utf8'));
const p = `${__dirname}/../js/strats/${id}.json`; if (!fs.existsSync(p)) { console.log('ERROR: no existe ' + p); process.exit(1); }
let S; try { S = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.log('ERROR: JSON inválido: ' + e.message); process.exit(1); }
const errs = []; const roomKey = (en, f) => `${String(f)}|${en}`; const rooms = new Set(ctx.rooms.map(r => roomKey(r.en, r.f === undefined ? -1 : r.f))); const roomsAnyFloor = new Set(ctx.rooms.map(r => r.en));
const spawns = new Set(ctx.spawns.map(s => s.en)); const atk = new Set(ctx.ops.atk.map(o => o.id)); const def = new Set(ctx.ops.def.map(o => o.id)); const floors = new Set(ctx.floors.map(f => String(f.idx)).concat(['-1']));
if (S.map !== id) errs.push(`map debe ser "${id}"`);
for (const site of ctx.sites) {
  const st = S.sites && S.sites[site.id]; if (!st) { errs.push(`falta sites.${site.id}`); continue; }
  if (!Array.isArray(st.attack) || st.attack.length < 3) errs.push(`${site.id}: attack necesita ≥3 estrategias (default, rush, vertical, split)`);
  (st.attack || []).forEach((s, si) => {
    const w = `${site.id}.attack[${si}:${s.id}]`; if (!s.id || !s.n || !s.summary) errs.push(`${w}: id/n/summary requeridos`);
    if (!Array.isArray(s.timeline) || s.timeline.length < 3) errs.push(`${w}: timeline ≥3 fases`);
    if (!Array.isArray(s.ops) || s.ops.length !== 5) { errs.push(`${w}: ops debe tener exactamente 5`); return; }
    const ids = new Set(); s.ops.forEach((o, oi) => {
      const ww = `${w}.ops[${oi}:${o.op}]`; if (!atk.has(o.op)) errs.push(`${ww}: op inválido`); if (ids.has(o.op)) errs.push(`${ww}: op repetido`); ids.add(o.op);
      if (!spawns.has(o.spawn)) errs.push(`${ww}: spawn "${o.spawn}" no existe (usa: ${[...spawns].join(' | ')})`);
      if (!Array.isArray(o.path) || o.path.length < 2) errs.push(`${ww}: path ≥2 pasos`);
      (o.path || []).forEach((st2, pi) => { if (!floors.has(String(st2.f))) errs.push(`${ww}.path[${pi}]: piso ${st2.f} inválido`); else if (!rooms.has(roomKey(st2.room, st2.f))) errs.push(`${ww}.path[${pi}]: cuarto "${st2.room}" no existe en piso ${st2.f}${roomsAnyFloor.has(st2.room) ? ' (existe en otro piso)' : ''}`); if (!st2.do) errs.push(`${ww}.path[${pi}]: falta "do"`); });
      if (!Array.isArray(o.clear) || o.clear.length < 1) errs.push(`${ww}: clear ≥1 zona`);
      (o.clear || []).forEach((c, ci) => { if (!rooms.has(roomKey(c.room, c.f))) errs.push(`${ww}.clear[${ci}]: cuarto "${c.room}" no existe en piso ${c.f}`); if (!c.threat || !c.how) errs.push(`${ww}.clear[${ci}]: threat/how requeridos`); });
      if (!o.final) errs.push(`${ww}: falta final`);
    });
  });
  if (!Array.isArray(st.defense) || st.defense.length < 2) errs.push(`${site.id}: defense necesita ≥2 setups`);
  (st.defense || []).forEach((d, di) => { const w = `${site.id}.defense[${di}:${d.id}]`; if (!d.id || !d.n || !d.summary) errs.push(`${w}: id/n/summary`); if (!Array.isArray(d.ops) || d.ops.length !== 5) { errs.push(`${w}: ops debe tener 5`); return; } const ids = new Set(); d.ops.forEach((o, oi) => { const ww = `${w}.ops[${oi}:${o.op}]`; if (!def.has(o.op)) errs.push(`${ww}: defensor inválido`); if (ids.has(o.op)) errs.push(`${ww}: repetido`); ids.add(o.op); if (!rooms.has(roomKey(o.room, o.f))) errs.push(`${ww}: cuarto "${o.room}" no existe en piso ${o.f}`); if (!o.role || !o.job) errs.push(`${ww}: role/job requeridos`); }); if (!Array.isArray(d.reinforce) || !d.reinforce.length) errs.push(`${w}: reinforce`); });
}
if (errs.length) { console.log(`ERRORES (${errs.length}):\n` + errs.slice(0, 80).join('\n') + (errs.length > 80 ? `\n… y ${errs.length - 80} más` : '')); process.exit(1); }
console.log(`OK ${id}: ${ctx.sites.length} sitios, ${ctx.sites.reduce((a, s) => a + S.sites[s.id].attack.length, 0)} estrategias de ataque, ${ctx.sites.reduce((a, s) => a + S.sites[s.id].defense.length, 0)} setups de defensa`);
