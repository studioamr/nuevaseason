/* R6 NUEVA SEASON — tema: colores de ataque/defensa (icónicos de R6), fuente y acento; el acento sigue al lado activo */
window.Theme = (() => {
  // Un color para TU equipo y otro para el ENEMIGO. Elegidos para no confundirse con el plano
  // (los planos oficiales son gris/blanco/marrón, con rojo de "línea de tiro" y amarillo de rompible).
  const PRESETS = {
    escuadra:{ n: 'Escuadra',   team: '#39b6f0', enemy: '#ff4d9d', font: 'barlow', glow: 0 },
    r6:      { n: 'R6 táctico', team: '#2f7fd4', enemy: '#e08a2b', font: 'barlow', glow: 0 },
    verde:   { n: 'Bosque',     team: '#4bbf7a', enemy: '#e0475f', font: 'saira',  glow: 0 },
    acero:   { n: 'Acero',      team: '#9fb4c8', enemy: '#e0a020', font: 'oswald', glow: 0 }
  };
  const FONTS = { barlow: '"Barlow Condensed","Saira Condensed",sans-serif', saira: '"Saira Condensed","Barlow Condensed",sans-serif', oswald: '"Oswald","Barlow Condensed",sans-serif' };
  const FONTN = { barlow: 'Barlow Condensed (R6)', saira: 'Saira Condensed', oswald: 'Oswald' };
  let cur = Object.assign({ preset: 'escuadra' }, PRESETS.escuadra, Store.get('theme', {}));
  if (!FONTS[cur.font]) cur.font = 'barlow'; if (cur.glow == null) cur.glow = 0;
  if (!cur.team) { cur.team = cur.atk || PRESETS.escuadra.team; cur.enemy = cur.def || PRESETS.escuadra.enemy; cur.preset = 'escuadra'; }
  const hex2rgb = h => { const m = h.replace('#', ''); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; };
  const lighten = (h, k) => '#' + hex2rgb(h).map(v => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
  function apply() {
    const r = document.documentElement.style; const [R, G, B] = hex2rgb(cur.team);
    r.setProperty('--team', cur.team); r.setProperty('--enemy', cur.enemy);
    // el resto de la interfaz usa el color del equipo; el del enemigo solo marca lo del rival
    r.setProperty('--atk', cur.team); r.setProperty('--def', cur.team); r.setProperty('--mag', cur.enemy);
    r.setProperty('--acc', cur.team); r.setProperty('--acc2', lighten(cur.team, .35));
    r.setProperty('--acc-dim', `rgba(${R},${G},${B},.14)`); r.setProperty('--acc-glow', cur.glow ? `0 0 14px rgba(${R},${G},${B},${cur.glow})` : 'none');
    r.setProperty('--disp', FONTS[cur.font] || FONTS.barlow);
    document.documentElement.dataset.font = cur.font;
  }
  function set(patch) { cur = { ...cur, ...patch }; if (patch.preset && PRESETS[patch.preset]) cur = { ...cur, ...PRESETS[patch.preset], preset: patch.preset }; Store.set('theme', cur); apply(); }
  return { PRESETS, FONTN, apply, set, get cur() { return cur; } };
})();
