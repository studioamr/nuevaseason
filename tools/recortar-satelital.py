# Fortress y Outback venian como foto satelital de toda la isla: el edificio jugable
# ocupaba ~13% del cuadro y todo salia diminuto y encimado. Recorta al edificio
# (mismo recorte en todos los pisos) y mueve el origen del piso, que es lo que usa
# el router para leer la mascara. Los cuartos siguen en las mismas coordenadas mundo.
import json, numpy as np, os
from PIL import Image
EX='js/r6maps-extra.json'; d=json.load(open(EX))

def bbox(p):
    a=np.asarray(Image.open(p).convert('RGB')).astype(int)
    mn=a.min(axis=2); mx=a.max(axis=2); w=(mn>=185)&((mx-mn)<45)
    w[int(w.shape[0]*.84):, int(w.shape[1]*.76):]=False   # fuera la leyenda
    ys,xs=np.where(w)
    if len(xs)<400: return None
    return (np.percentile(xs,.3), np.percentile(ys,.3), np.percentile(xs,99.7), np.percentile(ys,99.7))

for mid in ['fortress','outback']:
    m=d[mid]; cajas=[]
    for f in m['floors']:
        p=f'img/maps/{mid}/{f["index"]}.jpg'
        if os.path.exists(p):
            b=bbox(p)
            if b: cajas.append(b)
    if not cajas: print(mid,'sin caja'); continue
    x0=min(c[0] for c in cajas); y0=min(c[1] for c in cajas)
    x1=max(c[2] for c in cajas); y1=max(c[3] for c in cajas)
    mx=(x1-x0)*.14; my=(y1-y0)*.14                      # margen para el exterior cercano
    X0,Y0,X1,Y1=int(max(0,x0-mx)),int(max(0,y0-my)),int(x1+mx),int(y1+my)
    for f in m['floors']:
        i=f['index']; p=f'img/maps/{mid}/{i}.jpg'
        if not os.path.exists(p): continue
        im=Image.open(p); W,H=im.size
        cx1,cy1=min(X1,W),min(Y1,H)
        im.crop((X0,Y0,cx1,cy1)).save(p, quality=93)
        mk=f'img/masks/{mid}/{i}.png'
        if os.path.exists(mk):
            k=Image.open(mk); s=k.size[0]/W                # la mascara va a otra escala
            k.crop((int(X0*s),int(Y0*s),int(cx1*s),int(cy1*s))).save(mk)
        f['left']=X0; f['top']=Y0; f['w']=cx1-X0; f['h']=cy1-Y0
    print(f'{mid}: recortado a {X1-X0}x{Y1-Y0} desde ({X0},{Y0}) — antes 1600x900')
json.dump(d,open(EX,'w'),ensure_ascii=False)
