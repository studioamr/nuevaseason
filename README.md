# R6 NUEVA SEASON — centro de mando del squad (Y11S3 Split Fire)

Plataforma privada para el squad de Rainbow Six Siege (Xbox): eliges mapa + bomba + lado y la app
dibuja las entradas sobre el plano real, reparte los operadores entre los cinco y sincroniza el plan
en tiempo real con una sala P2P (código de 6 letras, sin servidor ni cuentas).

## Correr local
```bash
python3 -m http.server 4354 --directory ~/claude/nuevaseason
```
→ http://localhost:4354 (landing) · http://localhost:4354/app.html (app)

## Las 5 fases
`1 RANKED` (lobby con LISTO) → `2 MAPA` → `3 LADO · SITIO` → `4 PLAN` (preparación 45 s) → `5 EN VIVO` (reloj 3:00). La app abre siempre en la fase 1.

## Señalización del mapa
Cada jugador aparece como el **retrato circular de su operador**. El **aro es del color del lado** (azul en ataque, morado en defensa), así se distingue de un vistazo quién es de tu equipo. La **línea** conserva un color propio por jugador para poder seguir la tuya entre cinco.
Las **bombas se dibujan con el icono de la bomba** en un aro ámbar de objetivo (nunca una letra suelta): la del sitio activo va grande y con pulso, las otras pequeñas y punteadas. Ya no hay iniciales sueltas: se distingue de un vistazo quién es quién, y la cabeza que avanza en *En vivo* también lleva su retrato.

## Fase 1 · Lobby con LISTO
"Iniciar ranked" abre una ventana grande donde **cada quien da LISTO**. El estado se identifica por conexión (no por slot, así dos personas pueden elegir el mismo operador de squad sin pisarse) y se fusiona en la sala: dos pueden dar listo a la vez. Cuando todos los conectados están listos, **la partida arranca sola en todas las pantallas**. El host puede forzar con "Empezar ya".

Todo lo demás es de confirmación única: **basta con que uno toque el mapa, vete un mapa o registre el resultado de la ronda para que se le actualice a todo el equipo.** Probado con dos clientes: listo 1/2 → 2/2 → arranque simultáneo; veto de Chalet y elección de Coastline desde el invitado vistas por el host; marcador 1–0 R2 idéntico en ambos.

## Historial (debajo del lobby)
En la fase 1, bajo *Partida ranked*, va el historial del squad: cada partida como una **ficha del mapa con su plano de fondo**, el resultado, el marcador y las K/D/A de cada quien, más el récord total.

## Actualizar del tracker
El navegador no puede leer r6.tracker.network directamente (CORS), así que cada tarjeta del squad trae **↻ Actualizar**: abre el perfil, copias la página y la pegas; se leen rango, RP, K/D, nivel, partidas y K/D de la season, y el RP entra en la gráfica de la temporada.

## Modo ronda (pensado para los 45 s de selección de operador)
> Regla de diseño: **si hay que leer, no sirve.** El paso 3 es una hoja de operación de 5 tarjetas (operador · rol en dos palabras · spawn › entrada › objetivo). Los textos largos aparecen uno a la vez, ya en juego.

