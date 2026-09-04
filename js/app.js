// los .json siguen la version del <script> para que no queden cacheados tras un deploy
const DV = (() => { const t = [...document.querySelectorAll('script[src*="js/app.js"]')].pop(); const m = (t && t.src || '').match(/[?&]v=(\d+)/); return m ? '?v=' + m[1] : ''; })();
/* R6 NUEVA SEASON — controlador de la app */
(async () => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)]; const E = Store.esc;
  const R6KEY = { clubhouse: 'club' };
  // ---------- carga de planos reales ----------
  let R6 = {}, MAN = {};
  let EXTRA = {};
  try { [R6, MAN, EXTRA] = await Promise.all([
    fetch('js/r6maps.json' + DV).then(r => r.json()),
    fetch('js/floors-manifest.json' + DV).then(r => r.json()),
    fetch('js/r6maps-extra.json' + DV).then(r => r.ok ? r.json() : {}).catch(() => ({}))
  ]); } catch (e) { console.warn('sin r6maps.json', e); }
  Object.assign(R6, EXTRA); // planos oficiales de los mapas que antes eran croquis
  const flKey = n => { n = String((n && n.full) || n || '').toLowerCase(); if (/basement/.test(n)) return 'b'; if (/roof/.test(n)) return 'r'; const m = n.match(/(\d)/); return m ? m[1] : n; };
  MAPS.forEach(m => { const k = R6KEY[m.id] || m.id; m.r6 = R6[k] || null; if (m.r6) m.r6.floors.forEach(f => { f.fl = flKey(f.name); f.n = Engine.FLN[f.fl] || (f.name && f.name.full) || String(f.fl); }); m.floorImgs = (MAN[m.id] || []).map(x => ({ idx: x.idx, src: x.src + DV })); if (m.r6 && !m.floorImgs.length && m.r6.floors) m.floorImgs = m.r6.floors.map(f => ({ idx: f.index, src: `img/maps/${m.id}/${f.index}.jpg${DV}` }));
    if (m.r6 && m.r6.approx) m.approx = true; });
  // planos subidos por el usuario (IndexedDB)
  try { const keys = await Store.idb.keys(); for (const k of keys) { const [mid, fl] = k.split('|'); const m = MAPS.find(x => x.id === mid); if (m) { m.userImgs = m.userImgs || {}; m.userImgs[fl] = await Store.idb.get(k); } } } catch (e) {}

  // ---------- estrategias (js/strats/<map>.json, generadas y validadas contra los cuartos reales) ----------
  const STR = {};
  async function loadStrats(mid) { if (STR[mid] !== undefined) return STR[mid]; STR[mid] = null; try { const r = await fetch(`js/strats/${mid}.json${DV}`); if (r.ok) STR[mid] = await r.json(); } catch (e) {} return STR[mid]; }
  const siteStrats = () => { const st = STR[S.map]; const x = st && st.sites && st.sites[site().id]; return x || null; };
  const curStrat = () => { const st = siteStrats(); if (!st) return null; const list = S.side === 'atk' ? st.attack : st.defense; if (!list || !list.length) return null; if (S.strat === 'custom') return null; return list.find(x => x.id === S.strat) || list[0]; };
  const clean = t => String(t || '').replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ').trim();
  function roomPoint(m, room, f) { // coordenada mundo de un cuarto por nombre exacto (en) y piso
    if (m.r6) { const fi = f === -1 || f === '-1' ? -1 : +f;
      if (fi === -1) { const sp = m.r6.spawns.find(r => clean(r.en) === room); if (sp) return { x: sp.left, y: sp.top, f: -1, spawn: true }; const lo = m.r6.rooms.find(r => clean(r.en) === room && (r.out || r.f === -1)); if (lo) return { x: lo.left, y: lo.top, f: -1 }; }
      let l = m.r6.rooms.find(r => clean(r.en) === room && r.f === fi) || m.r6.rooms.find(r => clean(r.en) === room); if (l) return { x: l.left, y: l.top, f: (l.out || l.f == null) ? -1 : l.f };
      const sp = m.r6.spawns.find(r => clean(r.en) === room); if (sp) return { x: sp.left, y: sp.top, f: -1, spawn: true }; return null; }
    for (const st of m.sites) for (const [fl, rooms] of Object.entries(st.geo || {})) { const r = rooms.find(x => x.n === room); if (r) return { x: r.c * 100 + r.w * 50, y: r.r * 100 + r.h * 50, f: fl }; }
    return null;
  }
  const short = t => { t = clean(t); return t.length > 34 ? t.slice(0, 32) + '…' : t; };
  // Repara el recorrido: conserva solo pasos que ACERCAN al objetivo (o que son cambio de piso),
  // para que la línea no te mande a caminar por todo el mapa.
  function repairPath(m, so, s) {
    const set = Engine.siteSet(m, s); const raw = (so.path || []).map(st => ({ ...st, pt: roomPoint(m, st.room, st.f) })).filter(x => x.pt);
    if (!raw.length) return [];
    let B = null;
    if (set) { const bs = set.bombs; B = { x: bs.reduce((a, b) => a + b.left, 0) / bs.length, y: bs.reduce((a, b) => a + b.top, 0) / bs.length }; }
    else B = raw[raw.length - 1].pt;
    const sp = roomPoint(m, so.spawn, -1); const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const SL = Math.max(18, (sp ? D(sp, B) : 300) * 0.02); const out = []; let cur = sp || raw[0].pt;
    raw.forEach((st, i) => {
      const last = i === raw.length - 1;
      const salto = st.via === 'stairs' || st.via === 'hatch' || st.via === 'rappel' || st.via === 'window' || st.via === 'breach';
      const d0 = D(cur, B), d1 = D(st.pt, B);
      const repetido = out.some(o => o.room === st.room && String(o.f) === String(st.f));
      if (((d1 < d0 + SL) || (salto && d1 < d0 + SL * 2) || last) && !repetido) { out.push(st); cur = st.pt; }
    });
    if (out.length > 4 && sp) { // si aun así pasea, deja entrada + los dos últimos
      let w = 0; const q = [sp].concat(out.map(o => o.pt)); for (let i = 1; i < q.length; i++) w += D(q[i - 1], q[i]);
      if (w > 2.2 * D(sp, B)) { const ent = out.find(o => o.f !== -1 && o.f !== '-1') || out[0]; const tail = out.slice(-2); const nk = [ent].concat(tail.filter(t => t !== ent)); out.length = 0; nk.forEach(k => out.push(k)); }
    }
    return out.length ? out : raw.slice(-2);
  }

  // ---------- identidad ----------
  let me = Store.get('me', null);
  const squadOverride = Store.get('squad', {});
  Object.entries(squadOverride).forEach(([id, o]) => { if (!SQUAD.some(p => p.id === id) && o && o.added) SQUAD.push({ id, nick: '', role: 'Flex', tag: 'SQUAD', stats: null }); });
  SQUAD.forEach(p => Object.assign(p, squadOverride[p.id] || {}));
  const ROSTER = () => SQUAD.filter(p => !p.removed);
  const slotOf = id => SQUAD.find(p => p.id === id);
  const initials = p => (p.nick || p.id || '?').replace(/^o\s+/i, '').slice(0, 2).toUpperCase();

  // ---------- estado ----------
  const _st = Store.get('state', {}); if (_st && !_st.v5 && typeof _st.step === 'number') { _st.step = Math.min(5, _st.step + 1); _st.v5 = 1; Store.set('state', _st); }
  const S = Object.assign({ map: 'clubhouse', site: null, side: 'atk', round: 1, strat: 'default', picks: {}, pins: {}, notes: '', step: 1, siteKnown: true, showAll: false, focus: null, live: null, stratKey: '', match: { rounds: [], active: false }, hint: null, prep: null, vetos: [], vetoMode: false, lobbyOpen: false, ready: {}, labels: true, lang: 'es', edit: false, selected: null, floorIdx: null }, Store.get('state', {}));
  const save = () => Store.set('state', { v5: 1, showAll: S.showAll, map: S.map, site: S.site, side: S.side, round: S.round, strat: S.strat, step: S.step, siteKnown: S.siteKnown, stratKey: S.stratKey, live: S.live, prep: S.prep, vetos: S.vetos, lobbyOpen: S.lobbyOpen, ready: S.ready, match: S.match, hint: S.hint, picks: S.picks, pins: S.pins, notes: S.notes, labels: S.labels, lang: S.lang });
  const map = () => MAPS.find(m => m.id === S.map) || MAPS[0];
  const site = () => map().sites.find(s => s.id === S.site) || map().sites[0];
  const shared = () => ({ map: S.map, site: site().id, side: S.side, round: S.round, strat: S.strat, siteKnown: S.siteKnown, live: S.live, prep: S.prep, vetos: S.vetos, lobbyOpen: S.lobbyOpen, ready: S.ready, match: S.match, hint: S.hint, picks: S.picks, pins: S.pins, notes: S.notes, season: SEASON });
  let SEASON = Store.get('season', null);
  if (!SEASON || !Array.isArray(SEASON.matches)) SEASON = { matches: [] };
  // La temporada arranca EN BLANCO: los partidos viejos del tracker ya no se siembran,
  // y a quien los tenga guardados del deploy anterior se le limpian una sola vez.
  if (Store.get('limpieza', 0) < 1) {
    SEASON.matches = SEASON.matches.filter(m => m.src !== 'tracker');
    Store.set('limpieza', 1); Store.set('season', SEASON);
  }
  const saveSeason = () => { Store.set('season', SEASON); if (Sync.connected && !syncing) Sync.patch({ season: SEASON }); };
  let syncing = false;
  function commit(patch) { Object.assign(S, patch); save(); if (Sync.connected && !syncing) { const p = {}; for (const k of Object.keys(patch)) if (k in shared()) p[k] = S[k]; if (Object.keys(p).length) Sync.patch(p); } render(); }
  Sync.onState = st => { syncing = true; const keep = { ...st }; delete keep.updatedAt; delete keep.by;
    if (keep.season) { SEASON = keep.season; Store.set('season', SEASON); delete keep.season; }
    const jump = (st.map && st.map !== S.map) || (st.site && st.site !== S.site) || (st.side && st.side !== S.side);
    const eraActiva = !!(S.match && S.match.active);
    Object.assign(S, keep); if (st.map !== undefined) S.floorIdx = null;
    // el equipo sigue la fase: lobby abierto → fase 1; arranque de partida → fase 2 (mapa)
    if (st.lobbyOpen === true) S.step = 1;
    else if (st.lobbyOpen === false && st.match && st.match.active && !eraActiva) S.step = 2;
    else if (jump && S.step < 4) S.step = 4; save(); render(); syncing = false; if (st.by && st.by !== (me && me.name)) Store.toast(`${st.by} actualizó el plan`); };
  Sync.onPeers = () => { renderSala(); renderSalaChip(); if (S.step === 1) renderLobby(); };

  // ---------- helpers ----------
  const floorList = m => m.r6 ? m.r6.floors.map(f => ({ idx: f.index, n: f.n, key: f.fl })) : m.floors.map(f => ({ idx: f.id, n: f.n, key: f.id }));
  const siteFloorIdx = (m, s) => m.r6 ? Engine.floorIndex(m, s.fl) : s.fl;
  const slots = () => ROSTER().map(p => { const pk = S.picks[p.id] || {}; const o = Engine.op(pk.op); const okSide = o && o.side === S.side; return { slot: p.id, name: p.nick || p.id, ...(okSide ? pk : {}) }; });
  const myPick = () => me && S.picks[me.slot] || {};
  const pinKey = v => `${S.map}/${site().id}/${v.id}`;
  const kindIcon = k => { const K = Engine.KIND[k] || { c: '#888', s: '?' }; return `<span class="ic" style="background:${K.c}">${K.s}</span>`; };

  // ---------- render raíz ----------
  function ensureStratPicks() { const x = curStrat(); if (!x || S.strat === 'custom') return; const key = `${S.map}/${site().id}/${S.side}/${x.id}`; if (S.stratKey === key) return; const picks = {}; ROSTER().forEach((p, i) => { picks[p.id] = { op: x.ops[i] ? x.ops[i].op : undefined }; }); S.picks = picks; S.stratKey = key; save(); if (Sync.connected && !syncing) Sync.patch({ picks }); }
  let renderSeq = 0;
  function render() { Theme.apply(); const seq = ++renderSeq; const go = () => { if (seq !== renderSeq) return; ensureStratPicks(); renderMe(); renderSalaChip(); renderBar(); renderWiz(); renderCanvas(); renderPlanPane(); renderOpsPane(); renderDefPane(); }; if (STR[S.map] === undefined) loadStrats(S.map).then(go); else go(); }
  function renderMe() { const p = me ? slotOf(me.slot) : null; $('#meChip').innerHTML = me ? `<span class="av ${p && p.me ? 'acc' : ''}">${E(initials({ nick: me.name }))}</span><div><div style="font-size:12px">${E(me.name)}</div><div class="k" style="font-size:9px">${E(p ? p.role : 'invitado')}</div></div>` : `<button class="btn sm" id="whoBtn">¿Quién eres?</button>`; ($('#whoBtn') || $('#meChip')).onclick = () => openIdentity(); }
  function renderSalaChip() { const c = $('#salaCode'); if (Sync.connected) { c.textContent = Sync.code; c.classList.add('live'); $('#salaBtn').textContent = `${Sync.members.length} en línea`; } else { c.textContent = '— sin sala —'; c.classList.remove('live'); $('#salaBtn').textContent = 'Crear / Unirse'; } }
  function renderMapList() {
    if (!$('#mapList')) return; const q = Store.norm(($('#mapSearch') || {}).value || ''); const groups = [['ranked', 'Pool ranked'], ['casual', 'Casual / evento']]; let h = '';
    for (const [g, gn] of groups) { const ms = MAPS.filter(m => m.pool === g && (!q || Store.norm(m.n).includes(q))); if (!ms.length) continue; h += `<div class="grp">${gn}</div>` + ms.map(m => `<button class="mapbtn ${m.id === S.map ? 'on' : ''}" data-map="${m.id}"><span class="n">${E(m.n)}</span><span class="t">${m.r6 ? 'plano' : m.userImgs ? 'tuyo' : 'croquis'}</span></button>`).join(''); }
    $('#mapList').innerHTML = h; $$('#mapList .mapbtn').forEach(b => b.onclick = () => { S.floorIdx = null; S.selected = null; commit({ map: b.dataset.map, site: MAPS.find(m => m.id === b.dataset.map).sites[0].id }); });
  }
  function renderBar() {
    const m = map(), s = site(); $('#mapName').textContent = m.n; FX.text($('#mapName'), true);
    $$('#sideSeg button').forEach(b => { b.classList.toggle('on', b.dataset.side === S.side); b.classList.toggle(b.dataset.side, b.dataset.side === S.side); b.onclick = () => { S.selected = null; commit({ side: b.dataset.side }); } });
    $('#siteBtns').innerHTML = m.sites.map(x => `<button class="${x.id === s.id ? 'on' : ''}" data-site="${x.id}"><span class="fl">${E(Engine.FLN[x.fl] || x.fl)}</span>${E(x.n)}${x.verify ? ' <span title="callouts por confirmar" style="color:var(--mute)">?</span>' : ''}</button>`).join('');
    $$('#siteBtns button').forEach(b => b.onclick = () => { S.floorIdx = null; S.selected = null; commit({ site: b.dataset.site }); });
    const st = siteStrats(); const list = st ? (S.side === 'atk' ? st.attack : st.defense) : []; let sb = $('#stratBar'); if (!sb) { sb = document.createElement('div'); sb.id = 'stratBar'; sb.className = 'strats'; $('#stratBarHost').appendChild(sb); }
    if (list && list.length) { const cur = curStrat(); sb.innerHTML = `<span class="k">Estrategia</span>` + list.map(x => `<button class="${cur && cur.id === x.id ? 'on' : ''}" data-strat="${x.id}"><b>${E(x.tag || x.n)}</b><small>${E(x.n)}</small></button>`).join('') + `<button class="${S.strat === 'custom' ? 'on' : ''}" data-strat="custom"><b>LIBRE</b><small>tú eliges</small></button>`; sb.style.display = ''; sb.querySelectorAll('button').forEach(b => b.onclick = () => applyStrat(b.dataset.strat)); }
    else { sb.innerHTML = ''; sb.style.display = 'none'; }
    $('#rNum').textContent = 'Ronda ' + S.round; $('#rMinus').onclick = () => commit({ round: Math.max(1, S.round - 1) }); $('#rPlus').onclick = () => commit({ round: S.round + 1 });
  }
  function applyStrat(id) { S.selected = null; if (id === 'custom') { commit({ strat: 'custom' }); return; } const st = siteStrats(); const list = S.side === 'atk' ? st.attack : st.defense; const x = list.find(y => y.id === id); if (!x) return; const picks = { ...S.picks }; ROSTER().forEach((p, i) => { picks[p.id] = { op: x.ops[i] ? x.ops[i].op : undefined }; }); commit({ strat: id, picks }); }
  // Separa los monitos que caen casi en el mismo punto: se empujan entre si hasta que
  // ninguno queda encima de otro. Sin esto, en un sitio chico salen todos amontonados.
  function separar(marcas, minD) {
    const P = marcas.map(r => r.pts[0]); if (P.length < 2) return;
    for (let it = 0; it < 60; it++) {
      let movio = false;
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
        if (P[a].f !== P[b].f) continue;
        let dx = P[b].x - P[a].x, dy = P[b].y - P[a].y; let d = Math.hypot(dx, dy);
        if (d >= minD) continue;
        if (d < 0.01) { dx = Math.cos(a * 2.4); dy = Math.sin(a * 2.4); d = 1; }
        const k = (minD - d) / 2 / d;
        P[a].x -= dx * k; P[a].y -= dy * k; P[b].x += dx * k; P[b].y += dy * k; movio = true;
      }
      if (!movio) break;
    }
  }

  // El plano arranca en el piso del sitio: si el bomb es del 2do, no sirve ver la planta baja.
  function pisoDelSitio(m, s) {
    if (!m || !m.r6 || !s) return 0;
    const i = Engine.floorIndex(m, s.fl);
    return (i == null || i < 0) ? 0 : i;
  }

  function stratRoutes() { // rutas de la estrategia activa: spawn → cuartos reales → bomba, con zonas de defensores
    const m = map(), s = site(), x = curStrat(); if (!x) return null; const out = [];
    const set = Engine.siteSet(m, s);
    ROSTER().forEach((p, i) => {
      const pick = S.picks[p.id] || {}; const o = Engine.op(pick.op); if (!o) return;
      const so = x.ops.find(z => z.op === pick.op) || x.ops[i]; if (!so) return;
      if (S.side === 'def') { const pt = roomPoint(m, so.room, so.f); if (!pt) return; out.push({ id: p.id, opId: o.id, ring: TEAM(), mark: true, pts: [{ ...pt }], color: COL(p.id), label: `${o.n} · ${String(so.role || '').toUpperCase()}`, tag: initials({ nick: p.nick || p.id }), job: so.job }); return; }
      const key = `${S.map}/${s.id}/${x.id}/${so.op}`; let pts = S.pins[key];
      const fixed = repairPath(m, so, s); so._fix = fixed;
      if (!pts) { pts = []; const sp = roomPoint(m, so.spawn, -1); if (sp) pts.push({ ...sp, spawn: true }); fixed.forEach(stp => { const pt = stp.pt; if (pt && !(pts.length && Math.abs(pts[pts.length - 1].x - pt.x) < 2 && Math.abs(pts[pts.length - 1].y - pt.y) < 2)) pts.push({ ...pt, via: stp.via, do: stp.do, room: stp.room }); });
        // exterior: spawn → (solo el último punto exterior antes de entrar) → interior. Evita zigzags por labels lejanos.
        const firstIn = pts.findIndex((q, i) => i > 0 && q.f >= 0); if (firstIn > 2) pts = [pts[0], pts[firstIn - 1], ...pts.slice(firstIn)];
        // quitar repeticiones (ida y vuelta al mismo cuarto)
        pts = pts.filter((q, i) => i === 0 || !(Math.abs(q.x - pts[i - 1].x) < 2 && Math.abs(q.y - pts[i - 1].y) < 2));
        for (let i = 0; i < pts.length - 2; i++) { if (Math.abs(pts[i].x - pts[i + 2].x) < 2 && Math.abs(pts[i].y - pts[i + 2].y) < 2) { pts.splice(i + 1, 2); i--; } } // A→B→A: quitar ida y vuelta
        if (set && pts.length) { const last = pts[pts.length - 1]; const b = set.bombs.reduce((a, c) => (Math.hypot(c.left - last.x, c.top - last.y) < Math.hypot(a.left - last.x, a.top - last.y) ? c : a)); if (Math.hypot(b.left - last.x, b.top - last.y) > 6) pts.push({ x: b.left, y: b.top, f: b.f, bomb: true }); } }
      if (pts.length < 2) return;
      const clear = (so.clear || []).map(c => { const pt = roomPoint(m, c.room, c.f); return pt ? { ...pt, short: short(c.threat), threat: c.threat, how: c.how } : null; }).filter(Boolean);
      out.push({ id: p.id, opId: o.id, ring: TEAM(), pts: pts.map(q => ({ ...q })), clear, color: COL(p.id), label: o.n, tag: initials({ nick: p.nick || p.id }), key, so });
    });
    separar(out, S.side === 'def' ? 46 : 42);   // en ataque todos salen del mismo spawn: hay que abrirlos
    return out;
  }

  // ---------- tareas del plan convertidas en marcas sobre el mapa ----------
  const stripParen = t => String(t || '').replace(/\([^)]*\)/g, ' ').replace(/×\s*\d+/g, ' ').replace(/\s+/g, ' ').trim();
  function findRoomPt(m, name, fl) { // resuelve un nombre suelto a coordenada, probando el piso del sitio y los demás
    if (!name) return null;
    const t = stripParen(name);
    let pt = roomPoint(m, t, fl); if (pt) return pt;
    if (m.r6) { const n = Store.norm(t);
      const cand = m.r6.rooms.filter(r => { const en = Store.norm(clean(r.en)), es = Store.norm(clean(r.es || '')); return en === n || es === n || en.includes(n) || n.includes(en); });
      if (cand.length) { const pick = cand.find(r => r.f === fl) || cand[0]; return { x: pick.left, y: pick.top, f: pick.out ? -1 : pick.f }; } }
    return null;
  }
  function nearestHatch(m, pt, fl) { if (!m.r6 || !m.r6.hatches.length) return null; const hs = m.r6.hatches.filter(h => fl == null || h.f === fl); const list = hs.length ? hs : m.r6.hatches;
    let best = null, bd = Infinity; list.forEach(h => { const d = Math.hypot(h.left - pt.x, h.top - pt.y); if (d < bd) { bd = d; best = h; } }); return best && bd < 700 ? { x: best.left, y: best.top, f: best.f } : null; }
  function own(m, x, mark) { // asigna la tarea al operador colocado más cerca
    let best = null, bd = Infinity;
    (x.ops || []).forEach((o, i) => { const p = ROSTER()[i]; if (!p) return; const r = findRoomPt(m, o.room, mark.f); if (!r) return;
      const d = Math.hypot(r.x - mark.x, r.y - mark.y); if (d < bd) { bd = d; best = p; } });
    if (best) { mark.slot = best.id; mark.color = COL(best.id); }
    return mark;
  }
  let _tk = [];
  // El foco de la capa de tareas: en vivo soy yo; si a esa persona no le toca ninguna
  // tarea, se devuelve null para que se vean todas en vez de dejar el mapa apagado.
  function focoUtil(tk) {
    const f = (S.step === 5 && me) ? me : S.focus;
    if (!f) return null;
    return (tk || []).some(t => t.slot === f) ? f : null;
  }

  function taskMarks() {
    const m = map(), s = site(), x = curStrat(); if (!x) return [];
    const fi = m.r6 ? Engine.floorIndex(m, s.fl) : s.fl; const out = [];
    const par = t => { const mm = stripParen(t).match(/^(?:pared|muro)\s+(.+?)\s*[–—\-]\s*(.+)$/i); return mm ? [mm[1], mm[2]] : null; };
    if (S.side === 'def') {
      (x.reinforce || []).forEach(t => {
        const txt = stripParen(t); const dosC = par(t);
        if (dosC) { const a = findRoomPt(m, dosC[0], fi), b = findRoomPt(m, dosC[1], fi);
          if (a && b) { out.push(own(m, x, { kind: 'wall', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, f: a.f >= 0 ? a.f : b.f, label: `REFORZAR ${dosC[0]}–${dosC[1]}`, short: 'REFORZAR', phase: 0 })); return; } }
        const esc = txt.match(/escotilla\s+(?:de\s+)?(.+)/i);
        if (esc) { const r = findRoomPt(m, esc[1], fi); const h = r ? nearestHatch(m, r, null) : null; const p = h || r; if (p) { out.push(own(m, x, { kind: 'hatch', x: p.x, y: p.y, f: p.f, label: `REFORZAR escotilla ${esc[1]}`, short: 'ESCOTILLA', phase: 0 })); return; } }
        const ven = txt.match(/(ventana|puerta)\s+(?:de\s+)?(.+)/i);
        if (ven) { const r = findRoomPt(m, ven[2], fi); if (r) { out.push(own(m, x, { kind: ven[1].toLowerCase() === 'ventana' ? 'window' : 'door', x: r.x, y: r.y, f: r.f, label: `${ven[1].toUpperCase()} ${ven[2]}`, short: ven[1].toUpperCase(), phase: 0 })); return; } }
      });
      (x.rotations || []).forEach(t => { const partes = stripParen(t).split(/\s*(?:↔|→|<->|->|—>)\s*/).filter(Boolean); if (partes.length < 2) return;
        const mm = [null, partes[0], partes[partes.length - 1]];
        const a = findRoomPt(m, mm[1], fi), b = findRoomPt(m, mm[2], fi);
        if (a && b) out.push(own(m, x, { kind: 'rot', x: a.x, y: a.y, x2: b.x, y2: b.y, f: a.f, label: `ROTAR ${mm[1]}↔${mm[2]}`, short: 'ROTAR', phase: 3 })); });
    } else {
      const seen = new Set();
      (x.ops || []).forEach((o, i) => { (o.path || []).forEach(st => {
        if (!['breach', 'hatch', 'rappel', 'window'].includes(st.via)) return;
        const key = st.via + '|' + st.room; if (seen.has(key)) return; seen.add(key);
        const r = findRoomPt(m, st.room, st.f); if (!r) return;
        const K = { breach: ['breach', 'ABRIR', 1], hatch: ['hatch', 'ESCOTILLA', 1], rappel: ['rappel', 'RAPPEL', 1], window: ['window', 'VENTANA', 1] }[st.via];
        const dueno = ROSTER()[i]; out.push({ kind: K[0], x: r.x, y: r.y, f: r.f, label: `${K[1]} ${st.room}`, short: K[1], phase: K[2], slot: dueno && dueno.id, color: dueno ? COL(dueno.id) : null }); }); });
    }
    return repartir(m, x, out);
  }

  // Reparte las tareas para que a cada quien le toque algo: si alguien acumula 2+ y otro
  // se queda sin nada, le pasa la tarea que le quede mas cerca.
  function repartir(m, x, out) {
    if (out.length < 2) return out;
    const gente = ROSTER().map(p => p.id);
    const donde = {};
    (x.ops || []).forEach((o, i) => { const p = ROSTER()[i]; if (!p) return; const r = findRoomPt(m, o.room, null); if (r) donde[p.id] = r; });
    for (let paso = 0; paso < 6; paso++) {
      const cuenta = {}; gente.forEach(g => cuenta[g] = 0);
      out.forEach(t => { if (t.slot != null && cuenta[t.slot] != null) cuenta[t.slot]++; });
      const vacio = gente.find(g => cuenta[g] === 0 && donde[g]);
      if (!vacio) break;
      const rico = gente.filter(g => cuenta[g] >= 2).sort((a, b) => cuenta[b] - cuenta[a])[0];
      if (!rico) break;
      const suyas = out.filter(t => t.slot === rico);
      const r = donde[vacio];
      suyas.sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y));
      suyas[0].slot = vacio; suyas[0].color = COL(vacio);
    }
    return out;
  }
  // ---------- canvas ----------
  let mounted = false, preview = null;
  const CSSVAR = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  // color por puesto = color de la insignia del operador (desempatado si dos coinciden)
  let _colKey = '', _cols = {};
  function slotColors() {
    const ids = ROSTER().map(p => (S.picks[p.id] || {}).op);
    const key = ids.join('|');
    if (key !== _colKey) { const arr = Engine.opColors(ids); _cols = {}; ROSTER().forEach((p, i) => { _cols[p.id] = arr[i]; }); _colKey = key; }
    return _cols;
  }
  const COL = slot => slotColors()[slot] || '#4a90d9';
  const TEAM = () => CSSVAR('--team') || '#39b6f0';
  function routes() {
    const sr = stratRoutes(); if (sr) return sr;
    const m = map(), s = site(); const out = [];
    if (S.side === 'atk') {
      Engine.plan(s, slots()).forEach(p => { if (!p.o || !p.v) return; const key = pinKey(p.v); const pts = Engine.routePoints(m, s, p.v, S.pins[key]); out.push({ id: p.slot, opId: p.o.id, ring: TEAM(), vec: p.v, pts: pts ? pts.map(x => ({ ...x })) : null, color: COL(p.slot), label: `${p.o.n}`, tag: initials({ nick: p.name }), key }); });
    } else {
      const c = Engine.siteCenter(m, s); const set = Engine.siteSet(m, s);
      Engine.defPlan(s, slots()).forEach((p, i) => { if (!p.o) return; let pt = null; if (set) { const b = set.bombs[i % set.bombs.length]; pt = { x: b.left + (i > 1 ? 40 : -40), y: b.top + (i % 2 ? 40 : -40), f: b.f }; if (p.role === 'ROAM') pt = { x: c.x + (i - 2) * 90, y: c.y - 180, f: c.f }; } else { pt = { x: 300 + i * 180, y: 300, f: s.fl }; } out.push({ id: p.slot, opId: p.o.id, ring: TEAM(), mark: true, pts: [pt], color: COL(p.slot), label: `${p.o.n} · ${p.role}`, tag: initials({ nick: p.name }) }); });
    }
    return out;
  }
  function renderCanvas() {
    const m = map(), s = (S.step === 3 && preview) ? (m.sites.find(x => x.id === preview) || site()) : site(); const c = CV; if (!c) return;
    if (!mounted) { c.innerHTML = ''; MapView.mount(c); mounted = true; }
    // floor buttons + tools (re-crear sobre el canvas)
    c.querySelectorAll('.floors,.tools,.legend,.src,.verify,.empty,.phasebar').forEach(x => x.remove());
    const fls = floorList(m); const sIdx = siteFloorIdx(m, s); if (S.step === 3 || S.floorIdx == null || !fls.some(f => String(f.idx) === String(S.floorIdx))) S.floorIdx = sIdx; // al elegir sitio, el plano salta siempre a su planta
    const fb = document.createElement('div'); fb.className = 'floors'; fb.innerHTML = fls.map(f => `<button class="${String(f.idx) === String(S.floorIdx) ? 'on' : ''} ${String(f.idx) === String(sIdx) ? 'site' : ''}" data-f="${f.idx}">${E(f.n)}</button>`).join(''); c.appendChild(fb);
    fb.querySelectorAll('button').forEach(b => b.onclick = () => { S.floorIdx = m.r6 ? +b.dataset.f : b.dataset.f; renderCanvas(); });
    const t = document.createElement('div'); t.className = 'tools'; t.innerHTML = `<button class="btn" data-t="in">＋</button><button class="btn" data-t="out">－</button><button class="btn" data-t="fit">Ajustar</button><button class="btn ${S.labels ? '' : 'ghost'}" data-t="lbl">Nombres</button><button class="btn ${S.lang === 'en' ? '' : 'ghost'}" data-t="lang">EN</button><button class="btn ${S.edit ? 'p' : ''}" data-t="edit">${S.edit ? 'Editando rutas' : 'Editar rutas'}</button>${!m.r6 ? '<button class="btn" data-t="up">Subir plano</button>' : ''}`; c.appendChild(t);
    t.querySelectorAll('button').forEach(b => b.onclick = () => { const k = b.dataset.t; if (k === 'in') MapView.zoom(1.3); else if (k === 'out') MapView.zoom(1 / 1.3); else if (k === 'fit') MapView.fit(); else if (k === 'lbl') { S.labels = !S.labels; save(); renderCanvas(); } else if (k === 'lang') { S.lang = S.lang === 'en' ? 'es' : 'en'; save(); renderCanvas(); } else if (k === 'edit') { S.edit = !S.edit; if (!S.edit) S.selected = null; renderCanvas(); renderPlanPane(); } else if (k === 'up') uploadPlan(); });
    // etapas de la estrategia, sobre el plano, que se van completando
    const xs = curStrat(); const ph = Round.phases();
    if (xs && ph.length) {
      const pb = document.createElement('div'); pb.className = 'phasebar'; pb.id = 'phaseBar';
      pb.innerHTML = ph.map((p, i) => `<div class="ph" data-i="${i}"><b>${i + 1}</b><span>${E(p.label)}</span><i></i></div>`).join('');
      c.appendChild(pb); c.classList.add('has-phases'); paintPhases();
    } else c.classList.remove('has-phases');
    const lg = document.createElement('div'); lg.className = 'legend';
    const leyEquipo = `<span><i class="dot" style="background:var(--team)"></i>tu equipo</span><span><i class="dot" style="background:var(--enemy)"></i>el enemigo</span><span><i class="dot" style="background:var(--team)"></i>bomba A/B</span>`;
    const leyPlano = `<span class="sep">|</span><span class="k2">plano oficial:</span><span><i style="background:#e8c33a"></i>pared rompible</span><span><i style="background:#a83a3a"></i>se dispara a través</span>`;
    lg.innerHTML = leyEquipo + (S.side === 'atk' ? `<span><i style="background:var(--team);height:3px"></i>tu ruta</span>` : '') + leyPlano;
    c.appendChild(lg);
    const src = document.createElement('div'); src.className = 'src'; src.textContent = m.approx ? 'plano oficial del juego · posiciones de cuarto aproximadas (arrástralas en Editar rutas)' : m.r6 ? 'plano: r6maps.com · in-game blueprint' + (['border', 'chalet', 'skyscraper', 'consulate', 'house', 'favela'].includes(m.id) ? ' · versión previa al rework' : '') : m.userImgs ? 'plano subido por ti' : 'croquis esquemático · editable'; c.appendChild(src);
    if (s.verify || m.verify) { const v = document.createElement('div'); v.className = 'verify'; v.innerHTML = `<span class="chip acc">Callouts por confirmar en el juego</span>`; c.appendChild(v); }
    // plano subido por el usuario para este piso (mapas sin r6maps)
    let mm = m; if (!m.r6 && m.userImgs && m.userImgs[String(S.floorIdx)]) { mm = { ...m, r6: { floors: [{ index: 0, top: -600, left: -800, name: 'user', nameEs: 'Plano', def: true }], rooms: [], bombs: [], hatches: [], spawns: [], cameras: [] }, floorImgs: [{ idx: 0, src: m.userImgs[String(S.floorIdx)] }] }; }
    const teamCol = CSSVAR('--team') || '#39b6f0';
    const enemyCol = CSSVAR('--enemy') || '#ff4d9d';
    MapView.show({ map: mm, site: s, side: S.side, teamColor: teamCol, enemyColor: enemyCol, floorIdx: mm === m ? (S.floorIdx != null ? S.floorIdx : pisoDelSitio(m, s)) : 0, zoomSite: S.step === 3, tasks: S.step === 3 ? [] : (_tk = taskMarks()), focusSlot: focoUtil(_tk), taskPhase: S.step === 5 && S.live ? Round.phaseIndex() : (S.side === 'def' ? 0 : 1), routes: S.step === 3 ? [] : routes(), labels: S.labels, lang: S.lang, editable: S.edit, selected: S.selected || S.focus, progress: S.step === 5 && S.side === 'atk' ? Round.progress() : null, onPinChange: (rt, pts) => { if (!rt.key) return; S.pins[rt.key] = pts.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), f: p.f, spawn: !!p.spawn, bomb: !!p.bomb })); commit({ pins: S.pins }); } });
  }
  async function uploadPlan() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = async () => { const m = map(); m.userImgs = m.userImgs || {}; m.userImgs[String(S.floorIdx)] = rd.result; await Store.idb.put(`${m.id}|${S.floorIdx}`, rd.result); Store.toast('Plano guardado para ' + m.n); renderMapList(); renderCanvas(); }; rd.readAsDataURL(f); }; inp.click(); }

  // ---------- panel PLAN ----------
  function renderPlanPane() {
    const m = map(), s = site(); const isAtk = S.side === 'atk'; const pl = isAtk ? Engine.plan(s, slots()) : Engine.defPlan(s, slots()); const ops = isAtk ? Engine.atk() : Engine.def();
    const x = curStrat();
    let h = `<div class="k" style="margin-bottom:8px">${isAtk ? 'Plan de ataque' : 'Plan de defensa'} · <span class="acc">${E(s.n)}</span> · ${E(Engine.FLN[s.fl] || s.fl)}</div>`;
    if (x) {
      h += `<div class="stratcard"><div class="sn"><b>${E(x.tag || x.n)}</b> ${E(x.n)}</div><p>${E(x.summary)}</p>${x.timeline ? `<ol class="tl">${x.timeline.map(t => `<li>${E(t)}</li>`).join('')}</ol>` : ''}${x.reinforce ? `<div class="k" style="margin-top:8px">Reforzar</div><ul class="deflist">${x.reinforce.map(r => `<li>${E(r)}</li>`).join('')}${(x.rotations || []).map(r => `<li class="rot">${E(r)}</li>`).join('')}</ul>` : ''}</div>`;
      const pl2 = isAtk ? Engine.plan(s, slots()) : Engine.defPlan(s, slots());
      h += `<div class="role-h"><span class="k">Ruta de cada operador</span><small>clic = resaltar${S.edit ? ' · arrastra puntos' : ''}</small></div>`;
      ROSTER().forEach((p, i) => { const pick = S.picks[p.id] || {}; const so = x.ops.find(o => o.op === pick.op); const o = so && Engine.op(so.op); if (!o) return; const sel = S.selected === p.id;
        h += `<div class="oproute ${sel ? 'on' : ''}" data-sel="${p.id}" style="--c:${COL(p.id)}"><div class="oh"><span class="dot"></span><b>${E(o.n)}</b><span class="k">${E(so.role || '')}</span><span class="who">${E(p.nick || p.id)}</span></div>`;
        if (isAtk) { h += `<div class="sp">Spawn · <b>${E(so.spawn)}</b></div><ol class="steps">${(so.path || []).map(stp => `<li><b>${E(stp.room)}</b>${stp.via && stp.via !== 'door' ? ` <i>${E(stp.via)}</i>` : ''}<span>${E(stp.do)}</span></li>`).join('')}</ol>`; if (so.clear && so.clear.length) h += `<div class="k" style="color:var(--red);margin:6px 0 2px">Zonas de defensores · limpiar en orden</div><ol class="cz">${so.clear.map(c => `<li><b>${E(c.room)}</b> · ${E(c.threat)}<span>${E(c.how)}</span></li>`).join('')}</ol>`; h += `<div class="fin">▶ ${E(so.final)}</div>`; }
        else h += `<div class="sp"><b>${E(so.room)}</b> · ${E(so.role)}</div><div class="fin">${E(so.job)}</div>`;
        h += `</div>`; });
    }
    if (!x && isAtk) h += s.atk.plan.map((p, i) => `<div class="step"><b>0${i + 1}</b><div>${E(p)}</div></div>`).join('');
    else if (!x) h += `<div class="step"><b>01</b><div><b>Reforzar:</b> ${E(s.def.reinforce.join(' · '))}</div></div><div class="step"><b>02</b><div><b>Roles:</b> ${E(s.def.anchors)}</div></div><div class="step"><b>03</b><div><b>Rotaciones:</b> ${E(s.def.rotations.join(' · '))}${s.def.keepSoft.length ? ` · <b>Dejar blando:</b> ${E(s.def.keepSoft.join(' · '))}` : ''}</div></div>`;
    // squad picks
    h += `<div class="role-h"><span class="k">Squad · ronda ${S.round}</span><button class="btn sm" id="autoBtn">Auto-completar</button></div><div class="squad5">`;
    pl.forEach((p, i) => { const mine = me && me.slot === p.slot; h += `<div class="slot ${mine ? 'me' : ''}"><span class="col" style="background:${p.color}"></span><div class="who">${E(p.name)}${mine ? ' <span class="chip acc" style="height:16px;font-size:8px;padding:0 5px">tú</span>' : ''}<small>${E(p.o ? (isAtk ? (p.v ? p.v.n : '') : `${p.role} · ${p.where}`) : 'sin operador')}</small></div><div style="display:grid;gap:4px;justify-items:end"><select class="in" data-slot="${p.slot}" data-k="op"><option value="">— operador —</option>${ops.map(o => `<option value="${o.id}" ${p.op === o.id ? 'selected' : ''}>${E(o.n)}</option>`).join('')}</select>${isAtk && p.o ? `<select class="in" data-slot="${p.slot}" data-k="vec" style="width:132px;height:24px;font-size:10px"><option value="">auto: entrada</option>${s.atk.vectors.map(v => `<option value="${v.id}" ${p.vec === v.id ? 'selected' : ''}>${E(v.n)}</option>`).join('')}</select>` : ''}</div></div>`; });
    h += `</div>`;
    // entradas (atk)
    if (isAtk && !x) { h += `<div class="role-h"><span class="k">Entradas al sitio</span><small>${S.edit ? 'clic en una para editar su ruta · arrastra puntos · doble clic añade' : ''}</small></div>`; s.atk.vectors.forEach(v => { const who = pl.filter(p => p.v && p.v.id === v.id); const sel = S.selected && who.some(p => p.slot === S.selected); h += `<div class="vec" data-vec="${v.id}" style="${sel ? 'background:var(--acc-dim);margin:0 -14px;padding:10px 14px' : ''}${S.edit && who.length ? ';cursor:pointer' : ''}">${kindIcon(v.kind)}<div><div class="n">${E(v.n)}${v.verify ? ' <span class="chip" style="height:16px;font-size:8px;padding:0 5px">confirmar</span>' : ''}</div><div class="p">${(v.path || []).map(x => `<b>${E(x)}</b>`).join(' → ')}</div>${v.note ? `<div class="note">${E(v.note)}</div>` : ''}</div><div class="who"><span class="risk ${v.risk}">${v.risk}</span>${who.map(p => `<span class="chip" style="border-color:${p.color};color:${p.color}">${E(p.o.n)}</span>`).join('')}${S.pins[pinKey(v)] ? `<button class="btn sm ghost" data-reset="${v.id}">reset ruta</button>` : ''}</div></div>`; }); }
    h += `<div class="role-h"><span class="k">Notas de la ronda</span></div><textarea class="in" id="notes" rows="3" placeholder="Ej. Bandit en pared de Iglesia, Cav rota por Rojas…">${E(S.notes)}</textarea>`;
    $('#p-plan').innerHTML = h;
    $('#autoBtn').onclick = () => { const side = isAtk ? 'atk' : 'def'; const ok = id => { const o = Engine.op(id); return !!o && o.side === side; }; const picks = { ...S.picks }; ROSTER().forEach(p => { if (picks[p.id] && !ok(picks[p.id].op)) picks[p.id] = {}; }); const cur = ROSTER().map(p => picks[p.id] && picks[p.id].op); if (isAtk) { const rec = Engine.recommend(s, cur); let j = 0; ROSTER().forEach(p => { if (!(picks[p.id] && picks[p.id].op) && rec[j]) picks[p.id] = { op: rec[j++] }; }); } else { const used = new Set(cur.filter(Boolean)); const pool = s.def.ops.filter(id => !used.has(id)); let k = 0; ROSTER().forEach(p => { if (!(picks[p.id] && picks[p.id].op) && pool[k]) picks[p.id] = { op: pool[k++] }; }); } commit({ picks, strat: 'custom' }); };
    $$('#p-plan select').forEach(sel => sel.onchange = () => { const picks = { ...S.picks }; picks[sel.dataset.slot] = { ...(picks[sel.dataset.slot] || {}), [sel.dataset.k]: sel.value || undefined }; if (sel.dataset.k === 'op') delete picks[sel.dataset.slot].vec; commit({ picks }); });
    $$('#p-plan .vec').forEach(v => v.onclick = e => { if (e.target.dataset.reset) { delete S.pins[pinKey({ id: e.target.dataset.reset })]; commit({ pins: S.pins }); return; } if (!S.edit) return; const who = pl.find(p => p.v && p.v.id === v.dataset.vec); if (!who) { Store.toast('Asigna un operador a esta entrada primero'); return; } S.selected = who.slot; renderCanvas(); renderPlanPane(); });
    $$('#p-plan .oproute').forEach(d => d.onclick = () => { S.selected = S.selected === d.dataset.sel ? null : d.dataset.sel; renderCanvas(); renderPlanPane(); });
    let nt; $('#notes').oninput = e => { clearTimeout(nt); nt = setTimeout(() => commit({ notes: e.target.value }), 500); };
  }
  // ---------- panel OPERADORES ----------
  let opSel = null;
  function renderOpsPane() {
    const s = site(); const isAtk = S.side === 'atk'; const ops = isAtk ? Engine.atk() : Engine.def(); const rec = new Set(isAtk ? Engine.recommend(s, []) : s.def.ops); slots().forEach(p => p.op && rec.add(p.op));
    let h = `<div class="k" style="margin-bottom:6px">${isAtk ? 'Todos los atacantes' : 'Todos los defensores'} · ${ops.length} · <span class="acc">resaltados = recomendados para ${E(s.rooms[0])}</span></div>`;
    if (isAtk) { for (const [rid, R] of Object.entries(ROLES)) { const list = ops.filter(o => o.roles[0] === rid); if (!list.length) continue; h += `<div class="role-h"><span class="k">${E(R.n)}</span><small>${E(R.d)}</small></div><div class="opgrid">` + list.map(o => `<button class="opc ${opSel === o.id ? 'on' : ''} ${rec.has(o.id) ? 'rec' : ''}" data-op="${o.id}">${opPlate(o, 'sm')}<div class="n">${E(o.n)}</div><div class="r">${o.spd}·${o.hp} ${E(o.roles.map(r => ROLES[r].n).join('/'))}</div><div class="g">${E(o.g)}</div></button>`).join('') + `</div>`; } }
    else h += `<div class="opgrid">` + ops.map(o => `<button class="opc ${opSel === o.id ? 'on' : ''} ${rec.has(o.id) ? 'rec' : ''}" data-op="${o.id}">${opPlate(o, 'sm')}<div class="n">${E(o.n)}</div><div class="g">${E(o.g)}</div></button>`).join('') + `</div>`;
    const o = Engine.op(opSel);
    if (o) { if (isAtk) { const j = Engine.jobFor(s, o); h += `<div class="opdetail"><b>${E(o.n)}</b> · ${E(o.g)} · ${o.spd} vel / ${o.hp} vida<br>${E(j.base)}<div class="rt">${E(j.where)}</div>${j.v ? `<div class="p" style="font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:6px">${(j.v.path || []).join(' → ')}</div>` : ''}${me ? `<div style="margin-top:10px"><button class="btn sm p" id="pickMe">Elegir para mí</button></div>` : ''}</div>`; } else h += `<div class="opdetail"><b>${E(o.n)}</b> · ${E(o.g)}<br><b>Cómo se juega / se contra:</b> ${E(o.ctr)}${me ? `<div style="margin-top:10px"><button class="btn sm p" id="pickMe">Elegir para mí</button></div>` : ''}</div>`; }
    $('#p-ops').innerHTML = h;
    $$('#p-ops .opc').forEach(b => b.onclick = () => { opSel = opSel === b.dataset.op ? null : b.dataset.op; renderOpsPane(); });
    const pm = $('#pickMe'); if (pm) pm.onclick = () => { const picks = { ...S.picks }; picks[me.slot] = { op: opSel }; commit({ picks }); $$('#sideTabs button')[0].click(); };
  }
  // ---------- panel DEFENSA ----------
  function renderDefPane() {
    const s = site(); const d = s.def;
    $('#p-def').innerHTML = `<div class="k" style="margin-bottom:8px">Cómo se defiende <span class="acc">${E(s.n)}</span> (y qué esperar si atacas)</div><ul class="deflist">${d.reinforce.map(x => `<li>${E(x)}</li>`).join('')}${d.keepSoft.map(x => `<li class="soft">Dejar blando: ${E(x)}</li>`).join('')}${d.rotations.map(x => `<li class="rot">${E(x)}</li>`).join('')}</ul><div class="step" style="grid-template-columns:1fr"><div>${E(d.anchors)}</div></div><div class="role-h"><span class="k">Defensores del sitio</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">${d.ops.map(id => { const o = Engine.op(id); return o ? `<span class="chip blue" title="${E(o.ctr)}">${E(o.n)}</span>` : ''; }).join('')}</div><div class="opdetail" style="margin-top:12px"><b>Tip:</b> ${E(d.tip)}</div>`;
  }
  // ---------- SQUAD ----------
  function rankBadge(rp, scale) { const r = RANKS.rankOf(rp, scale); return `<div class="rkb" style="background:${r.color}">${r.tier.n.slice(0, 2).toUpperCase()}</div>`; }
  function renderSquad() {
    $('#squadCards').innerHTML = ROSTER().map((p, i) => {
      const st = p.stats; const mine = me && me.slot === p.id;
      const latest = st && st.seasons.find(s => s[1] > 0); const lr = latest ? RANKS.rankOf(latest[1], latest[4]) : null; const pk = st ? RANKS.rankOf(st.peak.rp, st.peak.scale) : null;
      let body = '';
      if (st) body = `<div class="rk">${rankBadge(latest ? latest[1] : 0, latest ? latest[4] : 3)}<div class="rn">${lr ? E(lr.label) : 'Sin rango'}<small>${latest ? E(latest[0]) + ' · ' + latest[3] + ' partidas' : 'Split Fire · aún sin ranked'}</small></div><div class="rp">${latest ? Store.fmt(latest[1]) : '—'}<small>RP · pico ${Store.fmt(st.peak.rp)} ${E(pk.label)} (${E(st.peak.season)})</small></div></div><div class="kv"><div><b>${st.level}</b><span>Nivel</span></div><div><b>${st.kd.toFixed(2)}</b><span>K/D</span></div><div><b>${st.hs.toFixed(1)}%</b><span>Headshot</span></div><div><b>${st.win.toFixed(1)}%</b><span>Win</span></div><div><b>${Store.fmt(st.matches)}</b><span>Partidas</span></div><div><b>${Store.fmt(st.hours)}h</b><span>Jugadas</span></div><div><b>${Store.fmt(st.kills)}</b><span>Kills</span></div><div><b>${st.kpm.toFixed(2)}</b><span>K/partida</span></div></div><div class="seas"><div class="row h"><span>Season</span><span>RP</span><span>K/D</span><span>Part.</span></div>${st.seasons.map(s => `<div class="row"><b>${E(s[0])}</b><span>${s[1] ? Store.fmt(s[1]) : '—'}</span><span>${s[2].toFixed(2)}</span><span>${s[3]}</span></div>`).join('')}</div>${st.last.length ? `<div class="seas"><div class="k" style="margin-bottom:6px">Últimas ${st.last.length}</div><div class="spark">${st.last.map(l => `<i class="${l[1] === 'W' ? 'w' : 'l'}" style="height:${Math.min(28, 8 + l[3] * 10)}px" title="${E(l[0])} ${l[2]} K/D ${l[3]}"></i>`).join('')}</div><div class="row h" style="grid-template-columns:1fr;margin-top:4px">${st.last.map(l => E(l[0])).join(' · ')}</div></div>` : ''}`;
      else body = `<div class="empty">Sin perfil todavía. Escribe tu nick de Ubisoft/Xbox y abrimos tu tracker.<input class="in" id="nick-${p.id}" placeholder="nick exacto" value="${E(p.nick || '')}"><div style="margin-top:8px"><button class="btn sm p" data-savenick="${p.id}">Guardar</button></div></div>`;
      return `<div class="pc ${mine ? 'me' : ''}"><div class="hd"><span class="av ${p.me ? 'acc' : ''}">${E(initials(p))}</span><div class="nm">${E(p.nick || 'Tu nick')}<small>${E(p.role)}${p.alias ? ' · alias ' + E(p.alias) : ''}</small></div><span class="chip ${p.me ? 'acc' : ''} tag">${E(p.tag)}</span></div>${body}<div class="ft">${p.nick ? `<a class="btn sm" target="_blank" rel="noopener" href="${Store.trackerUrl(p.nick, p.plat)}">R6 Tracker ↗</a>` : ''}<button class="btn sm" data-imp="${p.id}">↻ Actualizar</button><button class="btn sm ghost" data-edit="${p.id}">Editar</button><button class="btn sm ghost danger" data-del="${p.id}" title="Quitar del squad">×</button>${!mine ? `<button class="btn sm ghost" data-beme="${p.id}">Soy yo</button>` : '<span class="chip acc dot">tú</span>'}</div></div>`;
    }).join('');
    $$('#squadCards .rp').forEach(e => { const n = parseInt(e.firstChild && e.firstChild.textContent.replace(/,/g, '')); if (n) { const t = e.firstChild; FX.count({ set textContent(v) { t.textContent = v; } }, n); } });
    { let bar = $('#squadBar'); if (!bar) { bar = document.createElement('div'); bar.id = 'squadBar'; bar.style.cssText = 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap'; $('#squadCards').after(bar); }
      const quitados = SQUAD.filter(p => p.removed);
      bar.innerHTML = `<button class="btn sm" id="addP">+ Añadir jugador</button>${quitados.length ? `<button class="btn sm ghost" id="undoP">Recuperar ${quitados.length} quitado${quitados.length > 1 ? 's' : ''}</button>` : ''}<button class="btn sm ghost" id="resetP">Restablecer squad</button>`;
      $('#addP').onclick = () => { const n = prompt('Nick exacto (Ubisoft/Xbox):'); if (!n) return; const id = 'p' + Store.uid().toLowerCase(); SQUAD.push({ id, nick: n.trim(), role: 'Flex', tag: 'SQUAD', stats: null }); setOverride(id, { nick: n.trim(), role: 'Flex', tag: 'SQUAD', added: true }); renderSquad(); render(); };
      const ub = $('#undoP'); if (ub) ub.onclick = () => { quitados.forEach(p => setOverride(p.id, { removed: false })); renderSquad(); render(); };
      $('#resetP').onclick = () => { if (!confirm('¿Restablecer el squad a los perfiles originales? Se borran tus cambios locales de nicks y quitados.')) return; Store.del('squad'); location.reload(); };
    }
    renderSeason();
    $$('[data-savenick]').forEach(b => b.onclick = () => { const id = b.dataset.savenick; const v = $('#nick-' + id).value.trim(); if (!v) return; setOverride(id, { nick: v }); if (me && me.slot === id) { me.name = v; Store.set('me', me); } renderSquad(); renderMe(); });
    $$('[data-del]').forEach(b => b.onclick = () => { const p = slotOf(b.dataset.del); if (!confirm(`¿Quitar a ${p.nick || p.id} del squad?`)) return; setOverride(p.id, { removed: true }); renderSquad(); render(); Store.toast('Fuera del squad'); });
    $$('[data-imp]').forEach(b => b.onclick = () => openImport(b.dataset.imp));
    $$('[data-edit]').forEach(b => b.onclick = () => editMember(b.dataset.edit));
    $$('[data-beme]').forEach(b => b.onclick = () => { const p = slotOf(b.dataset.beme); me = { slot: p.id, name: p.nick || p.id }; Store.set('me', me); render(); renderSquad(); });
  }

  function renderSeason() {
    let host = $('#seasonBox'); if (!host) { host = document.createElement('div'); host.id = 'seasonBox'; host.className = 'season'; $('#squadCards').after(host); }
    const ms = SEASON.matches.filter(m => !m.rpOnly); const w = ms.filter(m => m.result === 'W').length, l = ms.filter(m => m.result === 'L').length;
    const rows = ROSTER().map(p => ({ p, st: seasonStats(p.id) })); const champs = rows.filter(r => r.st.rp != null && r.st.rp >= CHAMP_RP).length;
    const pct = rows.length ? Math.round(rows.reduce((a, r) => a + Math.min(1, (r.st.rp || 0) / CHAMP_RP), 0) / rows.length * 100) : 0;
    host.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><div class="k">Temporada Split Fire · registro del squad</div><button class="btn sm ghost" id="deCero">Empezar de cero</button></div><div class="goal"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b class="h-disp" style="font-size:15px">Meta: todos Champion</b><div class="dim" style="font-size:12px">${champs}/${rows.length} en Champion (≥ ${Store.fmt(CHAMP_RP)} RP) · partidos registrados ${ms.length} · <b class="acc">${w}W – ${l}L</b></div></div><div class="k">${pct}% del camino</div></div><div class="bar"><i style="width:${pct}%"></i></div></div>
    <table><thead><tr><th>Jugador</th><th>RP ahora</th><th>Rango</th><th>Faltan p/ Champion</th><th>K/D temp.</th><th>K · D · A</th><th>Partidos</th><th>Progreso RP</th></tr></thead><tbody>${rows.map(({ p, st }) => { const r = st.rp != null ? RANKS.rankOf(st.rp, 3) : null; const falta = st.rp != null ? Math.max(0, CHAMP_RP - st.rp) : null; const mx = Math.max(1, ...st.rps); return `<tr><td><b>${E(p.nick || p.id)}</b></td><td class="rp">${st.rp != null ? Store.fmt(st.rp) : '—'}</td><td>${r ? `<span class="chip" style="border-color:${r.color};color:${r.color}">${E(r.label)}</span>` : '<span class="dim">sin dato</span>'}</td><td class="rp">${falta == null ? '—' : falta === 0 ? '<span style="color:var(--green)">CHAMPION</span>' : Store.fmt(falta) + ' RP · ~' + Math.ceil(falta / 80) + ' victorias'}</td><td><b>${st.n ? st.kd.toFixed(2) : '—'}</b></td><td class="rp">${st.n ? `${st.k} · ${st.d} · ${st.a}` : '—'}</td><td>${st.n}</td><td><div class="spark">${st.rps.map(v => `<i style="height:${Math.max(3, Math.round(v / mx * 22))}px;background:${v >= CHAMP_RP ? 'var(--green)' : 'var(--acc)'}" title="${v}"></i>`).join('') || '<span class="dim">—</span>'}</div></td></tr>`; }).join('')}</tbody></table>
    ${ms.length ? `<div class="k" style="margin-top:16px">Historial</div><div class="hist">${ms.slice().reverse().map(m => `<div><b>${new Date(m.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</b><span>${E((MAPS.find(x => x.id === m.map) || {}).n || m.mapName || m.map)}${m.src === 'tracker' ? ' <span class="dim">· tracker</span>' : ''} · ${m.result === 'W' ? '<b style="color:var(--green)">W</b>' : '<b style="color:var(--red)">L</b>'} ${m.w}–${m.l}</span><span class="rp">${Object.entries(m.players || {}).filter(([, v]) => v.k != null).map(([id, v]) => `${E((slotOf(id) || {}).nick || id).split(' ')[0]} ${v.k}/${v.d}`).join(' · ')}</span><button class="btn sm ghost" data-delm="${m.id}">×</button></div>`).join('')}</div><div style="margin-top:10px;display:flex;gap:8px"><button class="btn sm" id="expSeason">Exportar JSON</button><button class="btn sm ghost" id="impSeason">Importar</button></div>` : '<div class="dim" style="margin-top:10px;font-size:13px">Aún no hay partidos registrados. Toca <b>Iniciar ranked</b> en PLAN y al terminar captura las stats.</div>'}`;
    $$('#seasonBox [data-delm]').forEach(b => b.onclick = () => { if (!confirm('¿Borrar este partido?')) return; SEASON.matches = SEASON.matches.filter(m => m.id !== b.dataset.delm); saveSeason(); renderSeason(); });
    const cero = $('#deCero'); if (cero) cero.onclick = () => {
      if (!confirm('Borra TODO el registro de la temporada y la partida en curso de este navegador. ¿Seguro?')) return;
      SEASON = { matches: [] }; saveSeason();
      ['state', 'me', 'squad', 'limpieza'].forEach(k => { try { localStorage.removeItem('r6ns.' + k); } catch (e) {} });
      location.href = 'app.html';
    };
    const ex = $('#expSeason'); if (ex) ex.onclick = () => { navigator.clipboard.writeText(JSON.stringify(SEASON)).then(() => Store.toast('Temporada copiada (JSON)')); };
    const im = $('#impSeason'); if (im) im.onclick = () => { const t = prompt('Pega el JSON de la temporada:'); try { const j = JSON.parse(t); if (j && Array.isArray(j.matches)) { SEASON = j; saveSeason(); renderSeason(); } } catch (e) { Store.toast('JSON inválido'); } };
  }

  // ---------- importar del tracker (pegar el texto de la página del perfil) ----------
  function parseTracker(txt) {
    const T = String(txt).replace(/ /g, ' ');
    const num = v => v == null ? null : +String(v).replace(/,/g, '');
    const after = (label, re) => { const i = T.indexOf(label); if (i < 0) return null; const m = T.slice(i, i + 900).match(re); return m ? m[1] : null; };
    const out = {};
    const cs = T.indexOf('CURRENT SEASON');
    if (cs >= 0) { const blk = T.slice(cs, cs + 260);
      const r = blk.match(/\n\s*(COPPER|BRONZE|SILVER|GOLD|PLATINUM|EMERALD|DIAMOND|CHAMPION)\s+(V|IV|III|II|I)\s*\n\s*([\d,]+)\s*\n\s*RP/i);
      if (r) { out.rankRaw = `${r[1]} ${r[2]}`; out.rp = num(r[3]); }
      else if (/NO RANK/i.test(blk)) { out.rankRaw = 'NO RANK'; out.rp = null; } }
    out.level   = num(after('LIFETIME OVERALL', /Level\s*\n\s*([\d,]+)/));
    out.matches = num(after('LIFETIME OVERALL', /Matches\s*\n\s*([\d,]+)/));
    out.hours   = num(after('LIFETIME OVERALL', /Time Played\s*\n\s*([\d,]+)h/));
    out.win     = num(after('LIFETIME OVERALL', /Win %\s*\n\s*([\d.]+)/));
    out.kd      = num(after('LIFETIME OVERALL', /K\/D\s*\n\s*([\d.]+)/));
    out.hs      = num(after('LIFETIME OVERALL', /Headshot %\s*\n\s*([\d.]+)/));
    out.kills   = num(after('LIFETIME OVERALL', /Kills\s*\n\s*([\d,]+)/));
    out.deaths  = num(after('LIFETIME OVERALL', /Deaths\s*\n\s*([\d,]+)/));
    out.kpm     = num(after('LIFETIME OVERALL', /Kills\/Match\s*\n\s*([\d.]+)/));
    const so = T.indexOf('OVERVIEW');
    if (so >= 0) { const b = T.slice(so, so + 900);
      const kd = b.match(/K\/D\s*\n\s*([\d.]+)/); if (kd) out.seasonKd = num(kd[1]);
      const mm = b.match(/Matches\s*\n\s*([\d,]+)/); if (mm) out.seasonMatches = num(mm[1]);
      const w = b.match(/(\d+)\s*\n\s*W\s*\n\s*(\d+)\s*\n\s*L/); if (w) { out.seasonW = +w[1]; out.seasonL = +w[2]; } }
    return out;
  }
  function openImport(slot) {
    const p = slotOf(slot);
    openModal(`<h3>Actualizar ${E(p.nick || p.id)} del tracker</h3><div class="sub">Abre su perfil, selecciona todo (⌘A), copia (⌘C) y pega aquí. Se leen RP, rango, K/D, nivel y partidas.</div>
      <div style="display:flex;gap:8px;margin-bottom:10px"><a class="btn" target="_blank" rel="noopener" href="${Store.trackerUrl(p.nick, p.plat)}">Abrir tracker ↗</a></div>
      <textarea class="in" id="impTxt" rows="7" placeholder="Pega aquí el texto del perfil…"></textarea>
      <div id="impPrev" class="dim" style="font-size:12px;margin-top:8px"></div>
      <div class="row"><button class="btn" data-close>Cancelar</button><button class="btn p" id="impGo" disabled>Guardar</button></div>`);
    let parsed = null;
    $('#impTxt').oninput = e => {
      parsed = parseTracker(e.target.value);
      const ok = parsed.rp != null || parsed.kd != null;
      $('#impGo').disabled = !ok;
      $('#impPrev').innerHTML = ok ? `Detectado: ${parsed.rankRaw ? `<b class="acc">${E(parsed.rankRaw)}</b> · ` : ''}${parsed.rp != null ? Store.fmt(parsed.rp) + ' RP · ' : ''}K/D ${parsed.kd ?? '—'} · nivel ${parsed.level ?? '—'} · ${Store.fmt(parsed.matches) || '—'} partidas${parsed.seasonKd != null ? ` · season K/D ${parsed.seasonKd}` : ''}` : 'No reconocí el formato: pega el texto completo de la página del perfil.';
    };
    $('#impGo').onclick = () => {
      const st = p.stats || (p.stats = { seasons: [], last: [] });
      if (parsed.level != null) st.level = parsed.level; if (parsed.matches != null) st.matches = parsed.matches;
      if (parsed.hours != null) st.hours = parsed.hours; if (parsed.win != null) st.win = parsed.win;
      if (parsed.kd != null) st.kd = parsed.kd; if (parsed.hs != null) st.hs = parsed.hs;
      if (parsed.kills != null) st.kills = parsed.kills; if (parsed.deaths != null) st.deaths = parsed.deaths;
      if (parsed.kpm != null) st.kpm = parsed.kpm;
      st.season = { ...(st.season || {}), n: 'Split Fire', rp: parsed.rp, rank: parsed.rankRaw || null, kd: parsed.seasonKd ?? (st.season && st.season.kd), matches: parsed.seasonMatches ?? (st.season && st.season.matches), w: parsed.seasonW, l: parsed.seasonL };
      if (parsed.rp != null) { // el RP alimenta la temporada del squad
        SEASON.matches.push({ id: 'trk-' + Store.uid(), date: Date.now(), map: null, mapName: 'Actualización del tracker', result: 'W', w: 0, l: 0, rounds: [], players: { [slot]: { rp: parsed.rp } }, src: 'tracker', rpOnly: true });
        saveSeason();
      }
      setOverride(slot, { stats: st }); closeModal(); renderSquad(); Store.toast('Perfil actualizado');
    };
  }
  function setOverride(id, patch) { const o = Store.get('squad', {}); o[id] = { ...(o[id] || {}), ...patch }; Store.set('squad', o); Object.assign(slotOf(id), patch); }
  function editMember(id) { const p = slotOf(id); openModal(`<h3>Editar ${E(p.nick || p.id)}</h3><div class="sub">Nick exacto como aparece en R6 Tracker.</div><label class="f"><span class="k">Nick</span><input class="in" id="e-nick" value="${E(p.nick || '')}"></label><label class="f"><span class="k">Plataforma</span><select class="in" id="e-plat"><option value="xbl" ${p.plat === 'xbl' ? 'selected' : ''}>Xbox</option><option value="psn" ${p.plat === 'psn' ? 'selected' : ''}>PlayStation</option><option value="ubi" ${p.plat === 'ubi' ? 'selected' : ''}>PC (Ubisoft)</option></select></label><label class="f"><span class="k">Rol en el squad</span><input class="in" id="e-role" value="${E(p.role || '')}"></label><label class="f"><span class="k">Apodo</span><input class="in" id="e-tag" value="${E(p.tag || '')}"></label><div class="row"><button class="btn" data-close>Cancelar</button><button class="btn p" id="e-save">Guardar</button></div>`); $('#e-save').onclick = () => { setOverride(id, { nick: $('#e-nick').value.trim(), plat: $('#e-plat').value, role: $('#e-role').value.trim(), tag: $('#e-tag').value.trim() }); closeModal(); renderSquad(); render(); }; }
  // ---------- RANGOS ----------
  function renderRanks() {
    const base = RANKS.base[3]; let h = '';
    RANKS.tiers.forEach((t, i) => { const lo = base + i * RANKS.perTier; const who = ROSTER().filter(p => p.stats).map(p => { const l = p.stats.seasons.find(s => s[1] > 0); return l ? { p, r: RANKS.rankOf(l[1], l[4]) } : null; }).filter(x => x && x.r.t === i); h += `<div class="tier" style="--tc:${t.c}"><div class="n">${E(t.n)}</div><div class="rp">${Store.fmt(lo)}${i === 7 ? '+' : ' – ' + Store.fmt(lo + RANKS.perTier - 1)} RP</div><div class="divs">${RANKS.div.map((d, j) => `<span>${t.n.slice(0, 3)} ${d}<i>${Store.fmt(lo + j * RANKS.step)}</i></span>`).join('')}</div><div class="who">${who.map(x => `<span class="av" title="${E(x.p.nick)} · ${E(x.r.label)}">${E(initials(x.p))}</span>`).join('')}</div></div>`; });
    $('#ladder').innerHTML = h;
    $('#rules').innerHTML = [
      ['Cómo se gana RP', 'Cada división son <b>100 RP</b>. Una partida mueve <b>~80 RP</b> ajustados por: el rango del rival, tu rendimiento individual y si vas en <b>5-stack</b>. No hay MMR oculto desde Ranked 3.0: tu RP es tu rango.'],
      ['Restricción de squad', 'Cobre a Esmeralda: máximo <b>3 tiers</b> de diferencia dentro del squad. Diamante y arriba: <b>2 tiers</b>. Si Valeria está en Champion y Camila en Platino, no pueden ir juntas en ranked.'],
      ['Champion y Legend', 'Champion tiene divisiones reales <b>V–I</b> (asumimos 3,500+; Ubisoft no publica el corte). <b>Legend</b> (Y11S3) es una división solo-queue por encima de Champion: se entra por invitación de rango, sin squad.'],
      ['Ranked 2.0 vs 3.0', 'Los picos de Silent Hunt / Deep Freeze eran Ranked 2.0 (arrancaba en 1,000 RP: Champion = 4,500+). Desde System Override (jun-2026) es 3.0 y arranca en 0. Por eso Valeria con 4,567 era Champion y con 4,102 sigue siendo Champion.'],
      ['Meta del squad esta season', `Peor promedio de K/D del squad: <b>${Math.min(...ROSTER().filter(p => p.stats).map(p => p.stats.kd)).toFixed(2)}</b>. Objetivo realista: todos en <b>Diamante</b> (3,000+) al cierre de Split Fire. Con ~80 RP por partida, de Platino IV (2,133) a Diamante V son <b>~11 victorias netas</b>.`],
      ['Fuentes', 'Ranked 3.0: <a class="acc" target="_blank" rel="noopener" href="https://www.ubisoft.com/en-us/game/rainbow-six/siege/news-updates/5fzYRZKVVHqqRkkv3m4MyF/ranked-30-update">ubisoft.com · Ranked 3.0 Update</a>. Noor y Split Fire: <a class="acc" target="_blank" rel="noopener" href="https://www.ubisoft.com/en-us/game/rainbow-six/siege/game-info/operators/noor">ubisoft.com · Noor</a>. Stats: <a class="acc" target="_blank" rel="noopener" href="https://r6.tracker.network">r6.tracker.network</a>. Planos: <a class="acc" target="_blank" rel="noopener" href="https://r6maps.com">r6maps.com</a>.']
    ].map(([t, b]) => `<div class="card"><div class="h"><span class="k">${t}</span></div><div class="b">${b}</div></div>`).join('');
  }
  // ---------- SALA ----------
  function renderSala() {
    const on = Sync.connected; const link = location.origin + location.pathname + '#sala=' + (Sync.code || '');
    $('#salaBox').innerHTML = `<h2 class="h-disp" data-fx style="font-size:20px">Sala en tiempo real</h2><div class="sub" style="color:var(--dim);font-size:13px;margin:4px 0 18px">Uno crea la sala y comparte el código; los demás se unen. Mapa, sitio, lado, operadores, rutas y notas se sincronizan al instante entre todos. Sin cuentas, sin servidor: conexión directa entre navegadores.</div>${on ? `<div class="big">${E(Sync.code)}</div><div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap"><button class="btn" id="copyCode">Copiar código</button><button class="btn" id="copyLink">Copiar link</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Sala R6: ' + Sync.code + ' → ' + link)}">Mandar por WhatsApp</a><button class="btn danger" id="leaveBtn">Salir</button></div><div class="members">${Sync.members.map(m => `<div class="m"><span class="av">${E((m.name || '?').slice(0, 2).toUpperCase())}</span>${E(m.name)} ${m.host ? '<span class="chip acc">host</span>' : ''}<span class="st">en línea</span></div>`).join('')}${ROSTER().filter(p => !Sync.members.some(m => m.slot === p.id)).map(p => `<div class="m"><span class="av">${E(initials(p))}</span>${E(p.nick || p.id)}<span class="st off">fuera</span></div>`).join('')}</div>` : `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn p" id="hostBtn">Crear sala</button><div style="display:flex;gap:6px"><input class="in" id="joinCode" placeholder="CÓDIGO" style="width:140px;letter-spacing:.2em;text-transform:uppercase"><button class="btn" id="joinBtn">Unirse</button></div></div><div class="members" style="margin-top:22px">${ROSTER().map(p => `<div class="m"><span class="av ${p.me ? 'acc' : ''}">${E(initials(p))}</span>${E(p.nick || p.id)}<span class="k" style="margin-left:6px">${E(p.role)}</span><span class="st off">sin sala</span></div>`).join('')}</div>`}`;
    FX.all($('#salaBox')); const big = $('#salaBox .big'); if (big) FX.text(big);
    const cp = t => navigator.clipboard.writeText(t).then(() => Store.toast('Copiado'));
    if (on) { $('#copyCode').onclick = () => cp(Sync.code); $('#copyLink').onclick = () => cp(link); $('#leaveBtn').onclick = async () => { await Sync.leave(); renderSala(); renderSalaChip(); }; }
    else { $('#hostBtn').onclick = () => hostSala(); $('#joinBtn').onclick = () => joinSala($('#joinCode').value); }
  }
  async function hostSala() { if (!me) return openIdentity(() => hostSala()); try { Store.toast('Creando sala…'); await Sync.host(shared(), me.name, me.slot); Store.toast('Sala ' + Sync.code + ' lista'); renderSala(); renderSalaChip(); } catch (e) { Store.toast('No se pudo crear: ' + e.message); } }
  async function joinSala(code) { if (!code) return; if (!me) return openIdentity(() => joinSala(code)); try { Store.toast('Buscando sala ' + code.toUpperCase() + '…'); await Sync.join(code, me.name, me.slot); Store.toast('Dentro de ' + Sync.code); renderSala(); renderSalaChip(); showView('plan'); } catch (e) { Store.toast(e.message || 'No se encontró la sala'); renderSala(); } }
  // ---------- modal / identidad ----------
  function openModal(h) { $('#modalBox').innerHTML = h; $('#modal').classList.add('on'); $$('#modal [data-close]').forEach(b => b.onclick = closeModal); }
  function closeModal() { $('#modal').classList.remove('on'); }
  function openIdentity(after) {
    openModal(`<h3>¿Quién eres?</h3><div class="sub">Tu slot en el squad. Se guarda en este navegador.</div><div class="squad5">${ROSTER().map(p => `<button class="slot" data-who="${p.id}" style="cursor:pointer;text-align:left"><span class="av ${p.me ? 'acc' : ''}">${E(initials(p))}</span><div class="who">${E(p.nick || 'André (pon tu nick)')}<small>${E(p.role)} · ${E(p.tag)}</small></div><span class="rt">→</span></button>`).join('')}</div><div style="margin-top:12px;display:flex;gap:6px"><input class="in" id="guestName" placeholder="…o invitado: tu nombre"><button class="btn" id="guestBtn">Entrar</button></div>`);
    const pick = (slot, name) => { me = { slot, name }; Store.set('me', me); closeModal(); render(); renderSquad(); if (after) after(); };
    $$('#modal [data-who]').forEach(b => b.onclick = () => { const p = slotOf(b.dataset.who); if (!p.nick) { const n = prompt('Tu nick exacto de Ubisoft/Xbox:'); if (!n) return; setOverride(p.id, { nick: n.trim() }); } pick(p.id, slotOf(p.id).nick); });
    $('#guestBtn').onclick = () => { const n = $('#guestName').value.trim(); if (n) pick('guest-' + Store.uid(), n); };
  }

  // =====================================================================
  //  MODO RONDA · 4 pasos · pensado para los 45 s de selección de operador
  // =====================================================================
  const stepLabels = () => ({ 1: map().n, 2: `${S.side === 'atk' ? 'Ataque' : 'Defensa'} · ${S.side === 'atk' && !S.siteKnown ? 'sitio ?' : site().n}`, 3: (curStrat() ? (curStrat().tag || curStrat().n) : 'libre'), 4: S.live && S.live.playing ? 'en curso' : '' });
  function goStep(n) { // la fase 1 (lobby) se comparte con el equipo; salir de ella también
    S.step = n; S.selected = null;
    if (n === 1 && !S.lobbyOpen) { commit({ lobbyOpen: true }); return; }
    if (n !== 1 && S.lobbyOpen) { commit({ lobbyOpen: false }); return; }
    save(); render();
  }
  const CV = $('#canvas');
  function mountCanvas() { // el canvas vive fuera de las pantallas: al reconstruirlas hay que volver a colgarlo
    const cv = CV; if (!cv) return; cv.hidden = !(S.step === 3 || S.step === 4 || S.step === 5);
    const host = S.step === 3 ? $('#s3 .mini') : S.step === 4 ? $('#s4 .mini') : S.step === 5 ? $('#s5 .lv-canvas') : null;
    if (host && cv.parentElement !== host) { host.appendChild(cv); setTimeout(() => MapView.fit(), 60); }
  }
  function renderWiz() {
    const lb = stepLabels(); $$('#steps button[data-step]').forEach(b => { const n = +b.dataset.step; b.classList.toggle('on', n === S.step); b.classList.toggle('done', n < S.step); b.querySelector('small').textContent = lb[n] || ''; b.onclick = () => goStep(n); });
    $$('.screen').forEach(sc => sc.classList.toggle('on', sc.id === 's' + S.step));
    renderScore(); $('#rNum').textContent = 'Ronda ' + S.round; const nm = $('#newMatch'); if (nm) nm.onclick = () => { if (!confirm('¿Nuevo partido? Se borra el marcador y las rondas.')) return; S.step = 2; commit({ match: { rounds: [], active: false }, hint: null, prep: null, vetos: [], vetoMode: false, lobbyOpen: false, ready: {}, round: 1, live: null, siteKnown: true }); };
    if (S.step === 1) renderLobby(); if (S.step === 2) renderS2(); if (S.step === 3) renderS3(); if (S.step === 4) renderS4(); if (S.step === 5) renderS5();
    mountCanvas();
    if (S.step !== 5) Round.stopTick();
    else Round.ensureTick();
  }

  // =====================================================================
  //  LÓGICA ENTRE RONDAS: resultado → qué lado, qué sitio y qué estrategia sigue
  // =====================================================================
  const TAGS = [['rush', 'Nos rushearon / rusheamos'], ['vertical', 'Vertical'], ['flanco', 'Flanco / roam'], ['plant', 'Plant / defuse'], ['tiempo', 'Se acabó el tiempo'], ['duelo', 'Duelos perdidos']];
  const score = () => { const w = (S.match.rounds || []).filter(r => r.result === 'W').length, l = (S.match.rounds || []).filter(r => r.result === 'L').length; return { w, l }; };
  const siteRecord = sid => { const rs = (S.match.rounds || []).filter(r => r.map === S.map && r.site === sid); return { w: rs.filter(r => r.result === 'W').length, l: rs.filter(r => r.result === 'L').length, rs }; };
  function nextRoundPlan(result, tags) {
    const m = map(), s = site(), x = curStrat(); const n = S.round + 1;
    let side = S.side, flip = false; if (n === 4 || n >= 7) { side = S.side === 'atk' ? 'def' : 'atk'; flip = true; } // medio tiempo tras la 3; tiempo extra alterna
    const rec = { n: S.round, map: S.map, side: S.side, site: s.id, strat: x ? x.id : S.strat, result, tags };
    const rounds = [...(S.match.rounds || []), rec];
    const hint = { n, flip, side, site: null, strat: 'default', why: '' };
    const st = STR[S.map] && STR[S.map].sites;
    if (side === 'def') {
      const cand = (PICKS[m.id] || []).map(pk => pk.site).filter(id => m.sites.some(z => z.id === id)).concat(m.sites.map(z => z.id).filter(id => !(PICKS[m.id] || []).some(pk => pk.site === id)));
      const scored = cand.map(id => { const r = rounds.filter(q => q.map === S.map && q.side === 'def' && q.site === id); const w = r.filter(q => q.result === 'W').length, l = r.filter(q => q.result === 'L').length; const last2 = r.slice(-2); const burned = last2.length === 2 && last2.every(q => q.result === 'L'); return { id, w, l, burned, idx: cand.indexOf(id) }; });
      scored.sort((a, b) => (a.burned - b.burned) || ((b.w - b.l) - (a.w - a.l)) || (a.idx - b.idx));
      const curS = scored.find(z => z.id === s.id); const keep = !flip && S.side === 'def' && curS && !curS.burned; // una derrota no basta para abandonar el sitio
      hint.site = keep ? s.id : scored[0].id; const sr = keep ? curS : scored[0];
      const defs = st && st[hint.site] ? st[hint.site].defense : [];
      if (!flip && S.side === 'def' && hint.site === s.id) { hint.strat = result === 'W' ? (x ? x.id : 'default') : (defs[1] && (!x || x.id !== defs[1].id) ? defs[1].id : 'default'); hint.why = result === 'W' ? 'Ganamos aquí: mismo sitio, mismo setup. No cambies lo que funciona.' : (tags.includes('rush') ? 'Nos rushearon: setup anti-rush (más utilidad en la puerta).' : tags.includes('vertical') ? 'Nos hicieron vertical: roam arriba y anclas fuera del piso blando.' : 'Perdimos: cambia el setup en el mismo sitio antes de cambiar de sitio.'); }
      else hint.why = sr.w || sr.l ? `Récord ${sr.w}W-${sr.l}L en este sitio.` : (((PICKS[m.id] || [])[0] || {}).why || 'Sitio recomendado del mapa.');
      if (sr.burned) hint.why = 'Perdimos 2 seguidas ahí: cambiar de sitio.';
    } else {
      const order = ['default', 'split', 'vertical', 'rush'];
      if (!flip && S.side === 'atk') { if (result === 'W') { hint.strat = x ? x.id : 'default'; hint.why = 'Ganamos: misma estrategia si eligen el mismo sitio.'; } else { hint.strat = tags.includes('tiempo') ? 'rush' : tags.includes('plant') ? 'vertical' : tags.includes('flanco') ? (x ? x.id : 'default') : order[(order.indexOf(x ? x.id : 'default') + 1) % order.length]; hint.why = tags.includes('tiempo') ? 'Se acabó el tiempo: entrar más rápido (RUSH).' : tags.includes('plant') ? 'No pudimos plantar: matar desde arriba (VERTICAL).' : tags.includes('flanco') ? 'Nos flanquearon: misma estrategia, Nomad/Gridlock en la espalda.' : 'Perdimos: cambia el ángulo de ataque.'; } }
      else hint.why = 'Ataque: comp flexible y toca el sitio cuando lo veas en drones.';
    }
    return { rounds, hint, side, n, flip };
  }
  function openResult() {
    openModal(`<h3>¿Cómo terminó la ronda ${S.round}?</h3><div class="sub">${E(map().n)} · ${S.side === 'atk' ? 'Ataque' : 'Defensa'} · ${E(site().n)}</div><div class="big-toggle" style="max-width:none"><button data-res="W">GANAMOS</button><button data-res="L" style="color:#ffb3c2">PERDIMOS</button></div><div class="k" style="margin:6px 0">¿Qué pasó? (opcional)</div><div style="display:flex;gap:6px;flex-wrap:wrap" id="tagRow">${TAGS.map(t => `<button class="chip" data-tag="${t[0]}">${E(t[1])}</button>`).join('')}</div><div class="row"><button class="btn" data-close>Cancelar</button><button class="btn p" id="resGo" disabled>Siguiente ronda ▶</button></div>`);
    let res = null; const tags = new Set();
    $$('#modal [data-res]').forEach(b => b.onclick = () => { res = b.dataset.res; $$('#modal [data-res]').forEach(x => { x.classList.toggle('on', x === b); x.classList.toggle('atk', x === b && b.dataset.res === 'W'); }); $('#resGo').disabled = false; });
    $$('#modal [data-tag]').forEach(b => b.onclick = () => { const t = b.dataset.tag; tags.has(t) ? tags.delete(t) : tags.add(t); b.classList.toggle('acc', tags.has(t)); });
    $('#resGo').onclick = () => { const plan = nextRoundPlan(res, [...tags]); closeModal(); const over = S.match.active ? matchOver(plan.rounds) : null; if (over) { S.match = { ...S.match, rounds: plan.rounds }; save(); openMatchEnd(over); return; } S.step = 3; S.focus = null; S.selected = null; S.floorIdx = null; const patch = { match: { ...S.match, rounds: plan.rounds }, hint: plan.hint, round: plan.n, side: plan.side, live: null, strat: plan.hint.strat || 'default' }; if (plan.hint.site) { patch.site = plan.hint.site; patch.siteKnown = true; } else patch.siteKnown = false; commit(patch); if (plan.flip) Store.toast(`Ronda ${plan.n}: cambio de lado → ${plan.side === 'atk' ? 'ATAQUE' : 'DEFENSA'}`); };
  }

  // ---------- PARTIDO RANKED: inicio, marcador, fin y captura de stats ----------
  const CHAMP_RP = 4500; // Ranked 3.0 · Champion V (calibrado con R6 Tracker: la escala arranca en 1,000 RP)
  function matchOver(rounds) { // ranked: a 4 rondas; 3-3 → 3 de prórroga (a 5, o 2 de diferencia)
    const w = rounds.filter(r => r.result === 'W').length, l = rounds.filter(r => r.result === 'L').length;
    if (w >= 4 && l <= 2) return 'W'; if (l >= 4 && w <= 2) return 'L';
    if (w >= 5 || l >= 5) return w > l ? 'W' : 'L';
    return null;
  }
  function openLobby() { S.step = 1; commit({ lobbyOpen: true, ready: {} }); }
  function startMatch() { S.step = 2; S.focus = null; commit({ lobbyOpen: false, ready: {}, match: { rounds: [], active: true, id: Store.uid(), startedAt: Date.now() }, hint: null, round: 1, live: null, siteKnown: true }); Store.toast('Partida iniciada · ronda 1'); }
  // ---------- LOBBY: todos dan LISTO ----------
  function lobbyPeople() { // se identifica por conexión, no por slot: dos personas pueden elegir el mismo slot
    if (Sync.connected && Sync.members.length) return Sync.members.map(m => ({ key: m.id || m.slot || m.name, slot: m.slot, name: m.name, online: true, host: !!m.host }));
    return [{ key: 'solo', slot: me ? me.slot : 'yo', name: me ? me.name : 'Tú', online: true, host: true }];
  }
  const yoKey = () => (Sync.connected && Sync.meId) ? Sync.meId : 'solo';

  const mapImg = id => { const m = MAPS.find(x => x.id === id); if (!m || !m.floorImgs || !m.floorImgs.length) return null; const f = m.r6 && (m.r6.floors.find(z => z.def) || m.r6.floors[0]); const it = f ? m.floorImgs.find(x => x.idx === f.index) : m.floorImgs[0]; return it ? it.src : null; };
  function histHTML() {
    const ms = SEASON.matches.filter(m => !m.rpOnly).slice().reverse();
    if (!ms.length) return `<div class="hist2 vacio"><span class="k">Historial</span><p>Aún no hay partidas. Al cerrar cada partido se guarda aquí con el marcador y las stats.</p></div>`;
    const w = ms.filter(m => m.result === 'W').length, l = ms.filter(m => m.result === 'L').length;
    return `<div class="hist2"><div class="h2h"><span class="k">Historial del squad</span><span class="rec"><b class="w">${w}</b><i>–</i><b class="l">${l}</b></span></div>
      <div class="mlist">${ms.slice(0, 8).map(m => {
        const nm = (MAPS.find(x => x.id === m.map) || {}).n || m.mapName || m.map || '—';
        const img = m.map ? mapImg(m.map) : null;
        const jug = Object.entries(m.players || {}).filter(([, v]) => v && v.k != null);
        return `<div class="mrow ${m.result === 'W' ? 'w' : 'l'}">
          <div class="mmap">${img ? `<img src="${img}" alt="" loading="lazy">` : ''}<span>${E(nm)}</span></div>
          <div class="mres"><b>${m.result === 'W' ? 'GANAMOS' : 'PERDIMOS'}</b><span>${m.w}<i>–</i>${m.l}</span></div>
          <div class="mst">${jug.length ? jug.map(([id, v]) => { const p = slotOf(id); const o = p ? (p.nick || id) : id; return `<span class="pst"><b>${E(String(o).replace(/^o\s+/i, '').split(' ')[0])}</b>${v.k}<i>/</i>${v.d}${v.a != null ? '<i>/</i>' + v.a : ''}</span>`; }).join('') : '<span class="dim">sin stats</span>'}</div>
          <div class="mdate">${new Date(m.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}${m.src === 'tracker' ? '<i>tracker</i>' : ''}</div>
        </div>`; }).join('')}</div></div>`;
  }
  function renderLobby() {
    const el = $('#s1'); if (!el) return;
    const gente = lobbyPeople(); const listos = gente.filter(g => S.ready[g.key]).length;
    const yo = yoKey(); const yaListo = !!S.ready[yo];
    const fuera = ROSTER().filter(p => !gente.some(g => g.slot === p.id));
    el.innerHTML = `<div class="lobby"><div class="lb">
      <div class="lbh"><span class="k">Fase 1</span><h2 class="h-disp" data-fx>Partida ranked</h2><p>Todos dan <b>LISTO</b> para arrancar. El que quiera confirma el mapa después: se le actualiza a todo el equipo.</p></div>
      <div class="lbgrid">${gente.map(g => `<div class="lbp ${S.ready[g.key] ? 'ok' : ''} ${g.key === yo ? 'yo' : ''}">
        <span class="av">${E((g.name || '?').replace(/^o\s+/i, '').slice(0, 2).toUpperCase())}</span>
        <span class="nm">${E(g.name)}${g.host ? ' <i>host</i>' : ''}</span>
        <span class="st">${S.ready[g.key] ? 'LISTO' : 'esperando'}</span></div>`).join('')}
        ${fuera.map(p => `<div class="lbp off"><span class="av">${E(initials(p))}</span><span class="nm">${E(p.nick || p.id)}</span><span class="st">sin conectar</span></div>`).join('')}</div>
      <div class="lbbar"><b>${listos}</b> de <b>${gente.length}</b> listos${Sync.connected ? '' : ' · <span class="dim">sin sala: solo tú</span>'}</div>
      <div class="lbact">
        <button class="btn ${yaListo ? '' : 'p'} big" id="lbReady">${yaListo ? '✓ Estás listo' : 'LISTO'}</button>
        <button class="btn big" id="lbGo">Empezar ya ▶</button>
        ${Sync.connected ? '' : '<button class="btn" id="lbSala">Crear sala · invita al squad</button>'}
      </div>
      ${histHTML()}
      </div></div>`;
    FX.all(el);
    $('#lbReady').onclick = () => { const r = { ...S.ready }; r[yo] = !r[yo]; commit({ ready: r }); };
    $('#lbGo').onclick = startMatch;
    const sb = $('#lbSala'); if (sb) sb.onclick = () => showView('sala');
    if (gente.length && listos === gente.length && S.step === 1) setTimeout(() => { if (S.step === 1 && lobbyPeople().every(g => S.ready[g.key])) startMatch(); }, 700);
  }
  function renderScore() {
    let el = $('#scoreChip'); if (!el) { el = document.createElement('div'); el.id = 'scoreChip'; el.className = 'scorebar'; const sp = $('#steps .sp'); if (!sp) return; sp.after(el); }
    const sc = score(); if (S.match && S.match.active) { el.innerHTML = `<small>RANKED</small><b class="w">${sc.w}</b><small>–</small><b class="l">${sc.l}</b><small>R${S.round}</small>`; el.style.display = ''; } else el.style.display = 'none';
  }
  const lastRP = slot => { for (let i = SEASON.matches.length - 1; i >= 0; i--) { const v = SEASON.matches[i].players && SEASON.matches[i].players[slot]; if (v && v.rp != null) return v.rp; } return null; };
  function seasonStats(slot) {
    const ms = SEASON.matches.filter(m => m.players && m.players[slot] && (m.players[slot].k != null || m.players[slot].rp != null));
    const k = ms.reduce((a, m) => a + (m.players[slot].k || 0), 0), d = ms.reduce((a, m) => a + (m.players[slot].d || 0), 0), as = ms.reduce((a, m) => a + (m.players[slot].a || 0), 0);
    const w = SEASON.matches.filter(m => m.result === 'W').length, l = SEASON.matches.filter(m => m.result === 'L').length;
    const rps = SEASON.matches.map(m => m.players && m.players[slot] && m.players[slot].rp).filter(v => v != null);
    return { n: ms.length, k, d, a: as, kd: d ? k / d : k, w, l, rp: rps.length ? rps[rps.length - 1] : null, rps, best: rps.length ? Math.max(...rps) : null };
  }
  function openMatchEnd(result) {
    const sc = score();
    openModal(`<h3>${result === 'W' ? '🏆 GANAMOS' : '💀 PERDIMOS'} ${sc.w} – ${sc.l}</h3><div class="sub">${E(map().n)} · captura el scoreboard (K / D / A) y tu RP actual. Con esto se lleva la temporada.</div><div class="statgrid"><span></span><span class="hh">Kills</span><span class="hh">Muertes</span><span class="hh">Asist.</span><span class="hh">RP ahora</span>${ROSTER().map(p => `<span class="nm">${E(p.nick || p.id)}</span><input class="in" data-k="k" data-slot="${p.id}" inputmode="numeric" placeholder="0"><input class="in" data-k="d" data-slot="${p.id}" inputmode="numeric" placeholder="0"><input class="in" data-k="a" data-slot="${p.id}" inputmode="numeric" placeholder="0"><input class="in" data-k="rp" data-slot="${p.id}" inputmode="numeric" placeholder="${lastRP(p.id) || ''}">`).join('')}</div><div class="row"><button class="btn" id="skipStats">Sin stats</button><button class="btn p" id="saveStats">Guardar partido</button></div>`);
    const finish = withStats => {
      const players = {};
      if (withStats) ROSTER().forEach(p => { const g = k => { const el = $(`#modal [data-k="${k}"][data-slot="${p.id}"]`); const n = el && el.value.trim() !== '' ? +el.value : null; return Number.isFinite(n) ? n : null; }; players[p.id] = { k: g('k'), d: g('d'), a: g('a'), rp: g('rp') }; });
      SEASON.matches.push({ id: (S.match && S.match.id) || Store.uid(), date: Date.now(), map: S.map, result, w: sc.w, l: sc.l, rounds: (S.match && S.match.rounds) || [], players });
      saveSeason(); closeModal(); S.step = 2; commit({ match: { rounds: [], active: false }, hint: null, prep: null, vetos: [], vetoMode: false, lobbyOpen: false, ready: {}, round: 1, live: null }); Store.toast('Partido guardado en la temporada'); showView('squad');
    };
    $('#saveStats').onclick = () => finish(true); $('#skipStats').onclick = () => finish(false);
  }
  // ---- paso 1: mapa
  function renderS2() {
    const groups = S.showAll ? [['ranked', 'Pool ranked'], ['off', 'Fuera del pool']] : [['ranked', 'Pool ranked']]; let h = '';
    for (const [g, gn] of groups) { h += `<div class="tile grp"><span class="k">${gn}</span></div>` + MAPS.filter(m => m.pool === g).map(m => { const fl = m.r6 && (m.r6.floors.find(f => f.def) || m.r6.floors[0]); const img = fl ? m.floorImgs.find(x => x.idx === fl.index)?.src : ''; const vet = (S.vetos || []).includes(m.id); return `<button class="tile ${m.id === S.map ? 'on' : ''} ${vet ? 'veto' : ''}" data-map="${m.id}">${vet ? '<span class="vx">VETADO</span>' : ''}${img ? `<img src="${img}" loading="lazy" alt="">` : ''}<span class="chip t ${STR[m.id] ? 'acc' : ''}">${m.r6 ? (m.approx ? 'plano ~' : 'plano') : 'croquis'}</span><span class="n">${E(m.n)}</span></button>`; }).join(''); }
    const sc = score(); const isAtk = S.side === 'atk';
    const sb = `<div class="board ${S.match.active ? '' : 'idle'}">
      ${S.match.active ? `<div class="bd-side ${isAtk ? 'atk' : 'def'}">${ICO[isAtk ? 'atk' : 'def']}${isAtk ? 'ATAQUE' : 'DEFENSA'}</div>` : '<div class="bd-side">SIN PARTIDA</div>'}
      <div class="bd-mid">
        <div class="bd-sc"><b class="w">${sc.w}</b><i>–</i><b class="l">${sc.l}</b></div>
        <div class="bd-rd">${S.match.active ? 'RONDA ' + S.round : 'Ranked'}</div>
      </div>
      <div class="bd-crew">${ROSTER().map((p, i) => { const o = Engine.op((S.picks[p.id] || {}).op); return `<span class="bd-p" title="${E(p.nick || p.id)}" style="--c:${COL(p.id)}">${o ? `<img src="img/ops/${o.id}.svg" alt="">` : `<em>${E(initials(p))}</em>`}</span>`; }).join('')}</div>
      <div class="bd-act"><button class="btn ${S.vetoMode ? 'p' : ''}" id="vetoBtn">${S.vetoMode ? '✓ Listo' : '✕ Vetos'}</button>${S.match.active ? `<button class="btn danger" id="abortMatch">Abandonar</button>` : `<button class="btn p" id="startMatch">▶ Lobby</button>`}</div>
      <div class="bd-hint">${S.vetoMode ? 'Toca los mapas que se vetaron' : S.match.active ? 'Elige el mapa que tocó' : 'Ve al lobby para empezar'}</div>
    </div>`;
    h += `<div class="tile grp"><button class="btn sm ghost" id="allMaps">${S.showAll ? '− solo el pool de ranked' : '+ ver mapas fuera del pool (' + MAPS.filter(m => m.pool === 'off').length + ')'}</button></div>`;
    $('#mapTiles').innerHTML = sb + h;
    const am2 = $('#allMaps'); if (am2) am2.onclick = () => { S.showAll = !S.showAll; save(); renderS2(); };
    const sm = $('#startMatch'); if (sm) sm.onclick = openLobby; const am = $('#abortMatch'); if (am) am.onclick = () => { if (confirm('¿Abandonar el partido sin guardarlo?')) commit({ match: { rounds: [], active: false }, hint: null, prep: null, vetos: [], vetoMode: false, lobbyOpen: false, ready: {}, round: 1, live: null }); };
    const vb = $('#vetoBtn'); if (vb) vb.onclick = () => commit({ vetoMode: !S.vetoMode });
    $$('#mapTiles .tile[data-map]').forEach(b => b.onclick = async () => {
      if (S.vetoMode) { const id = b.dataset.map; const v = (S.vetos || []).slice(); const i = v.indexOf(id); i >= 0 ? v.splice(i, 1) : v.push(id); commit({ vetos: v }); return; }
      const m = MAPS.find(x => x.id === b.dataset.map); await loadStrats(m.id); const pk = (PICKS[m.id] || [])[0]; S.floorIdx = null; S.selected = null; S.focus = null; S.step = 3; commit({ map: m.id, site: pk ? pk.site : m.sites[0].id, strat: 'default', siteKnown: S.side === 'def' }); });
  }
  // ---- paso 2: lado + sitio
  function renderS3() {
    const m = map(); const picks = PICKS[m.id] || []; const isDef = S.side === 'def';
    const ordered = picks.map(pk => ({ ...pk, s: m.sites.find(x => x.id === pk.site) })).filter(x => x.s).concat(m.sites.filter(x => !picks.some(pk => pk.site === x.id)).map(x => ({ site: x.id, why: '', s: x })));
    const sc = score(); let h = `<div class="h-step"><h2 data-fx>${E(m.n)}</h2><p>${isDef ? 'Qué sitio pedir y qué hacer. Toca el sitio.' : '¿Ya viste el sitio con los drones? Tócalo. Si no, pide la comp flexible.'}${sc.w + sc.l ? ` · <b class="acc">${sc.w} – ${sc.l}</b>` : ''}</p></div>`;
    if (S.hint && S.hint.n === S.round) { const hs = S.hint.site ? m.sites.find(z => z.id === S.hint.site) : null; h += `<div class="hintbar"><div><span class="k">Ronda ${S.round} · sugerencia</span><div class="ht">${S.hint.flip ? '<b>CAMBIO DE LADO → ' + (S.hint.side === 'atk' ? 'ATAQUE' : 'DEFENSA') + '</b> · ' : ''}${hs ? 'Pedir <b>' + E(hs.n) + '</b>' : 'Comp flexible'}${S.hint.strat ? ' · setup <b>' + E(String(S.hint.strat).toUpperCase()) + '</b>' : ''}</div><div class="hw">${E(S.hint.why)}</div></div><button class="btn p" id="applyHint">Aplicar</button></div>`; }
    h += `<div class="big-toggle"><button class="${!isDef ? 'on atk' : ''}" data-side="atk">${ICO.atk}ATAQUE</button><button class="${isDef ? 'on def' : ''}" data-side="def">${ICO.def}DEFENSA</button></div>`;
    h += `<div class="sitegrid">`;
    if (!isDef) h += `<button class="sitecard unknown ${!S.siteKnown ? 'on' : ''}" data-unknown="1"><div class="fl">Fase de operadores</div><div class="n">Aún no sé el sitio</div><div class="why">Te doy la comp flexible del mapa (sirve para el sitio más probable) y cuando lo veas, lo tocas.</div></button>`;
    ordered.forEach((x, i) => { const r = siteRecord(x.s.id); const recBadge = S.hint && S.hint.n === S.round && S.hint.site === x.s.id; h += `<button class="sitecard ${S.siteKnown && x.s.id === site().id ? 'on' : ''}" data-site="${x.s.id}">${recBadge ? `<span class="chip acc rec">SUGERIDO</span>` : i === 0 && picks.length ? `<span class="chip rec">${isDef ? 'PEDIR ESTE' : 'MÁS PROBABLE'}</span>` : picks.length ? `<span class="rank">#${i + 1}</span>` : ''}<div class="fl">${E(Engine.FLN[x.s.fl] || x.s.fl)}${r.w + r.l ? ` · <b style="color:${r.w >= r.l ? 'var(--green)' : 'var(--red)'}">${r.w}W ${r.l}L</b>` : ''}</div><div class="n">${E(x.s.n)}</div><div class="why">${E(x.why || '')}${x.verify || x.s.verify ? ' <span class="dim">(por confirmar)</span>' : ''}</div></button>`; });
    h += `</div></div><div class="mini"></div>`;
    $('#s3').innerHTML = `<div class="sidepick">` + h; FX.all($('#s3'));
    mountCanvas();
    $$('#s3 .big-toggle button').forEach(b => b.onclick = () => { S.selected = null; S.focus = null; commit({ side: b.dataset.side, siteKnown: b.dataset.side === 'def' ? true : S.siteKnown, strat: 'default' }); });
    $$('#s3 .sitecard[data-site]').forEach(b => { b.onmouseenter = () => { if (preview !== b.dataset.site) { preview = b.dataset.site; renderCanvas(); } }; b.onfocus = b.onmouseenter; });
    $$('#s3 .sitecard[data-site]').forEach(b => b.onclick = () => { preview = null; S.floorIdx = null; S.selected = null; S.focus = null; S.step = 4; commit({ site: b.dataset.site, siteKnown: true, strat: 'default' }); });
    const ah = $('#applyHint'); if (ah) ah.onclick = () => { S.step = 4; S.floorIdx = null; const hs = S.hint.site; commit({ site: hs || site().id, siteKnown: !!hs || S.side === 'def', strat: S.hint.strat || 'default' }); };
    preview = null; const u = $('#s3 [data-unknown]'); if (u) u.onclick = () => { S.step = 4; const pk = (PICKS[m.id] || [])[0]; commit({ site: pk ? pk.site : m.sites[0].id, siteKnown: false, strat: 'default' }); };
  }
  // ---- llamadas por jugador (lo que se dice en voz alta)
  function callSheet() {
    const m = map(), s = site(), x = curStrat(); const isAtk = S.side === 'atk';
    return ROSTER().map((p, i) => {
      const pick = S.picks[p.id] || {}; const o = Engine.op(pick.op); const c = { slot: p.id, name: p.nick || p.id, color: COL(p.id), o, op: o ? o.n : '—', role: '', go: '', sub: '', room: '' };
      if (!o) { c.go = 'Sin operador'; return c; }
      const so = x && (x.ops.find(y => y.op === o.id) || x.ops[i]); // si cambiaste de operador, hereda el puesto del plan
      if (isAtk) {
        if (so) { const P = repairPath(m, so, s); so._fix = P; const entry = P.find(st => st.f !== -1 && st.f !== '-1') || P[0]; const last = P[P.length - 1]; c.role = ROLES[so.role] ? ROLES[so.role].n : so.role; c.go = `${so.spawn} → ${entry ? entry.room : '…'}${last && last !== entry ? ' → ' + last.room : ''}`; c.sub = so.final || ''; c.room = entry ? entry.room : ''; c.so = so; }
        else { const j = Engine.jobFor(s, o); c.role = ROLES[o.roles[0]].n; c.go = j.where; c.sub = j.base; }
      } else {
        if (so) { c.role = String(so.role || '').toUpperCase(); c.go = so.room; c.sub = so.job || ''; c.room = so.room; c.so = so; }
        else { const d = Engine.defPlan(s, slots()).find(q => q.slot === p.id); c.role = d && d.role || ''; c.go = d && d.where || ''; c.sub = o.ctr || ''; }
      }
      return c;
    });
  }
  // ---- paso 3: PREPARACIÓN (45 s) · sin párrafos: quién, qué operador, por dónde entra
  const OPIMG = id => `img/ops/${id}.svg`;
  const opPlate = (o, cls) => o ? `<span class="plate ${cls || ''}"><img src="${OPIMG(o.id)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'${E(o.n).slice(0, 2).toUpperCase()}',className:'ini'}))"></span>` : `<span class="plate empty"><b class="ini">?</b></span>`;
  const ROLE_ES = { duro: 'ABRE PARED', antigadget: 'LIMPIA GADGETS', blando: 'VERTICAL', intel: 'DRONES', entrada: 'ENTRA 1º', flanco: 'CUIDA ESPALDA', negacion: 'HUMO / FUEGO', soporte: 'APOYO' };

  // Otra comp: conserva el rol de cada puesto pero cambia los operadores
  function otraComp() {
    const x = curStrat(); const isAtk = S.side === 'atk'; const pool = isAtk ? Engine.atk() : Engine.def();
    const usados = new Set(); const picks = {};
    ROSTER().forEach((p, i) => {
      const so = x && x.ops[i]; const actual = (S.picks[p.id] || {}).op;
      let cand;
      if (isAtk && so) { const rol = so.role; cand = pool.filter(o => o.roles.includes(rol) && !usados.has(o.id)); }
      else if (!isAtk && so) { const base = Engine.op(so.op); const site = siteStrats(); const sug = new Set((site ? site.defense : []).flatMap(d => d.ops.map(o => o.op))); cand = pool.filter(o => !usados.has(o.id) && (sug.has(o.id) || (base && o.side === base.side))); }
      else { const o0 = Engine.op(actual); cand = pool.filter(o => !usados.has(o.id) && (!o0 || o.roles[0] === o0.roles[0])); }
      if (!cand || !cand.length) cand = pool.filter(o => !usados.has(o.id));
      const k = cand.findIndex(o => o.id === actual);
      const pick = cand[(k + 1 + cand.length) % cand.length] || cand[0];
      if (pick) { usados.add(pick.id); picks[p.id] = { op: pick.id }; }
    });
    S.stratKey = `${S.map}/${site().id}/${S.side}/${x ? x.id : 'libre'}`; // marca la comp como ya aplicada para que no la pise la estrategia
    commit({ picks });
    Store.toast('Otra comp · mismos roles, otros operadores');
  }
  const PREP_T = 45;
  const prepT = () => { if (!S.prep) return 0; if (!S.prep.playing) return S.prep.t || 0; return Math.min(PREP_T, (Date.now() - S.prep.t0) / 1000); };
  function renderS4() {
    const m = map(), s = site(), x = curStrat(); const isAtk = S.side === 'atk'; const st = siteStrats(); const list = st ? (isAtk ? st.attack : st.defense) : [];
    const cards = callSheet();
    let h = `<div class="sheet">
      <div class="sh-top"><span class="chip ${isAtk ? 'acc' : ''}" style="${isAtk ? '' : 'border-color:var(--def);color:#f0ad5a'}">${ICO[isAtk ? 'atk' : 'def']}${isAtk ? 'ATAQUE' : 'DEFENSA'}</span><b>${E(m.n)}</b><span class="sep">/</span><b class="obj">${E(s.n)}</b><span class="chip">R${S.round}</span>${S.siteKnown ? '' : '<span class="chip red">SITIO ?</span>'}</div>`;
    if (list && list.length) h += `<div class="stratrow">${list.map(z => `<button class="${x && x.id === z.id ? 'on' : ''}" data-strat="${z.id}"><b>${E(z.tag || z.n)}</b></button>`).join('')}</div>`;
    h += `<div class="crew">` + cards.map(c => {
      const P = c.so && c.so._fix || [];
      const via = { breach: 'PARED', door: 'PUERTA', window: 'VENTANA', rappel: 'RAPPEL', stairs: 'ESCALERA', hatch: 'ESCOTILLA' };
      let ruta = '';
      if (isAtk && c.so) { const ent = P.find(z => z.f !== -1 && z.f !== '-1') || P[0]; const fin = P[P.length - 1];
        ruta = `<span class="hop">${E(c.so.spawn)}</span><em>›</em>${ent ? `<span class="hop in">${via[ent.via] || 'PUERTA'} ${E(ent.room)}</span><em>›</em>` : ''}<span class="hop obj">${E(fin ? fin.room : s.rooms[0])}</span>`; }
      else if (c.so) ruta = `<span class="hop in">${E(c.so.room)}</span>`;
      const abierta = S.focus === c.slot;
      let det = '';
      if (abierta && c.so) {
        if (isAtk) det = `<ol class="pasos">${P.map(z => `<li><b>${E(z.room)}</b>${z.via && z.via !== 'door' ? ` <i>${E(via[z.via] || z.via)}</i>` : ''}<span>${E(z.do || '')}</span></li>`).join('')}</ol>`
          + ((c.so.clear || []).length ? `<div class="peligro"><span class="k">Limpiar en orden</span><ol>${c.so.clear.map(z => `<li><b>${E(z.room)}</b> · ${E(z.threat)}<span>${E(z.how)}</span></li>`).join('')}</ol></div>` : '')
          + `<div class="fin">▶ ${E(c.so.final || '')}</div>`;
        else det = `<div class="fin">${E(c.so.job || '')}</div>`;
      }
      return `<div class="opcard ${abierta ? 'on' : ''} ${me && me.slot === c.slot ? 'me' : ''}" data-slot="${c.slot}" style="--c:${c.color}">
        <div class="hd">
          ${opPlate(c.o)}
          <div class="meta"><span class="nick">${E(c.name)}</span><span class="opn">${E(c.op)}</span></div>
          <span class="role">${E(isAtk ? (ROLE_ES[(c.so && c.so.role) || ''] || c.role || '') : String((c.so && c.so.role) || c.role || '').toUpperCase())}</span>
          <span class="chev">${abierta ? '▴' : '▾'}</span>
        </div>
        <div class="ruta">${ruta}</div>
        ${det ? `<div class="det">${det}</div>` : ''}
      </div>`;
    }).join('') + `</div>`;
    const t = prepT(); const running = S.prep && S.prep.playing;
    h += `<div class="sh-act">
        <button class="btn p big" id="goLive">▶ EMPEZAR RONDA</button>
        <button class="btn big" id="prepBtn">${running ? '❚❚ ' : '⏱ '}PREP ${fmtT(PREP_T - t)}</button>
        <button class="btn" id="otraComp" title="Mismos roles, otros operadores">⟳ Otra comp</button>
        <button class="btn" id="dictar">🔊</button>
        <button class="btn ghost" id="openDrawer">Detalle</button>
        <button class="btn ghost" id="nextRound">Terminó</button>
      </div></div><div class="mini"></div>`;
    $('#s4').innerHTML = h;
    $$('#s4 .stratrow button').forEach(b => b.onclick = () => applyStrat(b.dataset.strat));
    $$('#s4 .opcard').forEach(d => d.onclick = () => { S.focus = S.focus === d.dataset.slot ? null : d.dataset.slot; save(); renderS4(); renderCanvas(); });
    mountCanvas();
    $('#goLive').onclick = () => { S.step = 5; _finPedido = false; commit({ prep: null, live: { playing: true, t0: Date.now() } }); Store.toast('Ronda en marcha · 3:00'); }; // arranca el reloj solo
    $('#prepBtn').onclick = () => { if (running) commit({ prep: { playing: false, t: prepT() } }); else commit({ prep: { playing: true, t0: Date.now() - prepT() * 1000 } }); };
    $('#otraComp').onclick = otraComp; $('#dictar').onclick = dictate; $('#nextRound').onclick = openResult;
    $('#openDrawer').onclick = () => $('#drawer').classList.add('on');
    Round.ensurePrepTick();
  }
  // ---- paso 4: EN VIVO (mapa grande + reloj + instrucción del operador enfocado)
  const Round = {
    T: 180, raf: null,
    phases() {
      const x = curStrat(); const out = [];
      (x && x.timeline || []).forEach(t => { const mm = String(t).match(/(\d+):(\d\d)\s*[–\-]\s*(\d+):(\d\d)\s*[·:\-]?\s*(.*)/); if (mm) out.push({ from: +mm[1] * 60 + +mm[2], to: +mm[3] * 60 + +mm[4], label: mm[5] || t }); });
      if (out.length || !x || S.side !== 'def') return out;
      // defensa: fases fijas de la ronda a partir del setup
      const rf = (x.reinforce || []).slice(0, 3).join(' · ') || 'refuerzos del sitio';
      const rot = (x.rotations || []).join(' · ');
      const anc = (x.ops || []).filter(o => o.role === 'ancla').map(o => `${(Engine.op(o.op) || {}).n || o.op} en ${o.room}`).join(' · ');
      const roam = (x.ops || []).filter(o => o.role === 'roam').map(o => (Engine.op(o.op) || {}).n || o.op).join(' · ');
      const nRef = (x.reinforce || []).length;
      return [
        { from: 0, to: 45, label: 'Reforzar y gadgets' + (nRef ? ` (${nRef})` : '') },
        { from: 45, to: 105, label: 'Roam' + (roam ? ' · ' + roam.split(' · ')[0] : '') },
        { from: 105, to: 150, label: 'Anclas al sitio' },
        { from: 150, to: 180, label: 'Retake / cortar plant' }
      ];
    },
    phaseIndex() { const ph = this.phases(); const t = this.t(); const i = ph.findIndex(p => t >= p.from && t < p.to); return i < 0 ? (t >= this.T ? ph.length - 1 : 0) : i; },
    arrival() { const ph = this.phases(); if (ph.length >= 3) return ph[ph.length - 1].from; return this.T * .75; },
    t() { if (!S.live) return 0; if (!S.live.playing) return S.live.t || 0; return Math.min(this.T, (Date.now() - S.live.t0) / 1000); },
    progress() { const t = this.t(); const arr = this.arrival(); const pr = {}; ROSTER().forEach(p => { pr[p.id] = S.live ? Math.min(1, t / arr) : 1; }); return pr; },
    play() { const t = this.t(); commit({ live: { playing: true, t0: Date.now() - t * 1000 } }); },
    pause() { commit({ live: { playing: false, t: this.t() } }); },
    reset() { commit({ live: { playing: false, t: 0 } }); },
    ensureTick() { if (this.raf) return; const tick = () => { this.raf = requestAnimationFrame(tick); if (S.step !== 5) return; if (S.live && S.side === 'atk') { MapView.setProgress(this.progress()); this.followFloor(); } renderLiveClock(); }; this.raf = requestAnimationFrame(tick); },
    followFloor() { // el mapa sigue el piso donde va el operador enfocado
      if (!S.live || !S.live.playing || !S.focus) return; const f = MapView.headFloor(S.focus);
      if (f == null || f === S.floorIdx) return; S.floorIdx = f; renderCanvas();
    },
    stopTick() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; },
    prepRaf: null,
    ensurePrepTick() { if (this.prepRaf) return; const tick = () => { this.prepRaf = requestAnimationFrame(tick);
      if (S.step !== 4) { cancelAnimationFrame(this.prepRaf); this.prepRaf = null; return; }
      const b = $('#prepBtn'); if (!b) return; const t = prepT();
      b.textContent = (S.prep && S.prep.playing ? '❚❚ ' : '⏱ ') + 'PREP ' + fmtT(PREP_T - t);
      b.classList.toggle('warn', S.prep && S.prep.playing && PREP_T - t <= 10);
      if (S.prep && S.prep.playing && t >= PREP_T) { S.step = 5; commit({ prep: null, live: { playing: true, t0: Date.now() } }); }
    }; this.prepRaf = requestAnimationFrame(tick); }
  };
  const fmtT = t => { t = Math.max(0, Math.round(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  function renderS5() {
    const cards = callSheet(); const focus = S.focus || (me && cards.some(c => c.slot === me.slot) ? me.slot : cards[0].slot); if (!S.focus) S.focus = focus;
    const isAtk = S.side === 'atk';
    $('#s5').innerHTML = `<div class="lv-canvas"></div><aside class="live"><div class="clock ${isAtk ? '' : 'def'}" id="clock">3:00</div><div class="phase" id="phase">${E(site().n)}</div><div class="ctl"><button class="btn p" id="lvPlay">▶</button><button class="btn" id="lvPause">❚❚</button><button class="btn" id="lvReset">↺</button><button class="btn ghost" id="lvBack">Plan</button></div><div class="now" id="now"></div><div class="tl" id="tl"></div><div class="opchips">${cards.map(c => `<button class="${S.focus === c.slot ? 'on' : ''}" data-slot="${c.slot}" style="--c:${c.color}">${opPlate(c.o, 'sm')}<b>${E(c.op)}</b><small>${E(c.name)}</small></button>`).join('')}</div></aside>`;
    mountCanvas();
    $('#lvPlay').onclick = () => Round.play(); $('#lvPause').onclick = () => Round.pause(); $('#lvReset').onclick = () => Round.reset(); $('#lvBack').onclick = () => goStep(4);
    $$('#s5 .opchips button').forEach(b => b.onclick = () => { S.focus = b.dataset.slot; save(); renderS5(); renderCanvas(); });
    renderLiveClock(true); setTimeout(() => MapView.fit(), 50);
  }
  let lastNowKey = '';
  function paintPhases() { // marca hecha/actual/pendiente y rellena la barra de la etapa en curso
    const bar = $('#phaseBar'); if (!bar) return; const ph = Round.phases(); if (!ph.length) return;
    const live = S.step === 5 && S.live; const t = live ? Round.t() : 0;
    [...bar.children].forEach((el, i) => {
      const p = ph[i]; const done = live && t >= p.to; const now = live ? (t >= p.from && t < p.to) : i === 0;
      el.classList.toggle('done', !!done); el.classList.toggle('now', !!now);
      const fill = el.querySelector('i'); const k = !live ? 0 : done ? 1 : now ? Math.max(0, Math.min(1, (t - p.from) / (p.to - p.from))) : 0;
      fill.style.width = (k * 100) + '%';
    });
  }
  let _finPedido = false;
  function renderLiveClock(force) {
    if (S.step !== 5) return; const t = Round.t(); const cl = $('#clock'); if (!cl) return; cl.textContent = fmtT(Round.T - t);
    // al llegar a 0:00 la ronda cierra sola y pregunta quien gano
    if (S.live && S.live.playing && t >= Round.T && !_finPedido) { _finPedido = true; Round.stopTick(); Store.toast('Se acabo el tiempo · ¿quien gano?'); openResult(); }
    const ph = Round.phases(); const cur = ph.find(p => t >= p.from && t < p.to) || (t >= Round.T ? ph[ph.length - 1] : null);
    const phEl = $('#phase'); if (phEl) phEl.textContent = cur ? cur.label : (S.live ? '' : 'Listo · toca ▶ al empezar la acción');
    const tl = $('#tl'); if (tl && (force || tl.children.length !== ph.length)) tl.innerHTML = ph.map(p => `<div><b>${fmtT(p.from)}–${fmtT(p.to)}</b><span>${E(p.label)}</span></div>`).join('');
    if (tl) [...tl.children].forEach((d, i) => d.classList.toggle('on', ph[i] === cur));
    paintPhases();
    // instrucción del operador enfocado según el avance
    const c = callSheet().find(x => x.slot === S.focus); const now = $('#now'); if (!c || !now) return;
    let key, html;
    if (S.side === 'atk' && c.so) { const path = c.so.path || []; const pr = Round.progress()[c.slot] || 0; const idx = S.live ? Math.min(path.length - 1, Math.floor(pr * path.length)) : 0; const stp = path[idx]; const cz = (c.so.clear || [])[Math.min((c.so.clear || []).length - 1, Math.floor(pr * ((c.so.clear || []).length + 0.5)))]; key = c.slot + ':' + idx + ':' + (pr >= 1); html = `<div class="k">${E(c.name)} · ${E(c.role)}</div><div class="opline">${opPlate(c.o, 'lg')}<span class="op" style="--c:${c.color}">${E(c.op)}</span></div><div class="room">${stp ? E(stp.room) : ''}${stp && stp.via && stp.via !== 'door' ? ' · ' + E(stp.via) : ''}</div><div class="txt">${pr >= 1 ? E(c.so.final || '') : stp ? E(stp.do || '') : ''}</div>${cz && pr < 1 ? `<div class="warn">⚠ ${E(cz.room)}: ${E(cz.threat)}<br><b>${E(cz.how)}</b></div>` : ''}`; }
    else { key = c.slot + ':def'; html = `<div class="k">${E(c.name)} · ${E(c.role)}</div><div class="opline">${opPlate(c.o, 'lg')}<span class="op" style="--c:${c.color}">${E(c.op)}</span></div><div class="room">${E(c.go)}</div><div class="txt">${E(c.sub)}</div>`; }
    if (key !== lastNowKey || force) { now.innerHTML = html; lastNowKey = key; }
  }
  // ---- dictado por voz (para cantar el plan en el lobby)
  function dictate() {
    const s = site(), x = curStrat(); const cards = callSheet();
    const txt = `${S.side === 'atk' ? 'Ataque' : 'Defensa'}, ${s.n}${x ? ', ' + x.n : ''}. ` + cards.filter(c => c.o).map(c => `${c.name.replace(/^o\s+/i, '')}: ${c.op}, ${c.go.replace(/→/g, ', luego ')}.`).join(' ');
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'es-MX'; const v = speechSynthesis.getVoices().find(v => /es[-_]MX/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/i.test(v.lang)); if (v) u.voice = v; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { Store.toast('Tu navegador no tiene voz'); }
  }

  // ---------- panel de tema ----------
  const ICO = { atk: '<span class="sideico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5 20 9l-9.5 9.5L5 13z"/><path d="M5 13l-2 2 2 2 2-2M9 17l-2 2"/></svg></span>', def: '<span class="sideico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg></span>' };
  function openTheme() {
    const t = Theme.cur;
    openModal(`<h3>Tema</h3><div class="sub">Un color para tu equipo y otro para el enemigo. Así se lee el plano de un vistazo. Se guarda en este navegador.</div><div class="themepanel"><div class="sw">${Object.entries(Theme.PRESETS).map(([id, pr]) => `<button class="${t.preset === id ? 'on' : ''}" data-preset="${id}"><i><s style="background:${pr.team}"></s><s style="background:${pr.enemy}"></s></i>${E(pr.n)}</button>`).join('')}</div><div class="row2"><label class="f"><span class="k">Tu equipo</span><input type="color" id="thAtk" value="${t.team}"></label><label class="f"><span class="k">El enemigo</span><input type="color" id="thDef" value="${t.enemy}"></label></div><label class="f"><span class="k">Fuente</span><select class="in" id="thFont">${Object.entries(Theme.FONTN).map(([id, n]) => `<option value="${id}" ${t.font === id ? 'selected' : ''}>${E(n)}</option>`).join('')}</select></label><label class="f"><span class="k">Brillo</span><input type="range" id="thGlow" min="0" max="0.6" step="0.05" value="${t.glow}" style="width:100%"></label><div class="row"><button class="btn p" data-close>Listo</button></div></div>`);
    $$('#modal [data-preset]').forEach(b => b.onclick = () => { Theme.set({ preset: b.dataset.preset }); openTheme(); });
    $('#thAtk').oninput = e => Theme.set({ team: e.target.value, preset: 'custom' }); $('#thDef').oninput = e => Theme.set({ enemy: e.target.value, preset: 'custom' }); $('#thFont').onchange = e => Theme.set({ font: e.target.value }); $('#thGlow').oninput = e => Theme.set({ glow: +e.target.value });
  }
  $('#themeBtn').onclick = openTheme;
  $('#drawerBtn').onclick = () => $('#drawer').classList.toggle('on'); $('#drawerClose').onclick = () => $('#drawer').classList.remove('on');
  // ---------- navegación ----------
  function showView(v) { $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v)); FX.all($('#v-' + v)); $$('.top .nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v)); if (v === 'squad') renderSquad(); if (v === 'ranks') renderRanks(); if (v === 'sala') renderSala(); if (v === 'plan') setTimeout(() => MapView.fit(), 30); if (v !== 'plan') Round.stopTick(); }
  $$('.top .nav button').forEach(b => b.onclick = () => showView(b.dataset.view));
  $$('#sideTabs button').forEach(b => b.onclick = () => { $$('#sideTabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.side .pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.pane)); });
  if ($('#mapSearch')) $('#mapSearch').oninput = renderMapList; $('#salaBtn').onclick = () => showView('sala'); $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  window.__dbg = { repairPath, taskMarks, Round, S, COL, loadStrats, roomPoint, stratRoutes, separar, curStrat, map, site };
  window.addEventListener('resize', () => MapView.fit());
  // ---------- arranque ----------
  const hash = new URLSearchParams(location.hash.slice(1)); if (hash.get('m')) { S.map = hash.get('m'); S.site = hash.get('s') || null; S.step = 4; S.siteKnown = true; }
  render();
  if (!me) openIdentity(() => { if (hash.get('sala')) joinSala(hash.get('sala')); }); else if (hash.get('sala')) joinSala(hash.get('sala'));
})();
