# Máscaras de transitabilidad desde los blueprints: 0=pared, 128=pared rompible, 255=libre. Celda = 4px.
import os, sys, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = 4
def classify(img):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mn = np.minimum(np.minimum(R, G), B); mx = np.maximum(np.maximum(R, G), B)
    bright = (mn >= 185) & ((mx - mn) < 45)                         # blanco/gris claro
    # pared = estructura FINA brillante. Los pisos claros (azulejo, etc.) son áreas anchas: se quitan con apertura morfológica
    k = np.ones((11, 11), bool)
    wide = ndi.binary_dilation(ndi.binary_erosion(bright, structure=k), structure=k)
    wall = bright & ~wide
    wall = ndi.binary_dilation(wall, structure=np.ones((3, 3), bool))   # engrosar 1px para que no se pierdan al reducir
    breach = (R > 160) & (G > 110) & (B < 120) & ((R - B) > 80)     # amarillo = rompible
    return wall, breach
def downsample(m, cell):
    h, w = m.shape; H, W = h // cell, w // cell
    return m[:H * cell, :W * cell].reshape(H, cell, W, cell).mean(axis=(1, 3))
manifest = {}
for mid in sorted(os.listdir(f'{ROOT}/img/maps')):
    d = f'{ROOT}/img/maps/{mid}'
    if not os.path.isdir(d): continue
    os.makedirs(f'{ROOT}/img/masks/{mid}', exist_ok=True)
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.jpg'): continue
        idx = fn[:-4]
        img = Image.open(f'{d}/{fn}')
        wall, breach = classify(img)
        w = downsample(wall, CELL); b = downsample(breach, CELL)
        out = np.full(w.shape, 255, np.uint8)
        out[b > 0.20] = 128
        out[w > 0.22] = 0
        # INTERIOR del edificio = celda no-pared a la que NO se llega desde el borde de la imagen
        # sin cruzar una pared. Se engrosan las paredes antes para cerrar huecos de puertas/ventanas.
        solid = ndi.binary_dilation(out == 0, structure=np.ones((3, 3), bool), iterations=2)
        free = ~solid
        seed = np.zeros_like(free); seed[0, :] = free[0, :]; seed[-1, :] = free[-1, :]; seed[:, 0] = free[:, 0]; seed[:, -1] = free[:, -1]
        outside = ndi.binary_propagation(seed, mask=free)
        interior = (~outside) & (out != 0)
        out[interior] = 64
        Image.fromarray(out, 'L').save(f'{ROOT}/img/masks/{mid}/{idx}.png', optimize=True)
        manifest.setdefault(mid, {})[idx] = {'w': int(out.shape[1]), 'h': int(out.shape[0]), 'cell': CELL, 'imgW': img.width, 'imgH': img.height}
import time
manifest['_v'] = int(time.time())
json.dump(manifest, open(f'{ROOT}/js/masks-manifest.json', 'w'))
# debug overlay para inspección
for mid, idx in [('bank', '1'), ('coastline', '1'), ('kafe', '2'), ('clubhouse', '1')]:
    img = Image.open(f'{ROOT}/img/maps/{mid}/{idx}.jpg').convert('RGB')
    m = np.asarray(Image.open(f'{ROOT}/img/masks/{mid}/{idx}.png'))
    ov = np.asarray(img).copy()
    big = np.kron(m, np.ones((CELL, CELL), np.uint8)); pad = np.full(ov.shape[:2], 255, np.uint8); pad[:big.shape[0], :big.shape[1]] = big[:ov.shape[0], :ov.shape[1]]; big = pad
    ov[big == 0] = (ov[big == 0] * 0.3 + np.array([255, 40, 40]) * 0.7).astype(np.uint8)
    ov[big == 128] = (ov[big == 128] * 0.3 + np.array([255, 200, 0]) * 0.7).astype(np.uint8)
    ov[big == 64] = (ov[big == 64] * 0.75 + np.array([40, 120, 255]) * 0.25).astype(np.uint8)
    Image.fromarray(ov).save(f'/private/tmp/claude-501/-Users-andremacouzet-claude/382dfd80-4158-455c-9165-8cc736798911/scratchpad/mask-debug-{mid}{idx}.png')
print('masks:', sum(len(v) for k, v in manifest.items() if k != '_v'), 'floors in', len(manifest) - 1, 'maps')
