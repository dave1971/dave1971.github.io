'use strict';
// ===== Shared event infrastructure: registry, scoring, records, runner physics, backgrounds =====

const TAU = Math.PI * 2;
const EVENTS = [];
// Le specialita' in cantiere: il codice c'e' tutto e si carica, ma non entrano in EVENTS, quindi
// non compaiono da nessuna parte (menu, decathlon, carriera, record, classifiche). Con loro si
// spengono anche l'allenamento e gli attrezzi che servono solo a loro (vedi career.js).
// Per riaccenderle basta togliere l'id da qui.
const NASCOSTE = ['staffetta', 'arrampicata', 'ciclismo', 'equitazione', 'breaking'];
const EVENTI_NASCOSTI = [];
function registerEvent(meta) { (NASCOSTE.indexOf(meta.id) >= 0 ? EVENTI_NASCOSTI : EVENTS).push(meta); }

// Le Specials: i giochi del torneo medievale, dietro la parola d'ordine (js/specials/). Hanno un
// registro tutto loro, cosi' non entrano mai nel menu, nel decathlon, nella carriera ne' nei record
// del mondo. Le schermate le trovano con un indice che parte da SPECIAL_BASE: evMeta() sa dove guardare.
const SPECIALS = [];
const SPECIAL_BASE = 100;
function registerSpecial(meta) { meta.medievo = true; SPECIALS.push(meta); }
function evMeta(i) { return i >= SPECIAL_BASE ? SPECIALS[i - SPECIAL_BASE] : EVENTS[i]; }

// Decathlon-style scoring (IAAF formula shape)
const Pts = {
  track: (a, b, c) => t => (t == null || t >= b) ? 0 : Math.floor(a * Math.pow(b - t, c)),
  field: (a, b, c) => m => (m == null || m <= b) ? 0 : Math.floor(a * Math.pow(m - b, c)),
};
const Fmt = {
  time: v => v.toFixed(2) + ' s',
  m: v => v.toFixed(2) + ' m',
  kg: v => Math.round(v) + ' kg',
  pts: v => v.toFixed(1) + ' pt',
};

// ---------- competition levels ----------
// The tier sets how strong the rivals are AND the physical ceiling of every athlete on the field:
// nobody runs an olympic time at a university meeting. lo/hi = skill range of the CPU athletes.
// hz/err/hit = the tap rate, the timing error and the aim of the weakest .. strongest rival of the field.
const LEVELS = [null,
  { id: 'uni', name: 'UNIVERSITY CHAMPIONSHIP', short: 'UNIVERSITY', col: '#43a047',
    desc: 'atleti in crescita, misure modeste', hz: [7.0, 8.6], err: [1.1, 0.4], hit: [0.25, 0.62] },
  { id: 'trials', name: 'INTERNATIONAL TRIALS', short: 'TRIALS', col: '#1e88e5',
    desc: 'livello internazionale', hz: [7.9, 10.6], err: [0.75, 0.22], hit: [0.42, 0.8] },
  { id: 'olympic', name: 'WORLD CHAMPIONSHIP', short: 'WORLD', col: '#ff8f00',
    desc: 'si arriva a sfiorare i record del mondo', hz: [8.8, 13.5], err: [0.42, 0.1], hit: [0.6, 0.97] },
];
const Lv = {
  i: 3,
  cur() { return LEVELS[clamp(this.i, 1, 3)]; },
  id() { return this.cur().id; },
};

