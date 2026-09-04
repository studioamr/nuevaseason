/* R6 NUEVA SEASON — tema: colores de ataque/defensa (icónicos de R6), fuente y acento; el acento sigue al lado activo */
window.Theme = (() => {
  const PRESETS = {
    r6:     { n: 'R6 táctico',   atk: '#2f7fd4', def: '#8158c8', font: 'barlow', glow: 0 },
    naranja:{ n: 'R6 naranja',   atk: '#2f7fd4', def: '#d9821f', font: 'barlow', glow: 0 },
    night:  { n: 'Operación',    atk: '#3d8f8a', def: '#c8642a', font: 'saira',  glow: 0 },
    steel:  { n: 'Acero',        atk: '#6f7d8c', def: '#b08040', font: 'oswald', glow: 0 },
    alert:  { n: 'Alerta',       atk: '#2f7fd4', def: '#c8442f', font: 'barlow', glow: 0 }
  };
  const FONTS = { barlow: '"Barlow Condensed","Saira Condensed",sans-serif', saira: '"Saira Condensed","Barlow Condensed",sans-serif', oswald: '"Oswald","Barlow Condensed",sans-serif' };
  const FONTN = { barlow: 'Barlow Condensed (R6)', saira: 'Saira Condensed', oswald: 'Oswald' };
  let cur = Object.assign({ preset: 'r6' }, PRESETS.r6, Store.get('theme', {})); if (!FONTS[cur.font]) cur.font = 'barlow'; if (cur.glow == null) cur.glow = 0;
  const hex2rgb = h => { const m = h.replace('#', ''); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; };
  const lighten = (h, k) => '#' + hex2rgb(h).map(v => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
  function apply(side) {
    const r = document.documentElement.style; const acc = side === 'def' ? cur.def : cur.atk; const [R, G, B] = hex2rgb(acc);
    r.setProperty('--atk', cur.atk); r.setProperty('--def', cur.def); r.setProperty('--mag', cur.def); r.setProperty('--obj', cur.obj || '#d9a520');
    r.setProperty('--acc', acc); r.setProperty('--acc2', lighten(acc, .35)); r.setProperty('--acc-dim', `rgba(${R},${G},${B},.14)`); r.setProperty('--acc-glow', cur.glow ? `0 0 14px rgba(${R},${G},${B},${cur.glow})` : 'none');
    r.setProperty('--disp', FONTS[cur.font] || FONTS.barlow); r.setProperty('--font-scale', '1');
    document.documentElement.dataset.font = cur.font; document.documentElement.dataset.side = side || 'atk';
  }
  function set(patch) { cur = { ...cur, ...patch }; if (patch.preset && PRESETS[patch.preset]) cur = { ...cur, ...PRESETS[patch.preset], preset: patch.preset }; Store.set('theme', cur); apply(document.documentElement.dataset.side); }
  return { PRESETS, FONTN, apply, set, get cur() { return cur; } };
})();
