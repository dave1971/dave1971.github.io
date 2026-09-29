'use strict';
// ===== Lingua =====
// Every visible string goes through txt(), so translating there covers the whole game with no call
// site changes. Fixed strings are looked up in EN; strings built with numbers go through EN_RULES.

let LANG = 'it', LANG_SET = false;
try {
  const v = localStorage.getItem('olimpiadi_lang');
  if (v === 'en' || v === 'it') { LANG = v; LANG_SET = true; }
} catch (e) { /* storage unavailable */ }

function setLang(l) {
  LANG = l === 'en' ? 'en' : 'it';
  LANG_SET = true;
  T_CACHE.clear();
  try { localStorage.setItem('olimpiadi_lang', LANG); } catch (e) { /* ignore */ }
}
const placeText = n => n + (LANG === 'en' ? ord(n) : '°');
const ord = n => { const k = n % 100; return (k >= 11 && k <= 13) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; };

const EN = {
  // --- title, menus ---
  '1 GIOCATORE': '1 PLAYER', '2 GIOCATORI': '2 PLAYERS',
  'CARRIERA': 'CAREER', 'RECORD': 'RECORDS', 'AUDIO ON': 'AUDIO ON', 'AUDIO OFF': 'AUDIO OFF', 'MUSICA OFF': 'MUSIC OFF',
  'TASTI': 'KEYS', 'PREDEFINITI': 'DEFAULTS', 'PREMI UN TASTO': 'PRESS A KEY',
  'tocca un\'azione e premi il tasto che vuoi usare': 'tap an action and press the key you want to use',
  'Esc e Backspace restano riservati a indietro e pausa.': 'Esc and Backspace stay reserved for back and pause.',
  'Lo stesso tasto non può servire due azioni: scambiandolo si scambiano anche le azioni.':
    'One key cannot serve two actions: taking it swaps the two bindings.',
  'INVIO': 'ENTER', 'BLOC MAIUSC': 'CAPS LOCK', 'SHIFT SX': 'SHIFT L', 'SHIFT DX': 'SHIFT R',
  'CTRL SX': 'CTRL L', 'CTRL DX': 'CTRL R', 'ALT SX': 'ALT L', 'ALT GR': 'ALT GR',
  'CANC': 'DEL', 'FINE': 'END', 'PAG ↑': 'PG ↑', 'PAG ↓': 'PG ↓',
  'DECATHLON': 'DECATHLON', 'le 10 gare una dopo l\'altra': 'all ten events, one after the other',
  'oppure scegli una gara singola:': 'or pick a single event:',
  'NOMI E BANDIERE': 'NAMES AND FLAGS',
  'AVVERSARI: NESSUNO': 'RIVALS: NONE',
  'gare a 8 atleti con medaglie': '8-athlete fields with medals',
  'solo contro il cronometro': 'against the clock only',
  '‹ INDIETRO': '‹ BACK', 'MENU': 'MENU', 'MENU PRINCIPALE': 'MAIN MENU',
  'RIPROVA': 'RETRY', 'RIPETI': 'REPEAT', 'RIPRENDI': 'RESUME', 'RICOMINCIA GARA': 'RESTART EVENT',
  'PAUSA': 'PAUSED', 'RISULTATI': 'RESULTS', 'GARA SINGOLA': 'SINGLE EVENT',
  'ORDINE D\'ARRIVO': 'FINISHING ORDER', 'MEDAGLIE': 'MEDALS', 'PUNTI': 'POINTS',
  'PROSSIMA GARA ›': 'NEXT EVENT ›', 'CLASSIFICA FINALE ›': 'FINAL STANDINGS ›',
  'DECATHLON  •  CLASSIFICA FINALE': 'DECATHLON  •  FINAL STANDINGS',
  'TOCCA LO SCHERMO PER INIZIARE': 'TOUCH THE SCREEN TO START',
  'GLI AVVERSARI STANNO COMPLETANDO LA GARA...': 'THE RIVALS ARE FINISHING THE EVENT...',
  'G1: pulsanti a SINISTRA   •   G2: pulsanti a DESTRA': 'P1: buttons on the LEFT   •   P2: buttons on the RIGHT',
  'CLASSIFICA': 'STANDINGS', 'gli avversari stanno finendo...': 'the rivals are finishing...',
  'IL TUO RECORD': 'YOUR RECORD', 'RECORD DEL MONDO': 'WORLD RECORD',
  'I GIOCATORI': 'PLAYERS', 'IL MONDO': 'THE WORLD',
  'MANDA': 'SEND', 'NON ORA': 'NOT NOW', 'MAI': 'NEVER',
  'HAI UN RECORD DA MANDARE': 'YOU HAVE A RECORD TO SEND',
  'Li metto nella classifica mondiale dei giocatori?': 'Shall I put them in the world players table?',
  'Si manda solo questo: nome, bandiera e risultato.': 'Only this is sent: name, flag and result.',
  'La classifica è pubblica, la vedono tutti i giocatori.': 'The table is public, every player sees it.',
  'Dicendo di sì i prossimi partiranno da soli.': 'Say yes and the next ones go on their own.',
  'sei primo al mondo!': 'you are first in the world!',
  'record mandato, sei in classifica': 'record sent, you are in the table',
  'record ricevuto, ma la classifica pubblica è ferma': 'record received, but the public table is stuck',
  'nessuno è entrato in classifica': 'none of them made the table',
  'non sono riuscito a mandarli: riprovo la prossima volta': 'could not send them: I will try again next time',
  'nuovi record!': 'new records!', 'scarico i record...': 'downloading records...',
  'RECORD!': 'RECORD!', 'CARTELLINO PERFETTO': 'PERFECT CARD',
  'tocca per cambiare livello': 'tap to change level',
  'HAI VINTO IL DECATHLON!': 'YOU WON THE DECATHLON!',
  'CAMPIONE DEL MONDO!': 'WORLD CHAMPION!', 'OTTIMA PRESTAZIONE!': 'GREAT PERFORMANCE!',
  'BUONA GARA, RIPROVA!': 'GOOD EFFORT, TRY AGAIN!', 'PAREGGIO!': 'A TIE!', 'PAREGGIO IN VETTA!': 'TIED AT THE TOP!',
  // --- update panel ---
  'NUOVA VERSIONE DISPONIBILE': 'A NEW VERSION IS AVAILABLE',
  'Vuoi aprire la pagina per scaricarla?': 'Open the page to download it?',
  'La scarico e te la installo adesso?': 'Shall I download and install it now?',
  'SCARICA': 'DOWNLOAD', 'PIÙ TARDI': 'LATER', 'IGNORA': 'SKIP',
  // --- levels ---
  'atleti in crescita, misure modeste': 'athletes still growing, modest marks',
  'livello internazionale': 'international level',
  'si arriva a sfiorare i record del mondo': 'here you get within reach of the world records',
  // --- player setup ---
  'scrivi il nome, scegli la nazione e la mano': 'type the name, pick the nation and the hand',
  'anche da tastiera  •  INVIO = conferma': 'the keyboard works too  •  ENTER = confirm',
  'SPAZIO': 'SPACE', '← CANCELLA': '← DELETE', 'CONFERMA ›': 'CONFIRM ›', 'GIOCATORE 2 ›': 'PLAYER 2 ›',
  'MANCINO': 'LEFT-HANDED', 'DESTRIMANO': 'RIGHT-HANDED',
  'EQUILIBRIO DI SPIN': 'SPIN BALANCE', 'SCARPE DA PEDANA': 'THROWING SHOES',
  'GIAVELLOTTO IN CARBONIO': 'CARBON JAVELIN', 'ARCO RICURVO': 'RECURVE BOW',
  'PREPARAZIONE TRAMPOLINO': 'TRAMPOLINE COACHING', 'PARAMANI E MAGNESITE': 'HAND GRIPS AND CHALK',
  'CLASSICHE': 'CLASSIC TEN', 'A CASO': 'SURPRISE ME', 'VIA! \u203a': 'GO! \u203a',
  '10 gare a tua scelta, una dopo l\'altra': '10 events of your choosing, one after the other',
  'scegli le 10 gare, nell\'ordine in cui vuoi affrontarle': 'pick the 10 events, in the order you want to face them',
  'TELECOMANDO': 'REMOTE', 'nessun telecomando collegato': 'no controller connected',
  'SPEGNI IL SERVER': 'TURN THE SERVER OFF', 'ACCENDI IL SERVER': 'TURN THE SERVER ON',
  'chiude la porta 8080': 'closes port 8080', 'apre la porta 8080 su questa rete': 'opens port 8080 on this network',
  'server spento: nessuno pu\u00f2 entrare': 'server off: nobody can get in',
  'Finch\u00e9 resta spento questo dispositivo non apre nessuna porta':
    'While it stays off this device opens no port at all',
  'e non \u00e8 raggiungibile da chi sta sulla stessa rete.': 'and nobody on the same network can reach it.',
  'Accendilo solo se vuoi comandare il gioco da un telefono o da un':
    'Turn it on only to drive the game from a phone or a tablet:',
  'tablet: serve su un televisore, non serve se giochi qui.':
    'you need it on a television, not if you play right here.',
  'La porta resta aperta solo mentre il gioco \u00e8 in primo piano.':
    'The port stays open only while the game is in the foreground.',
  'sul tablet apri il browser e vai a questo indirizzo:': 'on the tablet open the browser and go to this address:',
  'Il tablet deve essere sulla stessa rete del televisore.': 'The tablet must be on the same network as the television.',
  'La pagina mostra i due tasti della gara con le loro etichette;': 'The page shows the two buttons of the event with their labels;',
  'nei menù diventa un riquadro da toccare come fosse lo schermo.': 'in the menus it becomes a pad you touch as if it were the screen.',
  'Due tablet = due giocatori: in alto si sceglie G1 o G2.': 'Two tablets = two players: pick G1 or G2 at the top.',
  'La tastiera USB continua a funzionare come prima.': 'The USB keyboard goes on working as before.',
  'COLORI ›': 'COLOURS ›', 'divisa, pelle e capelli': 'kit, skin and hair',
  'e i colori dell\'atleta': 'and the athlete\'s colours', 'CASUALE': 'RANDOM',
  'scegli i colori della divisa, della pelle e dei capelli': 'pick the kit, skin and hair colours',
  'MAGLIETTA': 'SHIRT', 'PANTALONCINI': 'SHORTS', 'PELLE': 'SKIN', 'CAPELLI': 'HAIR',
  'azione 1 a SINISTRA  •  tocca per cambiare': 'action 1 on the LEFT  •  tap to change',
  'azione 1 a DESTRA  •  tocca per cambiare': 'action 1 on the RIGHT  •  tap to change',
  'EUROPA': 'EUROPE', 'AMERICHE': 'AMERICAS', 'ASIA': 'ASIA', 'AFRICA': 'AFRICA', 'OCEANIA': 'OCEANIA',
  // --- career ---
  'ALLENAMENTI': 'TRAINING', 'NEGOZIO': 'SHOP', 'QUALIFICAZIONE': 'QUALIFYING',
  'QUALIFICATI ›': 'QUALIFY ›', 'TITOLO MONDIALE': 'WORLD TITLE', 'QUALIFICATO!': 'QUALIFIED!',
  'CAMPIONE DEL MONDO': 'WORLD CHAMPION', 'AVANTI ›': 'CONTINUE ›', '‹ CARRIERA': '‹ CAREER',
  'porta un risultato valido in tutte e 10 le specialità per salire di livello':
    'post a qualifying mark in all ten events to move up a level',
  'il meglio in ogni specialità di questo campionato': 'your best in each event of this championship',
  'il meglio in ogni specialità, campionato per campionato': 'your best in each event, championship by championship',
  'mai gareggiato': 'never competed', 'passi a': 'you move up to', 'su 8': 'of 8',
  'avversari più forti, obiettivi più alti': 'stronger rivals, higher targets',
  'e un tetto di prestazione più vicino ai record': 'and a ceiling closer to the records',
  'hai centrato l\'obiettivo in tutte e diciotto le specialità': 'you have hit the target in all eighteen events',
  'centra l\'obiettivo in tutte le specialità per il titolo mondiale': 'hit the target in every event for the world title',
  'al campionato del mondo. La carriera è completa.': 'at the world championship. The career is complete.',
  'l\'attrezzatura non si consuma: si sostituisce con la versione migliore':
    'equipment never wears out: you replace it with the better version',
  'TETTO DEL LIVELLO': 'TIER CEILING',
  'COMPLETO': 'COMPLETE', 'AL MASSIMO': 'MAXED OUT', 'niente': 'none', '+2 punti': '+2 points',
  'VELOCITÀ': 'SPEED', 'POTENZA': 'POWER', 'RESISTENZA': 'STAMINA', 'TECNICA': 'TECHNIQUE',
  'CHIODATE': 'SPIKES', 'SCARPE DA SALTO': 'JUMPING SHOES', 'ASTA IN CARBONIO': 'CARBON POLE',
  'COSTUME IN FIBRA': 'TECH SUIT', 'CINTURA E MAGNESITE': 'BELT AND CHALK', 'FUCILE DA SKEET': 'SKEET GUN',
  'PREPARAZIONE TUFFI': 'DIVING COACHING',
  'SCEGLI IL GIOCATORE': 'CHOOSE THE PLAYER', 'NUOVA CARRIERA': 'NEW CAREER', 'CONTINUA': 'CONTINUE',
  'ogni giocatore ha la sua carriera, salvata sul dispositivo': 'each player has their own career, saved on the device',
  'AZZERA': 'RESET', 'MODIFICA': 'EDIT',
  'senza misura: nessun premio': 'no mark: no prize money',
  'AZZERARE LA CARRIERA?': 'RESET THIS CAREER?',
  'si perdono livello, soldi, allenamenti e attrezzatura': 'level, money, training and equipment are all lost',
  'STACCO': 'TAKE-OFF', 'INGRESSO': 'ENTRY',
  'A gara ferma B passa le misure che hai già superato.': 'Between attempts, B passes the heights you have already cleared.',
  'A gara ferma B passa i pesi che hai già sollevato.': 'Between attempts, B passes the loads you have already lifted.',
  'premi A per saltare': 'press A to jump',
  'ANNULLA': 'CANCEL', 'SÌ, AZZERA': 'YES, RESET', 'SÌ, PARTI': 'YES, GO',
  'QUALIFICARSI ORA?': 'QUALIFY NOW?',
  'il resto resta in cassa per il campionato nuovo': 'the rest stays in the wallet for the new championship',
  'VENDI TUTTO': 'SELL ALL', 'SÌ, VENDI': 'YES, SELL', 'niente da vendere': 'nothing to sell',
  'VENDERE TUTTA L\'ATTREZZATURA?': 'SELL ALL YOUR EQUIPMENT?',
  'tutto quello che hai pagato, gradino per gradino': 'everything you paid, tier by tier',
  'i bonus tornano a zero finché non ricompri': 'the bonuses go back to zero until you buy again',
  // --- event names ---
  '100 METRI': '100 METRES', '110 OSTACOLI': '110 HURDLES', 'SALTO IN LUNGO': 'LONG JUMP',
  'SALTO IN ALTO': 'HIGH JUMP', 'SALTO TRIPLO': 'TRIPLE JUMP', 'TIRO AL PIATTELLO': 'SKEET SHOOTING',
  'SOLLEVAMENTO PESI': 'WEIGHTLIFTING', '50 M STILE LIBERO': '50 M FREESTYLE',
  'SALTO CON L\'ASTA': 'POLE VAULT', 'TUFFI DALLA PIATTAFORMA': 'PLATFORM DIVING',
  'PIATTELLO': 'SKEET', 'PESI': 'WEIGHTS', '50 M S.L.': '50 M FREE', 'ASTA': 'POLE VAULT', 'TUFFI': 'DIVING',
  // --- button labels ---
  'CORRI': 'RUN', 'SALTA': 'JUMP', 'FORZA': 'PULL', 'SLANCIO': 'JERK', 'NUOTA': 'SWIM', 'RESPIRA': 'BREATHE',
  'GIRA': 'SPIN', 'LANCIA': 'THROW', 'ALZA E LANCIA': 'ANGLE & THROW', 'TENDI E TIRA': 'DRAW & SHOOT', 'RESPIRO': 'BREATH', 'STACCA/RAGGR.': 'TAKE OFF/TUCK',
  '200 METRI': '200 METRES', 'LANCIO DEL PESO': 'SHOT PUT', 'LANCIO DEL DISCO': 'DISCUS THROW',
  'LANCIO DEL MARTELLO': 'HAMMER THROW', 'LANCIO DEL GIAVELLOTTO': 'JAVELIN THROW',
  'TIRO CON L\'ARCO': 'ARCHERY', 'TRAMPOLINO ELASTICO': 'TRAMPOLINE',
  'PESO': 'SHOT', 'DISCO': 'DISCUS', 'MARTELLO': 'HAMMER', 'GIAVELLOTTO': 'JAVELIN',
  'ARCO': 'ARCHERY', 'TRAMPOLINO': 'TRAMPOLINE', 'VOLTEGGIO': 'VAULT',
  'SPARA SX': 'SHOOT L', 'SPARA DX': 'SHOOT R', 'SALTA/RAGGR.': 'JUMP/TUCK', 'AVVITA': 'TWIST',
  'CORRI/RAGGR.': 'RUN/TUCK', 'STACCA/AVVITA': 'TAKE OFF/TWIST',
  // --- in-event messages ---
  'AI VOSTRI POSTI': 'ON YOUR MARKS', 'PRONTI...': 'SET...', 'VIA!': 'GO!',
  'FALSA PARTENZA!': 'FALSE START!', 'SQUALIFICATO!': 'DISQUALIFIED!', 'SQUALIFICATO': 'DISQUALIFIED',
  'SQUALIF.': 'DISQ.', 'RITIRATO': 'RETIRED', 'NULLO': 'FOUL', 'NULLO!': 'FOUL!', 'VALIDO!': 'CLEARED!',
  'ARRIVO': 'FINISH', 'OSTACOLO!': 'HURDLE!', 'COLPITO!': 'HIT!', 'PERFETTO!': 'PERFECT!',
  'EQUILIBRIO': 'BALANCE', 'EQUILIBRIO OK': 'BALANCE SAFE', 'RILASCIO': 'RELEASE', 'FIATO': 'BREATH', 'IN TENSIONE': 'DRAWING', 'PRONTO': 'READY',
  'FUORI!': 'MISS!', 'in pieno centro': 'dead centre', 'premi A per girare, B per alzare e lanciare': 'press A to spin, B to angle and throw',
  'premi A per staccare': 'press A to take off', 'tieni premuto A per tendere l\'arco': 'hold A to draw the bow',
  'uscito dal cerchio': 'you stepped out of the circle', 'fuori dal settore': 'outside the sector',
  'piede oltre la pedana': 'foot past the line', 'non hai lanciato in tempo': 'you did not throw in time',
  'Miglior lancio!': 'Best throw!', 'salto teso': 'straight jump', 'volteggio teso': 'plain vault',
  'CADUTO!': 'FELL!', 'ALZATA VALIDA!': 'GOOD LIFT!', 'NESSUNA MISURA': 'NO MARK', 'NESSUNA ALZATA': 'NO LIFT',
  'SALTELLO': 'HOP', 'PASSO': 'STEP', 'SALTO': 'JUMP',
  'ANGOLO': 'ANGLE', 'OSSIGENO': 'OXYGEN', 'RESPIRA! (B)': 'BREATHE! (B)',
  'B: SLANCIO!': 'B: JERK!', 'TIENI! (A)': 'HOLD IT! (A)',
  'RAGGRUPPATO': 'TUCKED', 'DISTESO': 'STRAIGHT', 'Tuffo in piedi': 'Feet first',
  'piede oltre la linea di battuta': 'foot past the take-off line',
  'non hai saltato in tempo': 'you did not jump in time',
  'premi B quando il piede tocca terra': 'press B as the foot lands',
  'Miglior salto!': 'Best jump!',
  'slancio fuori tempo': 'jerk mistimed', 'troppo lento': 'too slow', 'tempo scaduto': 'out of time',
  'cedimento': 'gave way',
  'premi A per partire': 'press A to start', 'premi A per saltare': 'press A to jump',
  'premi A velocemente per sollevare': 'press A quickly to lift',
  // --- help texts ---
  'Premi velocemente i pulsanti per correre:': 'Press the buttons quickly to run:',
  'alternare A e B è ancora più veloce!': 'alternating A and B is even faster!',
  'Non partire prima dello sparo!': 'Do not go before the gun!',
  'A: premi velocemente per correre': 'A: press quickly to run',
  'B: salta l\'ostacolo (poco prima di raggiungerlo)': 'B: clear the hurdle (just before you reach it)',
  'Ogni ostacolo abbattuto ti rallenta!': 'Every hurdle you knock down slows you down!',
  'A: premi velocemente per prendere la rincorsa': 'A: press quickly for the run-up',
  'B: premi vicino alla linea rossa (senza superarla) per staccare,': 'B: press near the red line (without crossing it) to take off,',
  'tienilo premuto per alzare l\'angolo (ideale ~43°) e rilascia. 3 salti.': 'hold to raise the angle (~43° is ideal) and release. 3 jumps.',
  'A: rincorsa  •  B: stacca vicino al segno bianco': 'A: run-up  •  B: take off near the white mark',
  'B di nuovo in volo, quando sei sopra l\'asticella,': 'B again in the air, once you are over the bar,',
  'per inarcare la schiena. 3 errori consecutivi = fine.': 'to arch your back. 3 failures in a row ends it.',
  'A: premi velocemente per la rincorsa': 'A: press quickly for the run-up',
  'B: stacca prima della linea rossa, poi premi B': 'B: take off before the red line, then press B',
  'ogni volta che il piede tocca terra (3 balzi). 3 salti.': 'every time the foot lands (3 phases). 3 jumps.',
  'A spara nel mirino SINISTRO, B nel mirino DESTRO.': 'A fires through the LEFT sight, B through the RIGHT one.',
  'B spara nel mirino SINISTRO, A nel mirino DESTRO.': 'B fires through the LEFT sight, A through the RIGHT one.',
  'Spara quando il piattello attraversa il mirino.': 'Fire as the clay crosses the sight.',
  'A: gira su te stesso, sempre più veloce. Occhio all\'equilibrio:': 'A: spin on the spot, faster and faster. Mind your balance:',
  'se la barra si svuota esci dal cerchio ed è nullo.': 'if the bar empties you step out of the circle and it is a foul.',
  'B: premi con la lancetta nel settore verde e tienilo premuto per alzare':
    'B: press with the needle in the green sector and hold to raise',
  'l\'angolo (il meglio è ~43°), poi rilascia per lanciare il peso.':
    'the angle (43° is best), then let go to throw the shot.',
  'l\'angolo (il meglio è ~43°), poi rilascia per lanciare il disco.':
    'the angle (43° is best), then let go to throw the discus.',
  'l\'angolo (il meglio è ~43°), poi rilascia per lanciare il martello.':
    'the angle (43° is best), then let go to throw the hammer.',
  'A: premi velocemente per prendere la rincorsa.': 'A: press quickly to build up the run-up.',
  'A: rincorsa. B sulla pedana elastica per staccare.': 'A: run up. B on the springboard to take off.',
  'Poi come nei tuffi: A tenuto per raggrupparti e girare veloce,':
    'Then it is a dive: hold A to tuck and spin fast,',
  'B per gli avvitamenti. Si atterra in piedi. 3 volteggi.':
    'B for the twists. You land on your feet. 3 vaults.',
  'premi A per la rincorsa': 'press A for the run-up',
  'B: tienilo premuto per alzare l\'angolo (ideale ~36°)': 'B: hold it to raise the angle (~36° is ideal)',
  'e rilascia prima della pedana. 3 lanci, conta il migliore.': 'and let go before the line. 3 throws, the best one counts.',
  'Tieni premuto A per tendere l\'arco, rilascia per scoccare.': 'Hold A to draw the bow, release to loose the arrow.',
  'B: trattieni il respiro e il mirino quasi si ferma,': 'B: hold your breath and the sight almost stops moving,',
  'ma il fiato è poco. 6 frecce, 10 punti al centro.': 'but your breath is short. 6 arrows, 10 points in the gold.',
  'A: stacca. Tieni premuto A per raggrupparti e girare': 'A: take off. Hold A to tuck and spin fast,',
  'veloce, rilascia per distenderti. B: mezzo avvitamento.': 'release to stretch out. B: half twist.',
  'Torna sul telo in piedi! 3 esercizi, punti sommati.': 'Land back on the bed on your feet! 3 skills, scores added up.',
  'Premi velocemente i pulsanti per correre:': 'Press the buttons quickly to run:',
  'sono il doppio dei 100, negli ultimi metri cali.': 'twice the 100, and you fade over the last metres.',
  '2 cartucce per lancio, 15 piattelli (nei doppi il 2° parte dopo 1 s).': '2 shells per launch, 15 clays (in doubles the 2nd comes 1 s later).',
  'A: premi velocemente per portare il bilanciere al petto': 'A: press quickly to pull the bar to your chest',
  'B: slancio sopra la testa quando l\'indicatore è nel verde,': 'B: jerk it overhead when the needle is in the green,',
  'poi continua con A per tenerlo. 3 errori consecutivi = fine.': 'then keep pressing A to hold it. 3 failures in a row ends it.',
  'A: tuffati allo sparo, poi premi velocemente per nuotare': 'A: dive at the gun, then press quickly to swim',
  'B: respira quando l\'ossigeno è basso': 'B: breathe when the oxygen runs low',
  '(senza ossigeno rallenti moltissimo!)': '(with no oxygen you slow right down!)',
  'A: rincorsa  •  B: pianta l\'asta vicino al segno bianco': 'A: run-up  •  B: plant the pole near the white mark',
  'B di nuovo quando sei capovolto in cima: lasci l\'asta, pieghi': 'B again when you are upside down at the top: you let go, fold',
  'le gambe oltre l\'asticella e cadi di schiena. 3 errori = fine.': 'your legs over the bar and land on your back. 3 failures ends it.',
  'A: salta. Tieni premuto A per raggrupparti e ruotare': 'A: jump. Hold A to tuck and spin',
  'veloce, rilascia per distenderti. B: mezzo avvitamento.': 'fast, release to straighten. B: half twist.',
  'Entra in acqua dritto e verticale! 3 tuffi, punti sommati.': 'Enter the water straight and vertical! 3 dives, scores added.',
};

