'use strict';
// ===== Modalità Carriera =====
// One athlete, three championships. To move up you must post a qualifying mark in EVERY event of the
// current tier; money won on the track buys training and equipment, which raise the athlete toward the
// ceiling his tier allows (never past it).

// What each event leans on. Weights add up to 1.
const EV_ATTR = {
  '100m': { spd: 0.75, pow: 0.15, sta: 0.10 },
  '110h': { spd: 0.50, tec: 0.35, pow: 0.15 },
  lungo: { spd: 0.45, pow: 0.40, tec: 0.15 },
  alto: { pow: 0.55, tec: 0.30, spd: 0.15 },
  triplo: { spd: 0.35, pow: 0.40, tec: 0.25 },
  piattello: { tec: 0.85, sta: 0.15 },
  pesi: { pow: 0.80, sta: 0.20 },
  '50sl': { sta: 0.50, pow: 0.30, tec: 0.20 },
  asta: { pow: 0.40, tec: 0.35, spd: 0.25 },
  tuffi: { tec: 0.70, pow: 0.20, sta: 0.10 },
  '200m': { spd: 0.45, sta: 0.40, pow: 0.15 },
  peso: { pow: 0.55, equ: 0.35, tec: 0.10 },
  disco: { equ: 0.45, pow: 0.35, tec: 0.20 },
  martello: { equ: 0.50, pow: 0.40, tec: 0.10 },
  giavellotto: { pow: 0.45, spd: 0.40, tec: 0.15 },
  arco: { tec: 0.60, sta: 0.25, equ: 0.15 },
  trampolino: { tec: 0.60, pow: 0.25, equ: 0.15 },
  volteggio: { spd: 0.40, tec: 0.40, pow: 0.20 },
  // le sei della 1.2: il cambio del testimone, il ritmo in parete, il tempo sul cavallo e sulla
  // musica sono coordinazione, cioe' l'allenamento che e' arrivato con loro
  staffetta: { spd: 0.65, coo: 0.25, pow: 0.10 },
  arrampicata: { pow: 0.40, coo: 0.40, spd: 0.20 },
  ciclismo: { pow: 0.50, sta: 0.30, spd: 0.20 },
  equitazione: { coo: 0.45, tec: 0.35, equ: 0.20 },
  breaking: { coo: 0.45, equ: 0.35, pow: 0.20 },
};
const ATTRS_TUTTI = [
  { k: 'spd', name: 'VELOCITÀ', col: '#ef5350' },
  { k: 'pow', name: 'POTENZA', col: '#ffa726' },
  { k: 'sta', name: 'RESISTENZA', col: '#66bb6a' },
  { k: 'tec', name: 'TECNICA', col: '#42a5f5' },
  { k: 'equ', name: 'EQUILIBRIO DI SPIN', col: '#ab47bc' },
  { k: 'coo', name: 'COORDINAZIONE', col: '#ffee58' },
];
// Si allena solo quello che serve a qualche specialita' in gara: con le gare nuove nascoste (vedi
// NASCOSTE in base.js) sparisce anche la coordinazione, che serve solo a loro.
const ATTRS = ATTRS_TUTTI.filter(a => EVENTS.some(e => (EV_ATTR[e.id] || {})[a.k] > 0));
const ATTR_MIN = 0, ATTR_MAX = 100;
// How far training can take each attribute at each tier: the athlete carries his points up with him
// and keeps improving them, but only the olympic season lets him reach 100.
const ATTR_CAP = [50, 80, 100];

