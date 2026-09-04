/* R6 NUEVA SEASON — SQUAD · datos de R6 Tracker (3-sep-2026, ~04:40 CST)
   Escala de RP verificada contra el propio tracker: Ranked 3.0 arranca en 1,000 RP
   (Camila 2,150 = PLATA IV · maciaco 3,100 = PLATINO IV · Paola 3,164 = PLATINO IV). Champion = 4,500+. */
window.SQUAD = [
 {id:'valeria', main:'ash',      nick:'NarrativePrime', alias:'o Valeria 15', plat:'xbl', role:'Entry / Fragger', tag:'MVP',
  stats:{level:874, matches:9472, hours:3504, win:49.5, kd:1.16, hs:47.8, kills:54276, deaths:46599, kpm:5.73,
         ranked:{matches:8771, win:50.0, kd:1.12}, peak:{season:'Deep Freeze', rp:4567, scale:2},
         season:{n:'Split Fire', rp:null, rank:'Sin rango aún', matches:2, w:1, l:1, kd:1.10, hs:54.5, kills:11, deaths:10, aces:0, clutches:1},
         seasons:[['Split Fire',0,1.10,2,3],['System Override',4102,1.04,573,3],['Silent Hunt',4566,1.25,493,2],['Tenfold Pursuit',4502,1.05,346,2],['High Stakes',4486,1.28,290,2]],
         last:[['Skyscraper','L','2:4',0.80],['Calypso Casino','W','4:2',1.40],['Oregon','W','4:2',1.00],['Clubhouse','L','1:4',0.60],['Clubhouse','W','4:1',1.00]]}},
 {id:'paola',   main:'thermite', nick:'o Paola 9',      alias:'TaP Pablinch', plat:'xbl', role:'Support / Hard breach', tag:'MURO',
  stats:{level:560, matches:5769, hours:2674, win:49.5, kd:0.91, hs:49.9, kills:23298, deaths:25581, kpm:4.04,
         ranked:{matches:4997, win:50.2, kd:0.89}, peak:{season:'Silent Hunt', rp:4545, scale:2},
         season:{n:'Split Fire', rp:3164, rank:'Platino IV', pos:'#38,770', matches:7, w:5, l:2, kd:0.96, hs:31.8, kills:22, deaths:23, aces:0, clutches:0},
         seasons:[['Split Fire',3197,0.96,7,3],['System Override',3398,1.14,82,3],['Silent Hunt',4545,0.93,483,2],['Tenfold Pursuit',3557,0.87,132,2],['High Stakes',4389,0.89,336,2]],
         last:[['Skyscraper','L','2:4',0.33],['Calypso Casino','W','4:2',0.33],['Skyscraper','W','4:0',4.00],['Coastline','W','4:0',1.50],['Bank','L','0:4',0.00]]}},
 {id:'maciaco', main:'jager', nick:'maciaco',        plat:'xbl', role:'Flex / Roam', tag:'CAZADOR',
  stats:{level:500, matches:4957, hours:903, win:48.7, kd:0.94, hs:41.8, kills:20945, deaths:22295, kpm:4.23,
         ranked:{matches:4249, win:50.0, kd:0.94}, peak:{season:'Silent Hunt', rp:3957, scale:2},
         season:{n:'Split Fire', rp:3100, rank:'Platino IV', matches:9, w:6, l:3, kd:1.20, hs:64.3, kills:42, deaths:35, aces:1, clutches:2},
         seasons:[['Split Fire',3128,1.20,9,3],['System Override',3194,1.03,73,3],['Silent Hunt',3957,0.88,504,2],['Tenfold Pursuit',2837,1.05,113,2],['High Stakes',3724,0.89,294,2]],
         last:[['Kafe Dostoyevsky','L','4:5',0.43],['Clubhouse','W','4:1',2.67],['Skyscraper','L','2:4',2.20],['Calypso Casino','W','4:2',0.75],['Skyscraper','W','4:0',0.50]]}},
 {id:'camila',  main:'valkyrie', nick:'oCamila13',      plat:'xbl', role:'Intel / Anchor', tag:'OJOS',
  stats:{level:339, matches:3609, hours:1496, win:47.4, kd:0.74, hs:43.7, kills:12114, deaths:16346, kpm:3.36,
         ranked:{matches:2921, win:48.9, kd:0.74}, peak:{season:'Silent Hunt', rp:3153, scale:2},
         season:{n:'Split Fire', rp:2150, rank:'Plata IV', matches:5, w:4, l:1, kd:0.67, hs:58.3, kills:12, deaths:18, aces:0, clutches:0},
         seasons:[['Split Fire',2150,0.67,5,3],['System Override',2133,0.61,17,3],['Silent Hunt',3153,1.08,172,2],['Tenfold Pursuit',2015,0.65,71,2],['High Stakes',2562,0.58,224,2]],
         last:[['Skyscraper','W','4:0',2.50],['Coastline','W','3:0',0.00],['Bank','L','0:4',0.25],['Chalet','W','4:2',0.60],['Chalet','W','5:3',0.60]]}}
];

/* Partidas jugadas COMO SQUAD (mismo mapa, mismo marcador, misma hora en los perfiles del tracker).
   Sirven de semilla del registro de temporada; las nuevas se añaden desde la app al cerrar cada partido. */
window.SQUAD_MATCHES = [
 {id:'trk-sky24', date:'2026-09-02T15:00', map:'skyscraper', mapName:'Skyscraper', result:'L', w:2, l:4, src:'tracker',
  players:{valeria:{k:4,d:5,a:1}, paola:{k:2,d:6,a:0,rp:3164}, maciaco:{k:11,d:5,a:1,rp:3100}}},
 {id:'trk-cal42', date:'2026-09-02T15:30', map:null, mapName:'Calypso Casino', result:'W', w:4, l:2, src:'tracker',
  players:{valeria:{k:7,d:5,a:0}, paola:{k:1,d:3,a:3,rp:3197}, maciaco:{k:3,d:4,a:2,rp:3106}}},
 {id:'trk-sky40', date:'2026-09-02T14:00', map:'skyscraper', mapName:'Skyscraper', result:'W', w:4, l:0, src:'tracker',
  players:{paola:{k:4,d:1,a:2,rp:3172}, maciaco:{k:1,d:2,a:0,rp:3081}, camila:{k:5,d:2,a:1,rp:2150}}},
 {id:'trk-bank04', date:'2026-09-02T13:00', map:'bank', mapName:'Bank', result:'L', w:0, l:4, src:'tracker',
  players:{paola:{k:0,d:4,a:0}, camila:{k:1,d:4,a:0}}}
];
