# R6 NUEVA SEASON — centro de mando del squad (Y11S3 Split Fire)

Plataforma privada para el squad de Rainbow Six Siege (Xbox): eliges mapa + bomba + lado y la app
dibuja las entradas sobre el plano real, reparte los operadores entre los cinco y sincroniza el plan
en tiempo real con una sala P2P (código de 6 letras, sin servidor ni cuentas).

## Correr local
```bash
python3 -m http.server 4354 --directory ~/claude/nuevaseason
```
→ http://localhost:4354 (landing) · http://localhost:4354/app.html (app)

## Modo ronda (pensado para los 45 s de selección de operador)
1. **Mapa** (tiles con plano) → 2. **Lado + sitio** (en defensa te dice qué sitio pedir; en ataque "aún no sé el sitio" = comp flexible) →
3. **Plan**: 5 tarjetas grandes jugador → operador → a dónde va, estrategia DEFAULT/RUSH/VERTICAL/SPLIT, botón 🔊 Dictar (voz es-MX) →
4. **En vivo**: mapa grande, reloj de 3:00, fases de la estrategia, las líneas avanzan y la tarjeta muestra el paso actual y la zona de defensores que toca limpiar.
5. **Terminó la ronda** → GANAMOS/PERDIMOS + qué pasó (rush, vertical, flanco, plant, tiempo, duelos) → la app propone la ronda siguiente: cambio de lado (medio tiempo tras la 3ª; tiempo extra alterna), qué sitio pedir (récord por sitio; una derrota no cambia de sitio, dos seguidas sí), qué setup (perdimos a rush → anti-rush; ataque sin tiempo → RUSH; sin plant → VERTICAL…). "Nuevo partido" borra marcador y rondas.
- Rutas por **pathfinding A\*** sobre máscaras del blueprint (`img/masks`, `tools/build-masks.py`): pared blanca = bloqueada, amarillo = rompible (caro), interior/exterior del edificio distinguidos para que las rutas exteriores rodeen el edificio.
- Estrategias por sitio en `js/strats/<mapa>.json` (generadas por agentes contra `tools/ctx/<mapa>.json` y validadas con `tools/validate-strats.js`). Faltan 9 mapas (límite de sesión): kanal, house, tower, bartlett, closequarter, fortress, favela, yacht, plane, hereford.

## Estructura
- `index.html` landing · `app.html` app · `css/` estilos · `js/`
- `js/data-maps.js` — 27 mapas / 100 sitios / 343 entradas (vectores) + plan de ataque + setup de defensa + croquis de rejilla
- `js/data-ops.js` — 37 atacantes + 38 defensores (incluye Noor, Y11S3)
- `js/data-squad.js` — perfiles del squad (R6 Tracker, 3-sep-2026)
- `js/data-ranks.js` — Ranked 3.0 (8 tiers × 5 div × 100 RP desde 0) + Ranked 2.0 para picos viejos
- `js/r6maps.json` — cuartos ES/EN, bombas por set, escotillas, spawns, cámaras con coordenadas (extraído de r6maps.com)
- `js/floors-manifest.json` + `img/maps/<mapa>/<piso>.jpg` — blueprints reales de 18 mapas (r6maps.com)
- `js/engine.js` — casa sitios con sets de bomba, asigna operador→entrada · `js/router.js` — A* sobre máscaras · `js/data-picks.js` — qué sitio pedir en defensa
- `js/mapview.js` — visor pan/zoom con capas y edición de rutas · `js/sync.js` — sala PeerJS · `js/app.js` — UI

## Honestidad de datos
- Los 18 mapas con plano son blueprints in-game; Border/Chalet/Skyscraper/Consulate/House/Favela son de la versión previa al rework.
- Villa (rework Y11S3), Lair, Outback, Emerald Plains, Nighthaven, Stadium Alpha/Bravo, Close Quarter y Fortress no tienen plano público: croquis esquemático + botón **Subir plano** (se guarda en el navegador).
- Los callouts marcados `?` / "por confirmar" los escribí de memoria: confírmalos en el juego y corrígelos en `data-maps.js`.
- Ubisoft no publica el corte exacto de Champion en Ranked 3.0; se asume 3,500+.
