/* R6 NUEVA SEASON — sala en tiempo real (PeerJS, sin servidor propio)
   Modelo: el que CREA la sala es host y guarda la verdad. Los demás mandan cambios;
   el host los aplica y reenvía el estado completo a todos. Si el host se va, la sala se congela
   hasta que alguien cree otra (mismo código no se puede recuperar). */
window.Sync = (() => {
  const PREFIX = 'r6ns-split-fire-';
  let peer = null, conns = [], hostConn = null, isHost = false, code = null, onState = null, onPeers = null, state = null, meId = null, meName = '';
  const members = new Map(); // peerId -> {name, slot, at}
  const emitPeers = () => onPeers && onPeers([...members.values()]);
  function mkPeer(id) {
    return new Promise((res, rej) => {
      if (!window.Peer) return rej(new Error('PeerJS no cargó (¿sin internet?)'));
      const p = new Peer(id, { debug: 0 });
      p.on('open', () => res(p)); p.on('error', e => rej(e));
    });
  }
  async function host(initialState, name, slot) {
    await leave();
    code = Store.code(); meName = name;
    peer = await mkPeer(PREFIX + code); isHost = true; state = { ...initialState, updatedAt: Date.now() };
    meId = peer.id; members.set(meId, { name, slot, at: Date.now(), host: true }); emitPeers();
    peer.on('connection', c => {
      conns.push(c);
      c.on('open', () => { c.send({ t: 'state', s: state }); });
      c.on('data', d => handle(d, c));
      c.on('close', () => { conns = conns.filter(x => x !== c); members.delete(c.peer); emitPeers(); broadcastPeers(); });
    });
    return code;
  }
  async function join(c, name, slot) {
    await leave();
    code = c.toUpperCase().trim(); meName = name; isHost = false;
    peer = await mkPeer(undefined); meId = peer.id;
    return new Promise((res, rej) => {
      const conn = peer.connect(PREFIX + code, { reliable: true });
      const to = setTimeout(() => rej(new Error('No se encontró la sala ' + code)), 8000);
      conn.on('open', () => { clearTimeout(to); hostConn = conn; conn.send({ t: 'hello', name, slot }); res(code); });
      conn.on('data', d => handle(d, conn));
      conn.on('close', () => { hostConn = null; Store.toast('Sala cerrada por el host'); });
      conn.on('error', e => { clearTimeout(to); rej(e); });
      peer.on('error', e => { clearTimeout(to); rej(new Error('No se encontró la sala ' + code)); });
    });
  }
  function handle(d, c) {
    if (!d || !d.t) return;
    if (isHost) {
      if (d.t === 'hello') { members.set(c.peer, { name: d.name, slot: d.slot, at: Date.now() }); emitPeers(); broadcastPeers(); }
      if (d.t === 'patch') { apply(d.p, d.by); }
    } else {
      if (d.t === 'state') { state = d.s; onState && onState(state); }
      if (d.t === 'peers') { members.clear(); d.m.forEach(m => members.set(m.id, m)); emitPeers(); }
    }
  }
  function broadcastPeers() { const m = [...members.entries()].map(([id, v]) => ({ id, ...v })); conns.forEach(c => c.open && c.send({ t: 'peers', m })); }
  function apply(patch, by) { // merge superficial + merge profundo en picks/pins
    state = state || {};
    for (const [k, v] of Object.entries(patch)) {
      if ((k === 'picks' || k === 'pins' || k === 'ready') && v && typeof v === 'object') state[k] = { ...(state[k] || {}), ...v }; // se fusionan: dos personas pueden tocarlos a la vez
      else state[k] = v;
    }
    state.updatedAt = Date.now(); state.by = by;
    onState && onState(state);
    conns.forEach(c => c.open && c.send({ t: 'state', s: state }));
  }
  function patch(p) {
    if (!peer) return false;
    if (isHost) apply(p, meName); else if (hostConn && hostConn.open) hostConn.send({ t: 'patch', p, by: meName });
    return true;
  }
  async function leave() { conns.forEach(c => { try { c.close(); } catch (e) {} }); conns = []; if (hostConn) { try { hostConn.close(); } catch (e) {} hostConn = null; } if (peer) { try { peer.destroy(); } catch (e) {} peer = null; } members.clear(); code = null; isHost = false; }
  return { host, join, leave, patch, get code() { return code; }, get isHost() { return isHost; }, get connected() { return !!peer && (isHost || (hostConn && hostConn.open)); }, set onState(f) { onState = f; }, set onPeers(f) { onPeers = f; }, get members() { return [...members.entries()].map(([id, v]) => ({ id, ...v })); }, get meId() { return meId; } };
})();
