/* R6 NUEVA SEASON — tema: colores de ataque/defensa (icónicos de R6), fuente y acento; el acento sigue al lado activo */
window.Theme = (() => {
  const PRESETS = {
    r6:     { n: 'R6 clásico',    atk: '#2f9dff', def: '#ff8a1f', font: 'barlow',   glow: .35 },
    season: { n: 'Nueva Season',  atk: '#5ee7ff', def: '#ff4fd8', font: 'orbitron', glow: .35 },
    pro:    { n: 'Pro league',    atk: '#4da3ff', def: '#ffb020', font: 'saira',    glow: .2 },
    stealth:{ n: 'Sigilo',        atk: '#9fd3ff', def: '#ffc27a', font: 'oswald',   glow: .08 }
  };
  const FONTS = { barlow: '"Barlow Condensed","Saira Extra Condensed","Oswald",sans-serif', saira: '"Saira Extra Condensed","Barlow Condensed",sans-serif', oswald: '"Oswald","Barlow Condensed",sans-serif', orbitron: '"Orbitron","Rajdhani",sans-serif' };
  const FONTN = { barlow: 'Barlow Condensed (estilo R6)', saira: 'Saira Condensed', oswald: 'Oswald', orbitron: 'Orbitron (videojuego)' };
  let cur = Object.assign({ preset: 'r6' }, PRESETS.r6, Store.get('theme', {}));
  const hex2rgb = h => { const m = h.replace('#', ''); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; };
  const lighten = (h, k) => '#' + hex2rgb(h).map(v => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
  function apply(side) {
    const r = document.documentElement.style; const acc = side === 'def' ? cur.def : cur.atk; const [R, G, B] = hex2rgb(acc);
    r.setProperty('--atk', cur.atk); r.setProperty('--def', cur.def); r.setProperty('--mag', cur.def);
    r.setProperty('--acc', acc); r.setProperty('--acc2', lighten(acc, .35)); r.setProperty('--acc-dim', `rgba(${R},${G},${B},.14)`); r.setProperty('--acc-glow', `0 0 18px rgba(${R},${G},${B},${cur.glow})`);
    r.setProperty('--disp', FONTS[cur.font] || FONTS.barlow); r.setProperty('--font-scale', cur.font === 'orbitron' ? '1' : '1.15');
    document.documentElement.dataset.font = cur.font; document.documentElement.dataset.side = side || 'atk';
  }
  function set(patch) { cur = { ...cur, ...patch }; if (patch.preset && PRESETS[patch.preset]) cur = { ...cur, ...PRESETS[patch.preset], preset: patch.preset }; Store.set('theme', cur); apply(document.documentElement.dataset.side); }
  return { PRESETS, FONTN, apply, set, get cur() { return cur; } };
})();
