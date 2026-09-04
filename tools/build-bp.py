# Integra los blueprints oficiales (Dexerto/Ubisoft) de los mapas que solo tenían croquis.
# Geometría REAL (paredes/rompibles). Los cuartos se colocan proyectando la rejilla del croquis
# sobre la huella detectada del edificio → posiciones APROXIMADAS y editables en la app.
import os, json, subprocess, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# mapeo EXPLÍCITO verificado a ojo: qué blueprint corresponde a cada piso declarado en data-maps
PLAN = {
 'villa':        [3, 4],        # bp1 = sótano (sin sitios en nuestros datos)
 'lair':         [1, 2, 3],     # bp4 = techo
 'outback':      [1, 2],
 'fortress':     [1, 2],
 'emerald':      [1, 2],        # bp3 = techo
 'nighthaven':   [1, 2, 3],     # bp4 = techo
 'closequarter': [1, 2],
}
MAPS = list(PLAN)

def walls(a):
    mn=a.min(axis=2); mx=a.max(axis=2)
    return (mn>=185)&((mx-mn)<45)

def footprint(p):
    a=np.asarray(Image.open(p).convert('RGB')).astype(int); w=walls(a)
    w[int(w.shape[0]*.84):, int(w.shape[1]*.76):]=False       # la leyenda no cuenta
    ys,xs=np.where(w)
    if len(xs)<400: return None,0
    x0,x1=np.percentile(xs,[0.5,99.5]); y0,y1=np.percentile(ys,[0.5,99.5])
    return (int(x0),int(y0),int(x1),int(y1)), float(w.mean()*100)

# datos del croquis (rejilla 14x10) desde data-maps.js
geo = json.loads(subprocess.check_output(['node','-e','''
global.window={};require("%s/js/data-maps.js");
const out={};
for(const m of window.MAPS){ out[m.id]={floors:m.floors.map(f=>f.id), sites:{}};
  for(const s of m.sites){ out[m.id].sites[s.id]={fl:s.fl, rooms:s.rooms, geo:s.geo}; } }
console.log(JSON.stringify(out));''' % ROOT]).decode())

extra={}
for mid in MAPS:
    d=f'{ROOT}/img/maps/{mid}'
    use=[]
    for n in PLAN[mid]:
        bb,wp = footprint(f'{d}/bp{n}.jpg')
        if bb: use.append((f'bp{n}.jpg', bb))
    keys = geo[mid]['floors']
    if len(use)!=len(keys): print(mid,'AVISO: pisos',len(use),'vs declarados',len(keys))
    floors=[]; rooms=[]; bombs=[]
    NAME={'b':'Sótano','1':'Planta 1','2':'Planta 2','3':'Planta 3','r':'Techo'}
    for i,(f,bb) in enumerate(use):
        key = keys[i]
        os.rename(f'{d}/{f}', f'{d}/{i}.jpg')
        im=Image.open(f'{d}/{i}.jpg')
        floors.append({'index':i,'left':0,'top':0,'name':{'full':NAME.get(key,key),'short':key},
                       'nameEs':{'full':NAME.get(key,key),'short':key},'bg':i==0,'def':key=='1' or i==0,'fl':key,'n':NAME.get(key,key),
                       'w':im.width,'h':im.height,'bbox':list(bb)})
        # cuartos del croquis de ese piso → proyectados en la huella
        x0,y0,x1,y1 = bb; W=x1-x0; H=y1-y0
        seen=set()
        for sid,s in geo[mid]['sites'].items():
            for fl,rs in (s['geo'] or {}).items():
                if str(fl)!=str(key): continue
                for r in rs:
                    if r['n'] in seen: continue
                    seen.add(r['n'])
                    cx=(r['c']+r['w']/2)/14.0; cy=(r['r']+r['h']/2)/10.0
                    out_ = r.get('t')=='ext'
                    rooms.append({'f':-1 if out_ else i,'en':r['n'],'es':r['n'],
                                  'left':round(x0+cx*W),'top':round(y0+cy*H),'small':False,'hard':False,'out':out_})
    # bombas = centroide de los cuartos del sitio
    for sid,s in geo[mid]['sites'].items():
        fl=str(s['fl']); idx=next((f['index'] for f in floors if f['fl']==fl), None)
        if idx is None: continue
        for j,rn in enumerate(s['rooms'][:2]):
            r=next((x for x in rooms if x['en']==rn and x['f']==idx), None)
            if r: bombs.append({'f':idx,'left':r['left'],'top':r['top'],'set':list(geo[mid]['sites']).index(sid)+1,'letter':'AB'[j]})
    # spawn: fuera de la huella del piso base
    bb=floors[0]['bbox']; im=Image.open(f'{d}/0.jpg')
    spawns=[{'letter':'A','left':max(40,bb[0]-160),'top':(bb[1]+bb[3])//2,'en':'Exterior','es':'Exterior'},
            {'letter':'B','left':min(im.width-40,bb[2]+160),'top':(bb[1]+bb[3])//2,'en':'Exterior este','es':'Exterior este'}]
    extra[mid]={'name':mid,'nameEs':mid,'prefix':mid,'objectives':['bomb'],'floors':floors,'rooms':rooms,
                'bombs':bombs,'hostage':[],'secure':[],'hatches':[],'spawns':spawns,'cameras':[],'skylights':[],
                'tunnels':[],'ladders':[],'zoom':{'topLeft':{'left':bb[0]-60,'top':bb[1]-60},'bottomRight':{'left':bb[2]+60,'top':bb[3]+60}},
                'approx':True}
    for f in floors: f.pop('bbox',None)
    print(mid, 'pisos', [f['fl'] for f in floors], 'cuartos', len([r for r in rooms]), 'bombas', len(bombs))
    for f in os.listdir(d):
        if f.startswith('bp'): os.remove(f'{d}/{f}')
json.dump(extra, open(f'{ROOT}/js/r6maps-extra.json','w'))
print('escrito js/r6maps-extra.json ·', len(extra),'mapas')
