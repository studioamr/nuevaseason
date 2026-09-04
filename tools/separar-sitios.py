# En los mapas de plano aproximado, la rejilla proyectada le daba la MISMA celda a cuartos
# de sitios distintos (p.ej. Fortress: Cocina y Hammam en el mismo pixel). Eso encimaba
# marcadores y rutas. Reparte los sitios de cada piso en sectores distintos del edificio.
import json, subprocess, collections
EX = 'js/r6maps-extra.json'
d = json.load(open(EX))
sitios = json.loads(subprocess.check_output(['node','-e','''
global.window={};require("./js/data-maps.js");
const o={}; for(const m of window.MAPS){ o[m.id]=m.sites.map(s=>({id:s.id, fl:s.fl, rooms:s.rooms||[]})); }
console.log(JSON.stringify(o));''']).decode())

movidos = 0
for mid, m in d.items():
    ss = sitios.get(mid) or []
    porPiso = collections.defaultdict(list)
    for s in ss: porPiso[s['fl']].append(s)
    # indice de piso: data-maps usa fl '1','2','b'; extra usa f 0,1,...
    for i, (fl, lista) in enumerate(sorted(porPiso.items())):
        if len(lista) < 2: continue
        f = i  # los pisos de extra van en el mismo orden
        cuartos = [r for r in m['rooms'] if r['f'] == f]
        if not cuartos: continue
        L = [r['left'] for r in cuartos]; T = [r['top'] for r in cuartos]
        x0, x1, y0, y1 = min(L), max(L), min(T), max(T)
        ancho = max(x1 - x0, 60)
        for j, s in enumerate(lista):
            # cada sitio a su franja: el primero se queda, los demas se corren
            if j == 0: continue
            dx = int(ancho * 0.55 * j)
            for r in m['rooms']:
                if r['f'] == f and r['en'] in s['rooms']:
                    r['left'] += dx; movidos += 1
            for b in m.get('bombs', []):
                if b['f'] == f and b.get('set') in (2*j+1, 2*j+2): b['left'] += dx
        # ensancha la caja de zoom para que quepan los sitios corridos
        z = m.get('zoom')
        if z: z['bottomRight']['left'] = max(z['bottomRight']['left'], x1 + int(ancho*0.55*(len(lista)-1)) + 40)
json.dump(d, open(EX,'w'), ensure_ascii=False)
print(f'{movidos} cuartos reubicados')
