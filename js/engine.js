/* R6 NUEVA SEASON — motor: casa sitios con r6maps, asigna operadores a entradas, calcula rutas */
window.Engine = (() => {
  const COLORS = ['#4a90d9', '#d9a520', '#5f9e50', '#c2553c', '#8a7fb5']; // respaldo si un puesto no tiene operador
  // Color del operador = el de su insignia oficial. Si dos del squad salen casi iguales
  // (mismas unidades comparten insignia) se les gira el tono hasta que se distingan.
  function hex2hsv(h) { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hu = 0;
    if (d) { if (mx === r) hu = ((g - b) / d + 6) % 6; else if (mx === g) hu = (b - r) / d + 2; else hu = (r - g) / d + 4; hu /= 6; }
    return [hu, mx ? d / mx : 0, mx]; }
  function hsv2hex(hu, s, v) { const i = Math.floor(hu * 6), f = hu * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
  const dist = (a, b) => { const A = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  function opColors(ids) { // devuelve un color por puesto, ya desempatado
    const out = []; 
    ids.forEach((id, i) => {
      let c = (window.OPCOLOR && id && window.OPCOLOR[id]) || COLORS[i % COLORS.length];
      let intento = 0;
      while (out.some(o => o && dist(o, c) < 45) && intento < 12) { const [h, s, v] = hex2hsv(c); c = hsv2hex((h + (intento % 2 ? -1 : 1) * (0.055 * Math.ceil((intento + 1) / 2)) + 1) % 1, Math.max(.5, s), Math.min(1, Math.max(.78, v))); intento++; }
      out.push(c);
    });
    return out;
  }
  const FL = { b: 'basement', 1: 'firstFloor', 2: 'secondFloor', 3: 'thirdFloor', 4: 'fourthFloor', r: 'roof' };
  const FLN = { b: 'Sótano', 1: 'Planta 1', 2: 'Planta 2', 3: 'Planta 3', 4: 'Planta 4', r: 'Techo' };
  const KIND = { reforzada: { n: 'Pared reforzada', c: '#5ee7ff', s: 'R' }, blanda: { n: 'Pared blanda', c: '#9ff3ff', s: 'B' }, puerta: { n: 'Puerta', c: '#6aa3ff', s: 'P' }, ventana: { n: 'Ventana', c: '#7dff6a', s: 'V' }, escotilla: { n: 'Escotilla', c: '#cfd8e3', s: 'E' }, rappel: { n: 'Rappel', c: '#7dff6a', s: '↓' }, vertical: { n: 'Vertical', c: '#b48cff', s: '↕' } }; 
  // sinónimos ES → tokens EN/ES que aparecen en los labels de r6maps
  const SYN = { cocina: ['kitchen', 'cocina'], comedor: ['dining', 'comedor'], garaje: ['garage', 'garaje'], escaleras: ['stairs', 'stairway', 'stairwell', 'escalera'], lobby: ['lobby', 'vestibulo'], sotano: ['basement', 'sotano'], oficina: ['office', 'oficina', 'despacho'], recamara: ['bedroom', 'dormitorio', 'habitacion', 'recamara'], bano: ['bathroom', 'bano', 'restroom', 'toilet'], bar: ['bar'], almacen: ['storage', 'stock', 'supply', 'almacen', 'deposito', 'store'], archivo: ['archives', 'archive', 'archivo'], ventanillas: ['tellers', 'ventanilla'], casilleros: ['lockers', 'locker', 'casillero', 'taquilla'], cctv: ['cctv', 'camaras', 'security'], camaras: ['cctv', 'camera', 'camaras'], servidores: ['server', 'servidor'], iglesia: ['church', 'iglesia', 'capilla'], arsenal: ['arsenal', 'armory', 'armeria'], armeria: ['armory', 'armeria', 'arsenal'], gimnasio: ['gym', 'gimnasio'], caja: ['cash', 'caja', 'vault'], biblioteca: ['library', 'biblioteca'], sala: ['living', 'lounge', 'hall', 'sala', 'salon', 'room'], lounge: ['lounge', 'sala'], salon: ['hall', 'lounge', 'salon', 'ballroom'], lavanderia: ['laundry', 'lavanderia'], suministros: ['supply', 'suministro'], dormitorio: ['dorm', 'dormitorio', 'bunk'], dormitorios: ['dorm', 'dormitorio'], torre: ['tower', 'torre'], juntas: ['meeting', 'juntas', 'reunion'], reuniones: ['meeting', 'reunion'], reunion: ['meeting', 'reunion'], taller: ['workshop', 'taller'], ventilacion: ['ventilation', 'ventilacion'], aduana: ['customs', 'aduana', 'inspection'], pasillo: ['hallway', 'corridor', 'pasillo'], tunel: ['tunnel', 'tunel'], impresion: ['printer', 'impresora'], ejecutivo: ['executive', 'ejecutiv'], ejecutiva: ['executive', 'ejecutiv'], ceo: ['ceo'], terraza: ['terrace', 'balcony', 'terraza', 'balcon'], balcon: ['balcony', 'balcon'], bodega: ['wine', 'cellar', 'bodega', 'warehouse'], motos: ['snowmobile', 'moto'], juegos: ['game', 'gaming', 'juego', 'billiard'], trofeos: ['trophy', 'trofeo'], piano: ['piano'], visados: ['visa'], prensa: ['press', 'prensa'], consul: ['consul'], administracion: ['admin'], panaderia: ['bakery', 'panaderia'], lectura: ['reading', 'lectura'], chimenea: ['fireplace', 'chimenea'], mineria: ['mining', 'mineria'], museo: ['museum', 'museo', 'train'], tren: ['train', 'tren'], coctel: ['cocktail', 'coctel'], servicio: ['service', 'servicio'], azul: ['blue', 'azul'], sunrise: ['sunrise'], hookah: ['hookah'], billar: ['billiard', 'pool', 'billar'], atico: ['penthouse', 'atico'], teatro: ['theater', 'theatre', 'teatro'], patio: ['patio', 'courtyard', 'yard'], exterior: ['exterior', 'outside', 'spawn', 'street', 'parking'], techo: ['roof', 'techo', 'tejado'], parrilla: ['bbq', 'parrilla', 'grill'], jardin: ['garden', 'jardin'], restaurante: ['restaurant', 'restaurante'], karaoke: ['karaoke'], te: ['tea', 'te'], exhibicion: ['exhibition', 'exhibicion', 'exhibit'], entrada: ['entrance', 'entry', 'entrada', 'main'], principal: ['main', 'principal'], trono: ['throne', 'trono'], laboratorio: ['lab', 'laboratorio'], iniciacion: ['initiation', 'iniciacion'], literas: ['bunk', 'litera'], guarderia: ['day care', 'daycare', 'guarderia'], cafeteria: ['cafeteria', 'cafe'], bunker: ['bunker'], naturaleza: ['nature', 'naturaleza'], bushranger: ['bushranger'], compresor: ['compressor', 'compresor'], tienda: ['gear', 'store', 'shop', 'tienda'], fiesta: ['party', 'fiesta'], radar: ['radar'], mapas: ['map', 'mapas'], seguridad: ['security', 'seguridad'], kayaks: ['kayak'], guardacostas: ['coast', 'guardacostas'], cargo: ['cargo', 'carga'], warehouse: ['warehouse'], storage: ['storage'], vending: ['vending'], kitchen: ['kitchen'], pantry: ['pantry'], control: ['control'], cc: ['cc', 'command'], command: ['command'], server: ['server'], bunks: ['bunk'], bathroom: ['bathroom'], cervecería: ['brewery'], cerveceria: ['brewery', 'cerveceria'], tractores: ['tractor'], motores: ['engine', 'motor'], casino: ['casino'], cabina: ['cockpit', 'cabina', 'bridge'], hammam: ['hammam'], comandante: ['commander', 'comandante'], aves: ['bird', 'aves'], linternas: ['lantern', 'linterna'], medios: ['media', 'medios'], aula: ['classroom', 'aula'], equipaje: ['luggage', 'equipaje'], personal: ['staff', 'personal'], futbol: ['football', 'soccer', 'futbol'], tia: ['aunt', 'tia'], empaque: ['packaging', 'empaque'], estatuas: ['statuary', 'statue', 'estatua'], aviador: ['aviator', 'aviador'], gaming: ['gaming', 'game'] };
  const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'a', 'en', 'the', 'of', 'arriba', 'abajo', 'grande', 'pequena', 'norte', 'sur', 'este', 'oeste', 'sala', 'room']);
  function tokens(name) { return Store.norm(name.replace(/\(.*?\)/g, '')).split(' ').filter(t => t && !STOP.has(t)); }
  function labelMatches(label, toks) { // score de coincidencia entre un label r6maps y tokens del cuarto
    const en = Store.norm(label.en), es = Store.norm(label.es || ''); let sc = 0;
    for (const t of toks) { const syn = SYN[t] || [t]; for (const s of syn) { if (en.includes(s) || es.includes(s)) { sc += s.length > 3 ? 2 : 1; break; } } }
    return sc;
  }
  function floorIndex(map, fl) { const r = map.r6; if (!r) return null; const f = r.floors.find(x => String(x.fl) === String(fl)); if (f) return f.index; if (fl === 'b') return r.floors[0].index; if (fl === 'r') return r.floors[r.floors.length - 1].index; const d = r.floors.find(x => x.def); return d ? d.index : r.floors[0].index; }
  function floorOf(map, fl) { return map.r6 ? map.r6.floors.find(f => f.index === floorIndex(map, fl)) : null; }
  function findLabel(map, name, fIdx) { // mejor label en ese piso (o exterior)
    if (!map.r6) return null; const toks = tokens(name); if (!toks.length) return null;
    let best = null, bs = 0;
    for (const l of map.r6.rooms) { if (l.f !== fIdx && !(l.out && /exterior|spawn|patio|calle|jardin|garaje/.test(toks.join(' ')))) continue; const s = labelMatches(l, toks); if (s > bs) { bs = s; best = l; } }
    return bs > 0 ? best : null;
  }
  function siteSet(map, site) { // qué set de bombas de r6maps corresponde a este sitio
    if (!map.r6 || !map.r6.bombs.length) return null;
    const fi = floorIndex(map, site.fl); const sets = {}; map.r6.bombs.forEach(b => { (sets[b.set] = sets[b.set] || []).push(b); });
    const cand = Object.entries(sets).filter(([k, bs]) => bs.some(b => b.f === fi));
    if (!cand.length) return null; if (cand.length === 1) return { set: +cand[0][0], bombs: cand[0][1] };
    // varios sets en el mismo piso: elige el más cercano a los labels de los cuartos del sitio
    let best = null, bd = Infinity;
    for (const [k, bs] of cand) { let d = 0, n = 0; for (const rn of site.rooms) { const l = findLabel(map, rn, fi); if (!l) continue; const b = bs.reduce((a, x) => Math.min(a, Math.hypot(x.left - l.left, x.top - l.top)), Infinity); d += b; n++; } if (n && d / n < bd) { bd = d / n; best = { set: +k, bombs: bs }; } }
    return best || { set: +cand[0][0], bombs: cand[0][1] };
  }
  function siteCenter(map, site) { const s = siteSet(map, site); if (!s) return null; const x = s.bombs.reduce((a, b) => a + b.left, 0) / s.bombs.length, y = s.bombs.reduce((a, b) => a + b.top, 0) / s.bombs.length; return { x, y, f: floorIndex(map, site.fl) }; }
  // Ruta de un vector sobre el plano real: lista de puntos {x,y,f,auto}
  function routePoints(map, site, vec, custom) {
    if (custom && custom.length) return custom;
    if (!map.r6) return null;
    const fi = floorIndex(map, site.fl); const pts = []; const set = siteSet(map, site);
    const toLabel = findLabel(map, vec.to, fi);
    let end = null;
    if (set) { end = toLabel ? set.bombs.reduce((a, b) => (Math.hypot(b.left - toLabel.left, b.top - toLabel.top) < Math.hypot(a.left - toLabel.left, a.top - toLabel.top) ? b : a)) : set.bombs[0]; end = { x: end.left, y: end.top, f: fi }; }
    else if (toLabel) end = { x: toLabel.left, y: toLabel.top, f: fi };
    const path = (vec.path || []).slice(0, -1);
    for (const rn of path) {
      const up = /\(arriba\)/i.test(rn), down = /\(abajo\)/i.test(rn); const f = up ? fi + 1 : down ? fi - 1 : fi;
      let l = findLabel(map, rn, f);
      if (!l && /exterior/i.test(rn) && map.r6.spawns.length && end) { const s = map.r6.spawns.reduce((a, b) => (Math.hypot(b.left - end.x, b.top - end.y) < Math.hypot(a.left - end.x, a.top - end.y) ? b : a)); pts.push({ x: s.left, y: s.top, f: -1, spawn: true }); continue; }
      if (l) pts.push({ x: l.left, y: l.top, f: l.out ? -1 : f });
    }
    if (!pts.length && end) { // sin cuartos casados: desde el spawn más cercano o desde arriba (vertical)
      if (vec.kind === 'vertical' || vec.kind === 'escotilla') pts.push({ x: end.x - 40, y: end.y - 40, f: fi + 1, auto: true });
      else if (map.r6.spawns.length) { const s = map.r6.spawns.reduce((a, b) => (Math.hypot(b.left - end.x, b.top - end.y) < Math.hypot(a.left - end.x, a.top - end.y) ? b : a)); pts.push({ x: s.left, y: s.top, f: -1, spawn: true, auto: true }); }
    }
    if (end) pts.push(end);
    return pts.length >= 2 ? pts.map(p => ({ ...p, auto: p.auto || !custom })) : null;
  }
  // ---- Operadores ----
  const atk = () => OPS.filter(o => o.side === 'atk'); const def = () => OPS.filter(o => o.side === 'def');
  const op = id => OPS.find(o => o.id === id);
  const NEED = ['antigadget', 'duro', 'blando', 'intel', 'flanco']; // orden de prioridad para completar un squad
  function vectorFor(site, o, taken) { // vector que mejor usa este operador
    const vs = site.atk.vectors; let best = null, bs = -1;
    for (const v of vs) { let s = 0; o.roles.forEach((r, i) => { if (v.roles.includes(r)) s += 3 - i; }); if (!s) continue; s -= (taken[v.id] || 0) * 1.5; if (s > bs) { bs = s; best = v; } }
    return best || vs[0];
  }
  function recommend(site, chosen) { // rellena los slots vacíos con operadores por rol faltante
    const have = chosen.filter(Boolean).map(op).filter(Boolean); const roles = new Set(have.flatMap(o => o.roles)); const used = new Set(have.map(o => o.id));
    const out = [];
    for (const r of NEED) { if (roles.has(r)) continue; const c = atk().find(o => o.roles[0] === r && !used.has(o.id)) || atk().find(o => o.roles.includes(r) && !used.has(o.id)); if (c) { out.push(c.id); used.add(c.id); roles.add(r); } }
    return out;
  }
  function plan(site, picks) { // picks: [{slot, op}] → [{slot, op, vec, color}]
    const taken = {}; const out = [];
    picks.forEach((p, i) => { const o = op(p.op); if (!o || o.side !== 'atk') { out.push({ ...p, op: undefined, color: COLORS[i] }); return; } const v = p.vec ? site.atk.vectors.find(x => x.id === p.vec) : vectorFor(site, o, taken); if (v) taken[v.id] = (taken[v.id] || 0) + 1; out.push({ ...p, o, v, color: COLORS[i] }); });
    return out;
  }
  function jobFor(site, o) { // texto: qué hace este operador en este sitio
    const v = vectorFor(site, o, {}); const k = KIND[v.kind];
    const base = o.job; let where = v ? `${k.n.toUpperCase()}: ${v.n}` : '';
    if (o.roles[0] === 'flanco') where = `FLANCO: ${site.atk.vectors.filter(x => x.roles.includes('flanco')).map(x => x.n).join(' · ') || v.n}`;
    return { base, where, v };
  }
  function defPlan(site, picks) { // defensa: asigna anclas/roam por operador
    const d = site.def; const out = []; const anchorsFirst = ['smoke', 'mira', 'maestro', 'rook', 'doc', 'castle', 'frost', 'kaid', 'bandit', 'mute', 'echo', 'tachanka', 'thunderbird', 'azami', 'aruni', 'noor', 'skopos', 'sentry', 'goyo', 'wamai', 'jager', 'melusi', 'lesion', 'kapkan', 'ela', 'thorn', 'warden'];
    picks.forEach((p, i) => { const o = op(p.op); if (!o || o.side !== 'def') { out.push({ ...p, op: undefined, color: COLORS[i] }); return; } const roam = ['caveira', 'vigil', 'oryx', 'alibi', 'mozzie', 'pulse', 'valkyrie', 'solis', 'fenrir', 'tubarao', 'jager', 'ela', 'lesion', 'kapkan'].includes(o.id) && !['smoke', 'mira', 'maestro'].includes(o.id); const role = roam ? 'ROAM' : anchorsFirst.indexOf(o.id) >= 0 && anchorsFirst.indexOf(o.id) < 8 ? 'ANCLA' : 'FLEX'; out.push({ ...p, o, role, color: COLORS[i], where: role === 'ANCLA' ? site.rooms[i % 2] : role === 'ROAM' ? (d.keepSoft[0] ? d.keepSoft[0].replace(/\(.*\)/, '').trim() : 'Piso de arriba') : d.rotations[0] || site.rooms[0] }); });
    return out;
  }
  return { COLORS, opColors, KIND, FLN, floorIndex, floorOf, findLabel, siteSet, siteCenter, routePoints, atk, def, op, recommend, plan, jobFor, defPlan, vectorFor };
})();
