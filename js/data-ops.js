/* R6 NUEVA SEASON — operadores
   Roles (atacante):
   duro      = abre pared/escotilla REFORZADA
   blando    = abre pared/piso BLANDO (vertical)
   antigadget= quita Bandit/Kaid/Mute/Jäger/cámaras para que entre el duro
   intel     = dron, cámaras, escaneo
   entrada   = primero por la puerta / ventana
   flanco    = vigila la espalda, caza roamers
   negacion  = humo, veneno, área que el defensor no puede pisar
   soporte   = escudo, curación, flash para el equipo
*/
window.ROLES = {
  duro:      {n:'Breach duro',    d:'Abre paredes y escotillas reforzadas. Sin esto no hay entrada limpia al sitio.'},
  antigadget:{n:'Anti-gadget',    d:'Quita Bandit, Kaid, Mute, Jäger y cámaras. Va ANTES del breach duro.'},
  blando:    {n:'Vertical',       d:'Abre piso y paredes blandas desde arriba o abajo. Mata sin entrar.'},
  intel:     {n:'Intel',          d:'Drones, cámaras, escaneos. Te dice dónde están antes de entrar.'},
  entrada:   {n:'Entrada',        d:'Primero por la puerta. Rápido, duelo 1v1.'},
  flanco:    {n:'Flanco',         d:'Cuida la espalda del equipo y caza roamers.'},
  negacion:  {n:'Negación',       d:'Humo, gas, trampas: zonas donde el defensor no puede quedarse.'},
  soporte:   {n:'Soporte',        d:'Escudos, curación, flashes, cobertura para el plant.'}
};