// Physical ceiling of every athlete, per event, per level [university, trials, olympic].
// The olympic column is tuned so that a flawless performance lands just short of the real world record.
const CAPS = {
  '100m': [10.42, 10.93, 11.12],   // top running speed (m/s)
  '110h': [8.09, 8.66, 9.02],      // top running speed (m/s)
  lungo: [10.46, 11.12, 11.60],    // approach speed (m/s)
  triplo: [9.80, 10.94, 12.21],    // approach speed (m/s)
  alto: [1.175, 1.375, 1.525],       // constant of the take-off height
  asta: [2.72, 3.20, 3.665],       // constant of the take-off height
  '50sl': [2.06, 2.23, 2.348],     // top swimming speed (m/s)
  pesi: [1.25, 0.76, 0.494],       // how fast the effort needed grows with the load
  tuffi: [2, 4, 6],                // half twists allowed in a dive
  piattello: [1.15, 1.0, 0.86],    // width of the killing circle: the higher the tier, the finer the aim
  '200m': [10.68, 11.16, 11.34],   // top running speed (m/s), before the legs go in the straight
  peso: [9.5, 11.5, 13.2],         // top spin rate in the circle (rad/s)
  disco: [10.5, 12.6, 14.4],       // idem
  martello: [11.0, 13.2, 15.1],    // idem
  giavellotto: [7.40, 8.30, 9.00], // approach speed (m/s)
  arco: [0.80, 1.20, 1.80],        // steadiness of the bow arm: the higher, the less the sight wanders
  trampolino: [2, 4, 6],           // half twists allowed in one skill
  volteggio: [7.30, 8.10, 8.85],   // approach speed (m/s): da lì vengono altezza e giri
  staffetta: [10.42, 10.93, 11.12], // top running speed (m/s), della squadra e dell'ultimo frazionista
  arrampicata: [2.54, 3.15, 3.81],  // prese al secondo che il corpo regge senza scivolare
  ciclismo: [18.95, 20.9, 22.3],     // velocità di punta a pedalare (m/s): la picchiata dà il resto
  equitazione: [7.4, 8.2, 8.9],     // galoppo massimo del cavallo (m/s)
  breaking: [1, 1, 1],              // la pulizia dei movimenti: il livello fa la coreografia, l'atleta l'esecuzione
};
function capOf(id) { const a = CAPS[id]; return a ? a[clamp(Lv.i, 1, 3) - 1] : 1; }
// In career mode the athlete is still growing, so his own ceiling sits below the one the tier allows.
// f = 1 means "fully developed": the tier ceiling, nothing more.
function scaleCap(id, cap, f) {
  if (id === 'tuffi' || id === 'trampolino') return cap; // twists allowed: set by the tier alone
  if (id === 'pesi') return cap / f;   // steepness of the effort curve: lower = stronger
  return cap * f;
}

// Real world records, shown as the mark to chase.
const WR = {
  '100m': { v: 9.58, who: 'BOLT', nat: 'JAM', anno: 2009 },
  '110h': { v: 12.75, who: 'THARP', nat: 'USA', anno: 2026 },
  lungo: { v: 8.95, who: 'POWELL', nat: 'USA', anno: 1991 },
  alto: { v: 2.45, who: 'SOTOMAYOR', nat: 'CUB', anno: 1993 },
  triplo: { v: 18.29, who: 'EDWARDS', nat: 'GBR', anno: 1995 },
  asta: { v: 6.31, who: 'DUPLANTIS', nat: 'SWE', anno: 2026 },
  '50sl': { v: 20.88, who: 'McEVOY', nat: 'AUS', anno: 2026 },
  pesi: { v: 267, who: 'TALAKHADZE', nat: 'GEO', anno: 2021 },
  piattello: { v: 15, who: 'PERFETTO' },
  '200m': { v: 19.19, who: 'BOLT', nat: 'JAM', anno: 2009 },
  peso: { v: 23.56, who: 'CROUSER', nat: 'USA', anno: 2023 },
  disco: { v: 74.35, who: 'ALEKNA', nat: 'LTU', anno: 2024 },
  martello: { v: 86.74, who: 'SEDYKH', nat: 'URS', anno: 1986 },
  giavellotto: { v: 98.48, who: 'ZELEZNY', nat: 'CZE', anno: 1996 },
  arco: { v: 60, who: 'PERFETTO' },
  staffetta: { v: 36.84, who: 'JAMAICA', nat: 'JAM', anno: 2012 },
  arrampicata: { v: 4.54, who: 'ZHAO', nat: 'CHN', anno: 2026 },
  ciclismo: { v: 8.857, who: 'RICHARDSON', nat: 'GBR', anno: 2025 },
  breaking: { v: 100, who: 'PERFETTO' },
};
// La tabella qui sopra e' la rete di sicurezza: quella buona si scarica (vedi world.js), cosi' un
// record del mondo che cade si corregge in un file di testo invece che ricompilando l'apk.
function wrText(id, corto) {
  const r = typeof World !== 'undefined' ? World.wr(id) : WR[id];
  const meta = EVENTS.find(e => e.id === id);
  if (!r) return '—';
  const chi = typeof whoText === 'function' ? whoText(r, corto) : r.who;
  return (meta ? meta.fmt(r.v) : r.v + '') + '  (' + chi + ')';
}

