# Quita el rayado rojo diagonal de los blueprints (marca el piso de arriba y confunde a simple vista).
# CONSERVA la cinta amarilla/negra (paredes rompibles) y los marcadores chicos.
# Los pixeles de raya se rellenan con el color del piso vecino (convolucion normalizada),
# asi desaparece el tono Y la banda de brillo, no solo el rojo.
import sys, glob, numpy as np
from PIL import Image
from scipy import ndimage as ndi

def limpiar(p, escribir=True):
    im = Image.open(p).convert('RGB'); a = np.asarray(im).astype(np.float32)
    r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
    # raya roja: rojo domina, y NO es amarillo/naranja (en amarillo g >> b)
    rojo = (r > 70) & (r - g > 22) & (r - b > 12) & (g - b < 45)
    if rojo.mean() < 0.015: return 0.0, 0.0
    # solo DENTRO del edificio: en satelitales (Fortress/Outback) el "rojo" de afuera es terreno
    mn = a.min(axis=2); mx = a.max(axis=2)
    pared = (mn >= 185) & ((mx - mn) < 45)
    pared[int(pared.shape[0]*.84):, int(pared.shape[1]*.76):] = False   # la leyenda no cuenta
    ys, xs = np.where(pared)
    if len(xs) < 400: return rojo.mean()*100, -1.0
    x0, x1 = np.percentile(xs, [0.5, 99.5]); y0, y1 = np.percentile(ys, [0.5, 99.5])
    dentro = np.zeros(rojo.shape, bool); dentro[int(y0):int(y1)+1, int(x0):int(x1)+1] = True
    rojo &= dentro
    # solo planos VECTORIALES de base plana azul: en los fotograficos (Bartlett, Villa, Favela...)
    # el "rojo" es madera/ladrillo y rellenarlo destruye el mobiliario
    azul = ((b > r + 10) & (b > 60) & dentro).mean()
    if azul < 0.10: return rojo.mean()*100, -1.0
    dens = ndi.uniform_filter(rojo.astype(np.float32), size=25)
    campo = rojo & (dens > 0.15)                       # solo campos amplios de rayado
    campo = ndi.binary_dilation(campo, iterations=1)   # come el borde suave de la raya
    if campo.mean() < 0.005: return rojo.mean()*100, 0.0
    w = (~campo).astype(np.float32)
    N = 21
    den = ndi.uniform_filter(w, size=N)
    out = a.copy()
    for c in range(3):
        num = ndi.uniform_filter(a[:,:,c] * w, size=N)
        base = num / np.maximum(den, 1e-3)
        out[:,:,c][campo] = base[campo]
    # donde no habia vecino limpio, segunda pasada mas ancha
    hueco = campo & (den < 0.06)
    if hueco.any():
        den2 = ndi.uniform_filter(w, size=61)
        for c in range(3):
            num2 = ndi.uniform_filter(a[:,:,c] * w, size=61)
            out[:,:,c][hueco] = (num2 / np.maximum(den2, 1e-3))[hueco]
    if escribir: Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(p, quality=93)
    return rojo.mean()*100, campo.mean()*100

objetivo = sys.argv[1:] or sorted(glob.glob('img/maps/*/*.jpg'))
n = 0
for f in objetivo:
    antes, quitado = limpiar(f)
    if quitado > 0.5: n += 1; print(f'  {f}: {antes:.0f}% rojo → borrado {quitado:.0f}%')
print(f'{n} planos limpiados')
