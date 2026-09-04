// ¿Cuántas tareas del plan (reforzar / rotar / abrir) logramos ubicar en el mapa?
const fs=require('fs'); global.window={}; global.Store={norm:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/<br\s*\/?>/g,' ').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()};
require('../js/data-maps.js');
const R6=JSON.parse(fs.readFileSync(__dirname+'/../js/r6maps.json','utf8'));
let X={}; try{X=JSON.parse(fs.readFileSync(__dirname+'/../js/r6maps-extra.json','utf8'));}catch(e){}
Object.assign(R6,X); const KEY={clubhouse:'club'};
const clean=t=>String(t||'').replace(/<br\s*\/?>/g,' ').replace(/\s+/g,' ').trim();
const strip=t=>String(t||'').replace(/\([^)]*\)/g,' ').replace(/×\s*\d+/g,' ').replace(/\s+/g,' ').trim();
let tot=0, ok=0; const fallos=[];
for(const m of window.MAPS){
  if(m.pool!=='ranked') continue;
  const r6=R6[KEY[m.id]||m.id]; if(!r6) continue;
  const p=`${__dirname}/../js/strats/${m.id}.json`; if(!fs.existsSync(p)) continue;
  const S=JSON.parse(fs.readFileSync(p,'utf8'));
  const find=n=>{ const q=Store.norm(strip(n)); if(!q) return null;
    return r6.rooms.find(r=>Store.norm(clean(r.en))===q||Store.norm(clean(r.es||''))===q) ||
           r6.rooms.find(r=>{const e=Store.norm(clean(r.en));return e.includes(q)||q.includes(e);}) || null; };
  for(const site of m.sites){ const st=S.sites[site.id]; if(!st) continue;
    for(const d of st.defense||[]){
      for(const t of d.reinforce||[]){ tot++;
        const s2=strip(t); const par=s2.match(/^(?:pared|muro)\s+(.+?)\s*[–—\-]\s*(.+)$/i);
        let hit=false;
        if(par) hit=!!(find(par[1])&&find(par[2]));
        else if(/escotilla/i.test(s2)) hit=!!find(s2.replace(/.*escotilla\s+(?:de\s+)?/i,''));
        else if(/ventana|puerta/i.test(s2)) hit=!!find(s2.replace(/.*(ventana|puerta)\s+(?:de\s+)?/i,''));
        if(hit) ok++; else fallos.push(`${m.id}/${site.id}: ${t}`);
      }
      for(const t of d.rotations||[]){ tot++; const pz=strip(t).split(/\s*(?:↔|→|<->|->|—>)\s*/).filter(Boolean);
        if(pz.length>1&&find(pz[0])&&find(pz[pz.length-1])) ok++; else fallos.push(`${m.id}/${site.id}: rot ${t}`); }
    }
  }
}
console.log(`tareas de defensa: ${ok}/${tot} ubicadas (${(ok/tot*100).toFixed(0)}%)`);
fallos.slice(0,12).forEach(f=>console.log('  x '+f));