// ---------- persistent records ----------
// Records are kept per level: a university mark is not comparable with an olympic one.
// Quanto puo' essere lungo il nome di un giocatore: 12 caratteri, per tutti e dappertutto. Si
// sceglie a 12, parte verso la classifica mondiale a 12, e se ne arriva uno piu' lungo (da una
// versione vecchia del gioco) si mostra tagliato coi puntini. Il posto piu' stretto e' il
// tabellone di gara, dove anche L. ANDERSEN, 11 lettere, entra solo rimpicciolito.
const NOME_MAX = 12;
function nomeCorto(s) { s = String(s || ''); return s.length > NOME_MAX ? s.slice(0, NOME_MAX - 1) + '…' : s; }

const Records = {
  key: 'olimpiadi_retro_records_v1',
  data: {},
  load() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
  k(id, lvl) { return id + '@' + (lvl || Lv.id()); },
  get(id, lvl) { return this.data[this.k(id, lvl)] || null; },
  // returns true if value is a new record (lvl: il livello, se non e' quello in corso)
  submit(id, value, lowerBetter, who, nat, lvl, leg) {
    if (value == null) return false;
    const key = this.k(id, lvl);
    const r = this.data[key];
    if (!r || (lowerBetter ? value < r.v : value > r.v)) {
      this.data[key] = { v: value, who: who, nat: nat || '' };
      if (leg) this.data[key].leg = true;     // fatto con un oggetto leggendario: l'asterisco
      this.save();
      return true;
    }
    return false;
  },
};
Records.load();
// I record del torneo medievale: stessa forma, un altro cassetto. Quelli fatti prima della 1.3.1
// stavano insieme agli altri e li sposta js/specials/carriera.js.
const RecordsTorneo = Object.assign(Object.create(Records), { key: 'olimpiadi_torneo_records_v1', data: {} });
RecordsTorneo.load();
function recordsOf(meta) { return meta && meta.medievo ? RecordsTorneo : Records; }