// Equipment: one item per family, three tiers, bought in order and never worn out — only replaced
// by the better version of the same item.
const GEAR_TIERS = [{ n: 'BASE', b: 0.010, c: 1800 }, { n: 'PRO', b: 0.020, c: 5200 }, { n: 'ELITE', b: 0.030, c: 12000 }];
const GEAR_TUTTI = [
  { k: 'spikes', name: 'CHIODATE', evs: ['100m', '200m', '110h', 'staffetta'], col: '#ef5350' },
  { k: 'jump', name: 'SCARPE DA SALTO', evs: ['lungo', 'triplo', 'alto'], col: '#ffa726' },
  { k: 'pole', name: 'ASTA IN CARBONIO', evs: ['asta'], col: '#ffca28' },
  { k: 'suit', name: 'COSTUME IN FIBRA', evs: ['50sl'], col: '#29b6f6' },
  { k: 'belt', name: 'CINTURA E MAGNESITE', evs: ['pesi'], col: '#8d6e63' },
  { k: 'gun', name: 'FUCILE DA SKEET', evs: ['piattello'], col: '#78909c' },
  { k: 'dive', name: 'PREPARAZIONE TUFFI', evs: ['tuffi'], col: '#26a69a' },
  { k: 'throw', name: 'SCARPE DA PEDANA', evs: ['peso', 'disco', 'martello'], col: '#8d6e63' },
  { k: 'jav', name: 'GIAVELLOTTO IN CARBONIO', evs: ['giavellotto'], col: '#cfd8dc' },
  { k: 'bow', name: 'ARCO RICURVO', evs: ['arco'], col: '#66bb6a' },
  { k: 'tramp', name: 'PREPARAZIONE TRAMPOLINO', evs: ['trampolino'], col: '#26c6da' },
  { k: 'grip', name: 'PARAMANI E MAGNESITE', evs: ['volteggio'], col: '#d4a373' },
  { k: 'climb', name: 'SCARPETTE DA ARRAMPICATA', evs: ['arrampicata'], col: '#ff7043' },
  { k: 'bike', name: 'BICI DA PISTA IN CARBONIO', evs: ['ciclismo'], col: '#90caf9' },
  { k: 'horse', name: 'SELLA E FINIMENTI', evs: ['equitazione'], col: '#a1887f' },
  { k: 'dance', name: 'PREPARAZIONE BREAKING', evs: ['breaking'], col: '#f06292' },
];
// Nel negozio solo gli attrezzi di specialita' in gara; le chiodate perdono la staffetta, gli
// attrezzi delle gare nascoste spariscono del tutto.
const GEAR = GEAR_TUTTI.map(g => Object.assign({}, g, { evs: g.evs.filter(id => EVENTS.some(e => e.id === id)) })).filter(g => g.evs.length);

