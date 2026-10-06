'use strict';
// ===== I record che arrivano da fuori =====
// Un file solo, pubblicato accanto all'apk, con dentro due cose: i record veri degli atleti — che
// prima stavano scritti nel codice, e per correggerne uno bisognava rifare l'apk e farla riscaricare
// a tutti — e i migliori risultati dei giocatori sparsi per il mondo.
//
// Si scarica con lo stesso giro del manifesto degli aggiornamenti: una volta all'avvio, in silenzio,
// e se non c'è rete non succede niente di male — si tiene quello che si era già scaricato, che è
// rimasto nella memoria del dispositivo. Chi non ha mai visto la rete gioca con la tabella scritta
// nel codice, che resta lì proprio per questo.
//
// Il numero `rev` fa da versione, esattamente come il versionCode per gli aggiornamenti: se quello
// che arriva è più alto di quello che il giocatore ha già guardato, sul pulsante RECORD compare una
// stellina. Aprendo la schermata dei record si riscarica e la stellina si spegne.
//
// Qui dentro si legge soltanto. Mandare un proprio record è l'altra metà del lavoro, e vuole
// qualcosa che stia in ascolto: GitHub Pages sa solo servire file, non riceverli.

const WORLD_URL = 'https://dave1971.github.io/olimpiadi/records.json';

const WORLD_TOP = 10;      // quanti giocatori tiene la classifica per ogni gara (come il Worker)
// In che campionato di carriera e' stato fatto un risultato: la lettera che lo accompagna in classifica.
// I risultati mandati prima che la lettera esistesse erano tutti del Mondiale.
const LIVELLO_LETTERA = { uni: 'U', trials: 'T', olympic: 'W' };
const LETTERA_COL = { U: '#66bb6a', T: '#42a5f5', W: '#ffa726' };
const letteraDi = r => (r && LETTERA_COL[r.lv] ? r.lv : 'W');

