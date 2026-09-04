/* R6 NUEVA SEASON — visor: plano real (r6maps) o croquis de rejilla, con pan/zoom, capas y rutas */
window.MapView = (() => {
  let root, world, imgs = {}, svg, minX = 0, minY = 0, W = 1000, H = 800, s = 1, tx = 0, ty = 0, cur = null, sizes = {}, drag = null, pinDrag = null, opts = {};
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a = {}, txt) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; return e; };
  function mount(container) {
    root = container; root.innerHTML = '<div class="wrap"><div class="world" style="position:absolute;left:0;top:0;transform-origin:0 0"></div></div>';
    world = root.querySelector('.world'); const wrap = root.querySelector('.wrap');
    wrap.addEventListener('pointerdown', e => { if (e.target.closest('.pinhit')) return; drag = { x: e.clientX, y: e.clientY, tx, ty }; wrap.classList.add('drag'); wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', e => { if (pinDrag) { const p = toWorld(e); pinDrag.pt.x = p.x + minX; pinDrag.pt.y = p.y + minY; pinDrag.pt.auto = false; drawRoutes(true); return; } if (!drag) return; tx = drag.tx + (e.clientX - drag.x); ty = drag.ty + (e.clientY - drag.y); apply(); });
    const up = e => { if (pinDrag) { const r = pinDrag; pinDrag = null; drawRoutes(); opts.onPinChange && opts.onPinChange(r.route, r.route.pts); } drag = null; wrap.classList.remove('drag'); };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('wheel', e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const k = Math.exp(-e.deltaY * 0.0012); const ns = Math.min(4, Math.max(0.12, s * k)); tx = mx - (mx - tx) * (ns / s); ty = my - (my - ty) * (ns / s); s = ns; apply(); }, { passive: false });
    wrap.addEventListener('dblclick', e => { if (!opts.editable || !opts.selected) return; const p = toWorld(e); const rt = cur.routes.find(r => r.id === opts.selected); if (!rt) return; const pt = { x: p.x + minX, y: p.y + minY, f: cur.floorIdx, auto: false }; rt.pts.splice(rt.pts.length - 1, 0, pt); rt.pts.forEach(q => q.auto = false); drawRoutes(); opts.onPinChange && opts.onPinChange(rt, rt.pts); });
  }
  function toWorld(e) { const r = root.querySelector('.wrap').getBoundingClientRect(); return { x: (e.clientX - r.left - tx) / s, y: (e.clientY - r.top - ty) / s }; }
  function apply() { world.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; }
  function fit(box) { const r = root.getBoundingClientRect(); const b = box || { x: 0, y: 0, w: W, h: H }; s = Math.min(r.width / b.w, r.height / b.h) * 0.92; tx = (r.width - b.w * s) / 2 - b.x * s; ty = (r.height - b.h * s) / 2 - b.y * s; apply(); }
  function loadSize(src) { return new Promise(res => { if (sizes[src]) return res(sizes[src]); const im = new Image(); im.onload = () => { sizes[src] = { w: im.naturalWidth, h: im.naturalHeight }; res(sizes[src]); }; im.onerror = () => res(null); im.src = src; }); }
  // ---------- render ----------
  async function show(o) {
    opts = o; const { map, floorIdx } = o; const changed = !cur || cur.map !== map;
    cur = { ...o };
    world.innerHTML = ''; imgs = {};
    if (map.r6 && map.floorImgs && map.floorImgs.length) {
      // mundo = unión de imágenes en coordenadas r6maps (centro = 0,0)
      const fl = map.r6.floors; const dims = await Promise.all(fl.map(f => loadSize(map.floorImgs.find(x => x.idx === f.index)?.src || '')));
      minX = Infinity; minY = Infinity; let maxX = -Infinity, maxY = -Infinity;
      fl.forEach((f, i) => { const d = dims[i]; if (!d) return; minX = Math.min(minX, f.left); minY = Math.min(minY, f.top); maxX = Math.max(maxX, f.left + d.w); maxY = Math.max(maxY, f.top + d.h); });
      if (!isFinite(minX)) { minX = -600; minY = -500; maxX = 600; maxY = 500; }
      W = maxX - minX; H = maxY - minY;
      const bg = fl.find(f => f.bg); const curF = fl.find(f => f.index === floorIdx) || fl.find(f => f.def) || fl[0];
      const order = [bg, curF].filter((f, i, a) => f && a.indexOf(f) === i);
      order.forEach(f => { const src = map.floorImgs.find(x => x.idx === f.index)?.src; if (!src) return; const im = document.createElement('img'); im.className = 'floorimg'; im.src = src; im.style.left = (f.left - minX) + 'px'; im.style.top = (f.top - minY) + 'px'; im.draggable = false; if (f !== curF) im.style.opacity = '.38'; world.appendChild(im); imgs[f.index] = im; });
      svg = el('svg', { class: 'ov', width: W, height: H, viewBox: `0 0 ${W} ${H}` }); svg.style.width = W + 'px'; svg.style.height = H + 'px'; world.appendChild(svg);
      drawR6(); drawRoutes();
      if (o.zoomSite) { // acercarse al sitio elegido
        const set = Engine.siteSet(map, o.site);
        if (set && set.bombs.length) { const xs = set.bombs.map(b => b.left), ys = set.bombs.map(b => b.top); const pad = 300;
          fit({ x: Math.min(...xs) - minX - pad, y: Math.min(...ys) - minY - pad, w: (Math.max(...xs) - Math.min(...xs)) + pad * 2, h: (Math.max(...ys) - Math.min(...ys)) + pad * 2 }); }
        else { const z2 = map.r6.zoom; if (z2) fit({ x: z2.topLeft.left - minX - 60, y: z2.topLeft.top - minY - 60, w: z2.bottomRight.left - z2.topLeft.left + 120, h: z2.bottomRight.top - z2.topLeft.top + 120 }); }
      }
      else if (changed || o.refit) { const z = map.r6.zoom; if (z) fit({ x: z.topLeft.left - minX - 60, y: z.topLeft.top - minY - 60, w: z.bottomRight.left - z.topLeft.left + 120, h: z.bottomRight.top - z.topLeft.top + 120 }); else { const d = dims[fl.indexOf(curF)] || { w: 1200, h: 1000 }; fit({ x: curF.left - minX, y: curF.top - minY, w: d.w, h: d.h }); } }
    } else {
      minX = 0; minY = 0; W = 1400; H = 1000;
      svg = el('svg', { class: 'ov', width: W, height: H, viewBox: `0 0 ${W} ${H}` }); svg.style.width = W + 'px'; svg.style.height = H + 'px'; world.appendChild(svg);
      drawGrid(); drawRoutes();
      if (changed || o.refit) fit();
    }
  }
  function drawR6() {
    const { map, site, floorIdx } = cur; const r = map.r6; const set = Engine.siteSet(map, site); const X = x => x - minX, Y = y => y - minY;
    const g = el('g', { class: 'r6 hit' }); svg.appendChild(g);
    // escotillas
    r.hatches.filter(h => h.f === floorIdx).forEach(h => { g.appendChild(el('rect', { class: 'hatch', x: X(h.left) - 9, y: Y(h.top) - 9, width: 18, height: 18, rx: 2, stroke: cur.teamColor || '#cfd8e3', opacity: .55 })); });
    // bombas
    const team = cur.teamColor || '#2f7fd4';          // color de TU equipo
    const enemy = cur.enemyColor || '#8158c8';        // color del equipo contrario
    r.bombs.filter(b => b.f === floorIdx).forEach(b => {
      const on = set && b.set === set.set; const R = on ? (cur.zoomSite ? 32 : 25) : 14; const cx = X(b.left), cy = Y(b.top);
      const col = on ? team : '#5a636d';
      const gg = el('g', { class: 'bombmk' + (on ? '' : ' off') });
      if (on && cur.zoomSite) gg.appendChild(el('circle', { class: 'pulse', cx, cy, r: R + 10, fill: 'none', stroke: col, 'stroke-width': 2 }));
      gg.appendChild(el('circle', { cx, cy, r: R, fill: 'rgba(8,10,13,.88)', stroke: col, 'stroke-width': on ? 3 : 1.5, 'stroke-dasharray': on ? 'none' : '4 3' }));
      // la LETRA manda
      gg.appendChild(el('text', { class: 'bletra', x: cx, y: cy + (on ? R * .34 : R * .32), 'text-anchor': 'middle', fill: col, style: `font-size:${on ? R * 1.15 : R * 1.1}px` }, b.letter));
      // sello de bomba en la esquina, para saber que es el objetivo
      if (on) { const br = R * .40, bx = cx + R * .72, by = cy - R * .72;
        gg.appendChild(el('circle', { cx: bx, cy: by, r: br, fill: col }));
        const im = el('image', { x: bx - br * .68, y: by - br * .68, width: br * 1.36, height: br * 1.36, preserveAspectRatio: 'xMidYMid meet' });
        im.setAttribute('href', 'img/ui/bomb.svg'); im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', 'img/ui/bomb.svg'); gg.appendChild(im); }
      g.appendChild(gg);
    });
    // spawns (exterior)
    r.spawns.forEach(sp => { g.appendChild(el('circle', { class: 'spawn', cx: X(sp.left), cy: Y(sp.top), r: 14 })); g.appendChild(el('text', { class: 'sp', x: X(sp.left), y: Y(sp.top) + 4, 'text-anchor': 'middle' }, sp.letter || 'S')); g.appendChild(el('text', { class: 'room out', x: X(sp.left), y: Y(sp.top) + 28, 'text-anchor': 'middle' }, (sp.es || sp.en || '').replace(/<br\s*\/?>/g, ' '))); });
    // labels
    if (cur.labels !== false) r.rooms.filter(l => l.f === floorIdx || l.out).forEach(l => { const t = el('text', { class: 'room' + (l.small ? ' small' : '') + (l.out ? ' out' : ''), x: X(l.left), y: Y(l.top), 'text-anchor': 'middle' }); const lines = String(cur.lang === 'en' ? l.en : l.es || l.en).split(/<br\s*\/?>/); lines.forEach((ln, i) => { t.appendChild(el('tspan', { x: X(l.left), dy: i ? 13 : 0 }, ln)); }); g.appendChild(t); });
  }
  function drawGrid() {
    const { map, site, floorIdx } = cur; const cell = 100; const g = el('g', { class: 'grid' }); svg.appendChild(g);
    const fl = (site.geo && (site.geo[floorIdx] || site.geo[site.fl])) || []; g.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0b0c0e' }));
    fl.forEach(rm => { const x = rm.c * cell + 6, y = rm.r * cell + 6, w = rm.w * cell - 12, h = rm.h * cell - 12; const cls = rm.t === 'site' ? 'gs' : rm.t === 'ext' ? 'ge' : 'gr'; g.appendChild(el('rect', { x, y, width: w, height: h, rx: 4, fill: rm.t === 'site' ? 'rgba(226,147,47,.16)' : rm.t === 'ext' ? 'rgba(255,255,255,.02)' : 'rgba(80,110,160,.14)', stroke: rm.t === 'site' ? '#e2932f' : rm.t === 'ext' ? '#2f353d' : '#4a5566', 'stroke-width': rm.t === 'site' ? 2 : 1.2, 'stroke-dasharray': rm.t === 'ext' ? '6 5' : 'none' })); const t = el('text', { class: 'room' + (rm.t === 'ext' ? ' out' : ''), x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle' }, rm.n); g.appendChild(t); if (rm.t === 'site') g.appendChild(el('text', { class: 'bl', x: x + 10, y: y + 18 }, '◆ BOMBA')); });
    if (!fl.length) { g.appendChild(el('text', { class: 'room', x: W / 2, y: H / 2, 'text-anchor': 'middle' }, 'Sin croquis para este piso — sube el plano con el botón PLANO')); }
  }
  function gridPoint(name) { const { site, floorIdx } = cur; const fl = (site.geo && (site.geo[floorIdx] || site.geo[site.fl])) || []; const n = Store.norm(name.replace(/\(.*?\)/g, '')); const rm = fl.find(r => Store.norm(r.n) === n) || fl.find(r => Store.norm(r.n).includes(n) || n.includes(Store.norm(r.n))); return rm ? { x: rm.c * 100 + rm.w * 50, y: rm.r * 100 + rm.h * 50, f: floorIdx } : null; }
  // ---------- rutas: geometría por pathfinding (Router) sobre la máscara del piso ----------
  let drawToken = 0;
  function bgFloor() { const r = cur.map.r6; if (!r) return null; return r.floors.find(f => f.bg) || null; }
  function inFloorImg(f, p) { const src = cur.map.floorImgs.find(x => x.idx === f.index)?.src; const d = src && sizes[src]; if (!d) return false; return p.x >= f.left && p.y >= f.top && p.x <= f.left + d.w && p.y <= f.top + d.h; }
  function segFloor(a, b) { // en qué piso se calcula el tramo a→b (null = cambio de piso: línea directa)
    const r = cur.map.r6; if (!r) return null; const F = i => r.floors.find(f => f.index === i);
    if (a.f >= 0 && b.f >= 0) return a.f === b.f ? F(a.f) : null;               // mismo piso
    const bg = bgFloor() || r.floors.find(f => f.def) || r.floors[0];
    if (a.f < 0 && b.f < 0) return bg;                                          // exterior puro: plano de fondo (trae el terreno)
    const fl = F(a.f >= 0 ? a.f : b.f), ext = a.f < 0 ? a : b;
    if (fl && fl !== bg && inFloorImg(fl, ext)) return fl;                      // el punto exterior cae dentro de ese plano
    return bg;                                                                   // entrada al edificio: se traza en el plano de fondo
  }
  async function geometry(rt, fast) {
    const pts = rt.pts; if (!pts || pts.length < 2) return null;
    const key = JSON.stringify(pts.map(p => [Math.round(p.x), Math.round(p.y), p.f])) + (fast ? 'F' : '');
    if (rt._geo && rt._geoKey === key) return rt._geo;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]; const via = b.via || ''; const jumpVia = ((via === 'rappel' || via === 'window') && b.f >= 0 && a.f !== b.f) || (a.f !== b.f && a.f >= 0 && b.f >= 0 && (via === 'hatch' || via === 'stairs')) || (a.f < 0 && b.f > 1 && !via);
      const fl = jumpVia ? null : segFloor(a, b); let line = null, kind = 'walk';
      if (fl && !fast) {
        const mode = a.f < 0 && b.f < 0 ? 'outdoor' : a.f >= 0 && b.f >= 0 ? 'indoor' : 'enter';
        try { line = await Router.route(cur.map.id, fl, a, b, { mode }); } catch (e) { line = null; }
        const bg = bgFloor(); // si no hay camino en ese plano, reintenta en el plano de fondo antes de rendirse
        if (!line && bg && bg !== fl) { try { line = await Router.route(cur.map.id, bg, a, b, { mode }); } catch (e) { line = null; } }
      }
      if (!line) { line = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]; kind = fl ? 'straight' : 'level'; }
      segs.push({ line, f: fl ? fl.index : null, kind, ext: a.f < 0 || b.f < 0, via: jumpVia ? via : null, up: fl ? null : (b.f > a.f ? 'up' : 'down') });
    }
    rt._geo = segs; rt._geoKey = key; return segs;
  }
  // ---------- dibujo de rutas: líneas limpias, píldora con el nombre, números, cabeza animable ----------
  let routeEls = {};
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return L; }
  function pointAt(pts, d) { for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (d <= l || i === pts.length - 1) { const k = l ? Math.max(0, Math.min(1, d / l)) : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k }; } d -= l; } return pts[pts.length - 1]; }
  let clipN = 0;
  function defs() { let d = svg.querySelector('defs'); if (!d) { d = el('defs'); svg.insertBefore(d, svg.firstChild); } return d; }
  function portrait(g, x, y, r, rt, big) { // círculo con la insignia del operador y aro del color de su línea
    const gg = el('g', { class: 'port' });
    gg.appendChild(el('circle', { cx: x, cy: y, r: r + 3, fill: 'rgba(6,9,12,.92)' }));
    if (rt.opId) {
      const id = 'cp' + (++clipN); const cp = el('clipPath', { id }); cp.appendChild(el('circle', { cx: x, cy: y, r })); defs().appendChild(cp);
      const im = el('image', { x: x - r, y: y - r, width: r * 2, height: r * 2, 'clip-path': `url(#${id})`, preserveAspectRatio: 'xMidYMid meet', opacity: .96 });
      im.setAttribute('href', `img/ops/${rt.opId}.svg`); im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `img/ops/${rt.opId}.svg`);
      im.addEventListener('error', () => { im.remove(); gg.appendChild(el('text', { class: 'bn', x, y: y + 4, 'text-anchor': 'middle' }, rt.tag || '')); });
      gg.appendChild(im);
    } else gg.appendChild(el('text', { class: 'bn', x, y: y + 4, 'text-anchor': 'middle' }, rt.tag || ''));
    gg.appendChild(el('circle', { cx: x, cy: y, r: r + 1.5, fill: 'none', stroke: rt.ring || rt.color, 'stroke-width': big ? 4 : 3 }));
    g.appendChild(gg); return gg;
  }
  function pill(g, x, y, text, color, big) { const w = text.length * (big ? 8.2 : 6.6) + 18, h = big ? 24 : 20; const gg = el('g', { class: 'pill' }); gg.appendChild(el('rect', { x: x - 6, y: y - h / 2, width: w, height: h, rx: h / 2, fill: 'rgba(3,6,10,.85)', stroke: color, 'stroke-width': 1.5 })); gg.appendChild(el('text', { class: 'pl' + (big ? ' big' : ''), x: x + 3, y: y + (big ? 5 : 4), fill: color }, text)); g.appendChild(gg); return gg; }
  function badge(g, x, y, n, color, r = 9) { g.appendChild(el('circle', { cx: x, cy: y, r, fill: color, stroke: '#000', 'stroke-width': 2 })); g.appendChild(el('text', { class: 'bn', x, y: y + 3.5, 'text-anchor': 'middle' }, String(n))); }
  async function drawRoutes(fast) {
    const token = ++drawToken; const { routes = [], floorIdx, editable, selected } = cur; const X = x => x - minX, Y = y => y - minY;
    const geoms = await Promise.all(routes.map(rt => geometry(rt, fast)));
    if (token !== drawToken) return;
    svg.querySelectorAll('.routes').forEach(x => x.remove()); const g = el('g', { class: 'routes hit' }); svg.appendChild(g); routeEls = {};
    const anim = !!cur.progress;
    routes.forEach((rt, ri) => {
      let pts = rt.pts;
      if (!pts && !cur.map.r6) { pts = (rt.vec && rt.vec.path || []).map(gridPoint).filter(Boolean); if (pts.length < 2) return; rt.pts = pts; }
      const sel = selected === rt.id; const dim = selected && !sel ? .25 : 1; const w = sel ? 7 : 4.5;
      if (rt.mark && pts && pts.length === 1) { const p = pts[0]; if (p.f !== floorIdx && p.f !== -1) return; const gg = el('g', { opacity: dim }); gg.appendChild(el('circle', { cx: X(p.x), cy: Y(p.y), r: 22, fill: rt.color, opacity: .16 })); portrait(gg, X(p.x), Y(p.y), 14, rt, sel); const side = ri % 2 ? 1 : -1; pill(gg, X(p.x) + 22, Y(p.y) + side * (18 + (ri >> 1) * 22), rt.label || '', rt.color, sel); g.appendChild(gg); return; }
      if (!pts || pts.length < 2) return;
      const segs = geoms[ri] || []; const rg = el('g', { class: 'rt', 'data-slot': rt.id, opacity: dim }); g.appendChild(rg);
      const rec = { paths: [], total: 0, color: rt.color }; routeEls[rt.id] = rec; let cum = 0;
      segs.forEach((sg, si) => {
        const here = sg.f === floorIdx || sg.f === null || sg.ext; const op = here ? 1 : .3;
        const solid = sg.line.filter(p => !p.jump); const len = polyLen(solid); const d = solid.map((p, i) => (i ? 'L' : 'M') + X(p.x) + ' ' + Y(p.y)).join(' ');
        const sw = sg.kind === 'walk' ? w : Math.max(2.5, w - 2);
        if (anim) rg.appendChild(el('path', { class: 'route base' + (sg.kind !== 'walk' ? ' ghost' : ''), d, stroke: rt.color, 'stroke-width': sw, opacity: op * .3 })); // plan completo, tenue
        const pe = el('path', { class: 'route' + (sg.kind !== 'walk' ? ' ghost' : ''), d, stroke: rt.color, 'stroke-width': sw, opacity: op }); rg.appendChild(pe);
        if (anim) { pe.setAttribute('stroke-dasharray', len); pe.setAttribute('stroke-dashoffset', len); }
        rec.paths.push({ el: pe, len, start: cum, pts: solid, here, f2: sg.f }); cum += len;
        const jp = sg.line.find(p => p.jump); if (jp && solid.length) { const lp = solid[solid.length - 1]; rg.appendChild(el('path', { class: 'route ghost', d: `M${X(lp.x)} ${Y(lp.y)} L${X(jp.x)} ${Y(jp.y)}`, stroke: rt.color, 'stroke-width': 3, opacity: op * .8 })); }
        if (sg.kind === 'level') { const m = sg.line[sg.line.length - 1]; const lbl = sg.via === 'rappel' ? '↗ rappel' : sg.via === 'window' ? '↗ ventana' : sg.via === 'hatch' ? (sg.up === 'up' ? '▲ escotilla' : '▼ escotilla') : sg.via === 'stairs' ? (sg.up === 'up' ? '▲ escaleras' : '▼ escaleras') : (sg.up === 'up' ? '▲ sube' : '▼ baja'); pill(rg, X(m.x) + 14, Y(m.y) - 14, lbl, rt.color, false); }
        if (si === segs.length - 1 && solid.length >= 2) { const a = solid[solid.length - 2], b = solid[solid.length - 1]; const ang = Math.atan2(b.y - a.y, b.x - a.x), L = 16; const p1 = { x: b.x - L * Math.cos(ang - .5), y: b.y - L * Math.sin(ang - .5) }, p2 = { x: b.x - L * Math.cos(ang + .5), y: b.y - L * Math.sin(ang + .5) }; rg.appendChild(el('path', { d: `M${X(p1.x)} ${Y(p1.y)} L${X(b.x)} ${Y(b.y)} L${X(p2.x)} ${Y(p2.y)}`, fill: 'none', stroke: rt.color, 'stroke-width': w, 'stroke-linecap': 'round', opacity: op })); }
      });
      rec.total = cum;
      // zonas de defensores: punto rojo numerado (texto solo si está seleccionada)
      (rt.clear || []).forEach((c, ci) => { if (c.f !== floorIdx) return; const gg = el('g', { class: 'clearzone' }); const en = cur.enemyColor || '#c8442f'; gg.appendChild(el('circle', { cx: X(c.x), cy: Y(c.y), r: 20, fill: 'rgba(0,0,0,.25)', stroke: en, 'stroke-width': 2, 'stroke-dasharray': '5 4' })); badge(gg, X(c.x) - 15, Y(c.y) - 15, ci + 1, en); if (sel) pill(gg, X(c.x) + 24, Y(c.y) + 2, c.short || '', cur.enemyColor || '#c8442f', false); rg.appendChild(gg); });
      // waypoints numerados (solo seleccionada) + arrastre en edición
      pts.forEach((p, i) => { const here = p.f === floorIdx || p.f === -1; const last = i === pts.length - 1; if (i === 0 || last) return; if (sel) { badge(rg, X(p.x), Y(p.y), i, rt.color, 8); } else rg.appendChild(el('circle', { cx: X(p.x), cy: Y(p.y), r: 3.5, fill: '#03060a', stroke: rt.color, 'stroke-width': 2, opacity: here ? 1 : .3 })); if (editable && sel) { const c = el('circle', { class: 'pinhit', cx: X(p.x), cy: Y(p.y), r: 12, fill: 'transparent' }); c.addEventListener('pointerdown', e => { e.stopPropagation(); pinDrag = { route: rt, pt: p }; }); rg.appendChild(c); } });
      // inicio (spawn) con píldora del operador; fin = bomba
      const a0 = pts[0], b0 = pts[pts.length - 1];
      portrait(rg, X(a0.x), Y(a0.y), sel ? 16 : 13, rt, sel);
      pill(rg, X(a0.x) + (sel ? 22 : 19), Y(a0.y) - 18, rt.label || '', rt.color, sel);
      rg.appendChild(el('circle', { cx: X(b0.x), cy: Y(b0.y), r: 6, fill: '#03060a', stroke: rt.color, 'stroke-width': 3 }));
      // cabeza animada
      if (anim) { const hg = el('g', { class: 'head' }); portrait(hg, 0, 0, 12, rt, false); rg.appendChild(hg); rec.head = hg; }
    });
    if (anim) setProgress(cur.progress);
  }
  function setProgress(prog) { // prog: {slotId: 0..1}
    if (!cur) return; cur.progress = prog; const X = x => x - minX, Y = y => y - minY;
    for (const [id, rec] of Object.entries(routeEls)) { const p = Math.max(0, Math.min(1, prog[id] == null ? 1 : prog[id])); const d = rec.total * p; let head = null;
      rec.paths.forEach(ph => { if (!ph.len) return; const end = ph.start + ph.len; if (d >= end) { ph.el.setAttribute('stroke-dashoffset', 0); head = ph.pts[ph.pts.length - 1]; } else if (d <= ph.start) ph.el.setAttribute('stroke-dashoffset', ph.len); else { ph.el.setAttribute('stroke-dashoffset', ph.len - (d - ph.start)); head = pointAt(ph.pts, d - ph.start); } });
      if (rec.head && head) { rec.head.setAttribute('transform', `translate(${X(head.x)},${Y(head.y)})`); rec.head.style.display = p > 0 ? '' : 'none'; }
      rec.headFloor = null; { let d2 = rec.total * p; for (const ph of rec.paths) { if (!ph.len) continue; if (d2 <= ph.start + ph.len) { rec.headFloor = ph.f2; break; } } }
    }
  }
  function setFloor(idx) { if (!cur) return; show({ ...cur, floorIdx: idx }); }
  function zoom(k) { const r = root.getBoundingClientRect(); const mx = r.width / 2, my = r.height / 2; const ns = Math.min(4, Math.max(0.12, s * k)); tx = mx - (mx - tx) * (ns / s); ty = my - (my - ty) * (ns / s); s = ns; apply(); }
  function headFloor(id) { const r = routeEls[id]; return r ? r.headFloor : null; }
  return { mount, show, setFloor, headFloor, fit: () => cur && show({ ...cur, refit: true }), zoom, redraw: () => cur && drawRoutes(), setProgress, get cur() { return cur; } };
})();
