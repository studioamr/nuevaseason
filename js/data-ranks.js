/* Rangos — Ranked 3.0 (desde 2-jun-2026): 8 tiers × 5 divisiones × 100 RP, arranca en 0.
   Ubisoft NO publica cortes exactos de Champion/Legend; aquí Champion = 3,500+ y Legend = división
   solo-queue para los mejores Champion (Y11S3). Ranked 2.0 (antes) arrancaba en 1,000 RP. */
window.RANKS = {
 tiers:[
  {id:'copper',   n:'Cobre',    c:'#b87333'},
  {id:'bronze',   n:'Bronce',   c:'#cd7f32'},
  {id:'silver',   n:'Plata',    c:'#c0c0c0'},
  {id:'gold',     n:'Oro',      c:'#e2b13c'},
  {id:'platinum', n:'Platino',  c:'#4fd1c5'},
  {id:'emerald',  n:'Esmeralda',c:'#3ec46d'},
  {id:'diamond',  n:'Diamante', c:'#7fb2ff'},
  {id:'champion', n:'Champion', c:'#e04b7a'}
 ],
 div:['V','IV','III','II','I'],
 step:100, perTier:500,
 base:{2:1000, 3:0},           // RP donde arranca Cobre V según la versión del ranked
 legend:{n:'Legend', c:'#f4e3b2', note:'División solo-queue para los mejores Champion (Y11S3 Split Fire).'},
 rankOf(rp, scale){            // scale 2 = Ranked 2.0, 3 = Ranked 3.0
  scale=scale||3; const base=this.base[scale]; let x=Math.max(0,(rp||0)-base);
  let t=Math.min(7,Math.floor(x/this.perTier)); let d=Math.min(4,Math.floor((x-t*this.perTier)/this.step));
  if(t===7) d=Math.min(4,d);
  const tier=this.tiers[t]; return {tier, div:this.div[d], label:`${tier.n} ${this.div[d]}`, color:tier.c, t, d, next: base+(t*this.perTier)+(d+1)*this.step};
 }
};