const World = {
  KEY: 'olimpiadi_world_v1', SEEN: 'olimpiadi_world_seen',
  d: null,                 // quello che abbiamo in mano: scaricato adesso o ritrovato da prima
  busy: false,

  read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },

  load() { try { this.d = JSON.parse(this.read(this.KEY)) || null; } catch (e) { this.d = null; } },

  rev() { return (this.d && this.d.rev) | 0; },
  seenRev() { return parseInt(this.read(this.SEEN), 10) || 0; },
  /** C'è qualcosa di nuovo che il giocatore non ha ancora guardato: è questa la stellina. */
  isFresh() { return this.rev() > this.seenRev(); },
  seen() { this.write(this.SEEN, String(this.rev())); },

  // La stellina dice solo che il file e' cambiato; per sapere COSA e' cambiato si tiene l'impronta di
  // quello che la schermata dei record mostrava l'ultima volta: per ogni gara il primo dei giocatori e
  // il record del mondo. Aprendo la schermata si confronta con quella nuova, e le gare diverse si
  // evidenziano (una volta sola: poi l'impronta nuova diventa quella vista).
  VISTI: 'olimpiadi_world_visti',
  impronta() {
    const o = {}, voce = r => r && typeof r.v === 'number' ? r.v + '|' + (r.who || '') + '|' + (r.nat || '') : '';
    for (const id of EVENTS.map(e => e.id).concat(['decathlon'])) o[id] = [voce(this.top(id)[0]), voce(this.d && this.d.wr && this.d.wr[id])];
    return o;
  },
  /** Le gare con qualcosa di nuovo dall'ultima volta: { id: { top: true, wr: true } }. Poi le segna viste. */
  novita() {
    if (!this.d) return {};
    let prima = null;
    try { prima = JSON.parse(this.read(this.VISTI)); } catch (e) { prima = null; }
    const ora = this.impronta(), nuovi = {};
    // la prima volta non c'e' niente con cui confrontare: si prende nota e basta
    if (prima) for (const id in ora) {
      const p = prima[id] || ['', ''];
      if (ora[id][0] && ora[id][0] !== p[0]) (nuovi[id] = nuovi[id] || {}).top = true;
      if (ora[id][1] && ora[id][1] !== p[1]) (nuovi[id] = nuovi[id] || {}).wr = true;
    }
    this.write(this.VISTI, JSON.stringify(ora));
    return nuovi;
  },

  /** Il record vero della disciplina: quello scaricato se c'è, se no quello scritto nel codice. */
  wr(id) { return (this.d && this.d.wr && this.d.wr[id]) || WR[id] || null; },
  /** I migliori giocatori di quella disciplina, dal più forte in giù. */
  top(id) {
    const t = this.d && this.d.top && this.d.top[id];
    return Array.isArray(t) ? t : [];
  },
  /**
   * Dove si mandano i propri record. **Non è scritto nel gioco: arriva dal file.** Così il giorno
   * che il Worker esiste basta aggiungere una riga a records.json e gli invii si accendono per
   * tutti, senza una versione nuova dell'apk. Finché il campo non c'è, il gioco non manda niente e
   * non chiede niente.
   */
  postUrl() { return (this.d && typeof this.d.post === 'string' && /^https:\/\//.test(this.d.post)) ? this.d.post : ''; },

  /**
   * Un risultato entrerebbe fra i primi dieci? Se no, non vale la pena disturbare il giocatore.
   * `who` e' il nome con cui partirebbe: chi in classifica c'e' gia' con di meglio non rimanda niente
   * (di ogni giocatore si tiene solo il migliore).
   */
  wouldEnter(id, v, who) {
    if (typeof v !== 'number' || !isFinite(v)) return false;
    const meta = EVENTS.find(e => e.id === id);
    const giu = !!(meta && meta.lowerBetter);
    const t = this.top(id);
    const mio = who ? t.find(r => r.who === who) : null;
    if (mio && !(giu ? v < mio.v : v > mio.v)) return false;
    if (t.length < WORLD_TOP) return true;
    const peggio = t[t.length - 1].v;
    return giu ? v < peggio : v > peggio;
  },

  /** Vero se in classifica c'è almeno qualcuno: finché non c'è, la colonna non si mostra. */
  anyTop() {
    const t = this.d && this.d.top;
    if (!t) return false;
    for (const k in t) if (Array.isArray(t[k]) && t[k].length) return true;
    return false;
  },

  /**
   * Scarica. `done(qualcosaDiNuovo)` viene chiamata comunque, anche quando non è arrivato niente:
   * chi aspetta il download deve poter smettere di aspettare anche quando la rete non c'è.
   */
  pull(done) {
    const end = (nuovo) => { this.busy = false; if (done) done(!!nuovo); };
    if (this.busy) { if (done) done(false); return; }
    if (typeof window.fetch !== 'function') { if (done) done(false); return; }
    this.busy = true;
    let late = false;
    const timer = setTimeout(() => { late = true; end(false); }, 6000);
    window.fetch(WORLD_URL, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        clearTimeout(timer);
        if (late) return;                       // ha risposto tardi: chi aspettava è già andato avanti
        if (!d || typeof d.rev !== 'number') { end(false); return; }
        const nuovo = d.rev > this.rev();
        // dopo un aggiornamento forzato la classifica in mano e' piu' fresca di quella del file, finche'
        // la pagina pubblica non si rimette in pari (ci mette un minuto): si tiene la piu' fresca
        if (this.forzato && (d.postRev | 0) < this.forzato.rev) d.top = this.forzato.top;
        this.d = d;
        this.write(this.KEY, JSON.stringify(d));
        end(nuovo);
      })
      .catch(() => { clearTimeout(timer); if (!late) end(false); });   // offline: si tiene il vecchio
  },
};
World.load();

// Il nome di chi detiene un record, con l'anno se il file lo porta. Quando le colonne sono tre e
// lo spazio non basta l'anno si lascia fuori: meglio leggere "BOLT" che vedere "BOLT 2009" in
// caratteri da otto pixel.
function whoText(r, corto) { return r ? String(r.who || '') + (!corto && r.anno ? ' ' + r.anno : '') : ''; }

// ===== Mandare i propri record =====
// Quello che parte da qui è: disciplina, risultato, il nome che il giocatore si è scelto e la sua
// bandiera. Niente altro — nessun identificativo del dispositivo, niente che non sia già scritto
// sulla maglietta dell'atleta. Ma diventa una pagina pubblica, quindi **si chiede prima**, una
// volta sola, e si può dire di no per sempre.
//
// Conta solo il livello olimpico: i record del gioco sono per livello, e tre classifiche mondiali
// non si capirebbero. Un tempo universitario non è confrontabile con uno olimpico.