// Le misure superate nelle gare singole di alto, asta e pesi: per ogni giocatore (G1, G2) e per ogni
// livello, la piu' alta asticella passata o il carico piu' pesante sollevato. Ricominciando la gara,
// B a gara ferma passa le misure fino a quella, come in carriera si passano quelle gia' fatte in un
// campionato: si riparte dalla prima mai superata invece di rifare tutta la salita.
const Superate = {
  key: 'olimpiadi_superate_v1',
  data: {},
  load() { try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
  k(id, p) { return id + '@' + Lv.id() + '#' + p; },
  // vale solo per chi gioca davvero, nelle gare singole (non in carriera, che ha la sua, ne' nel decathlon)
  // (e non per l'atleta di dimostrazione delle istruzioni, Game.demo)
  conta(p) { return !Game.demo && !Game.careerMode && !Game.deca && !Game.special && p < Game.humans; },
  get(id, p) { const v = this.data[this.k(id, p)]; return typeof v === 'number' ? v : null; },
  metti(id, p, v) {
    if (!this.conta(p) || v == null) return;
    const k = this.k(id, p);
    if (!(this.data[k] >= v)) { this.data[k] = v; this.save(); }
  },
};
Superate.load();

// ---------- base class for all events ----------
// Labels of the A and B buttons for one player. Most events use the same pair for everybody; an event
// whose two actions are tied to the side of the screen (skeet) swaps them with the dominant hand.
function metaLabels(meta, p) { return meta.labelsFor ? meta.labelsFor(p) : meta.labels; }

class EventBase {
  constructor(n, meta) {
    this.n = n; this.meta = meta; this.time = 0;
    this.cap = capOf(meta.id); // physical ceiling for the level this competition is run at
    // ...and the ceiling of each athlete on the field: the same, except for a career player still growing
    this.pf = Array.from({ length: n }, (_, p) => Career.factorFor(p, meta.id));
    this.pcap = this.pf.map(f => scaleCap(meta.id, this.cap, f));
    this.res = Array(n).fill(null);
    this.msg = Array(n).fill(null);
    this.finished = false; this.endT = 0;
  }
  labels(p) { return metaLabels(this.meta, p); }
  capP(p) { return this.pcap[p]; }
  say(p, text, color, dur, sub) { this.msg[p] = { text, color: color || '#fff', t: dur || 1.6, d: dur || 1.6, sub: sub || '' }; }
  finish(p, value, disp) {
    if (this.res[p]) return;
    this.res[p] = { value, disp: disp || (value == null ? 'NULLO' : this.meta.fmt(value)), pts: value == null ? 0 : this.meta.pts(value) };
  }
  isDone(p) { return !!this.res[p]; }
  /**
   * Il ritiro: dal menu di pausa il giocatore lascia la gara e si tiene quello che ha fatto fin li'.
   * Serve da via d'uscita: prima, per chiudere un salto in alto o una gara di lanci senza buttare la
   * misura gia' fatta, bisognava sbagliare apposta tutti i tentativi che restavano.
   *
   * `parziale` e' la misura che resta in mano a chi si ritira adesso, nell'unita' della gara (null =
   * niente). Dove conta il tentativo migliore e' quello, dove i punti si sommano e' la somma fin qui:
   * in tutti e due i casi e' `liveScore`, purche' sia davvero una misura (lo dice `liveText`: nelle
   * corse e' la strada fatta, e li' chi non taglia il traguardo non ha un tempo). Nelle gare a tempo
   * del torneo `liveScore` e' rovesciato per fare la classifica, ma il tempo vero sta in `val` appena
   * c'e'. Le poche gare che fanno diversamente si scrivono la loro.
   */
  parziale(p) {
    const s = this.S && this.S[p];
    if (s && s.val != null) return s.val;
    if (this.meta.lowerBetter) return null;
    const v = this.liveScore(p);
    return v != null && v > 0 && this.liveText(p) ? v : null;
  }
  ritira(p) {
    if (this.res[p]) return;
    const v = this.parziale(p);
    // l'atleta torna fermo al suo posto: senza, resterebbe congelato a mezz'aria o col bilanciere in mano
    if (typeof this.fresh === 'function' && this.S && this.S[p]) this.S[p] = this.fresh(this.S[p], p);
    this.finish(p, v, v == null ? 'RITIRATO' : undefined);
    // la scritta resta fino ai risultati: finche' c'e' un messaggio le gare non scrivono "premi A per
    // partire", e a gara chiusa il tempo corre (si mandano avanti gli avversari) e sparirebbe subito
    this.say(p, 'RITIRATO', '#ffb74d', 1e6, v == null ? '' : 'vale ' + this.meta.fmt(v));
  }
  baseUpdate(dt) {
    this.time += dt;
    for (let p = 0; p < this.n; p++) {
      const m = this.msg[p];
      if (m) { m.t -= dt; if (m.t <= 0) this.msg[p] = null; }
    }
    if (this.res.every(r => r)) { this.endT += dt; if (this.endT > 2.3) this.finished = true; }
  }
  drawMsg(ctx, p, w, h) {
    const m = this.msg[p];
    if (!m) return;
    const age = m.d - m.t;
    const sc = age < 0.15 ? 0.5 + age / 0.3 : 1;
    const size = clamp(h * 0.16, 26, 58) * sc;
    ctx.save();
    ctx.globalAlpha = clamp(m.t / 0.3, 0, 1);
    txt(ctx, m.text, w / 2, h * 0.3, size, m.color);
    if (m.sub) txt(ctx, m.sub, w / 2, h * 0.3 + size * 0.85, size * 0.5, '#fff');
    ctx.restore();
  }
  hud() { return ''; }
  // provisional standing: liveScore(q) is higher-is-better, null = no valid mark yet
  liveScore() { return null; }
  /**
   * La misura di adesso, scritta come si scrive sul tabellone.
   *
   * Nelle gare a misura e in quelle a punti `liveScore` **è già** la misura, quindi basta darla da
   * formattare alla gara stessa. Nelle corse invece è la distanza percorsa, che sul tabellone non
   * vuol dire niente: là si sovrascrive con niente, e si aspetta il tempo finale.
   */
  liveText(p) {
    const v = this.liveScore(p);
    return (v == null || v <= 0) ? '' : this.meta.fmt(v);
  }
  /**
   * Vero quando il giocatore non sta facendo niente: prima di cominciare, fra un tentativo e
   * l'altro, o mentre guarda la misura appena fatta. È il momento in cui il tabellone può stare
   * sullo schermo senza coprire quello che serve a giocare — dal momento che parte la rincorsa
   * quello spazio torna al cronometro e all'indicatore di alzo.
   *
   * Quasi tutte le gare tengono la fase in `S[p].ph` e chiamano 'ready' quella d'attesa, quindi qui
   * basta guardare lì. Le corse non hanno pause — dal colpo di pistola al traguardo è tutto azione —
   * e infatti non hanno `ph`: per loro questa risponde no, e il tabellone aspetta la fine.
   */
  fermo(p) {
    const s = this.S && this.S[p];
    if (!s || !s.ph) return false;
    return s.ph === 'ready' || s.ph === 'done' || s.ph === 'score' || s.ph === 'show';
  }
  rank(p) {
    const v = this.liveScore(p);
    if (v == null) return null;
    let r = 1;
    for (let q = 0; q < this.n; q++) { const u = this.liveScore(q); if (q !== p && u != null && u > v) r++; }
    return r;
  }
  update(dt) { this.baseUpdate(dt); }
  press() { }
  release() { }
}

// ---------- tap-to-run physics ----------
// Each tap adds "effort" which decays; speed follows effort smoothly.
// Steady speed ~= tapRate * gain / decay  (7 taps/s -> ~11 m/s by default)
class Runner {
  constructor(o) {
    o = o || {};
    this.x = o.x || 0; this.v = 0; this.e = 0; this.ph = 0;
    this.vmax = o.vmax || 12.2; this.gain = o.gain || 2.4; this.decay = o.decay || 1.5; this.resp = o.resp || 2.6;
    this.stepRate = o.stepRate || 0.17; this.sound = o.sound !== false;
  }
  tap() { this.e = Math.min(this.e + 1, 12); }
  target() { return Math.min(this.vmax, this.e * this.gain); }
  update(dt, ground) {
    this.e -= this.e * this.decay * dt;
    if (ground !== false) this.v += (this.target() - this.v) * Math.min(1, this.resp * dt);
    this.x += this.v * dt;
    if (ground !== false && this.v > 0.3) {
      const before = Math.floor(this.ph / Math.PI);
      this.ph += dt * Math.PI * 2 * (0.35 + this.v * this.stepRate);
      if (this.sound && Math.floor(this.ph / Math.PI) !== before) Snd.step();
    }
  }
  k() { return clamp(this.v / 11, 0, 1); }
}
// Dove si carica col solo A (B serve per l'azione: stacco, lancio, salto dell'ostacolo) il passo di
// ogni colpo deve portare al massimo con un dito solo: circa 4,8 colpi al secondo. Nelle corse si
// alternano A e B e il passo normale basta. Prima qui servivano da 5,5 a 7,2 colpi al secondo: la CPU
// ci arrivava sempre, un giocatore vero quasi mai.
const COLPI_UN_DITO = 4.8;
function passoUnDito(vmax, decay) { return vmax * (decay || 1.5) / COLPI_UN_DITO; }

// ---------- race starter (shared by track & swim races) ----------
class Starter {
  constructor(n) { this.n = n; this.fs = Array(n).fill(0); this.dq = Array(n).fill(false); this.reset(); }
  reset() {
    this.state = 'marks'; this.t = 0; this.wait = rnd(1.1, 2.4); this.text = 'AI VOSTRI POSTI'; this.raceT = 0; this.flash = 0;
    Snd.tone(330, 0.2, 'square', 0.1, 0, 0.85); // "pronti", right after the start jingle
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'marks' && this.t > 1.4) {
      this.state = 'set'; this.t = 0; this.text = 'PRONTI...';
      Snd.tone(523, 0.24, 'square', 0.12); Snd.tone(523, 0.24, 'triangle', 0.06); // "attenti", then the gun
    }
    else if (this.state === 'set' && this.t > this.wait) { this.state = 'go'; this.t = 0; this.text = 'VIA!'; Snd.gun(); }
    else if (this.state === 'go') { this.raceT += dt; if (this.t > 1) this.text = ''; }
    else if (this.state === 'false' && this.t > 2) { this.reset(); return 'restart'; }
    return null;
  }
  // returns 'ok' when the race is on, otherwise handles false starts
  press(p) {
    if (this.dq[p]) return 'dq';
    if (this.state === 'go') return 'ok';
    if (this.state === 'false') return 'wait';
    this.fs[p]++;
    if (this.fs[p] >= 2) this.dq[p] = true;
    this.state = 'false'; this.t = 0;
    this.text = this.dq[p] ? 'SQUALIFICATO!' : 'FALSA PARTENZA!';
    this.fsBy = p;
    Snd.fail();
    return 'false';
  }
  running() { return this.state === 'go'; }
}