// Gli oggetti leggendari: roba da collezione, con una storia (inventata) dietro, che vale il 10% in piu'
// dell'atleta che la usa, anche oltre il tetto del livello. Solo per la carriera delle Olimpiadi, e si
// comprano solo pagando: 250.000 in gara (i 10 euro per ora sono solo scritti), e solo da chi sa la
// parola d'ordine del torneo, in tutte le versioni. I risultati fatti con uno di questi
// vanno in classifica con l'asterisco. I nomi alludono senza nominare: sono in vendita.
const LEG_PREZZO = 250000, LEG_EURO = 10, LEG_BONUS = 1.10;
const LEG_TESTA = 34, LEG_RIGA = 52;      // nel negozio: la testata della sezione e l'altezza di una riga
const LEGGENDARI_TUTTI = [
  { k: 'fulmine', name: 'LE SCARPE DEL FULMINE GIAMAICANO', evs: ['100m', '200m'], col: '#fdd835', battuta: 'ancora calde dal 2009: non lavarle, mai' },
  { k: 'barba', name: 'MEZZA BARBA DEL SALTATORE MARCHIGIANO', evs: ['alto'], col: '#8d6e63', battuta: 'l\'altra meta\' la tiene lui, per scaramanzia' },
  { k: 'hermes', name: 'LE ALETTE AI TALLONI DI HERMES', evs: ['110h'], col: '#e0e0e0', battuta: 'consegna garantita, anche oltre gli ostacoli' },
  { k: 'canguro', name: 'LE MOLLE DEL CANGURO BOXEUR', evs: ['lungo', 'triplo'], col: '#d4a373', battuta: 'il canguro le rivuole per il ring del sabato' },
  { k: 'vichingo', name: 'L\'ASTA DEL VICHINGO VOLANTE', evs: ['asta'], col: '#90caf9', battuta: 'rinforzata col corno di un vichingo, dicono' },
  { k: 'tell', name: 'L\'OCCHIO DI GUGLIELMO TELL', evs: ['piattello', 'arco'], col: '#66bb6a', battuta: 'la mela non e\' compresa nel prezzo' },
  { k: 'ercole', name: 'LA CINTURA DI ERCOLE', evs: ['pesi'], col: '#ff7043', battuta: 'le dodici fatiche sono a parte' },
  { k: 'squalo', name: 'LA PINNA DELLO SQUALO DI BALTIMORA', evs: ['50sl'], col: '#29b6f6', battuta: 'si mette sulla schiena: le corsie vicine si spostano' },
  { k: 'nettuno', name: 'LA MOLLETTA DA NASO DI NETTUNO', evs: ['tuffi', 'trampolino'], col: '#26c6da', battuta: 'Nettuno giura che non entra una goccia' },
  { k: 'ciclope', name: 'IL BRACCIO BIONICO DEL CICLOPE', evs: ['peso', 'disco', 'martello'], col: '#a1887f', battuta: 'l\'altro braccio il ciclope lo tiene, per ora' },
  { k: 'zeus', name: 'LA SAETTA DI ZEUS', evs: ['giavellotto'], col: '#ffee58', battuta: 'da lanciare solo col bel tempo' },
  { k: 'saltimbanco', name: 'LE MOLLE DEL SALTIMBANCO DI CORTE', evs: ['volteggio'], col: '#f06292', battuta: 'fanno boing anche da sole, di notte' },
];
const LEGGENDARI = LEGGENDARI_TUTTI.map(g => Object.assign({}, g, { evs: g.evs.filter(id => EVENTS.some(e => e.id === id)) })).filter(g => g.evs.length);
// Servono la parola d'ordine del torneo: detta una volta (nel negozio o alla porta del torneo), vale per
// sempre su quel dispositivo. Senza, gli oggetti non si comprano e quelli gia' presi non valgono.
// Nel codice c'e' solo l'impronta della parola: la versione web, che del torneo non sa niente, non
// deve poterla mostrare a chi ne legge i file.
const PAROLA_IMPRONTA = 'd78ca0ebc1b35fdf';
function parolaGiusta(s) {
  const t = String(s).toUpperCase(), h = seme => {
    let x = seme >>> 0;
    for (let i = 0; i < t.length; i++) { x ^= t.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
    return x.toString(16).padStart(8, '0');
  };
  return h(2166136261) + h(0x9e3779b9) === PAROLA_IMPRONTA;
}
const LEG_CHIAVE = 'olimpiadi_leg_ok';
function legSbloccati() { try { return localStorage.getItem(LEG_CHIAVE) === '1'; } catch (e) { return false; } }
function legSblocca() { try { localStorage.setItem(LEG_CHIAVE, '1'); } catch (e) { /* storage unavailable */ } }

// Prize money by finishing place, multiplied by the tier.
const PRIZE = [2200, 1500, 1100, 800, 680, 600, 540, 480];
const LVL_MUL = [1, 1.8, 3];
// Trasferta e iscrizione al campionato nuovo: una cifra fissa, non tutto il portafoglio.
// Quello che avanza si porta dietro, cosi' vincere tanto all'universitario serve a qualcosa
// anche dopo, e non c'e' da svuotare la cassa di corsa prima di partire.
const PROMO_FEE = [5000, 10000];   // universitario -> trials, trials -> olimpico
// Obiettivi centrati per salire di campionato: cinque su sei. Con le 18 specialita' in gara sono 15;
// riaccendendo le cinque nascoste diventano 19 su 23.
const PROMO_NEED = Math.round(EVENTS.length * 5 / 6);
const STD_BONUS = 3000; // one-off, the first time an event's qualifying mark is posted

// Qualifying marks, per tier: the mark that is worth about a third place in a meeting of that tier.
// Measured from the field itself (median third best of the seven rivals), so posting it puts you on the
// podium and qualifies you; a fully developed athlete with a clean run goes better than this.
// Two exceptions: skeet, whose card stops at 15/15 and simply steps up with the tier, and diving, where
// the rivals release the tuck from a prediction with no reaction time and are out of human reach — there
// the mark is set on what a developed athlete can actually score.
const STD = {
  uni: { '100m': 11.50, '110h': 15.95, lungo: 5.90, alto: 1.95, triplo: 12.90, piattello: 11, pesi: 145, '50sl': 26.45, asta: 4.80, tuffi: 190,
    '200m': 23.00, peso: 11.80, disco: 34.80, martello: 40.20, giavellotto: 53.50, arco: 50, trampolino: 166, volteggio: 115 },
  trials: { '100m': 10.55, '110h': 14.35, lungo: 7.10, alto: 2.20, triplo: 15.00, piattello: 12, pesi: 185, '50sl': 23.60, asta: 5.50, tuffi: 215,
    '200m': 21.10, peso: 16.10, disco: 50.20, martello: 58.00, giavellotto: 73.00, arco: 54, trampolino: 190, volteggio: 165 },
  olympic: { '100m': 10.05, '110h': 13.40, lungo: 8.30, alto: 2.35, triplo: 17.45, piattello: 13, pesi: 245, '50sl': 21.80, asta: 6.10, tuffi: 225,
    '200m': 20.10, peso: 21.30, disco: 65.50, martello: 77.20, giavellotto: 90.50, arco: 56, trampolino: 210, volteggio: 190 },
};
// Le cinque della 1.2, misurate allo stesso modo (tools/campo-carriera.js): il terzo posto mediano di
// sette avversari di carriera. Alcune arrotondate a favore del giocatore:
//  - nel breaking la CPU prende il tempo meglio di un pollice vero (il campo fa 81, 84, 90);
//  - staffetta, ciclismo e salto ostacoli: il terzo posto vero chiedeva per forza l'attrezzatura
//    ELITE (come il lungo e il martello), e qui si e' scelto di no: bastano attributi sugli 85.
Object.assign(STD.uni, { staffetta: 44.00, arrampicata: 7.65, ciclismo: 11.70, equitazione: 27.50, breaking: 78.0 });
Object.assign(STD.trials, { staffetta: 40.60, arrampicata: 6.15, ciclismo: 10.15, equitazione: 24.10, breaking: 82.0 });
Object.assign(STD.olympic, { staffetta: 38.85, arrampicata: 4.95, ciclismo: 9.35, equitazione: 21.40, breaking: 88.0 });
// Il lungo del Trials: 7,10 era il terzo posto del campo, ma un giocatore vero con attributi a 80 e
// scarpe ELITE ci arrivava due volte su trenta salti (le simulazioni perfette fanno 7,56: fra rincorsa,
// stacco e angolo una persona perde mezzo metro). Abbassato su richiesta di Davide.
STD.trials.lungo = 6.95;

// L'obiettivo e' centrato se lo e' la misura che si vede: si confronta al centesimo, come la si scrive.
// Prima un 7,096 compariva come "7.10" ma non centrava un obiettivo di 7,10.
function centrato(v, need, lowerBetter) {
  const q = x => Math.round(x * 100);
  return lowerBetter ? q(v) <= q(need) : q(v) >= q(need);
}

// Development of the CPU rivals of a career meeting, [weakest .. strongest of the field] per tier.
// Tuned so that the qualifying mark of the tier is worth roughly a third place.
const CPU_F = [[0.840, 0.925], [0.885, 0.965], [0.925, 1.0]];
// Per-event nudge on top of that band, where the rivals' technique flattered them: the vault rewards a
// clean plant so heavily that the whole university field cleared more than a player ever could.
const CPU_F_ADJ = { asta: [-0.085, 0, 0] };

// Un circuito e' tutto quello che distingue una carriera dall'altra: le specialita', gli allenamenti,
// l'attrezzatura, gli obiettivi, i nomi dei campionati e dove si salva. Il motore (Career) e le
// schermate sono gli stessi. Questo e' quello delle Olimpiadi; il torneo medievale ha il suo in
// js/specials/carriera.js, con un salvataggio a parte.
const CIRCUITO_BASE = {
  key: 'olimpiadi_career_v2', oldKey: 'olimpiadi_career_v1',
  events: EVENTS, attrs: ATTRS, evAttr: EV_ATTR, gear: GEAR, tiers: GEAR_TIERS, std: STD, need: PROMO_NEED, leggendari: LEGGENDARI,
  idx: i => i,                          // l'indice di gara che capisce Game
  livello: l => LEVELS[clamp(l, 1, 3)],  // nome, sigla e colore di ogni campionato
  valuta: ' €',
  testi: {
    titolo: 'CARRIERA', titoloBtn: 'TITOLO MONDIALE', campione: 'CAMPIONE DEL MONDO',
    finale: 'al campionato del mondo. La carriera è completa.',
    ultimo: 'centra l\'obiettivo in tutte le specialità per il titolo mondiale',
    tassa: 'trasferta e iscrizione: ', manca: 'trasferta: mancano ', resto: 'il resto resta in cassa per il campionato nuovo',
    promo: ['avversari più forti, obiettivi più alti', 'e un tetto di prestazione più vicino ai record'],
  },
  esci: () => G.setScene(new TitleScene()),
};

const Career = {
  C: CIRCUITO_BASE,  // il circuito in uso
  slots: [],      // one career per player profile
  slot: 0,        // the one being played
  data: null,     // = slots[slot]
  blank() {
    return {
      lvl: 1, money: 0, races: 0,
      attr: this.C.attrs.reduce((o, a) => { o[a.k] = ATTR_MIN; return o; }, {}),
      gear: {}, done: {}, best: {}, place: {}, medals: [0, 0, 0], champion: false, spent: 0, leggendari: {},
    };
  },
  fix(d) {
    const o = Object.assign(this.blank(), d);
    o.attr = Object.assign(this.C.attrs.reduce((a, x) => { a[x.k] = ATTR_MIN; return a; }, {}), d.attr);
    o.lvl = clamp(o.lvl | 0, 1, 3);
    return o;
  },
  // I migliori gia' fatti che centrano un obiettivo non ancora segnato (dopo un obiettivo abbassato, o
  // dopo la correzione dei centesimi): si segna, col suo bonus. Dice se ha cambiato qualcosa.
  ricontrolla(d) {
    let cambiato = false;
    for (let l = 1; l <= 3; l++) {
      const lv = LEVELS[l].id, B = d.best[lv], S = this.C.std[lv] || {};
      if (!B) continue;
      const D = d.done[lv] || (d.done[lv] = {});
      for (const e of this.C.events) {
        const v = B[e.id], need = S[e.id];
        if (v == null || need == null || D[e.id] || !centrato(v, need, e.lowerBetter)) continue;
        D[e.id] = true;
        d.money += Math.round(STD_BONUS * LVL_MUL[l - 1]);
        cambiato = true;
      }
    }
    return cambiato;
  },
  load() {
    this.slots = [this.blank(), this.blank()];
    try {
      const d = JSON.parse(localStorage.getItem(this.C.key));
      if (Array.isArray(d)) d.forEach((x, i) => { if (x && x.attr && i < 2) this.slots[i] = this.fix(x); });
      else if (this.C.oldKey) {
        const old = JSON.parse(localStorage.getItem(this.C.oldKey)); // careers from before the split
        if (old && old.attr) this.slots[0] = this.fix(old);
      }
    } catch (e) { /* storage unavailable */ }
    this.C.slots = this.slots;
    if (this.slots.map(d => this.ricontrolla(d)).some(Boolean)) this.save();
    this.data = this.slots[this.slot];
    return this.data;
  },
  // Passa a un altro circuito: ognuno tiene le sue due carriere, caricate la prima volta che serve.
  usa(C) {
    this.C = C;
    if (C.slots) { this.slots = C.slots; this.data = this.slots[this.slot]; } else this.load();
    return this;
  },
  use(i) { this.slot = clamp(i | 0, 0, 1); this.data = this.slots[this.slot]; return this.data; },
  started(i) { const d = this.slots[i]; return d.races > 0 || d.lvl > 1; },
  save() { try { localStorage.setItem(this.C.key, JSON.stringify(this.slots)); } catch (e) { /* ignore */ } },
  reset(i) { const k = i == null ? this.slot : i; this.slots[k] = this.blank(); if (k === this.slot) this.data = this.slots[k]; this.save(); },

  lvlId() { return LEVELS[clamp(this.data.lvl, 1, 3)].id; },
  mul() { return LVL_MUL[clamp(this.data.lvl, 1, 3) - 1]; },
  std(id, lvl) { return this.C.std[LEVELS[clamp(lvl || this.data.lvl, 1, 3)].id][id]; },
  doneMap() { const k = this.lvlId(); return this.data.done[k] || (this.data.done[k] = {}); },
  bestMap() { const k = this.lvlId(); return this.data.best[k] || (this.data.best[k] = {}); },
  // best finishing position of this championship, event by event (1 = won it)
  placeMap() { const k = this.lvlId(); return this.data.place[k] || (this.data.place[k] = {}); },
  // Medals counted one per event: only the best you ever took in each. Winning the 100 m three times
  // is one gold here, not three. With no level given, every championship played counts.
  bestMedals(lvl) {
    const out = [0, 0, 0], P = this.data.place;
    const maps = lvl ? [P[LEVELS[clamp(lvl, 1, 3)].id]] : Object.keys(P).map(k => P[k]);
    for (const m of maps) {
      if (!m) continue;
      for (const e of this.C.events) { const p = m[e.id]; if (p != null && p <= 3) out[p - 1]++; }
    }
    return out;
  },
  doneCount() { const d = this.doneMap(); return this.C.events.reduce((a, e) => a + (d[e.id] ? 1 : 0), 0); },
  bestMedalsOf(i) { const keep = this.data; this.data = this.slots[i]; const o = this.bestMedals(); this.data = keep; return o; },
  doneCountOf(i) { const s = this.slots[i], d = s.done[LEVELS[clamp(s.lvl, 1, 3)].id] || {};
    return this.C.events.reduce((a, e) => a + (d[e.id] ? 1 : 0), 0); },
  // Quanti obiettivi servono per salire: non tutti. Qualche gara chiede l'attrezzatura migliore per
  // passare, e restare fermi un campionato intero per una sola specialita' non e' divertente; le
  // altre si possono continuare a inseguire anche dopo. Il titolo olimpico invece le chiede tutte:
  // e' la fine della carriera, non un passaggio.
  need() { const n = this.C.events.length; return this.data.lvl >= 3 ? n : Math.min(this.C.need, n); },
  ready() { return this.doneCount() >= this.need(); },

  gearOf(k) { return this.data.gear[k] || 0; },   // 0 = nothing yet, 1..3 = tier owned
  gearBonus(id) {
    let b = 0;
    for (const g of this.C.gear) if (g.evs.indexOf(id) >= 0) { const t = this.gearOf(g.k); if (t) b += this.C.tiers[t - 1].b; }
    return b;
  },
  // Share of the tier ceiling the athlete can actually use: 0.80 with no training at all, 0.97 with every
  // attribute at 100, 1.00 only with the best equipment on top. Never more than 1.
  // The curve flattens out, so the first points of training are worth much more than the last.
  factor(id) {
    const a = this.data.attr, w = this.C.evAttr[id] || {};
    let v = 0;
    for (const k in w) v += w[k] * (a[k] || 0);
    const f = clamp(0.80 + 0.17 * Math.pow(clamp(v, 0, 100) / 100, 0.6) + this.gearBonus(id), 0.5, 1);
    // l'oggetto leggendario va oltre il tetto: e' per questo che i suoi risultati hanno l'asterisco
    return this.legPer(id) ? f * LEG_BONUS : f;
  },
  // l'oggetto leggendario che vale per questa gara, se c'e' e se in questa versione gli oggetti valgono
  legPer(id) {
    if (!legSbloccati() || !this.data || !this.C.leggendari) return null;
    const L = this.data.leggendari || {};
    return this.C.leggendari.find(g => L[g.k] && g.evs.indexOf(id) >= 0) || null;
  },
  hasLeg(k) { return !!(this.data && this.data.leggendari && this.data.leggendari[k]); },
  canBuyLeg(k) { return legSbloccati() && !this.hasLeg(k) && this.data.money >= LEG_PREZZO; },
  buyLeg(k) {
    if (!this.canBuyLeg(k)) return false;
    this.data.money -= LEG_PREZZO;
    this.data.leggendari = Object.assign({}, this.data.leggendari, { [k]: true });
    this.save();
    return true;
  },
  factorFor(p, id) {
    if (!Game.careerMode || !this.data) return 1; // free play: everybody runs at the tier ceiling
    if (p === 0) return this.factor(id);
    const i = clamp(Lv.i, 1, 3) - 1, b = CPU_F[i], s = Game.cpuSkill[p];
    const adj = CPU_F_ADJ[id] ? CPU_F_ADJ[id][i] : 0;
    return clamp(lerp(b[0], b[1], s == null ? 0.5 : s) + adj, 0.5, 1);
  },

  attrCap() { return ATTR_CAP[clamp(this.data.lvl, 1, 3) - 1]; },
  atCap(k) { return this.data.attr[k] >= this.attrCap(); },
  trainCost(k) { return Math.round(80 + 5 * this.data.attr[k]); },
  canTrain(k) { return !this.atCap(k) && this.data.money >= this.trainCost(k); },
  train(k) {
    if (!this.canTrain(k)) return false;
    this.data.money -= this.trainCost(k);
    this.data.attr[k] = Math.min(this.attrCap(), this.data.attr[k] + 2);
    this.save();
    return true;
  },
  // Quanto e' costata l'attrezzatura che hai. I gradini si comprano in ordine e non si sommano, quindi
  // chi ha ELITE ha pagato anche BASE e PRO: rivendendo rientra tutto, gradino per gradino.
  gearSpent() {
    let c = 0;
    for (const g of this.C.gear) for (let t = 0; t < this.gearOf(g.k); t++) c += this.C.tiers[t].c;
    return c;
  },
  // Vende tutto a quanto e' stato pagato: serve a riprovare le gare con attrezzi piu' bassi, che
  // poi vanno ricomprati uno per uno. Restituisce quanto e' rientrato.
  sellAllGear() {
    const c = this.gearSpent();
    if (!c) return 0;
    this.data.money += c;
    this.data.gear = {};
    this.save();
    return c;
  },
  nextGear(k) { const t = this.gearOf(k); return t >= 3 ? null : this.C.tiers[t]; },
  canBuy(k) { const n = this.nextGear(k); return !!n && this.data.money >= n.c; },
  buy(k) {
    if (!this.canBuy(k)) return false;
    this.data.money -= this.nextGear(k).c;
    this.data.gear[k] = this.gearOf(k) + 1;
    this.save();
    return true;
  },

  // called at the end of every career event; returns what was won, for the results screen.
  // An athlete without a valid mark (disqualified, or every attempt a foul) is not classified
  // and takes no money and no medal.
  eventDone(meta, res, order) {
    const r = res[0], o = order.find(x => x.p === 0);
    const v = r ? r.value : null;
    const place = (v != null && o && o.place) ? o.place : null;
    const out = { place, prize: 0, bonus: 0, first: false, better: false, valid: v != null };
    if (v != null) {
      out.prize = Math.round(PRIZE[clamp(place, 1, 8) - 1] * this.mul());
      if (place <= 3) this.data.medals[place - 1]++;
      const B = this.bestMap(), old = B[meta.id];
      if (old == null || (meta.lowerBetter ? v < old : v > old)) { B[meta.id] = v; out.better = true; }
      const P = this.placeMap();
      if (place != null && (P[meta.id] == null || place < P[meta.id])) P[meta.id] = place;
      const need = this.std(meta.id);
      if (centrato(v, need, meta.lowerBetter)) {
        const D = this.doneMap();
        if (!D[meta.id]) { D[meta.id] = true; out.first = true; out.bonus = Math.round(STD_BONUS * this.mul()); }
      }
    }
    this.data.money += out.prize + out.bonus;
    this.data.races++;
    this.save();
    return out;
  },
  // Moving up costs a fixed fare, and what is left over carries into the new season.
  // Winning the olympic title costs nothing, there is nowhere left to travel to.
  promoFee() { return this.data.lvl >= 3 ? 0 : PROMO_FEE[clamp(this.data.lvl, 1, 2) - 1]; },
  // Per salire servono gli obiettivi E i soldi della trasferta. Prima la tassa si prendeva quello che
  // c'era, e si partiva anche con la cassa vuota: adesso, finche' mancano i soldi, si resta qui.
  canAfford() { return this.data.money >= this.promoFee(); },
  canPromote() { return this.ready() && this.canAfford(); },
  promote() {
    if (!this.canPromote()) return false;
    if (this.data.lvl >= 3) { this.data.champion = true; this.save(); return true; }
    const fee = this.promoFee();
    this.data.spent = fee;
    this.data.money = Math.round(this.data.money) - fee;
    this.data.lvl++;
    this.save();
    return true;
  },
};
Career.load();

// i soldi nella valuta del circuito: euro alle Olimpiadi, fiorini al torneo
const Money = v => (v >= 10000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)) + Career.C.valuta;