window.OPS = [
 // ---------- ATACANTES ----------
 {id:'sledge',    n:'Sledge',    side:'atk', spd:2, hp:2, g:'Martillo de brecha',      roles:['blando'],            job:'Abre pisos y paredes blandas sin gastar gadget. Vertical desde arriba del sitio.'},
 {id:'thatcher',  n:'Thatcher',  side:'atk', spd:2, hp:2, g:'Granada EMP',             roles:['antigadget'],        job:'Lanza EMP a la pared reforzada antes de que Thermite/Hibana/Ace la abran. Mata Bandit/Kaid/Mute.'},
 {id:'ash',       n:'Ash',       side:'atk', spd:3, hp:1, g:'Lanzador de brecha',      roles:['entrada','blando'],  job:'Abre blandas a distancia y entra primero. Quita Castle y barricadas desde lejos.'},
 {id:'thermite',  n:'Thermite',  side:'atk', spd:2, hp:2, g:'Carga exotérmica',        roles:['duro'],              job:'La pared reforzada principal del sitio. Necesita anti-gadget antes.'},
 {id:'twitch',    n:'Twitch',    side:'atk', spd:2, hp:2, g:'Dron de choque',          roles:['antigadget','intel'],job:'Destruye gadgets con el dron: Bandit, Jäger, cámaras, Mira. Intel mientras lo hace.'},
 {id:'montagne',  n:'Montagne',  side:'atk', spd:1, hp:3, g:'Escudo extensible',       roles:['soporte','intel'],   job:'Entra primero como muro, da intel y cubre el plant. Ideal en pasillos largos.'},
 {id:'glaz',      n:'Glaz',      side:'atk', spd:2, hp:2, g:'Mira térmica',            roles:['negacion','soporte'],job:'Humos + térmica: mata a través del humo mientras plantan.'},
 {id:'fuze',      n:'Fuze',      side:'atk', spd:1, hp:3, g:'Carga de racimo',         roles:['negacion','blando'], job:'Limpia el sitio desde la pared o el piso de arriba. Cuidado con el rehén.'},
 {id:'blitz',     n:'Blitz',     side:'atk', spd:2, hp:2, g:'Escudo flash',            roles:['entrada','soporte'], job:'Entra por pasillos cortos, flashea y remata. No en ángulos largos.'},
 {id:'iq',        n:'IQ',        side:'atk', spd:3, hp:1, g:'Detector electrónico',    roles:['intel','antigadget'],job:'Ve gadgets a través de paredes: Kapkan, Valkyrie, Pulse, Vigil. Los quita con el arma.'},
 {id:'buck',      n:'Buck',      side:'atk', spd:2, hp:2, g:'Skeleton Key',            roles:['blando'],            job:'Vertical desde arriba: abre piso con la escopeta bajo cañón y mata al defensor anclado.'},
 {id:'blackbeard',n:'Blackbeard',side:'atk', spd:2, hp:2, g:'Escudo de rifle',         roles:['soporte','entrada'], job:'Gana los duelos de ventana y ángulo largo. Sostiene una línea mientras plantan.'},
 {id:'capitao',   n:'Capitão',   side:'atk', spd:3, hp:1, g:'Ballesta táctica',        roles:['negacion'],          job:'Fuego asfixiante para sacar al defensor del sitio o cubrir el plant, humo a distancia.'},
 {id:'hibana',    n:'Hibana',    side:'atk', spd:3, hp:1, g:'X-KAIROS',                roles:['duro'],              job:'Abre escotillas reforzadas y hace agujeros de cabeza a distancia. Más flexible que Thermite.'},
 {id:'jackal',    n:'Jackal',    side:'atk', spd:2, hp:2, g:'Eyenox',                  roles:['flanco','intel'],    job:'Rastrea huellas de roamers y los caza. Mata al roam antes de entrar al sitio.'},
 {id:'ying',      n:'Ying',      side:'atk', spd:2, hp:2, g:'Candela',                 roles:['entrada','negacion'],job:'Flash múltiple por puerta o piso. Entrada agresiva cuando el sitio está ciego.'},
 {id:'zofia',     n:'Zofia',     side:'atk', spd:2, hp:2, g:'KS79 Lifeline',           roles:['entrada','blando'],  job:'Impactos para abrir blandas + concusión. Entra sola, aguanta un tiro.'},
 {id:'dokkaebi',  n:'Dokkaebi',  side:'atk', spd:2, hp:2, g:'Logic Bomb',              roles:['intel','flanco'],    job:'Hace sonar los teléfonos de los roamers y hackea sus cámaras. Revela a Vigil y Caveira.'},
 {id:'lion',      n:'Lion',      side:'atk', spd:2, hp:2, g:'EE-ONE-D',                roles:['intel','flanco'],    job:'Escaneo global: nadie se mueve mientras plantan. Úsalo al entrar y al plantar.'},
 {id:'finka',     n:'Finka',     side:'atk', spd:2, hp:2, g:'Adrenal Surge',           roles:['soporte'],           job:'Cura y levanta a todos a la vez. Actívalo justo en la entrada final.'},
 {id:'maverick',  n:'Maverick',  side:'atk', spd:3, hp:1, g:'Soplete',                 roles:['duro','antigadget'], job:'Abre reforzadas en silencio aunque haya Bandit/Kaid. Hace mirillas para ver el sitio.'},
 {id:'nomad',     n:'Nomad',     side:'atk', spd:2, hp:2, g:'Airjab',                  roles:['flanco'],            job:'Pone Airjabs en los pasillos de flanco. El equipo puede plantar sin mirar atrás.'},
 {id:'gridlock',  n:'Gridlock',  side:'atk', spd:1, hp:3, g:'Trax Stingers',           roles:['flanco','negacion'], job:'Púas en el pasillo de flanco y en la puerta del sitio. Nadie corre a rematar el plant.'},
 {id:'nokk',      n:'Nøkk',      side:'atk', spd:2, hp:2, g:'HEL',                     roles:['flanco','intel'],    job:'Invisible a cámaras. Entra por el flanco sin que el sitio lo vea venir.'},
 {id:'amaru',     n:'Amaru',     side:'atk', spd:2, hp:2, g:'Garra Hook',              roles:['entrada'],           job:'Sube a ventanas y escotillas en un segundo. Entrada sorpresa por arriba.'},
 {id:'kali',      n:'Kali',      side:'atk', spd:2, hp:2, g:'Lanza explosiva LV',      roles:['antigadget'],        job:'Destruye Bandit/Kaid/Mira desde lejos por la pared. Rifle de un tiro para ventanas.'},
 {id:'iana',      n:'Iana',      side:'atk', spd:2, hp:2, g:'Réplica Gemini',          roles:['intel','entrada'],   job:'Clon holográfico: entra primero sin morir. Confirma dónde están y luego entra de verdad.'},
 {id:'ace',       n:'Ace',       side:'atk', spd:2, hp:2, g:'S.E.L.M.A.',              roles:['duro'],              job:'Abre reforzadas desde lejos sin exponerse. Tres cargas: pared + escotilla + una extra.'},
 {id:'zero',      n:'Zero',      side:'atk', spd:3, hp:1, g:'Cámaras Argus',           roles:['intel','antigadget'],job:'Cámaras que atraviesan pared y disparan láser: destruye gadgets y vigila el sitio.'},
 {id:'flores',    n:'Flores',    side:'atk', spd:2, hp:2, g:'RCE-Ratero',              roles:['antigadget'],        job:'Drones explosivos a control: limpia escudos, Kapkan, Bandit sin arriesgarse.'},
 {id:'osa',       n:'Osa',       side:'atk', spd:1, hp:3, g:'Escudo Talon-8',          roles:['soporte'],           job:'Escudo transparente en puerta o ventana: cubre el plant y cierra un ángulo.'},
 {id:'sens',      n:'Sens',      side:'atk', spd:3, hp:1, g:'R.O.U.',                  roles:['negacion','soporte'],job:'Línea de humo rodante: tapa un pasillo entero para cruzar o plantar.'},
 {id:'grim',      n:'Grim',      side:'atk', spd:3, hp:1, g:'Colmena Kawan',           roles:['intel','flanco'],    job:'Abejas que marcan a quien pise la zona. Pon una en la puerta del sitio.'},
 {id:'brava',     n:'Brava',     side:'atk', spd:3, hp:1, g:'Dron Kludge',             roles:['antigadget','intel'],job:'Hackea gadgets enemigos y los vuelve tuyos: Evil Eye, Kapkan, Jäger.'},
 {id:'ram',       n:'Ram',       side:'atk', spd:1, hp:3, g:'BU-GI',                   roles:['blando','negacion'], job:'Robot que abre TODO el piso de arriba del sitio. Vertical masivo.'},
 {id:'deimos',    n:'Deimos',    side:'atk', spd:1, hp:3, g:'DeathMARK',               roles:['flanco','intel'],    job:'Marca a un defensor y lo obliga a un duelo. Caza al roamer solo.'},
 {id:'striker',   n:'Striker',   side:'atk', spd:2, hp:2, g:'Múltiple (recluta)',       roles:['soporte','flanco'],  job:'Lleva utilidad extra: 2 gadgets secundarios. Rellena lo que le falte al equipo.'},
 // ---------- DEFENSORES (para saber a qué te enfrentas) ----------
 {id:'smoke',   n:'Smoke',   side:'def', g:'Gas',            ctr:'Retrasa el plant. Planta lejos de su gas.'},
 {id:'mute',    n:'Mute',    side:'def', g:'Jammer',         ctr:'Bloquea drones y breach. Thatcher / Kali / Twitch.'},
 {id:'castle',  n:'Castle',  side:'def', g:'Barricada blindada', ctr:'Ash, Sledge o explosivos. No la abras a golpes.'},
 {id:'pulse',   n:'Pulse',   side:'def', g:'Sensor cardiaco', ctr:'Suele estar abajo del sitio. IQ lo ve.'},
 {id:'doc',     n:'Doc',     side:'def', g:'Estimulante',    ctr:'Ancla. Vertical (Buck/Sledge) lo saca.'},
 {id:'rook',    n:'Rook',    side:'def', g:'Blindaje',       ctr:'Ancla. Apunta a la cabeza.'},
 {id:'kapkan',  n:'Kapkan',  side:'def', g:'Trampas de puerta', ctr:'Dronea las puertas. IQ / Twitch / Flores.'},
 {id:'tachanka',n:'Tachanka',side:'def', g:'Shumikha',       ctr:'Fuego. No plantes en su línea.'},
 {id:'jager',   n:'Jäger',   side:'def', g:'ADS',            ctr:'Come granadas. Twitch / Thatcher / Brava antes de tirar.'},
 {id:'bandit',  n:'Bandit',  side:'def', g:'Batería',        ctr:'Electrifica reforzadas. Thatcher / Kali / Maverick / Twitch.'},
 {id:'frost',   n:'Frost',   side:'def', g:'Cepo',           ctr:'Bajo ventanas. Dronea antes de entrar por ventana.'},
 {id:'valkyrie',n:'Valkyrie',side:'def', g:'Cámaras',        ctr:'Rompe cámaras al entrar. IQ las ve.'},
 {id:'caveira', n:'Caveira', side:'def', g:'Silencio',       ctr:'Roamer. Jackal / Dokkaebi / Lion.'},
 {id:'echo',    n:'Echo',    side:'def', g:'Yokai',          ctr:'Niega el plant. Mata el dron o IQ.'},
 {id:'mira',    n:'Mira',    side:'def', g:'Espejo negro',   ctr:'Kali / Thatcher+Thermite en la pared del espejo, o vertical.'},
 {id:'lesion',  n:'Lesion',  side:'def', g:'Gu',             ctr:'Minas invisibles. IQ / drones / camina despacio.'},
 {id:'ela',     n:'Ela',     side:'def', g:'Grzmot',         ctr:'Concusión en puertas. IQ / Twitch.'},
 {id:'vigil',   n:'Vigil',   side:'def', g:'ERC-7',          ctr:'Invisible a drones. Dokkaebi / Lion.'},
 {id:'maestro', n:'Maestro', side:'def', g:'Evil Eye',       ctr:'Kali / Zero / Brava / dispárale cuando abre.'},
 {id:'alibi',   n:'Alibi',   side:'def', g:'Prisma',         ctr:'No dispares a los hologramas. Dronea.'},
 {id:'clash',   n:'Clash',   side:'def', g:'Escudo CCE',     ctr:'Explosivos / rodéala. Nunca 1v1 de frente.'},
 {id:'kaid',    n:'Kaid',    side:'def', g:'Rtila',          ctr:'Electrifica escotillas. Thatcher / Kali / Maverick.'},
 {id:'mozzie',  n:'Mozzie',  side:'def', g:'Pest',           ctr:'Roba drones. Cuida tu dron en fase de prep.'},
 {id:'warden',  n:'Warden',  side:'def', g:'Glance',         ctr:'Ve en humo y flash. No confíes en Glaz/Ying contra él.'},
 {id:'goyo',    n:'Goyo',    side:'def', g:'Volcán',         ctr:'Botes de fuego. Dispárales desde lejos.'},
 {id:'wamai',   n:'Wamai',   side:'def', g:'Mag-NET',        ctr:'Atrae granadas. Igual que Jäger.'},
 {id:'oryx',    n:'Oryx',    side:'def', g:'Remah Dash',     ctr:'Sube escotillas. Vigila la escotilla que abriste.'},
 {id:'melusi',  n:'Melusi',  side:'def', g:'Banshee',        ctr:'Te frena. Zero / Kali / Twitch.'},
 {id:'aruni',   n:'Aruni',   side:'def', g:'Surya',          ctr:'Láser en puertas. Dron o dispara el emisor.'},
 {id:'thunderbird',n:'Thunderbird',side:'def', g:'Kóna',     ctr:'Cura. Ancla. Vertical.'},
 {id:'thorn',   n:'Thorn',   side:'def', g:'Razorbloom',     ctr:'Trampa de proximidad. IQ / drones.'},
 {id:'azami',   n:'Azami',   side:'def', g:'Kiba',           ctr:'Bloquea agujeros. Explosivos / cambia de entrada.'},
 {id:'solis',   n:'Solis',   side:'def', g:'SPEC-IO',        ctr:'Ve tus gadgets. Nøkk es invisible a ella.'},
 {id:'fenrir',  n:'Fenrir',  side:'def', g:'F-NATT',         ctr:'Gas de miedo. Dispara los nodos / Thatcher.'},
 {id:'tubarao', n:'Tubarão', side:'def', g:'Zoto',           ctr:'Congela gadgets y breach. Espera que expire o Thatcher.'},
 {id:'skopos',  n:'Skopós',  side:'def', g:'Cuerpos V10',    ctr:'Dos cuerpos. Mata el que está activo, luego el otro.'},
 {id:'noor',    n:'Noor',    side:'def', g:'Lanzador Horus (fuego)', ctr:'NUEVO Y11S3. Dispara 5 lanzas de fuego que atraviesan escudos y superficies (también piso/techo). Contra Noor: no entres con Montagne/Blitz/Osa de frente; dronea, rompe el lanzador cuando lo saque y entra por otro lado.'},
 {id:'sentry',  n:'Sentry',  side:'def', g:'Múltiple (recluta)', ctr:'Utilidad extra. Trátalo como ancla.'}
];
