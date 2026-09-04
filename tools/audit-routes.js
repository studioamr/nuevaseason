// ¿La ruta avanza del spawn hacia la bomba o te manda a caminar sin sentido?
const fs=require('fs'); global.window={}; global.Store={norm:s=>String(s||'').toLowerCase()};
require('../js/data-maps.js');
const R6=JSON.parse(fs.readFileSync(__dirname+'/../js/r6maps.json','utf8')); const KEY={clubhouse:'club'};
const clean=t=>String(t||'').replace(/<br\s*\/?>/g,' ').replace(/\s+/g,' ').trim();
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let tot=0, bad=0, worst=[];
for(const m of window.MAPS){
  const r6=R6[KEY[m.id]||m.id]; if(!r6) continue;
  const p=`${__dirname}/../js/strats/${m.id}.json`; if(!fs.existsSync(p)) continue;
  const S=JSON.parse(fs.readFileSync(p,'utf8'));
  const pt=(room,f)=>{const fi=f===-1||f==='-1'?-1:+f;
    if(fi===-1){const sp=r6.spawns.find(r=>clean(r.en)===room); if(sp)return{x:sp.left,y:sp.top};
      const lo=r6.rooms.find(r=>clean(r.en)===room&&(r.out||r.f===-1)); if(lo)return{x:lo.left,y:lo.top};}
    const l=r6.rooms.find(r=>clean(r.en)===room&&r.f===fi)||r6.rooms.find(r=>clean(r.en)===room); if(l)return{x:l.left,y:l.top};
    const sp=r6.spawns.find(r=>clean(r.en)===room); return sp?{x:sp.left,y:sp.top}:null;};
  for(const site of m.sites){
    const st=S.sites[site.id]; if(!st) continue;
    const fi=(r6.floors.find(f=>{const n=String((f.name&&f.name.full)||'').toLowerCase(); const k=/basement/.test(n)?'b':/roof/.test(n)?'r':(n.match(/(\d)/)||[])[1]; return String(k)===String(site.fl);})||{}).index;
    const bombs=r6.bombs.filter(b=>b.f===fi); if(!bombs.length) continue;
    const B={x:bombs.reduce((a,b)=>a+b.left,0)/bombs.length, y:bombs.reduce((a,b)=>a+b.top,0)/bombs.length};
    for(const a of st.attack||[]) for(const o of a.ops||[]){
      const sp=pt(o.spawn,-1); const raw=(o.path||[]).map(x=>({...x,pt:pt(x.room,x.f)})).filter(x=>x.pt);
      const SL=Math.max(18, (sp?D(sp,B):300)*(+process.env.SL||0.06));
      let cur=sp||(raw[0]&&raw[0].pt); const keep=[];
      raw.forEach((st,i)=>{const last=i===raw.length-1; const salto=['stairs','hatch','rappel','window','breach'].includes(st.via);
        const d0=D(cur,B), d1=D(st.pt,B); const avanza=d1<d0+SL; const rep=keep.some(k=>k.room===st.room&&String(k.f)===String(st.f));
        if(((avanza||(salto&&d1<d0+SL*2))||last)&&!rep){keep.push(st); cur=st.pt;}});
      // si aún así se pasea, deja spawn + entrada + últimos 2
      if(keep.length>4){let w=0;const q=[sp].concat(keep.map(k=>k.pt));for(let i=1;i<q.length;i++)w+=D(q[i-1],q[i]);
        if(w>2.2*D(sp||q[0],B)){const ent=keep.find(k=>k.f!==-1&&k.f!=='-1')||keep[0];const tail=keep.slice(-2);
          const nk=[ent].concat(tail.filter(t=>t!==ent));keep.length=0;nk.forEach(k=>keep.push(k));}}
      const pts=[sp].concat((process.env.FIX?keep:raw).map(x=>x.pt)).filter(Boolean); if(pts.length<2) continue;
      let walk=0; for(let i=1;i<pts.length;i++) walk+=D(pts[i-1],pts[i]);
      const direct=D(pts[0],B)||1; const ratio=walk/direct;
      // pasos que ALEJAN de la bomba
      let back=0; for(let i=1;i<pts.length;i++) if(D(pts[i],B)>D(pts[i-1],B)+40) back++;
      tot++; if(ratio>2 || back>=2){ bad++; worst.push({r:+ratio.toFixed(1),back,id:`${m.id}/${site.id}/${a.id}/${o.op}`,rooms:[o.spawn].concat((o.path||[]).map(x=>x.room)).join(' → ')}); }
    }
  }
}
worst.sort((a,b)=>b.r-a.r);
console.log(`rutas: ${tot} · con detour (ratio>2 o 2+ pasos que alejan): ${bad} (${(bad/tot*100).toFixed(0)}%)`);
worst.slice(0,10).forEach(w=>console.log(` x${w.r} atrás:${w.back} ${w.id}\n    ${w.rooms}`));
