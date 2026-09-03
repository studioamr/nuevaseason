/* R6 NUEVA SEASON — efectos tipográficos de videojuego */
window.FX = (() => {
  function text(el, fast) { if (!el || el.dataset.fxDone === el.textContent) return; const t = el.textContent; el.dataset.fxDone = t; el.classList.add('fx'); if (fast) el.classList.add('fast'); el.innerHTML = ''; [...t].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'g' + (ch === ' ' ? ' sp' : ''); s.style.setProperty('--i', i); s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); }); }
  function all(root) { (root || document).querySelectorAll('[data-fx]').forEach(e => text(e, e.dataset.fx === 'fast')); }
  function count(el, to, ms = 900) { const from = 0; const t0 = performance.now(); const fmt = v => Number.isInteger(to) ? Math.round(v).toLocaleString('en-US') : v.toFixed(2); const step = now => { const k = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  document.addEventListener('DOMContentLoaded', () => all());
  return { text, all, count };
})();
