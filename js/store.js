/* R6 NUEVA SEASON — sesión local, ajustes y utilidades */
window.Store = (() => {
  const K = 'r6ns.';
  const get = (k, d) => { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) {} };
  const del = k => { try { localStorage.removeItem(K + k); } catch (e) {} };
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const code = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<br\s*\/?>/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const trackerUrl = (nick, plat) => `https://r6.tracker.network/r6siege/profile/${plat || 'xbl'}/${encodeURIComponent(nick || '')}/overview`;
  const fmt = n => (n == null ? '—' : Number(n).toLocaleString('en-US'));
  let toastT; const toast = m => { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); };
  // IndexedDB mínimo para planos subidos por el usuario
  const idb = { db: null,
    open() { return new Promise((res, rej) => { if (this.db) return res(this.db); const r = indexedDB.open('r6ns', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
    async put(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async get(k) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('img').objectStore('img').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async keys() { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('img').objectStore('img').getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  };
  return { get, set, del, uid, code, esc, norm, trackerUrl, fmt, toast, idb };
})();