// ---------- backgrounds ----------
const Bg = {
  crowd: null,
  makeCrowd() {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 160;
    const x = c.getContext('2d');
    const r = mulberry32(42);
    x.fillStyle = '#39405a'; x.fillRect(0, 0, 320, 160);
    const cols = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#eeeeee', '#00acc1', '#6d4c41', '#f06292'];
    const skins = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
    for (let row = 0; row < 11; row++) {
      const y = 8 + row * 14;
      x.fillStyle = row % 2 ? '#454d6b' : '#3d4461';
      x.fillRect(0, y + 6, 320, 8);
      for (let i = 0; i < 40; i++) {
        if (r() < 0.12) continue;
        const px = i * 8 + (row % 2) * 4 + r() * 2;
        x.fillStyle = cols[(r() * cols.length) | 0];
        x.fillRect(px, y + 2, 6, 7);
        x.fillStyle = skins[(r() * skins.length) | 0];
        x.beginPath(); x.arc(px + 3, y, 2.6, 0, Math.PI * 2); x.fill();
      }
    }
    this.crowd = c;
  },
  sky(ctx, w, h, y1) {
    const g = ctx.createLinearGradient(0, 0, 0, y1);
    g.addColorStop(0, '#4aa3e8'); g.addColorStop(1, '#bfe3ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, y1);
  },
  crowdBand(ctx, w, y0, y1, scroll) {
    if (!this.crowd) this.makeCrowd();
    const hh = y1 - y0;
    const sc = hh / this.crowd.height, tw = this.crowd.width * sc;
    let off = -((scroll % tw) + tw) % tw;
    for (let x = off; x < w; x += tw) ctx.drawImage(this.crowd, x, y0, tw + 1, hh);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, y0, w, Math.max(2, hh * 0.04));
  },
  // Athletics stadium side view. Returns layout info.
  // Le Specials si giocano in un campo da torneo: al posto dei cartelloni gli stendardi, sopra la
  // folla i merli di un castello, e al posto della pista la terra battuta.
  medievo() { const sc = typeof G !== 'undefined' && G.scene; return !!(sc && (sc.medievo || (sc.meta && sc.meta.medievo))); },
  stadium(ctx, w, h, camX, ppm, ax) {
    const L = { standBot: h * 0.4, boardBot: h * 0.5, grassBot: h * 0.56, gy: h * 0.9 };
    const med = this.medievo();
    Bg.sky(ctx, w, h, L.standBot * 0.3);
    Bg.crowdBand(ctx, w, L.standBot * 0.18, L.standBot, camX * ppm * 0.35);
    if (med) {
      // i merli: una fila di pietra con le sue feritoie, che scorre con la folla
      const y0 = L.standBot * 0.1, mh = L.standBot * 0.1, mw = Math.max(10, ppm * 0.9);
      const off = -(((camX * ppm * 0.35) % (mw * 2)) + mw * 2) % (mw * 2);
      ctx.fillStyle = '#8d8d8d'; ctx.fillRect(0, y0 + mh * 0.55, w, mh * 0.6);
      for (let x = off; x < w; x += mw * 2) ctx.fillRect(x, y0, mw, mh);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y0 + mh * 1.1, w, 2);
    }
    // advertising boards (in the tournament: heraldic banners)
    const bw = 8, bcol = med ? ['#6a1b9a', '#f9a825', '#1b5e20', '#b71c1c'] : ['#f5f5f5', '#ffd400', '#0d47a1', '#c62828'];
    const bt = med ? ['GRAN', 'TORNEO', 'DEL RE', 'A.D. 1285'] : ['NEON', 'STADIUM', 'SPORT', '1985'];
    const i0 = Math.floor((camX - ax / ppm) / bw) - 1, i1 = i0 + Math.ceil(w / ppm / bw) + 2;
    for (let i = i0; i <= i1; i++) {
      const x = ax + (i * bw - camX) * ppm, k = ((i % 4) + 4) % 4;
      ctx.fillStyle = bcol[k];
      ctx.fillRect(x, L.standBot, bw * ppm - 2, L.boardBot - L.standBot);
      txt(ctx, bt[k], x + bw * ppm / 2, (L.standBot + L.boardBot) / 2, Math.min((L.boardBot - L.standBot) * 0.62, bw * ppm * 0.16),
        med ? (k === 1 ? '#4a148c' : '#fff') : (k === 0 || k === 1 ? '#c62828' : '#fff'), 'center', { outline: false });
    }
    ctx.fillStyle = med ? '#5b7f2e' : '#3f9b3a'; ctx.fillRect(0, L.boardBot, w, L.grassBot - L.boardBot);
    ctx.fillStyle = med ? '#a0724a' : '#c8553d'; ctx.fillRect(0, L.grassBot, w, h - L.grassBot);
    // lane lines (in the tournament just faint chalk on the dirt)
    ctx.fillStyle = med ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, L.grassBot + 2, w, Math.max(1, h * 0.008));
    ctx.fillRect(0, h * 0.7, w, Math.max(1, h * 0.008));
    ctx.fillRect(0, h * 0.985, w, Math.max(1, h * 0.008));
    return L;
  },
  distMarks(ctx, w, h, camX, ppm, ax, L, from, to, step, label) {
    const i0 = Math.max(from, Math.ceil((camX - ax / ppm) / step) * step);
    for (let d = i0; d <= to && ax + (d - camX) * ppm < w + 40; d += step) {
      const x = ax + (d - camX) * ppm;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - 1, h * 0.7, 2, h * 0.285);
      if (label) txt(ctx, label(d), x, (L.boardBot + L.grassBot) / 2, Math.max(10, h * 0.045), '#fff', 'center', { italic: false });
    }
  },
};