// La stessa funzione che sta nel Worker. Non è una serratura — chi apre l'apk trova la parola e
// l'algoritmo — è il chiavistello del bagno: tiene fuori chi passa di lì per caso.
const SALE = 'olimpiadi-retro-1984';
function firmaRecord(s) {
  let h = 2166136261 >>> 0;
  const t = SALE + '|' + s + '|' + SALE;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** Ripulito esattamente come fa il Worker, se no la firma non torna. */
function pulisciNome(s) {
  return String(s || '').replace(/[^\p{L}\p{N} .'\-]/gu, '').trim().slice(0, NOME_MAX).toUpperCase();
}

const Share = {
  KEY: 'olimpiadi_share_v1',
  d: { ok: null, coda: [] },      // ok: null = non gliel'ho ancora chiesto, true = sì, false = mai
  esito: '', esitoT: 0,           // che cosa dire al giocatore dopo aver mandato
  busy: false,

  load() {
    try {
      const d = JSON.parse(World.read(this.KEY));
      if (d && Array.isArray(d.coda)) this.d = { ok: d.ok === true ? true : d.ok === false ? false : null, coda: d.coda, v: d.v };
    } catch (e) { /* prima volta */ }
  },
  /**
   * Dalla 1.6.2 in classifica mondiale vanno solo le gare di carriera. Quello che era in coda da prima
   * poteva venire da una gara singola: si butta, una volta sola. Non si rimette in coda niente da soli:
   * ci andra' il prossimo primato di carriera, o tutto quanto se il giocatore riaccende l'invio.
   */
  soloCarriera() {
    if (this.d.v === 2) return;
    this.d.v = 2; this.d.coda = [];
    this.save();
  },
  save() { World.write(this.KEY, JSON.stringify(this.d)); },

  /** Si può mandare solo se il file dice dove. */
  attivo() { return !!World.postUrl(); },
  /** C'è qualcosa in coda e non gli è ancora stato chiesto se va bene. */
  chiede() { return this.attivo() && this.d.ok === null && this.d.coda.length > 0; },
  pronti() { return this.attivo() && this.d.ok === true && this.d.coda.length > 0; },
  no() { this.d.ok = false; this.d.coda = []; this.save(); },
  /** Dalla schermata dei record: acceso diventa spento, spento (o mai chiesto) diventa acceso. */
  cambia() {
    if (this.d.ok === true) { this.no(); return; }
    this.d.ok = true;
    this.ricoda();
    this.save();
  },
  /**
   * I migliori di carriera che entrerebbero fra i primi dieci, di nuovo in coda: di ogni gara il migliore
   * fra tutti i campionati e tutte le carriere salvate. Si leggono dalle carriere e non dai record
   * personali: quelli puo' averli fatti una gara singola, che in classifica non va.
   */
  ricoda() {
    let slots = null;
    try { slots = JSON.parse(World.read(CIRCUITO_BASE.key)); } catch (e) { /* nessuna carriera */ }
    if (!Array.isArray(slots)) return;
    slots.forEach((d, i) => {
      const pr = typeof Profiles !== 'undefined' && Profiles.data[i];
      if (!pr || !d || !d.best) return;
      const who = pulisciNome(pr.name), nat = (typeof FLAGS !== 'undefined' && FLAGS[pr.code]) ? pr.code : '';
      if (!who) return;
      // dal Mondiale in giu': a parita' di misura resta scritto il campionato piu' alto
      for (const liv of ['olympic', 'trials', 'uni']) {
        const B = d.best[liv];
        if (!B) continue;
        for (const id in B) {
          const v = B[id], meta = EVENTS.find(e => e.id === id);
          if (!meta || typeof v !== 'number' || !World.wouldEnter(id, v, who)) continue;
          const gia = this.d.coda.find(x => x.ev === id);
          if (gia && (meta.lowerBetter ? gia.v <= v : gia.v >= v)) continue;
          // oltre il record vero si arriva solo con un oggetto leggendario: va detto, o il server lo scarta
          const wr = World.wr(id), leg = !!(wr && (meta.lowerBetter ? v < wr.v : v > wr.v));
          const r = { ev: id, v, who, nat, lv: LIVELLO_LETTERA[liv] };
          if (leg) r.leg = true;
          this.d.coda = this.d.coda.filter(x => x.ev !== id);
          this.d.coda.push(r);
        }
      }
    });
    this.d.coda = this.d.coda.slice(-24);
  },

  /**
   * Finita una gara di carriera, in qualunque campionato: se e' il nuovo primato di quella carriera ed
   * entrerebbe fra i primi dieci, si mette in coda (con la lettera del campionato: U, T o W). Mandarlo
   * subito no: il giocatore sta guardando il risultato, e la domanda va fatta con calma. Le gare singole
   * e il decathlon non arrivano qui (vedi Game.eventDone).
   */
  offer(id, v, p, leg) {
    if (!this.attivo() || this.d.ok === false) return;
    const pr = (typeof Profiles !== 'undefined' && Profiles.data[p]) || {};
    // la bandiera deve essere una di quelle che il gioco conosce: finisce su una pagina pubblica
    const who = pulisciNome(pr.name);
    const nat = (typeof FLAGS !== 'undefined' && FLAGS[pr.code]) ? pr.code : '';
    if (!who || !World.wouldEnter(id, v, who)) return;
    const r = { ev: id, v, who, nat, lv: LIVELLO_LETTERA[Lv.id()] || 'W' };
    if (leg) r.leg = true;                  // fatto con un oggetto leggendario: va in classifica con l'asterisco
    this.d.coda = this.d.coda.filter(x => x.ev !== id);
    this.d.coda.push(r);
    this.d.coda = this.d.coda.slice(-24);
    this.save();
  },

  /** Manda tutta la coda, uno alla volta, e poi dice com'è andata. */
  manda() {
    if (this.busy || !this.attivo() || !this.d.coda.length) return;
    this.busy = true;
    this.d.ok = true; this.save();
    const url = World.postUrl();
    let mandati = 0, primi = 0, fermo = false;
    const uno = () => {
      const r = this.d.coda[0];
      if (!r) return this.fine(mandati, primi, false, fermo);
      // col leggendario la firma porta anche il segno: il server lo accetta oltre il record vero.
      // 'car' dice che viene da una gara di carriera: dalla 1.6.2 il server prende solo quelli.
      // `lv` e' il campionato (U, T, W): sta anche nella firma. Quello che era in coda da prima era del Mondiale.
      const lv = LETTERA_COL[r.lv] ? r.lv : 'W';
      const corpo = {
        ev: r.ev, v: r.v, who: r.who, nat: r.nat, car: 1, lv,
        s: firmaRecord(r.ev + '|' + r.v + '|' + r.who + '|' + r.nat + (r.leg ? '|L' : '') + '|C' + lv),
      };
      if (r.leg) corpo.leg = 1;
      let late = false;
      const timer = setTimeout(() => { late = true; this.fine(mandati, primi, true); }, 8000);
      window.fetch(url, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
        .then(x => x.json().catch(() => null))
        .then(a => {
          clearTimeout(timer);
          if (late) return;
          // accettato o rifiutato, quel record è stato esaminato: non si riprova all'infinito
          this.d.coda.shift(); this.save();
          if (a && a.ok) { mandati++; if (a.posto === 1) primi++; }
          if (a && a.avviso) fermo = true;        // il record è arrivato, ma non sta uscendo di lì
          uno();
        })
        .catch(() => { clearTimeout(timer); if (!late) this.fine(mandati, primi, true, fermo); });
    };
    uno();
  },
  /**
   * `fermo` arriva dal Worker e vuol dire: il record l'ho preso, ma non sta arrivando nella
   * classifica che scaricano tutti — di solito perché è scaduto il gettone con cui la riscrive.
   * Chi manda un record è l'unica persona che in quel momento sta guardando: è a lui che conviene
   * dirlo, invece di lasciarlo scritto in un registro che non apre nessuno.
   */
  fine(mandati, primi, rete, fermo) {
    this.busy = false;
    this.esito = rete && !mandati ? 'non sono riuscito a mandarli: riprovo la prossima volta'
      : !mandati ? 'nessuno è entrato in classifica'
        : fermo ? 'record ricevuto, ma la classifica pubblica è ferma'
          : primi ? 'sei primo al mondo!'
            : 'record mandato, sei in classifica';
    this.esitoT = fermo ? 9 : 6;                // se c'è qualcosa che non va, resta scritto di più
    this.save();
    this.entrati = mandati;
    if (this.dopo) { const f = this.dopo; this.dopo = null; f(); }
  },

  /**
   * L'aggiornamento forzato, dalla schermata dei record e solo con la parola d'ordine. Di norma la
   * classifica torna sulla pagina pubblica una volta all'ora, e i giochi la scaricano da li': qui si
   * mandano subito i primati di carriera che entrerebbero, si chiede al Worker di pubblicare adesso, e
   * la classifica nuova si prende direttamente dalla sua risposta, senza aspettare la pagina.
   * La parola la controlla il Worker (non basta averla saltata qui): `fine(scritta, riuscito)`.
   */
  forza(parola, fine) {
    if (!this.attivo() || typeof window.fetch !== 'function') { fine('la classifica non risponde: riprova fra poco', false); return; }
    this.d.ok = true;               // chi preme questo pulsante vuole mandarli
    this.ricoda();
    this.save();
    const inCoda = this.d.coda.length;
    const chiedi = () => {
      const entrati = inCoda ? (this.entrati | 0) : 0;
      this.esito = ''; this.esitoT = 0;
      let late = false;
      const timer = setTimeout(() => { late = true; fine('la classifica non risponde: riprova fra poco', false); }, 15000);
      window.fetch(World.postUrl().replace(/\/r$/, '/ora'), {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: parola }),
      })
        .then(x => x.json().catch(() => null))
        .then(a => {
          clearTimeout(timer);
          if (late) return;
          if (!a || !a.ok) { fine(a && a.perche === 'parola' ? 'PAROLA SBAGLIATA' : 'la classifica non risponde: riprova fra poco', false); return; }
          if (a.top && World.d) {
            World.d.top = a.top;
            World.forzato = { rev: a.rev | 0, top: a.top };
            World.write(World.KEY, JSON.stringify(World.d));
          }
          fine(entrati ? entrati + (entrati === 1 ? ' record mandato, classifica aggiornata' : ' record mandati, classifica aggiornata') : 'classifica aggiornata', true);
        })
        .catch(() => { clearTimeout(timer); if (!late) fine('la classifica non risponde: riprova fra poco', false); });
    };
    if (!inCoda) { chiedi(); return; }
    this.dopo = chiedi;
    this.manda();
  },
};
Share.load();

// ===== I contatori =====
// Un segnale minuscolo al Worker della classifica: "il gioco e' stato aperto", "e' partita una gara".
// Serve a sapere quanto si gioca e da quale paese (lo vede Cloudflare, qui non si manda): niente nomi,
// niente risultati, niente che dica chi sei. L'indirizzo e' quello degli invii, che arriva da
// records.json: finche' non c'e', non parte niente.
const Conta = {
  SITO: 'neon-stadium', coda: [], fatte: {},
  // da dove si gioca: nel browser, nell'app Android, nell'exe. Altrove (le prove in locale) non si conta.
  dove() {
    // chi sulla pagina delle statistiche ha scelto di non contarsi (vale per il sito, quindi per il gioco web)
    try { if (localStorage.getItem('dave1971_noconta')) return ''; } catch (e) { /* niente memoria: si conta */ }
    if (window.OLIMPIADI_PLATFORM === 'web') return /^(localhost$|127\.|\[::1\])/.test(location.hostname) ? '' : 'web';
    if (window.OLIMPIADI_PLATFORM === 'win') return 'exe';
    return location.protocol === 'file:' && /Android/i.test(navigator.userAgent || '') ? 'apk' : '';
  },
  // ogni cosa una volta sola per sessione: 'avvio', 'gara' (la prima), 'agg' (l'aggiornamento accettato)
  manda(cosa) {
    const d = this.dove();
    if (!d || this.fatte[cosa]) return;
    this.fatte[cosa] = true;
    this.coda.push(cosa + '-' + d);
    this.svuota();
  },
  svuota() {
    const post = World.postUrl();
    if (!/\/r$/.test(post) || typeof window.fetch !== 'function') return;
    while (this.coda.length) {
      const u = post.replace(/\/r$/, '/c') + '?s=' + this.SITO + '&e=' + this.coda.shift();
      try { window.fetch(u, { method: 'POST', mode: 'no-cors', keepalive: true }).catch(() => {}); } catch (e) { /* pazienza */ }
    }
  },
};