// Strings built with numbers: every matching rule is applied, in order.
const EN_RULES = [
  [/^Tastiera: G1 = (.+) \/ (.+)   •   G2 = (.+) \/ (.+)   •   Esc = pausa$/,
    'Keyboard: P1 = $1 / $2   •   P2 = $3 / $4   •   Esc = pause'],
  [/^Tastiera: (.+) = mirino sinistro, (.+) = mirino destro\.$/, 'Keyboard: $1 = left sight, $2 = right sight.'],
  [/^trasferta e iscrizione: /, 'travel and entry: '],
  [/^B: passa a /, 'B: pass to '],
  [/^ogni sessione vale 2 punti  •  in questo campionato si arriva a (\d+) su 100$/,
    'each session is worth 2 points  •  this championship tops out at $1 of 100'],
  [/^IL TUO RECORD: /, 'YOUR RECORD: '], [/^RECORD DEL MONDO: /, 'WORLD RECORD: '],
  [/^HAI (\d+) RECORD DA MANDARE$/, 'YOU HAVE $1 RECORDS TO SEND'],
  [/^parto con: /, 'sending as: '],
  [/\(CARTELLINO PERFETTO\)/, '(PERFECT CARD)'], [/\(GIOCATORE (\d+)\)/, '(PLAYER $1)'],
  [/^Tuffo in piedi/, 'Feet first'],
  [/^Salto /, 'Jump '], [/^Tuffo /, 'Dive '], [/^Peso /, 'Weight '], [/^Asticella /, 'Bar '],
  [/^Colpiti /, 'Hits '], [/^Ostacoli abbattuti: /, 'Hurdles down: '], [/^Falsa partenza: /, 'False start: '],
  [/  •  Errori /, '  •  Fails '], [/  •  Totale /, '  •  Total '],
  [/^SALTO (\d+) DI (\d+)$/, 'JUMP $1 OF $2'], [/^TUFFO (\d+) DI (\d+)$/, 'DIVE $1 OF $2'],
  [/^VOLTEGGIO (\d+) DI (\d+)$/, 'VAULT $1 OF $2'],
  [/^ASTICELLA /, 'BAR '], [/^BILANCIERE /, 'BARBELL '],
  [/^LANCIO (\d+) DI (\d+)$/, 'THROW $1 OF $2'], [/^ESERCIZIO (\d+) DI (\d+)$/, 'SKILL $1 OF $2'],
  [/^FRECCIA (\d+) DI (\d+)$/, 'ARROW $1 OF $2'], [/^LANCIO /, 'ROUND '],
  [/^Lancio /, 'Throw '], [/^Freccia /, 'Arrow '], [/^Esercizio /, 'Skill '], [/^Volteggio /, 'Vault '],
  [/ giri\/s$/, ' turns/s'], [/^scegline /, 'pick '],
  [/^non hai staccato! \(errore (\d+) di 3\)$/, 'you did not take off! (fail $1 of 3)'],
  [/^errore (\d+) di 3$/, 'fail $1 of 3'], [/ \(errore (\d+)\/3\)$/, ' (fail $1/3)'],
  [/GARA (\d+) DI (\d+)/, 'EVENT $1 OF $2'],
  [/^CLASSIFICA DOPO (\d+) GAR[AE]$/, (m, n) => 'STANDINGS AFTER ' + n + (n === '1' ? ' EVENT' : ' EVENTS')],
  [/^hai la v(.*)   →   disponibile la v(.*)$/, 'you have v$1   →   v$2 is out'],
  [/^AVVERSARI: (\d+) CPU$/, 'RIVALS: $1 CPU'],
  [/ avversari CPU, classifica e medaglie$/, ' CPU rivals, ranking and medals'],
  [/^MEDAGLIE VINTE  /, 'MEDALS WON  '], [/^MEDAGLIE  /, 'MEDALS  '], [/^medaglie /, 'medals '],
  [/ oro  ·  /, ' gold  ·  '], [/ argento  ·  /, ' silver  ·  '], [/ bronzo/, ' bronze'],
  [/ gare$/, ' races'], [/ gare   •   /, ' races   •   '],
  [/^in cassa: /, 'cash: '], [/^premio /, 'prize '], [/   \+   obiettivo /, '   +   objective '],
  [/^obiettivo /, 'target '], [/^tuo /, 'your best '], [/^✔  /, '✔  '],
  [/^(\d+) obiettiv[oi] su (\d+)$/, '$1 of $2 targets'],
  [/^centra l'obiettivo in (\d+) specialità su (\d+) per salire di livello$/, 'hit the target in $1 of $2 events to move up a level'],
  [/^rientrano /, 'refund: '],
  [/^trasferta: mancano (.+)$/, 'travel: $1 short'],
  [/^obiettivi centrati: per partire servono (.+)$/, 'targets hit: you need $1 to travel'],
  [/^VINCE (.+)!$/, '$1 WINS!'],
  [/^GIOCATORE (\d+)/, 'PLAYER $1'],
  [/^HAI CHIUSO AL (\d+)° POSTO$/, (m, n) => 'YOU FINISHED ' + n + ord(+n)],
  [/^(\d+)° posto$/, (m, n) => n + ord(+n) + ' place'],
  [/^(\d+)° su (\d+)$/, (m, a, b) => a + ord(+a) + ' of ' + b],
  [/^telecomandi collegati: /, 'controllers connected: '],
  [/^TELECOMANDO  /, 'REMOTE  '],
  [/^(\d+) SPECIALITÀ  •  DECATHLON  •  1 O 2 GIOCATORI$/, '$1 EVENTS  •  DECATHLON  •  1 OR 2 PLAYERS'],
  [/^G1 (\d+)°   •   G2 (\d+)°$/, (m, a, b) => 'P1 ' + a + ord(+a) + '   •   P2 ' + b + ord(+b)],
  [/^slancio fuori tempo/, 'jerk mistimed'], [/^troppo lento/, 'too slow'],
  [/^tempo scaduto/, 'out of time'], [/^cedimento/, 'gave way'],
  [/ salti mortali/, ' somersaults'], [/ salto mortale/, ' somersault'], [/ avv\./, ' tw.'],
  [/  •  giudici /, '  •  judges '], [/  •  coeff\. /, '  •  DD '],
  [/ giri$/, ' turns'],
];

const T_CACHE = new Map();
function T(s) {
  if (LANG !== 'en' || s == null) return s;
  s = String(s);
  const hit = T_CACHE.get(s);
  if (hit !== undefined) return hit;
  let r = EN[s];
  // una frase conosciuta col contatore degli errori in coda ("ahia, che bernoccolo  (2/3)")
  const coda = r === undefined && s.match(/^(.+?)(  \(\d+\/\d+\))$/);
  if (coda && EN[coda[1]] !== undefined) r = EN[coda[1]] + coda[2];
  if (r === undefined) {
    r = s;
    for (const [re, rep] of EN_RULES) if (re.test(r)) r = r.replace(re, rep);
  }
  if (T_CACHE.size > 3000) T_CACHE.clear();
  T_CACHE.set(s, r);
  return r;
}

// ---------- le cinque specialita' della 1.2 ----------
Object.assign(EN, {
  'STAFFETTA 4×100': '4×100 RELAY', 'ARRAMPICATA SPEED': 'SPEED CLIMBING', 'ARRAMPICATA': 'CLIMBING',
  'CICLISMO 200 M LANCIATO': 'CYCLING FLYING 200 M', 'CICLISMO': 'CYCLING', 'SALTO OSTACOLI': 'SHOW JUMPING',
  'EQUITAZIONE': 'EQUESTRIAN', 'COORDINAZIONE': 'COORDINATION',
  'SCARPETTE DA ARRAMPICATA': 'CLIMBING SHOES', 'BICI DA PISTA IN CARBONIO': 'CARBON TRACK BIKE',
  'SELLA E FINIMENTI': 'SADDLE AND TACK', 'PREPARAZIONE BREAKING': 'BREAKING COACHING',
  // tasti
  'PARTI / CORRI': 'GO / RUN', 'MANO': 'HAND', 'DESTRA': 'RIGHT', 'SINISTRA': 'LEFT', 'PEDALA': 'PEDAL',
  'PICCHIATA': 'DIVE', 'COLPO DI RENI': 'BIKE THROW',
  'SPRONA': 'SPUR', 'BATTUTA': 'BEAT',
  // staffetta
  'CAMBIO!': 'HANDOFF!', 'FUORI ZONA!': 'OUT OF THE ZONE!', 'il testimone doveva passare entro la zona': 'the baton had to change hands inside the zone',
  'ZONA CAMBIO': 'EXCHANGE ZONE', 'SEGNO': 'MARK', 'HOP!': 'HUP!', 'ULTIMA FRAZIONE': 'ANCHOR LEG',
  'parti (A) quando il compagno passa sul segno': 'go (A) when your teammate crosses the mark', 'MANO! (B)': 'HAND! (B)',
  'Corri l\'ultima frazione. A: parti quando il compagno passa sul segno,': 'You run the anchor leg. A: go when your teammate crosses the mark,',
  'poi corri. Tieni B per allungare la mano: il testimone passa': 'then run. Hold B to reach back: the baton changes hands',
  'quando ti arriva vicino. Fuori dalla zona gialla è squalifica!': 'when your teammate catches you. Outside the yellow zone you are out!',
  // arrampicata
  'MANO SBAGLIATA': 'WRONG HAND', 'SCIVOLA!': 'SLIP!', 'mani alterne, a ritmo: aspetta il verde': 'alternate hands, in rhythm: wait for green',
  'Sali a mani alterne: A destra, B sinistra. Quando l\'anello': 'Climb with alternate hands: A right, B left. When the ring',
  'diventa verde la presa è pronta: se premi prima scivoli': 'turns green the hold is ready: press too early and you slip',
  'e perdi tempo. Non mashare: trova il ritmo!': 'and lose time. Do not mash: find the rhythm!',
  // ciclismo
  'GIRO DI LANCIO': 'WIND-UP LAP', 'pedala (A), poi picchia (B) prima della linea': 'pedal (A), then dive (B) before the line',
  'PICCHIA! (B)': 'DIVE! (B)', 'SEI IN ALTO!': 'STILL HIGH!', 'Sei ancora in alto!': 'Still high on the banking!',
  'COLPO DI RENI (B)': 'BIKE THROW (B)', 'INIZIO 200 M': '200 M START',
  'A: pedala per prendere velocità in alto sulla curva.': 'A: pedal to build speed high on the banking.',
  'B: picchia verso la linea nera poco prima dei 200 metri,': 'B: dive down to the black line just before the 200 metres,',
  'e sul traguardo B è il colpo di reni.': 'and at the finish B is the bike throw.',
  // salto ostacoli
  'BARRIERA!': 'RAIL DOWN!', '+4 secondi': '+4 seconds', 'ELIMINATO': 'ELIMINATED', 'secondo rifiuto': 'second refusal',
  'RIFIUTO!': 'REFUSAL!', 'PERCORSO NETTO': 'CLEAR ROUND', 'GALOPPO': 'CANTER', 'PARTENZA': 'START',
  'SPRONA (A) E SALTA (B)': 'SPUR (A) AND JUMP (B)',
  'stacca sulla striscia verde: più vai forte, più si stringe': 'take off on the green strip: the faster you go, the narrower it gets',
  'A: sprona il cavallo per andare più forte.': 'A: spur the horse to go faster.',
  'B: salta quando sei sulla striscia verde davanti all\'ostacolo.': 'B: jump when you are on the green strip in front of the fence.',
  'Ogni barriera abbattuta vale 4 secondi, due rifiuti eliminano.': 'Every rail down costs 4 seconds, two refusals eliminate you.',
  // breaking
  'FUORI TEMPO': 'OFF BEAT', 'PERFETTO': 'PERFECT', 'BENE': 'GOOD', 'OK': 'OK', 'LASCIATO': 'LET GO', 'TENUTO!': 'HELD!',
  'MANCATO': 'MISS', 'voto dei giudici': 'judges\' score', 'SI PARTE...': 'HERE WE GO...', 'Pronti...': 'Ready...',
  'Premi A o B quando la nota arriva sulla linea bianca.': 'Press A or B when the note reaches the white line.',
  'Le note lunghe si tengono premute fino in fondo,': 'Hold the long notes all the way to the end,',
  'quelle doppie vogliono A e B insieme. A vuoto perdi punti!': 'double notes want A and B together. Pressing on nothing costs points!',
});
EN_RULES.push(
  [/^Cambio a (\d+) m$/, 'Handoff at $1 m'],
  [/^Scivolate: /, 'Slips: '],
  [/^Lancio: (\d+) m alla linea$/, 'Wind-up: $1 m to the line'],
  [/^Ostacolo /, 'Fence '], [/  •  Barriere /, '  •  Rails '], [/  •  Rifiuti /, '  •  Refusals '],
  [/^(\d+) barriera$/, '$1 rail down'], [/^(\d+) barriere$/, '$1 rails down'],
  [/  •  Serie /, '  •  Streak '], [/^SERIE /, 'STREAK '],
  [/^hai centrato l'obiettivo in tutte le (\d+) specialità$/, 'you have hit the target in all $1 events'],
);

// ---------- le Specials: il torneo medievale ----------
Object.assign(EN, {
  // la porta e il menu
  'solo chi conosce la parola d\'ordine entra nel torneo': 'only those who know the password may enter the tournament',
  'PAROLA D\'ORDINE': 'PASSWORD', 'PAROLA SBAGLIATA: le guardie ti rimandano indietro': 'WRONG PASSWORD: the guards send you back',
  'ENTRA ›': 'ENTER ›', 'IL TORNEO DEL REGNO': 'THE TOURNAMENT OF THE REALM',
  'giochi medievali per atleti coraggiosi (e un po\' sfortunati)': 'medieval games for brave (and slightly unlucky) athletes',
  'scegli la tua prova:': 'choose your trial:', 'tocca per cambiare': 'tap to change',
  // gli stendardi dello stadio
  'GRAN': 'GRAND', 'TORNEO': 'TOURNAMENT', 'DEL RE': 'OF THE KING',
  // i nomi delle gare
  '100 METRI CON L\'ORSO': '100 METRES WITH A BEAR', 'OSTACOLI IN FIAMME': 'FLAMING HURDLES', 'SALTO DEL FOSSATO': 'MOAT JUMP',
  'LANCIO DEL TRONCO': 'LOG TOSS', 'LANCIO DEL BARILE': 'BARREL TOSS', 'GIOSTRA DELL\'ANELLO': 'RING JOUST',
  // i tasti
  'SOLLEVA': 'LIFT', 'LANCIA': 'THROW', 'DONDOLA': 'SWING', 'COLPO': 'STRIKE',
  // l'orso
  'L\'ORSO TI HA PRESO!': 'THE BEAR GOT YOU!', 'PRESO!': 'CAUGHT!', 'morso nel sedere, gara finita': 'bitten on the backside, race over',
  'sei volato in tribuna': 'you flew into the stands', 'l\'orso ringrazia per il pranzo': 'the bear thanks you for lunch',
  'Premi velocemente i pulsanti per correre,': 'Tap the buttons fast to run,', 'perché un metro dietro di te parte un orso.': 'because one metre behind you a bear starts too.',
  'Se ti prende, la gara per te è finita (e anche il sedere).': 'If it catches you, your race is over (and so is your backside).',
  // le fiamme
  'SCOTTATO!': 'SCORCHED!', 'ARROSTITO!': 'ROASTED!', 'ARROSTITO': 'ROASTED', 'tre barriere di fuoco: si corre al secchio': 'three fiery hurdles: run for the bucket',
  'ahia, le chiappe!': 'ouch, my backside!', 'odore di pollo arrosto': 'smells like roast chicken', 'fuma, ma corre': 'smoking, but still running',
  'A: premi velocemente per correre, B: salta la barriera.': 'A: tap fast to run, B: jump the hurdle.',
  'Le barriere bruciano: toccarne una scotta e rallenta parecchio.': 'The hurdles are on fire: touching one burns and slows you a lot.',
  'Alla terza scottatura sei arrostito e fuori gara.': 'Three burns and you are roasted and out.',
  // il fossato
  'NEL FOSSATO!': 'IN THE MOAT!', 'FOSSATO': 'MOAT', 'un palo proprio li\'...': 'a stake right there...', 'splash! e il pesce ride': 'splash! and the fish laugh',
  'bagnato, e anche punto': 'wet, and stung too',
  'Come il salto in lungo: A per la rincorsa, B per staccare e alzare l\'angolo.': 'Like the long jump: A to run up, B to take off and raise the angle.',
  'Ma dopo la battuta c\'è il fossato con i pali appuntiti:': 'But past the board there is the moat with sharp stakes:',
  'se non arrivi sull\'altra sponda il salto non vale (e ti bagni).': 'if you do not reach the far bank the jump does not count (and you get wet).',
  // il tronco
  'TROPPO PESANTE!': 'TOO HEAVY!', 'il tronco non si alza': 'the log will not budge', 'BONK!': 'BONK!', 'TRONCO CADUTO!': 'LOG DROPPED!',
  'il tronco ti e\' caduto in testa': 'the log fell on your head', 'vedi le stelline?': 'seeing stars?', 'il boscaiolo ride di te': 'the lumberjack is laughing at you',
  'lancio nullo': 'no throw', 'oltre la linea di lancio': 'over the throwing line', 'LINEA': 'LINE', 'SOLLEVA! (A)': 'LIFT! (A)', 'INDIETRO': 'BACK', 'AVANTI': 'FORWARD',
  'A veloce per sollevare e correre, tieni B per l\'angolo e lascia prima della linea': 'tap A fast to lift and run, hold B for the angle and let go before the line',
  'A veloce: la forza sopra la tacca bianca solleva il tronco, poi corri.': 'Tap A fast: power above the white mark lifts the log, then run.',
  'B: tienilo premuto per l\'angolo (ideale ~45°) e lascialo prima della linea.': 'B: hold it for the angle (ideal ~45°) and let go before the line.',
  'Il tronco fa mezzo giro e si misura dove tocca terra la cima. Tre lanci.': 'The log turns over and is measured where its top hits the ground. Three throws.',
  'NON GIRA!': 'NO TURN!', 'il tronco non si e\' ribaltato: nullo': 'the log did not turn over: no throw',
  'bisogna correre, prima di lanciare': 'you need to run before throwing',
  'Se aspetti troppo il tronco cade... magari in testa. Tre lanci.': 'Wait too long and the log falls... maybe on your head. Three throws.',
  // il barile
  'PASSATO!': 'CLEARED!', 'il barile e\' tornato indietro': 'the barrel came back', 'birra in testa': 'beer on the head', 'ahia, che bernoccolo': 'ouch, what a bump',
  'SLANCIO': 'SWING', 'B: LANCIA!': 'B: THROW!', 'dietro': 'back', 'davanti': 'front',
  'A veloce per la forza, B quando la lancetta e\' nel verde': 'tap A fast for power, B when the needle is in the green',
  'A: premi velocemente per la forza, sopra la tacca bianca passi l\'asticella.': 'A: tap fast for power, above the white mark you clear the bar.',
  'B: lancia quando la lancetta e\' nella zona verde e va avanti.': 'B: throw when the needle is in the green zone moving forward.',
  'Poca forza e ti ricade in testa, fuori tempo ti scivola. Tre errori e hai finito.': 'Too little power and it lands on your head, off time it slips. Three misses and you are done.',
  'ASTICELLA!': 'BAR DOWN!', 'l\'ha sfiorata di un soffio': 'missed by a whisker', 'ci voleva un po\' piu\' di forza': 'needed a bit more power', 'giu\' l\'asticella': 'down comes the bar',
  'poca forza, tanto male': 'little power, lots of pain', 'SCIVOLATO!': 'SLIPPED!', 'ti e\' scappato di mano': 'it slipped out of your hands',
  'lanciato nel momento sbagliato': 'thrown at the wrong moment', 'il pubblico si scansa': 'the crowd ducks', 'il barile non si alza': 'the barrel will not rise', 'ci vuole piu\' forza (A)': 'you need more power (A)',
  // la giostra
  'INFILATO!': 'SPEARED!', 'MANCATO': 'MISS', 'la lancia e\' passata sotto': 'the lance went underneath', 'l\'anello ringrazia': 'the ring says thanks',
  'il re sbadiglia': 'the king yawns', 'FINE LIZZA': 'END OF LISTS', 'VIA': 'GO', 'IN RESTA LA LANCIA!': 'COUCH YOUR LANCE!',
  'A sprona, B colpisce: infila gli anelli d\'oro': 'A spurs, B strikes: spear the golden rings',
  'A: sprona il cavallo. B: la lancia scatta in avanti.': 'A: spur the horse. B: the lance thrusts forward.',
  'Colpisci quando la punta arriva all\'anello e alla sua altezza:': 'Strike when the tip reaches the ring, at its height:',
  'la punta balla col galoppo. 10 punti ad anello, più il premio tempo.': 'the tip bounces with the gallop. 10 points a ring, plus a time bonus.',
});
EN_RULES.push(
  [/^Orso a /, 'Bear '], [/^Scottature: /, 'Burns: '],
  [/^Asticella (.+) m  •  Errori /, 'Bar $1 m  •  Misses '], [/^ASTICELLA A (.+) M$/, 'BAR AT $1 M'],
  [/^Anelli (\d)\/5  •  (\d+) punti$/, 'Rings $1/5  •  $2 points'], [/^(\d+) punti$/, '$1 points'],
  [/^(\d) anelli  •  tempo /, '$1 rings  •  time '], [/^anello (\d)$/, 'ring $1'],
  [/^LANCIO (\d) DI 3$/, 'THROW $1 OF 3'],
);

// ---------- la carriera del torneo (1.3.1) ----------
Object.assign(EN, {
  'FORZA BRUTA': 'BRUTE STRENGTH', 'DESTREZZA': 'DEXTERITY', 'CORAGGIO': 'COURAGE',
  'CALZARI DA CORSA': 'RUNNING BOOTS', 'BRAGHE IGNIFUGHE': 'FIREPROOF BREECHES', 'GUANTI DA BOSCAIOLO': 'LUMBERJACK GLOVES', 'LANCIA E SELLA': 'LANCE AND SADDLE',
  'RUSTICO': 'RUSTIC', 'DI BOTTEGA': 'CRAFTED', 'REALE': 'ROYAL',
  'TORNEO DEL VILLAGGIO': 'VILLAGE TOURNAMENT', 'TORNEO DEL DUCATO': 'DUCHY TOURNAMENT', 'GRAN TORNEO DEL RE': 'THE KING\'S GRAND TOURNAMENT',
  'VILLAGGIO': 'VILLAGE', 'DUCATO': 'DUCHY', 'REGNO': 'REALM',
  'garzoni, contadini e un orso pigro': 'farmhands, peasants and a lazy bear', 'cavalieri di provincia': 'country knights', 'i campioni del regno': 'the champions of the realm',
  'CARRIERA DEL TORNEO': 'TOURNAMENT CAREER', 'TITOLO DEL REGNO': 'TITLE OF THE REALM', 'CAMPIONE DEL REGNO': 'CHAMPION OF THE REALM',
  'al Gran Torneo del Re. Il regno canta il tuo nome.': 'at the King\'s Grand Tournament. The realm sings your name.',
  'centra l\'obiettivo in tutte le prove per il titolo del regno': 'hit the target in every trial for the title of the realm',
  'RECORD DEL TORNEO': 'TOURNAMENT RECORDS', '100 M CON L\'ORSO': '100 M WITH A BEAR', 'i tuoi migliori, gara per gara e campionato per campionato': 'your bests, trial by trial and championship by championship',
});
// i gradini degli attrezzi del torneo, davanti al prezzo o al bonus ("DI BOTTEGA  5200 ƒ")
EN_RULES.push([/^RUSTICO(?=  )/, 'RUSTIC'], [/^DI BOTTEGA(?=  )/, 'CRAFTED'], [/^REALE(?=  )/, 'ROYAL']);

// ---------- il guardaroba e il tuffo dalle mura (1.3.1) ----------
Object.assign(EN, {
  'GUARDAROBA': 'WARDROBE', 'elmi, tuniche e mantelli': 'helmets, robes and cloaks', 'COPRICAPO': 'HEADGEAR', 'VESTITO': 'OUTFIT',
  'come ti presenti al torneo: si vede solo nelle prove medievali': 'how you show up at the tournament: seen only in the medieval trials',
  'NIENTE': 'NOTHING', 'CAPPUCCIO': 'HOOD', 'ELMO DA GUERRIERO': 'WARRIOR HELMET', 'ELMO CORNUTO': 'HORNED HELMET', 'CAPPELLO DA MAGO': 'WIZARD HAT',
  'TIARA': 'TIARA', 'CORONA': 'CROWN', 'BERRETTO DA GIULLARE': 'JESTER CAP',
  'TENUTA SPORTIVA': 'SPORTS KIT', 'ARMATURA': 'ARMOUR', 'TUNICA DA MAGO': 'WIZARD ROBE', 'MANTELLO DA RANGER': 'RANGER CLOAK', 'BARBARO IN CUOIO': 'LEATHER BARBARIAN',
  'TUFFO DALLE MURA': 'CASTLE WALL DIVE', 'CUFFIA DI LANA': 'WOOLLEN SWIM CAP',
  'Il soldato avanza con la lancia: piu\' aspetti a saltare (A), piu\' vale il coraggio.': 'The soldier closes in with his spear: the longer you wait to jump (A), the more your courage is worth.',
  'Se la lancia ti punge ti butta giu\' lui, storto: i giudici tagliano.': 'If the spear pokes you, he pushes you off, crooked: the judges cut your score.',
  'In aria come nei tuffi: A raggruppa, B avvita. Entra dritto nel fossato!': 'In the air as in diving: A tucks, B twists. Enter the moat straight!',
  'SPINTO!': 'PUSHED!', 'la lancia punge: giu\'!': 'the spear pokes: off you go!', 'il soldato ha fretta': 'the soldier is in a hurry', 'ahia, il fondoschiena': 'ouch, my backside',
  'LA LANCIA': 'THE SPEAR',
});
EN_RULES.push([/  •  coraggio \+/, '  •  courage +'], [/  •  spinto: /, '  •  pushed: '], [/^CORAGGIO \+(\d+)%$/, 'COURAGE +$1%'],
  [/^TUFFO (\d) DI (\d):  A per saltare$/, 'DIVE $1 OF $2:  A to jump']);

// ---------- le frecce infuocate (1.3.2) ----------
Object.assign(EN, {
  'FRECCE INFUOCATE': 'FLAMING ARROWS', 'SCOCCA': 'LOOSE', 'B: SCOCCA!': 'B: LOOSE!', 'ARCO LUNGO DI TASSO': 'YEW LONGBOW',
  'A: premi velocemente per tendere l\'arco: la parabola mostra dove va la freccia.': 'A: tap fast to draw the bow: the arc shows where the arrow will go.',
  'B: scocca. Se la forza basta (parabola verde) il bersaglio prende fuoco e si allontana.': 'B: loose. With enough pull (green arc) the target catches fire and moves further away.',
  'Con forza scarsa la freccia cade corta: tre errori e hai finito.': 'With too little pull the arrow falls short: three misses and you are done.',
  'CENTRATO!': 'BULLSEYE!', 'CORTO!': 'SHORT!', 'A veloce per la forza, B per scoccare': 'tap A fast to draw, B to loose',
});
EN_RULES.push([/^Bersaglio a (\d+) m  •  Errori /, 'Target at $1 m  •  Misses '], [/^BERSAGLIO A (\d+) M$/, 'TARGET AT $1 M'],
  [/^il bersaglio prende fuoco  •  /, 'the target catches fire  •  '], [/^paglia arrosto  •  /, 'roast straw  •  '], [/^bel falo'  •  /, 'what a bonfire  •  '],
  [/^brucia l'erba e basta/, 'only the grass burns'], [/^ci voleva piu' forza \(A\)/, 'needed more pull (A)'], [/^il bersaglio ride/, 'the target laughs']);

// ---------- il mangiafuoco (1.3.4) ----------
Object.assign(EN, {
  'IL MANGIAFUOCO': 'THE FIRE BREATHER', 'SOFFIA': 'BLOW', 'FIASCO DI GRAPPA': 'FLASK OF GRAPPA',
  'GOBLIN': 'GOBLIN', 'ORCO': 'ORC', 'TROLL': 'TROLL', 'OGRE': 'OGRE', 'MINOTAURO': 'MINOTAUR', 'CICLOPE': 'CYCLOPS',
  'GIGANTE DELLE COLLINE': 'HILL GIANT', 'DRAGO DEI GHIACCI': 'ICE DRAGON',
  'A (o A e B alternati) velocemente: la fiammata si allunga verso il mostro.': 'A (or A and B alternated) fast: the flame stretches towards the monster.',
  'Arriva solo se la forza supera la tacca bianca: tienila li\' finche\' brucia.': 'It reaches only if your power beats the white mark: hold it there until it burns.',
  'Ogni mostro incenerito ne arriva uno piu\' grosso. Tre che resistono e hai finito.': 'For every monster burnt a bigger one comes. Three that resist and you are done.',
  'INCENERITO!': 'BURNT TO ASHES!', 'RESISTE!': 'IT RESISTS!', 'e ride pure': 'and it even laughs', 'appena abbronzato': 'barely tanned',
  'ci vuole piu\' fiato': 'you need more breath', 'odore di arrosto': 'smells like roast', 'il prossimo e\' piu\' grosso': 'the next one is bigger',
  'ARRIVA...': 'HERE COMES...', 'resta solo la cenere': 'only ashes are left', 'A veloce per la fiammata, tienila finche\' brucia': 'tap A fast for the flame, hold it until it burns', 'AH AH AH!': 'HA HA HA!',
});
EN_RULES.push([/^(.+)  •  Errori (\d)\/3$/, '$1  •  Misses $2/3']);
EN_RULES.push([/^bruciato: /, 'burnt: ']);

// ---------- il torneo comico: allenamenti, attrezzi, premi (1.3.5) ----------
Object.assign(EN, {
  // gli attrezzi, famiglia per famiglia, coi tre gradini e le battute del bottegaio
  'CALZARI': 'FOOTWEAR', 'BRAGHE': 'BREECHES', 'GUANTI': 'GLOVES', 'LANCE': 'LANCES', 'COPRICAPO DA TUFFO': 'DIVING HEADGEAR', 'ARCHI': 'BOWS', 'CARBURANTE': 'FUEL',
  'CIABATTE DELLA NONNA': 'GRANNY\'S SLIPPERS', 'STIVALI DEL CIABATTINO': 'COBBLER\'S BOOTS', 'STIVALI DELLE SETTE LEGHE': 'SEVEN-LEAGUE BOOTS',
  'BRACHE DI TELA BAGNATA': 'WET CANVAS BREECHES', 'BRAGHE DI SALAMANDRA': 'SALAMANDER BREECHES', 'BRAGHE BENEDETTE DAL VESCOVO': 'BISHOP-BLESSED BREECHES',
  'MANOPOLE DI LANA': 'WOOLLY MITTENS', 'GUANTI DEL BOSCAIOLO': 'LUMBERJACK\'S GLOVES', 'GUANTONI DEL GIGANTE': 'GIANT\'S GAUNTLETS',
  'MANICO DI SCOPA': 'BROOMSTICK', 'LANCIA DI FRASSINO': 'ASH-WOOD LANCE', 'LANCIA DEL CAVALIERE NERO': 'BLACK KNIGHT\'S LANCE',
  'ELMO COI TAPPI NELLE ORECCHIE': 'HELMET WITH EARPLUGS', 'CASCO A FORMA DI PAPERA': 'DUCK-SHAPED HELMET',
  'ARCO DI SALICE PIANGENTE': 'WEEPING-WILLOW BOW', 'ARCO DI ROBIN DEI BOSCHI': 'ROBIN HOOD\'S BOW',
  'VINO ANNACQUATO': 'WATERED-DOWN WINE', 'GRAPPA DELLO ZIO': 'UNCLE\'S GRAPPA', 'DISTILLATO DI DRAGO': 'DRAGON SPIRIT',
  'profumano ancora di minestrone': 'they still smell of soup', 'suola di cuoio di drago, giura il ciabattino (era una vacca)': 'dragon-leather soles, the cobbler swears (it was a cow)',
  'sette leghe a passo: impara a frenare': 'seven leagues a stride: learn to brake',
  'gocciolano, ma non prendono fuoco': 'they drip, but they don\'t catch fire', 'la salamandra non era d\'accordo': 'the salamander did not agree',
  'il vescovo ha voluto l\'offerta in anticipo': 'the bishop wanted his offering up front',
  'calde, morbide e scivolosissime': 'warm, soft and ever so slippery', 'odorano di resina e di boscaiolo': 'they smell of resin and lumberjack',
  'il gigante li rivuole indietro entro domenica': 'the giant wants them back by Sunday',
  'la strega la rivuole per volare': 'the witch wants it back to fly', 'dritta come un fuso (quasi)': 'straight as an arrow (almost)',
  'il cavaliere nero non sa ancora di avertela prestata': 'the black knight doesn\'t know he lent it to you yet',
  'pizzica, ma ripara': 'itchy, but it protects', 'non senti piu\' le urla del soldato': 'you can\'t hear the soldier yelling any more', 'galleggia: se lo perdi lo ritrovi': 'it floats: lose it and you\'ll find it',
  'il salice piange, e tu con lui': 'the willow weeps, and so do you', 'quello vero, da battaglia': 'the real one, for battle', 'rubato ai ricchi, naturalmente': 'stolen from the rich, of course',
  'fa piu\' fumo che fuoco': 'more smoke than fire', 'lo zio dice che sgrassa anche le padelle': 'uncle says it cleans the pans too', 'un sorso e sputi come un vulcano': 'one sip and you spit like a volcano',
  'a mani nude': 'bare-handed',
  // gli allenamenti del cavaliere
  'INSEGUIRE LE GALLINE DEL MUGNAIO': 'CHASING THE MILLER\'S HENS', 'SOLLEVARE IL MULO DEL FABBRO': 'LIFTING THE BLACKSMITH\'S MULE',
  'DORMIRE IN ARMATURA': 'SLEEPING IN ARMOUR', 'GIOCOLERIA CON LE ZUCCHE': 'JUGGLING PUMPKINS', 'SOLLETICARE L\'ORSO DEL CASTELLO': 'TICKLING THE CASTLE BEAR',
  'le galline hanno vinto, ma di poco': 'the hens won, but only just', 'il mugnaio ti insegue col forcone: ottimo allenamento': 'the miller chases you with a pitchfork: great workout',
  'una gallina ti ha beccato il polpaccio': 'a hen pecked your calf', 'il mulo non ha gradito': 'the mule was not amused', 'il fabbro chiede chi sollevera\' te': 'the blacksmith asks who will lift you',
  'mal di schiena, ma che bicipiti': 'backache, but what biceps', 'sveglia all\'alba, con i crampi': 'up at dawn, with cramps', 'il gallo ha cantato, tu hai cigolato': 'the rooster crowed, you creaked',
  'ruggine alle ginocchia, fiato da mantice': 'rusty knees, lungs like bellows', 'solo tre zucche in testa, oggi': 'only three pumpkins on the head today',
  'il giullare applaude, ironico': 'the jester applauds, ironically', 'zuppa di zucca per cena, di nuovo': 'pumpkin soup for dinner, again',
  'l\'orso ride, tu un po\' meno': 'the bear laughs, you a bit less', 'sei ancora intero: bravo': 'still in one piece: well done', 'un buco nuovo nelle braghe': 'a new hole in your breeches',
  // i premi in natura
  'e una coscia di cinghiale': 'and a leg of wild boar', 'e una forma di formaggio': 'and a wheel of cheese', 'e un cavolo cappuccio': 'and a cabbage',
  'e una pacca sulla spalla': 'and a pat on the back', 'e una rapa': 'and a turnip', 'e un sorriso della principessa': 'and a smile from the princess',
  'e una cipolla': 'and an onion', 'e una pernacchia del giullare': 'and a raspberry from the jester',
  // trasferte e promozioni
  'centra l\'obiettivo in tutte le prove per salire di torneo': 'hit the target in every trial to move up a tournament',
  'il resto lo nascondi sotto il pagliericcio': 'you hide the rest under your straw mattress',
  'il re ha sentito parlare di te (non tutto bene)': 'the king has heard of you (not all good)', 'avversari piu\' grossi e orsi piu\' affamati': 'bigger rivals and hungrier bears',
});
EN_RULES.push([/^carro, locanda e decima del feudatario: /, 'cart, inn and the lord\'s tithe: '], [/^per il carro mancano /, 'for the cart you still need ']);

// ---------- i 50 stile (1.3.6) ----------
Object.assign(EN, {
  'B: respira tardi, verso la tacca bianca, ma prima di finire l\'aria': 'B: breathe late, near the white mark, but before you run out of air',
});

// ---------- l'invio alla classifica mondiale (1.3.8) ----------
Object.assign(EN, {
  'INVIO MONDIALE: SÌ': 'WORLD SUBMIT: YES', 'INVIO MONDIALE: NO': 'WORLD SUBMIT: NO', 'tocca per spegnere': 'tap to turn off', 'tocca per accendere': 'tap to turn on',
});

// ---------- quattro prove nuove del torneo (1.3.9) ----------
Object.assign(EN, {
  // il tronco sul fiume
  'IL TRONCO SUL FIUME': 'LOG ROLLING', '◄ SINISTRA': '◄ LEFT', 'DESTRA ►': 'RIGHT ►',
  'IL MUGNAIO': 'THE MILLER', 'IL BARCAIOLO': 'THE BOATMAN', 'IL FABBRO': 'THE BLACKSMITH', 'FRATE TOMMASO': 'FRIAR THOMAS',
  'IL BARONE': 'THE BARON', 'LA LONTRA': 'THE OTTER',
  'IN ACQUA!': 'IN THE WATER!', 'splash! i pesci applaudono': 'splash! the fish applaud', 'il fiume ti ha vinto': 'the river beat you',
  'bagnato fino alle mutande': 'soaked to the underpants', 'FIUME DOMATO!': 'RIVER TAMED!', 'nessuno ti butta giu\'': 'nobody can knock you off',
  'SFIDANTE IN ACQUA!': 'RIVAL IN THE WATER!', 'COLPO DI TRONCO...': 'LOG KICK...',
  'ogni pulsante spinge l\'ago dalla sua parte: tienilo nel verde': 'each button pushes the needle its own way: keep it in the green',
  'i due pulsanti insieme: colpo di tronco allo sfidante': 'both buttons together: kick the log under your rival',
  'Ogni pulsante spinge l\'ago dalla sua parte: tienilo nel verde o cadi in acqua.': 'Each button pushes the needle its own way: keep it in the green or you fall in.',
  'Lo sfidante ti scuote il tronco: la freccia rossa dice da che parte.': 'Your rival shakes the log: the red arrow tells you which way.',
  'I due pulsanti insieme per mezzo secondo: lo scuoti tu (+3 s se cade).': 'Both buttons together for half a second: you shake him (+3 s if he falls).',
  // la pioggia di frecce
  'PIOGGIA DI FRECCE': 'RAIN OF ARROWS', 'ALTO': 'HIGH', 'BASSO': 'LOW', 'FERMO': 'STILL', 'AHIA!': 'OUCH!', 'SPLAT!': 'SPLAT!',
  'LA COLOMBA DEL RE!': 'THE KING\'S DOVE!', 'il pubblico ride  (-0,5)': 'the crowd laughs  (-0.5)',
  'A: SCUDO ALTO   B: SCUDO BASSO   A+B: TUTTO   COLOMBA: FERMO!': 'A: SHIELD HIGH   B: SHIELD LOW   A+B: ALL   DOVE: STAY STILL!',
  'alza lo scudo (A) o abbassalo (B) quando la freccia arriva': 'raise the shield (A) or lower it (B) as the arrow arrives',
  'A o B per cominciare': 'A or B to begin',
  'Alla freccia: A scudo alto, B scudo basso, A e B insieme coprono tutto.': 'As the arrow arrives: A shield high, B shield low, A and B together cover all.',
  'Pomodori: parali (o -0,5). La colomba del re: non toccarla, stai fermo!': 'Tomatoes: block them (or -0.5). The king\'s dove: don\'t touch it, stay still!',
  'Le frecce arrivano sempre piu\' fitte. Tre colpite e hai finito.': 'The arrows come ever thicker. Three hits and you are done.',
  // la caccia al maiale
  'LA CACCIA AL MAIALE': 'GREASY PIG CHASE', 'TUFFO': 'DIVE', 'B: TUFFO!': 'B: DIVE!', 'È UNTO!': 'IT\'S GREASY!', 'NEL FANGO!': 'IN THE MUD!',
  'CARICATO!': 'CHARGED!',
  'A veloce per correre, B per tuffarti quando il cerchio e\' sulla tacca': 'tap A fast to run, B to dive when the circle hits the mark',
  'quando lampeggia la freccia il maiale scarta: smetti di correre': 'when the arrow flashes the pig will swerve: stop running',
  'A: premi velocemente per correre dietro al maiale.': 'A: tap fast to run after the pig.',
  'Freccia lampeggiante: il maiale scarta. Smetti di correre o tiri dritto.': 'Flashing arrow: the pig swerves. Stop running or you overshoot.',
  'Da vicino compare un cerchio: B quando e\' sulla tacca. Prendine tre!': 'Up close a circle appears: B when it hits the mark. Catch three!',
  // l'ariete
  'L\'ARIETE': 'THE BATTERING RAM', 'SPINGI': 'PUSH', 'B: SPINGI!': 'B: PUSH!', 'FUORI TEMPO!': 'OFF TIME!', 'PORTONE': 'GATE',
  'BUM!': 'BOOM!', 'toc': 'thud', 'IL PORTONE REGGE': 'THE GATE HOLDS', 'fine del tempo': 'time is up', 'SFONDATO!': 'SMASHED!', 'MASSO!': 'BOULDER!',
  'LA PORTA DELLA STALLA': 'THE BARN DOOR', 'IL PORTONE DEL MUNICIPIO': 'THE TOWN HALL DOOR', 'IL PORTONE DELLA FORTEZZA': 'THE FORTRESS GATE',
  'A veloce per il dondolo, B per la spinta quando la lancetta e\' verde': 'tap A fast to swing, B to push when the needle turns green',
  'A: premi velocemente per la forza, e l\'ariete dondola sempre piu\' largo.': 'A: tap fast for power, and the ram swings ever wider.',
  'B: la spinta, proprio quando sta per colpire il portone (lancetta verde).': 'B: the push, just as it is about to hit the gate (green needle).',
  'Senza spinta la botta e\' fiacca; fuori tempo il dondolo si smorza.': 'Without a push the blow is weak; off time the swing dies down.',
  // la carriera: attrezzi
  'CALZE DA FIUME': 'RIVER SOCKS', 'CALZE DI LANA INFELTRITA': 'FELTED WOOL SOCKS', 'SANDALI ALLA PECE': 'PITCH SANDALS', 'ZAMPE DI LONTRA': 'OTTER PAWS',
  'antiscivolo, giura la nonna': 'non-slip, granny swears', 'la pece si attacca a tutto, anche al tronco': 'pitch sticks to everything, even the log',
  'la lontra non le rivuole: ne ha altre quattro': 'the otter doesn\'t want them back: it has four more',
  'SCUDI': 'SHIELDS', 'COPERCHIO DELLA PENTOLA': 'POT LID', 'SCUDO DI QUERCIA': 'OAK SHIELD', 'SCUDO DEL TEMPLARE': 'TEMPLAR SHIELD',
  'la nonna lo rivuole per il minestrone': 'granny wants it back for the soup', 'le frecce ci restano piantate, e tu no': 'the arrows stick in it, not in you',
  'benedetto, ammaccato e lucidato': 'blessed, dented and polished',
  'ARNESI DA PORCARO': 'SWINEHERD KIT', 'GUANTI DI SEGATURA': 'SAWDUST GLOVES', 'GREMBIULE DEL PORCARO': 'SWINEHERD\'S APRON', 'STIVALI DEL CACCIATORE DI CINGHIALI': 'BOAR HUNTER\'S BOOTS',
  'il grasso non scivola sulla segatura (quasi)': 'grease doesn\'t slip on sawdust (almost)', 'odora di porcile: i maiali si fidano': 'it smells of pigsty: the pigs trust you',
  'il cinghiale li riconosce e trema': 'the boar recognises them and trembles',
  'ARIETI': 'RAMS', 'ARIETE DI LEGNO DI PERO': 'PEARWOOD RAM', 'ARIETE DI QUERCIA FERRATA': 'IRON-SHOD OAK RAM', 'ARIETE A TESTA DI CAPRONE': 'GOAT-HEAD RAM',
  'profuma di pere cotte': 'it smells of stewed pears', 'il fabbro giura che non si spezza': 'the blacksmith swears it won\'t break',
  'il caprone di bronzo sembra sorridere': 'the bronze goat seems to smile',
});
EN_RULES.push(
  [/^Sfidanti in acqua: /, 'Rivals in the water: '], [/^(◀ )?ORSO (?=\d)/, '$1BEAR '], [/^Bersaglio a (\d+) m/, 'Target at $1 m'], [/^Colpito (\d)\/3$/, 'Hit $1/3'], [/^Maiali presi (\d)\/3$/, 'Pigs caught $1/3'],
  [/^(\S+) PARATE$/, '$1 BLOCKS'],
  [/^glu glu glu/, 'glug glug glug'], [/^ne arriva un altro/, 'here comes another'], [/^il pubblico esulta/, 'the crowd cheers'],
  [/^il re non ride/, 'the king is not amused'], [/^piume dappertutto/, 'feathers everywhere'], [/^con la colomba si sta fermi/, 'with the dove you stay still'],
  [/^erano due: ci voleva A e B/, 'there were two: it took A and B'], [/^una alta e una bassa/, 'one high and one low'],
  [/^nell'elmo, per fortuna/, 'in the helmet, luckily'], [/^una freccia nel cappello/, 'an arrow in the hat'], [/^nel polpaccio!/, 'in the calf!'],
  [/^proprio nel sedere/, 'right in the backside'], [/^ahia, lo stinco/, 'ouch, the shin'],
  [/^e strilla come un maiale/, 'and it squeals like a pig'], [/^tutto unto, ma preso/, 'all greasy, but caught'],
  [/^ti e' scivolato fra le dita/, 'it slipped through your fingers'], [/^troppo tardi/, 'too late'], [/^il maiale ride/, 'the pig laughs'],
  [/^troppo presto/, 'too early'], [/^muso nel fango/, 'face in the mud'], [/^il maiale era piu' avanti/, 'the pig was further ahead'],
  [/^il cinghiale non scherza/, 'the boar means business'], [/^volato come un sacco di patate/, 'flying like a sack of potatoes'],
  [/^i soldati inciampano/, 'the soldiers stumble'], [/^spinta nel vuoto/, 'pushing thin air'], [/^uno per tutti, ma non adesso/, 'all for one, but not now'],
  [/^e dietro c'erano solo galline/, 'and behind it only hens'], [/^il capitano ringrazia/, 'the captain thanks you'], [/^chi paga il falegname\?/, 'who pays the carpenter?'],
  [/^dall'alto delle mura/, 'from the top of the walls'], [/^attento alla testa/, 'mind your head'], [/^ridagli slancio \(A\)/, 'swing it again (A)'],
);

// ---------- la porta del torneo e la versione web (1.4) ----------
Object.assign(EN, {
  'LAVORI IN CORSO': 'WORK IN PROGRESS', 'ci stiamo ancora lavorando: torna presto!': 'we are still working on it: come back soon!',
});
