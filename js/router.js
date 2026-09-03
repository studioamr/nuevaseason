/* R6 NUEVA SEASON — pathfinding sobre la máscara del plano (0 pared · 128 rompible · 255 libre) */
window.Router = (() => {
  const masks = {}; let MAN = null;
  async function manifest() { if (MAN) return MAN; try { MAN = await fetch('js/masks-manifest.json?t=' + Date.now()).then(r => r.json()); } catch (e) { MAN = {}; } return MAN; }
  function loadMask(mapId, idx) {
    const key = mapId + '/' + idx; if (masks[key]) return masks[key];
    masks[key] = new Promise(async res => {
      const man = await manifest(); const meta = man[mapId] && man[mapId][String(idx)]; if (!meta) return res(null);
      const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, im.width, im.height).data; const grid = new Uint8Array(im.width * im.height); for (let i = 0; i < grid.length; i++) grid[i] = d[i * 4]; res({ ...meta, grid }); }; im.onerror = () => res(null); im.src = `img/masks/${mapId}/${idx}.png?v=${man._v || 0}`;
    });
    return masks[key];
  }
  const baseCost = v => v === 0 ? Infinity : v === 128 ? 7 : 1; // 0 pared · 128 rompible · 64 interior · 255 exterior
  function nearestFree(m, cx, cy, R = 10) { // celda libre más cercana (labels a veces caen en pared/mueble)
    const at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 0 : m.grid[y * m.w + x];
    if (at(cx, cy) > 0) return [cx, cy];
    for (let r = 1; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (at(cx + dx, cy + dy) === 255 || at(cx + dx, cy + dy) === 64) return [cx + dx, cy + dy]; }
    for (let r = 1; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (at(cx + dx, cy + dy) > 0) return [cx + dx, cy + dy]; }
    return [cx, cy];
  }
  function astar(m, s, g, cost) {
    cost = cost || baseCost; const W = m.w, H = m.h, G = m.grid; const idx = (x, y) => y * W + x;
    const open = []; const came = new Int32Array(W * H).fill(-1); const gs = new Float32Array(W * H).fill(Infinity); const closed = new Uint8Array(W * H);
    const h = (x, y) => Math.hypot(x - g[0], y - g[1]);
    const push = (f, i) => { open.push([f, i]); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break; [open[p], open[k]] = [open[k], open[p]]; k = p; } };
    const pop = () => { const top = open[0]; const last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, mI = k; if (l < open.length && open[l][0] < open[mI][0]) mI = l; if (r < open.length && open[r][0] < open[mI][0]) mI = r; if (mI === k) break; [open[mI], open[k]] = [open[k], open[mI]]; k = mI; } } return top; };
    const si = idx(s[0], s[1]), gi = idx(g[0], g[1]); gs[si] = 0; push(h(s[0], s[1]), si); let iter = 0; let best = si, bestH = h(s[0], s[1]);
    while (open.length && iter++ < 4000000) {
      const [, i] = pop(); if (i === gi) break; if (closed[i]) continue; closed[i] = 1; const x = i % W, y = (i / W) | 0; const hh = h(x, y); if (hh < bestH) { bestH = hh; best = i; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const ni = idx(nx, ny); if (closed[ni]) continue; const c = cost(G[ni], nx, ny); if (c === Infinity) continue; if (dx && dy && (G[idx(x + dx, y)] === 0 || G[idx(x, y + dy)] === 0)) continue; // no cortar esquinas de pared
        const ng = gs[i] + c * (dx && dy ? 1.4142 : 1); if (ng < gs[ni]) { gs[ni] = ng; came[ni] = i; push(ng + h(nx, ny), ni); } }
    }
    let partial = false; let target = gi; if (came[gi] < 0 && gi !== si) { if (best === si) return null; target = best; partial = true; } // inalcanzable: llega lo más cerca posible
    const path = []; let cur = target; while (cur >= 0) { path.push([cur % W, (cur / W) | 0]); if (cur === si) break; cur = came[cur]; } path.reverse(); path.partial = partial; return path;
  }
  function los(m, a, b) { // línea de vista sin cruzar pared (Bresenham)
    let [x0, y0] = a; const [x1, y1] = b; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { const v = m.grid[y0 * m.w + x0]; if (v === 0) return false; if (x0 === x1 && y0 === y1) return true; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function pull(m, path) { // string pulling: quita puntos intermedios cuando hay línea de vista (respeta rompibles como paso caro pero visible)
    if (!path || path.length < 3) return path; const out = [path[0]]; let i = 0;
    while (i < path.length - 1) { let j = path.length - 1; while (j > i + 1 && !los(m, path[i], path[j])) j--; out.push(path[j]); i = j; }
    return out;
  }
  // Ruta en coordenadas mundo entre dos puntos del mismo piso. floor = {index,left,top}. Devuelve [{x,y}] o null.
  const memo = new Map();
  async function route(mapId, floor, from, to, opts) {
    opts = opts || {}; const mk = `${mapId}|${floor.index}|${opts.mode || ''}|${Math.round(from.x)},${Math.round(from.y)}|${Math.round(to.x)},${Math.round(to.y)}`; if (memo.has(mk)) return memo.get(mk);
    const r = await routeRaw(mapId, floor, from, to, opts); memo.set(mk, r); return r;
  }
  async function routeRaw(mapId, floor, from, to, opts) {
    const m = await loadMask(mapId, floor.index); if (!m) return null; const c = m.cell;
    let cost = baseCost; // modos: outdoor = no entrar al edificio (interior 64 bloqueado) · indoor = salir cuesta ×5
    if (opts.mode === 'outdoor') cost = v => (v === 64 ? Infinity : baseCost(v));
    else if (opts.mode === 'indoor') cost = v => (v === 255 ? 5 : baseCost(v));
    const toCell = p => [Math.min(m.w - 1, Math.max(0, Math.round((p.x - floor.left) / c))), Math.min(m.h - 1, Math.max(0, Math.round((p.y - floor.top) / c)))];
    const s = nearestFree(m, ...toCell(from)), g = nearestFree(m, ...toCell(to));
    let raw = astar(m, s, g, cost); if ((!raw || raw.partial) && cost !== baseCost) raw = astar(m, s, g); if (!raw) return null;
    const pts = pull(m, raw).map(([x, y]) => ({ x: floor.left + x * c + c / 2, y: floor.top + y * c + c / 2 }));
    pts[0] = { x: from.x, y: from.y }; if (raw.partial) { pts.push({ x: to.x, y: to.y, jump: true }); pts.partial = true; } else pts[pts.length - 1] = { x: to.x, y: to.y }; return pts;
  }
  return { route, loadMask, manifest, _astar: astar, _pull: pull, _los: los, _nearestFree: nearestFree };
})();