0. **INICIAR RANKED** (paso 1): la app lleva marcador, rondas, cambio de lado y, al cerrar el partido (a 4 rondas / prórroga), pide **K / D / A y RP** de cada uno y lo guarda en la temporada.
1. **Mapa** (tiles con plano) → 2. **Lado + sitio** (en defensa te dice qué sitio pedir; en ataque "aún no sé el sitio" = comp flexible) →
3. **Plan**: 5 tarjetas grandes jugador → operador → a dónde va, estrategia DEFAULT/RUSH/VERTICAL/SPLIT, botón 🔊 Dictar (voz es-MX) →
4. **En vivo**: mapa grande, reloj de 3:00, fases de la estrategia, las líneas avanzan y la tarjeta muestra el paso actual y la zona de defensores que toca limpiar.
5. **Terminó la ronda** → GANAMOS/PERDIMOS + qué pasó (rush, vertical, flanco, plant, tiempo, duelos) → la app propone la ronda siguiente: cambio de lado (medio tiempo tras la 3ª; tiempo extra alterna), qué sitio pedir (récord por sitio; una derrota no cambia de sitio, dos seguidas sí), qué setup (perdimos a rush → anti-rush; ataque sin tiempo → RUSH; sin plant → VERTICAL…). "Nuevo partido" borra marcador y rondas.
- Rutas por **pathfinding A\*** sobre máscaras del blueprint (`img/masks`, `tools/build-masks.py`): pared blanca = bloqueada, amarillo = rompible (caro), interior/exterior del edificio distinguidos para que las rutas exteriores rodeen el edificio.
- Estrategias por sitio en `js/strats/<mapa>.json` (generadas por agentes contra `tools/ctx/<mapa>.json` y validadas con `tools/validate-strats.js`). Faltan 9 mapas (límite de sesión): kanal, house, tower, bartlett, closequarter, fortress, favela, yacht, plane, hereford.

## Mapas
La app muestra **18 mapas: el pool de ranked, todos con plano oficial del juego** (Fortress incluido). Los casuales y los dos Stadium (sin blueprint público) quedan fuera de la lista pero sus datos y estrategias siguen ahí: se ven con **+ ver mapas fuera del pool** al final de la cuadrícula, por si el pool rota.

## Planos
25 de 27 mapas tienen **plano oficial del juego**: 18 desde r6maps.com (con nombres de cuarto y bombas reales) y 7 desde los blueprints oficiales publicados por Dexerto — Villa, Lair, Outback, Fortress, Emerald Plains, Nighthaven Labs y Close Quarter. Estos 7 traen geometría real (paredes y paredes rompibles, que alimentan el pathfinding) pero **no traen nombres de cuarto**, así que las posiciones de cuarto se proyectan desde el croquis y son **aproximadas y editables** (arrástralas con "Editar rutas"; se guardan y se sincronizan). Solo Stadium Alpha y Stadium Bravo siguen en croquis: no hay blueprint público.

## Iconos de operador
`img/ops/<id>.svg` — 74 iconos oficiales autohospedados (paquete comunitario `r6operators` v2.12.0, vía jsDelivr). Noor (Y11S3) aún no está en el paquete: cae a un monograma. Se usan en las fichas del plan, los chips de En vivo y la rejilla del cajón.

## Diseño
Centro de mando táctico: chapa mate, reglas finas, sin neón ni cristal. Tipografía condensada (Barlow/Saira/Oswald) con animación de teletipo. El acento de toda la interfaz **cambia con el lado**: azul en ataque, naranja en defensa (convención de R6).

## Etapas sobre el plano
La estrategia se muestra como fases numeradas encima del mapa (`.phasebar`) y **se van completando** con el reloj en *En vivo*. En ataque salen de la línea de tiempo de la estrategia; en defensa se generan de la fase de preparación, roam, anclas y retake.

## Tema
`js/theme.js` — presets **R6 clásico** (azul ataque / naranja defensa), Nueva Season, Pro league, Sigilo; colores editables, 4 fuentes condensadas y control de brillo. El acento de toda la interfaz **sigue al lado activo**.

## Temporada (pestaña SQUAD)
Meta *todos Champion*: RP actual, rango Ranked 3.0, cuánto falta para Champion (RP y victorias estimadas a ~80 RP), K/D de la temporada, K·D·A, historial de partidos y exportar/importar JSON.

## Rutas: cómo se garantiza que no crucen paredes
`tools/build-masks.py` genera una máscara por piso: pared = estructura blanca **fina** (apertura morfológica descarta pisos claros), amarillo = rompible, y el **interior del edificio** se detecta por inundación desde el borde de la imagen (lo que no se alcanza sin cruzar muro es interior). `js/router.js` hace A* sobre eso con modos *outdoor* (rodea el edificio) / *indoor* / *enter*, suavizado que no atraviesa muros ni cambia de zona, y extremos que solo se pegan al cuarto si hay línea limpia. Verificado: 0 muros cruzados en Skyscraper, Bank y Clubhouse.

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
