#!/bin/sh
# Re-estampa ?v= en css/js de app.html e index.html (cache-busting)
cd "$(dirname "$0")/.." && python3 - <<'PY'
import re,time
v=str(int(time.time()))
for p in ['app.html','index.html']:
    s=open(p).read()
    s=re.sub(r'((?:href|src)="(?:css|js)/[^"?]+)(\?v=\d+)?"', lambda m: f'{m.group(1)}?v={v}"', s)
    open(p,'w').write(s)
print('stamp',v)
PY