function shadow(ctx, x, gy, ppm, sc) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, gy, 0.45 * ppm * (sc || 1), 0.08 * ppm, 0, 0, Math.PI * 2); ctx.fill();
}

// Il segno che segue l'atleta in rincorsa, nelle gare dove conta il punto in cui si stacca o si lancia
// (lungo, triplo, alto, asta, giavellotto): una barra sottile del colore che dice com'e' farlo adesso.
// Va disegnata PRIMA dell'atleta, cosi' gli resta dietro, e parte dall'inguine: si vede fra le gambe e
// sotto i piedi, sulla corsia, e non taglia il busto ne' spunta sopra la testa. Prima era spessa il
// doppio, con una freccia in cima, alta fin sopra la testa, e nel giavellotto stava davanti: troppo.
function segnoAtleta(ctx, x, h, ppm, col) {
  const y0 = h * 0.9 - 0.85 * ppm, y1 = h * 0.98;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 1.75, y0, 3.5, y1 - y0);
  ctx.fillStyle = col; ctx.fillRect(x - 1, y0, 2, y1 - y0);
}

// Horizontal meter
function drawMeter(ctx, x, y, w, h, frac, color, label, zone) {
  h = Math.max(h, 15);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rrect(ctx, x - 2, y - 2, w + 4, h + 4, 4); ctx.fill();
  if (zone) { ctx.fillStyle = 'rgba(80,255,80,0.45)'; ctx.fillRect(x + w * zone[0], y, w * (zone[1] - zone[0]), h); }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  if (label) txt(ctx, label, x + w / 2, y + h / 2 + 1, Math.max(11, h * 0.75), '#fff', 'center', { italic: false });
}

// Race progress bar showing every player's position
// (the lane owner `me` is drawn last, bigger and ringed)
function drawRaceBar(ctx, w, h, xs, total, me) {
  const bx = w * 0.3, bw = w * 0.4, by = h * 0.06;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rrect(ctx, bx - 6, by - 6, bw + 12, 12, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw - 1, by - 6, 3, 12);
  const dot = (i, r) => {
    ctx.fillStyle = PCOL[i].ui;
    ctx.beginPath(); ctx.arc(bx + bw * clamp(xs[i] / total, 0, 1), by, r, 0, Math.PI * 2); ctx.fill();
  };
  xs.forEach((x, i) => { if (i !== me) dot(i, 4.5); });
  if (me != null) { dot(me, 7); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
}
