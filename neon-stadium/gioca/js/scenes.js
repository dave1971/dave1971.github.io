'use strict';
// ===== Screens: title, menus, intro, gameplay, results, final standings, records =====

const GAME_VERSION = '1.8.7.0'; // keep in sync with versionName in app/build.gradle

const SHORT = { '100m': '100 METRI', '110h': '110 OSTACOLI', lungo: 'SALTO IN LUNGO', alto: 'SALTO IN ALTO', triplo: 'SALTO TRIPLO',
  piattello: 'PIATTELLO', pesi: 'PESI', '50sl': '50 M S.L.', asta: 'ASTA', tuffi: 'TUFFI',
  '200m': '200 METRI', peso: 'PESO', disco: 'DISCO', martello: 'MARTELLO', giavellotto: 'GIAVELLOTTO',
  arco: 'ARCO', trampolino: 'TRAMPOLINO', volteggio: 'VOLTEGGIO',
  staffetta: '4×100', arrampicata: 'ARRAMPICATA', ciclismo: 'CICLISMO', equitazione: 'EQUITAZIONE', breaking: 'BREAKING' };

// ---------- rankings (ties share the place; athletes without a valid mark come last, unplaced) ----------
function rankBy(items, better) {
  const ok = items.filter(x => x.v != null).sort((a, b) => better(a.v, b.v));
  ok.forEach((x, i) => { x.place = i > 0 && x.v === ok[i - 1].v ? ok[i - 1].place : i + 1; });
  return ok.concat(items.filter(x => x.v == null).map(x => Object.assign(x, { place: null })));
}
const rankResults = (res, lowerBetter) => rankBy(res.map((r, p) => ({ p, v: r.value, r })), lowerBetter ? (a, b) => a - b : (a, b) => b - a);
const rankTotals = totals => rankBy(totals.map((v, p) => ({ p, v })), (a, b) => b - a);

// ---------- game session (decathlon or single event) ----------
const Game = {
  // n = athletes in the competition, humans = players holding the device, cpu = CPU level (0 = no rivals)
  CAREER_N: 8, // a career event is always run against a full field
  n: 1, humans: 1, cpu: 0, lvlPref: 3, rivalsPref: true, careerMode: false, cpuSkill: [], deca: false, idx: 0, order: [], totals: [0], medals: [[0, 0, 0]], table: [],
  isCpu(p) { return !!this.cpu && p >= this.humans; },
  begin(n, deca, order) {
    // the level sets the ceiling of the whole field, rivals or not; in career it is the tier reached so far
    const lvl = this.careerMode ? Career.data.lvl : this.lvlPref;
    Lv.i = lvl;
    // l'ultimo campionato in cui si e' gareggiato: la schermata dei record si apre li' (vedi livelloDeiRecord)
    if (!this.special) { try { localStorage.setItem('olimpiadi_lvl_giocato', lvl); } catch (e) { /* storage unavailable */ } }
    this.humans = n; this.cpu = (this.careerMode || this.rivalsPref) ? lvl : 0; this.n = this.cpu ? this.CAREER_N : n;
    // roster: humans first, then the CPU athletes with skills spread over the level's range
    PCOL.length = 0;
    for (let i = 0; i < n; i++) {
      const pi = this.careerMode ? Career.slot : i;
      PCOL.push(Profiles.colOf(pi)); // the player's own name, flag, handedness and colours
    }
    this.cpuSkill = [];
    if (this.cpu) {
      const k = this.n - n, rivals = shuffle(CPU_ROSTER.slice()), sk = [];
      // the rivals are spread over the whole field of this tier, from the weakest entrant to the favourite
      for (let i = 0; i < k; i++) sk.push(clamp(lerp(0.08, 1, k > 1 ? i / (k - 1) : 0.6) + rnd(-0.04, 0.04), 0, 1));
      shuffle(sk);
      // uomini e donne insieme: il sesso di ogni avversario viene dal nome (e' solo da vedere)
      for (let i = 0; i < k; i++) { PCOL.push(Object.assign({ sex: sessoDalNome(rivals[i].name) }, rivals[i])); this.cpuSkill[n + i] = sk[i]; }
    } else if (n === 1) PCOL.push(Object.assign({}, HUMAN_COLS[1])); // menus draw two athletes
    this.deca = deca; this.order = order; this.idx = 0;
    this.reset();
    G.setScene(new IntroScene(order[0]));
  },
  reset() {
    this.totals = Array(this.n).fill(0);
    this.medals = Array.from({ length: this.n }, () => [0, 0, 0]);
    this.table = [];
  },
  startDeca(n, order) { this.careerMode = false; this.special = false; this.begin(n, true, order || Deca.load()); },
  startSingle(n, i) { this.careerMode = false; this.special = false; this.begin(n, false, [i]); },
  // la carriera del circuito in uso: le Olimpiadi, o il torneo medievale (che e' anche "special")
  startCareer(i) { this.careerMode = true; this.special = !!Career.C.medievo; this.begin(1, false, [i]); },
  // le Specials: gare singole del torneo, fuori dalla carriera, dai record del mondo e dalla classifica
  startSpecial(n, i) { this.careerMode = false; this.special = true; this.begin(n, false, [SPECIAL_BASE + i]); },
  // dove si torna da una gara: il menu delle gare, o quello del torneo se si veniva da li'
  menu() { return this.careerMode ? new CareerScene() : this.special ? new SpecialsScene(this.humans) : new MenuScene(this.humans); },
  eventDone(evIdx, res) {
    const meta = evMeta(evIdx);
    // Anche le gare di carriera fanno record personale (al livello del campionato che si corre). Prima
    // ne restavano fuori ("un atleta in crescita"), ma chi gioca solo in carriera non vedeva mai un record.
    // i record del torneo stanno per conto loro, separati da quelli delle Olimpiadi
    const R = recordsOf(meta);
    // una gara di carriera fatta con un oggetto leggendario: il record porta l'asterisco (anche in classifica)
    const leg = p => !!(this.careerMode && p === 0 && Career.legPer && Career.legPer(meta.id));
    const rec = res.map((r, p) => this.isCpu(p) ? false : R.submit(meta.id, r.value, meta.lowerBetter, PCOL[p].name, PCOL[p].short, undefined, leg(p)));
    res.forEach((r, p) => { this.totals[p] += r.pts; });
    const order = rankResults(res, meta.lowerBetter);
    if (this.n > 1) order.forEach(o => { if (o.place && o.place <= 3) this.medals[o.p][o.place - 1]++; });
    this.table.push({ ev: evIdx, res, order });
    const pay = this.careerMode ? Career.eventDone(meta, res, order) : null;
    // Nella classifica mondiale vanno solo le gare di carriera, di qualunque campionato (la classifica
    // dice quale: U, T, W): una gara singola si puo' ripetere finche' non esce il colpo fortunato, una
    // carriera no, e cosi' c'e' un motivo per cominciarla. Conta il primato di quella carriera
    // (pay.better), non il record personale, che puo' averlo fatto una gara singola. Si mette in coda:
    // la domanda si fa dal titolo, con calma.
    if (this.careerMode && !this.special && pay && pay.better) Share.offer(meta.id, res[0].value, Career.slot, leg(0));
    G.setScene(new ResultScene(evIdx, res, rec, order, pay));
  },
  next() {
    this.idx++;
    if (this.idx < this.order.length) G.setScene(new IntroScene(this.order[this.idx]));
    else G.setScene(new FinalScene());
  },
  retry() { this.reset(); G.setScene(new IntroScene(this.order[this.idx])); },
};
try {
  const v = localStorage.getItem('olimpiadi_lvl'); if (v != null) Game.lvlPref = clamp(+v || 3, 1, 3);
  const r = localStorage.getItem('olimpiadi_rivals'); if (r != null) Game.rivalsPref = r === '1';
} catch (e) { /* storage unavailable */ }
Lv.i = Game.lvlPref;

// Il campionato con cui si apre la schermata dei record. I record personali sono divisi per campionato,
// e la schermata ne mostra uno alla volta: aprendola appena avviato il gioco mostrava quello delle gare
// singole (di solito il Mondiale), e chi gioca la carriera all'Universitario vedeva una tabella vuota
// finche' non faceva una gara. Si apre invece sull'ultimo campionato in cui si e' gareggiato, anche in
// un'altra sessione; se li' non c'e' niente (o non lo si sa ancora), su quello che ha piu' record.
function livelloDeiRecord() {
  const quanti = [0, 0, 0, 0];
  for (const k in Records.data) {
    const l = LEVELS.findIndex(L => L && k.endsWith('@' + L.id));
    if (l > 0) quanti[l]++;
  }
  let ultimo = 0;
  try { ultimo = +localStorage.getItem('olimpiadi_lvl_giocato') || 0; } catch (e) { /* storage unavailable */ }
  if (ultimo >= 1 && ultimo <= 3 && quanti[ultimo] > 0) return ultimo;
  let m = clamp(Lv.i, 1, 3);
  for (let l = 1; l <= 3; l++) if (quanti[l] > quanti[m]) m = l;
  return m;
}

function savePrefs() {
  try {
    localStorage.setItem('olimpiadi_lvl', Game.lvlPref);
    localStorage.setItem('olimpiadi_rivals', Game.rivalsPref ? '1' : '0');
  } catch (e) { /* storage unavailable */ }
}

// ---------- common helpers ----------
class Screen {
  constructor() { this.btns = []; this.t = 0; }
  enter() { this.layout(); }
  resize() { this.layout(); }
  layout() { }
  update(dt) { this.t += dt; }
  pointerDown(x, y) {
    const b = hitBtn(this.btns, x, y);
    if (b && this.t > 0.3) { Snd.click(); b.fn(); }
  }
  key(p, b, down) { if (down && this.t > 0.4 && this.onKey) this.onKey(p, b); }
  back() { return false; }
  drawButtons(ctx) { for (const b of this.btns) drawBtn(ctx, b); }
}

// ---------- un elenco più lungo dello schermo ----------
// Il gioco ha 540 pixel di altezza e basta: diciotto specialità in colonna non ci stanno, e qui non
// c'è nessuna barra di sistema da trascinare perché tutto è disegnato su una tela.
//
// Si scorre in tre modi, e sono tre perché i modi di giocare sono tre: il dito trascina (tablet),
// la rotella gira (Windows e tastiera USB), e due pulsanti ▲▼ fanno un salto di pagina. I pulsanti
// non sono un ripiego: dal telecomando arrivano solo i tocchi, mai i trascinamenti, quindi da lì
// sono l'unico modo possibile — e siccome sono pulsanti normali, il pad li disegna da solo.
class Scroller {
  constructor() { this.off = 0; this.want = 0; this.max = 0; this.box = { x: 0, y: 0, w: 0, h: 0 }; this.drag = null; }
  /** box = il riquadro visibile, total = quanto è alto tutto quello che ci deve passare dentro */
  set(box, total) {
    this.box = box;
    this.max = Math.max(0, total - box.h);
    this.want = clamp(this.want, 0, this.max);
    this.off = clamp(this.off, 0, this.max);
  }
  get need() { return this.max > 0.5; }
  by(dy) { this.want = clamp(this.want + dy, 0, this.max); }
  page(dir) { this.by(dir * this.box.h * 0.75); }
  // il salto di pagina non è secco: la posizione insegue quella voluta, così si vede da dove a dove
  // si è andati invece di ritrovarsi altrove senza sapere come
  update(dt) {
    if (this.drag) return;                       // mentre si trascina si sta al dito, senza inseguire
    this.off += (this.want - this.off) * (1 - Math.exp(-14 * dt));
    if (Math.abs(this.want - this.off) < 0.4) this.off = this.want;
  }
  inside(x, y) { const b = this.box; return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
  down(x, y, id) {
    if (!this.need || !this.inside(x, y)) return false;
    this.drag = { id, y, off: this.off };
    return true;
  }
  move(x, y, id) {
    if (!this.drag || this.drag.id !== id) return;
    this.off = this.want = clamp(this.drag.off + (this.drag.y - y), 0, this.max);
  }
  up(id) { if (this.drag && this.drag.id === id) this.drag = null; }
  /** Tutto quello che si disegna dentro il riquadro va ritagliato, o esce dai bordi del pannello. */
  clip(ctx) {
    const b = this.box;
    ctx.save();
    ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    return b.y - this.off;                       // la y da cui far partire la prima riga
  }
  /** Vero se quella riga si vede: le altre non vale la pena disegnarle. */
  shows(y, h) { const b = this.box; return y > b.y - h && y < b.y + b.h + h; }
  // Una riga tagliata a metà dal bordo sembra un difetto; sfumata sembra quello che è, cioè un
  // elenco che continua. E si vede a colpo d'occhio da che parte c'è ancora roba.
  fade(ctx, h) {
    if (!this.need) return;
    const b = this.box;
    h = h || 20;
    const band = (y, dy) => {
      const g = ctx.createLinearGradient(0, y, 0, y + dy);
      g.addColorStop(0, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x, Math.min(y, y + dy), b.w, h);
    };
    if (this.off > 1) band(b.y, h);
    if (this.off < this.max - 1) band(b.y + b.h, -h);
  }
  /** La barretta di lato: dice quanto elenco c'è e a che punto si è. */
  drawBar(ctx, x, w) {
    if (!this.need) return;
    const b = this.box;
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    rrect(ctx, x, b.y, w, b.h, w / 2); ctx.fill();
    const h = Math.max(28, b.h * b.h / (b.h + this.max));
    ctx.fillStyle = 'rgba(255,214,0,0.7)';
    rrect(ctx, x, b.y + (b.h - h) * (this.off / this.max), w, h, w / 2); ctx.fill();
  }
}

function menuBg(ctx, t) {
  const w = G.W, h = G.H, ppm = h / 7;
  Bg.stadium(ctx, w, h, t * 6, ppm, w * 0.5);
  for (let i = 0; i < 2; i++) {
    const x = ((t * 110 + i * 520) % (w + 240)) - 120;
    drawAthlete(ctx, x, h * 0.9 - 0.88 * ppm, ppm, Pose.run(t * 13 + i * 1.7, 1), Profiles.colOf(i));
  }
  ctx.fillStyle = 'rgba(8,12,40,0.62)';
  ctx.fillRect(0, 0, w, h);
}
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rrect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
}
function recText(id) {
  const meta = EVENTS.find(e => e.id === id) || SPECIALS.find(e => e.id === id), r = recordsOf(meta).get(id);
  if (!r) return '—';
  return (meta ? meta.fmt(r.v) : r.v + ' pt') + '  (' + nomeCorto(r.who) + ')';
}

const MEDAL_COL = ['#ffd54f', '#cfd8dc', '#d7a26b'];
function medalDisc(ctx, x, y, r, place) {
  if (place && place <= 3) {
    ctx.fillStyle = shade(MEDAL_COL[place - 1], 0.7); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = MEDAL_COL[place - 1]; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill();
    txt(ctx, place + '', x, y + 1, r * 1.1, '#5d4037', 'center', { outline: false });
  } else txt(ctx, place ? placeText(place) : '—', x, y + 1, r * 1.1, '#fff', 'center', { italic: false });
}
// A medal hanging from a ribbon that runs up to topY: the disc carries the place, 1 to 3.
function drawMedal(ctx, x, y, r, place, topY) {
  const col = MEDAL_COL[clamp(place, 1, 3) - 1];
  ctx.save();
  ctx.lineCap = 'round';
  // two bands of ribbon, splayed at the top and meeting behind the disc
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = r * 0.62;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, topY + 2); ctx.lineTo(x - r * 0.12, y - r * 0.4);
  ctx.moveTo(x + r * 0.9, topY + 2); ctx.lineTo(x + r * 0.12, y - r * 0.4);
  ctx.stroke();
  ctx.strokeStyle = '#eceff1'; ctx.lineWidth = r * 0.42;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, topY); ctx.lineTo(x - r * 0.12, y - r * 0.5);
  ctx.moveTo(x + r * 0.9, topY); ctx.lineTo(x + r * 0.12, y - r * 0.5);
  ctx.stroke();
  // disc: dark rim, lit face, place stamped on it
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.arc(x + 1, y + 2, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(col, 0.66);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, 1, x, y, r * 0.84);
  g.addColorStop(0, shade(col, 1.4)); g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0, Math.PI * 2); ctx.fill();
  txt(ctx, place + '', x, y + 1, r * 1.2, shade(col, 0.45), 'center', { outline: false });
  ctx.restore();
}

// one standings row: place, athlete, value (or the athlete's medal counts), points
function standRow(ctx, x, y, w, h, place, p, value, right, note, medals) {
  const human = !Game.isCpu(p), fs = Math.min(16, h * 0.55);
  if (human && Game.n > 1) { ctx.fillStyle = 'rgba(255,255,255,0.14)'; rrect(ctx, x, y - h / 2 + 1, w, h - 2, 6); ctx.fill(); }
  medalDisc(ctx, x + 16, y, h * 0.36, place);
  drawFlag(ctx, PCOL[p].short, x + 30, y - h * 0.22, h * 0.66, h * 0.44);
  ctx.fillStyle = PCOL[p].shirt; ctx.fillRect(x + 34 + h * 0.66, y - h * 0.25, 5, h * 0.5);
  // il nome si ferma prima della misura (e della scritta RECORD): se non ci sta si rimpicciolisce,
  // invece di finirci sotto come succedeva nelle colonne strette (risultati con il riquadro carriera)
  const nx = x + 44 + h * 0.66;
  ctx.font = 'bold ' + fs + 'px ' + FONT;
  let lim = medals ? x + w - 150 - h * 0.2 - 8 : x + w - 96 - ctx.measureText(T(value)).width - 12;
  // la scritta RECORD sta a meta' riga, ma mai sopra la misura (che puo' essere lunga: i mostri del
  // mangiafuoco); il nome si ferma prima di lei
  let nxN = 0;
  if (note) {
    ctx.font = 'bold ' + fs * 0.8 + 'px ' + FONT;
    const nw = ctx.measureText(T(note)).width;
    nxN = Math.min(x + w * 0.55, lim - nw / 2);
    lim = Math.min(lim, nxN - nw / 2 - 8);
    txt(ctx, note, nxN, y + 1, fs * 0.8, '#ffd600');
  }
  txtFit(ctx, PCOL[p].name + '  ' + PCOL[p].short, nx, y + 1, fs, human ? PCOL[p].ui : '#fff', 'left', Math.max(40, lim - nx), { italic: human });
  if (medals) {
    for (let i = 0; i < 3; i++) {
      const mx = x + w - 150 + i * 30;
      ctx.fillStyle = MEDAL_COL[i]; ctx.beginPath(); ctx.arc(mx, y, h * 0.2, 0, Math.PI * 2); ctx.fill();
      txt(ctx, medals[i] + '', mx + h * 0.24 + 3, y + 1, fs * 0.8, '#fff', 'left', { italic: false });
    }
  } else txt(ctx, value, x + w - 96, y + 1, fs, '#fff', 'right', { italic: false });
  txt(ctx, right, x + w - 8, y + 1, fs * 0.9, '#b2ff59', 'right', { italic: false });
}

// ---------- title ----------
class TitleScene extends Screen {
  // tornando al titolo il campionato in corso e' di nuovo quello scelto per le gare singole (la
  // schermata dei record puo' averne mostrato un altro)
  enter() { Lv.i = Game.lvlPref; super.enter(); }
  layout() {
    const cx = G.W / 2;
    this.btns = [
      { x: cx - 265, y: 296, w: 250, h: 70, label: '1 GIOCATORE', color: '#e53935', size: 26, fn: () => G.setScene(new PlayerSetupScene(1)) },
      { x: cx + 15, y: 296, w: 250, h: 70, label: '2 GIOCATORI', color: '#1e88e5', size: 26, fn: () => G.setScene(new PlayerSetupScene(2)) },
      { x: cx - 265, y: 388, w: 250, h: 58, label: 'CARRIERA', color: '#ef6c00', size: 22,
        fn: () => { Career.usa(CIRCUITO_BASE); G.setScene(new CareerPickScene()); } },
      { x: cx + 15, y: 388, w: 250, h: 58, label: 'RECORD', color: '#7b1fa2', size: 22,
        // la stellina dice che il file dei record è cambiato da quando il giocatore l'ha guardato
        star: World.isFresh(), sub: World.isFresh() ? 'nuovi record!' : null,
        fn: () => G.setScene(new RecordsScene({ apri: true })) },
      { x: 14, y: 14, w: 64, h: 44, label: '', flag: LANG === 'en' ? 'GBR' : 'ITA', color: '#37474f',
        fn: () => { setLang(LANG === 'en' ? 'it' : 'en'); this.layout(); } },
      { x: G.W - 96, y: 14, w: 82, h: 44, label: !Snd.on ? 'AUDIO OFF' : Music.on ? 'AUDIO ON' : 'MUSICA OFF',
        size: 13, color: '#455a64',
        // tre posizioni: tutto, solo gli effetti, niente
        fn: () => {
          const step = !Snd.on ? '1' : Music.on ? 'fx' : '0';
          Snd.on = step !== '0';
          Music.on = step === '1';
          try { localStorage.setItem('olimpiadi_snd', step); } catch (e) { /* ignore */ }
          Music.refresh();
          this.layout();
        } },
      { x: G.W - 186, y: 14, w: 82, h: 44, label: 'TASTI', size: 15, color: '#00695c', fn: () => G.setScene(new KeysScene()) },
    ];
    // the remote only exists when the app is actually serving the controller page
    if (Remote.url || Remote.srv >= 0) {
      this.btns.push({ x: G.W - 322, y: 14, w: 128, h: 44, label: 'TELECOMANDO', size: 14, color: '#1565c0',
        fn: () => G.setScene(new RemoteScene()) });
    }
    if (Updater.info) {
      const y = 336, bw = 190;
      this.btns = [
        { x: cx - 300, y, w: bw, h: 52, label: 'SCARICA', color: '#43a047', size: 20, fn: () => { Updater.open(); this.layout(); } },
        { x: cx - 95, y, w: bw, h: 52, label: 'PIÙ TARDI', color: '#1e88e5', size: 20, fn: () => { Updater.later(); this.layout(); } },
        { x: cx + 110, y, w: bw, h: 52, label: 'IGNORA', color: '#546e7a', size: 20, fn: () => { Updater.skip(); this.layout(); } },
      ];
    } else if (Share.chiede()) {
      // la stessa maschera dell'aggiornamento: una domanda sola, in mezzo allo schermo, e nient'altro
      const y = 352, bw = 190;
      this.btns = [
        { x: cx - 300, y, w: bw, h: 52, label: 'MANDA', color: '#43a047', size: 20, fn: () => { Share.manda(); this.layout(); } },
        { x: cx - 95, y, w: bw, h: 52, label: 'NON ORA', color: '#1e88e5', size: 20, fn: () => { Share.esitoT = 0; this.rimanda = true; this.layout(); } },
        { x: cx + 110, y, w: bw, h: 52, label: 'MAI', color: '#546e7a', size: 20, fn: () => { Share.no(); this.layout(); } },
      ];
    }
  }
  update(dt) {
    super.update(dt);
    // both of these answer while the title screen is already up
    // il permesso c'è già: i record partono da soli, senza chiedere niente un'altra volta
    if (Share.pronti()) Share.manda();
    if (Share.esitoT > 0 && (Share.esitoT -= dt) <= 0) Share.esito = '';
    const has = !!Updater.info, rem = !!Remote.url, st = World.isFresh();
    const chiede = Share.chiede() && !this.rimanda;
    if (has !== this.hadInfo || rem !== this.hadRemote || st !== this.hadStar || chiede !== this.hadShare) {
      this.hadInfo = has; this.hadRemote = rem; this.hadStar = st; this.hadShare = chiede; this.layout();
    }
  }
  drawUpdate(ctx) {
    const W = G.W, cx = W / 2, u = Updater.info;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, G.H);
    panel(ctx, cx - 320, 150, 640, 246);
    txt(ctx, 'NUOVA VERSIONE DISPONIBILE', cx, 192, 26, '#ffd600');
    txt(ctx, 'hai la v' + GAME_VERSION + '   →   disponibile la v' + (u.versionName || '?'), cx, 232, 20, '#fff');
    if (u.note) txt(ctx, String(u.note).slice(0, 64), cx, 262, 16, '#b3e5fc', 'center', { italic: false });
    // dentro l'app (o dentro l'exe) si scarica e si installa da qui; nel browser si apre la pagina
    const inApp = !!Updater.direct();
    txt(ctx, inApp ? 'La scarico e te la installo adesso?' : 'Vuoi aprire la pagina per scaricarla?',
      cx, 294, 16, '#fff', 'center', { italic: false });
  }
  // La classifica dei giocatori è una pagina pubblica: il nome e la bandiera che si mandano sono
  // quelli che il giocatore si è scelto, ma è giusto che li veda scritti prima di dire di sì.
  drawShare(ctx) {
    const W = G.W, cx = W / 2, c = Share.d.coda, uno = c[0] || {};
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, G.H);
    panel(ctx, cx - 330, 132, 660, 272);
    txt(ctx, c.length > 1 ? 'HAI ' + c.length + ' RECORD DA MANDARE' : 'HAI UN RECORD DA MANDARE', cx, 174, 24, '#ffd600');
    txt(ctx, 'Li metto nella classifica mondiale dei giocatori?', cx, 212, 17, '#fff', 'center', { italic: false });
    txt(ctx, 'parto con: ' + uno.who + (uno.nat ? '  (' + uno.nat + ')' : ''), cx, 246, 19, '#90caf9', 'center', { italic: false });
    txt(ctx, 'Si manda solo questo: nome, bandiera e risultato.', cx, 280, 15, '#b0bec5', 'center', { italic: false });
    txt(ctx, 'La classifica è pubblica, la vedono tutti i giocatori.', cx, 302, 15, '#b0bec5', 'center', { italic: false });
    txt(ctx, 'Dicendo di sì i prossimi partiranno da soli.', cx, 324, 15, '#b0bec5', 'center', { italic: false });
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const cx = G.W / 2, bob = Math.sin(this.t * 2) * 4;
    // il nome come un'insegna al neon: fucsia sopra, azzurro sotto
    txt(ctx, 'NEON', cx, 118 + bob, 96, '#ff4fd8');
    txt(ctx, 'STADIUM', cx, 205 + bob, 66, '#3ff0ff');
    txt(ctx, EVENTS.length + ' SPECIALITÀ  •  DECATHLON  •  1 O 2 GIOCATORI', cx, 262, 18, '#fff', 'center', { italic: false });
    if (Updater.info) this.drawUpdate(ctx);
    else if (Share.chiede() && !this.rimanda) this.drawShare(ctx);
    for (const b of this.btns) {
      drawBtn(ctx, b);
      if (b.flag) drawFlag(ctx, b.flag, b.x + b.w / 2 - 21, b.y + 9, 42, 26);
      if (b.star) drawStar(ctx, b.x + b.w - 17, b.y + 15, 12);
    }
    // The address has to be readable without touching anything: on a television the only pointer may be
    // the tablet we are trying to set up, so it cannot live behind a button.
    if (Share.esito) txt(ctx, Share.esito, cx, G.H - 68, 16, '#ffd600', 'center', { italic: false });
    if (Remote.url) txt(ctx, 'TELECOMANDO  ' + Remote.url, cx, G.H - 46, 17, '#7CFC00', 'center', { italic: false });
    txt(ctx, keyHint(), cx, G.H - 22, 13, 'rgba(255,255,255,0.6)', 'center', { italic: false, outline: false });
    txt(ctx, 'v' + GAME_VERSION, G.W - 12, G.H - 22, 13, 'rgba(255,255,255,0.6)', 'right', { italic: false, outline: false });
  }
}

// ---------- mode / event selection ----------
class MenuScene extends Screen {
  constructor(n) { super(); this.n = this.humans = n; }
  layout() {
    const w = G.W, cx = w / 2;
    this.btns = [{ x: cx - 210, y: 78, w: 420, h: 66, label: 'DECATHLON', sub: '10 gare a tua scelta, una dopo l\'altra', color: '#ff8f00', size: 30,
      fn: () => G.setScene(new DecaPickScene(this.n)) }];
    // file da sei: con tre file i pulsanti sono alti, con quattro (piu' di 18 gare) si abbassano
    // quanto basta a lasciare sotto i due pulsanti delle impostazioni
    const cols = 6, gx = 9, bw = Math.min(150, (w - 56) / cols - gx), fitta = EVENTS.length > 18, bh = fitta ? 50 : 58;
    const x0 = cx - (cols * bw + (cols - 1) * gx) / 2;
    EVENTS.forEach((e, i) => {
      const r = Math.floor(i / cols), c = i % cols, rec = Records.get(e.id);
      this.btns.push({ x: x0 + c * (bw + gx), y: (fitta ? 202 : 208) + r * (bh + (fitta ? 8 : 10)), w: bw, h: bh, label: SHORT[e.id], size: 15, color: '#1e88e5',
        sub: rec ? 'REC ' + e.fmt(rec.v) : (i + 1) + '', fn: () => Game.startSingle(this.n, i) });
    });
    // bottom row, narrowed on a small screen so the two settings never cover the back button
    const bb = Math.min(160, w * 0.19), gap2 = 12;
    const mw = Math.min(300, (w - 60 - bb - gap2) / 2), mx = w - 20 - (2 * mw + gap2);
    this.btns.push({ x: 20, y: G.H - 68, w: bb, h: 50, label: '‹ INDIETRO', size: 18, color: '#546e7a', fn: () => G.setScene(new TitleScene()) });
    this.btns.push({ x: 20, y: 20, w: 200, h: 44, label: 'NOMI E BANDIERE', sub: 'e i colori dell\'atleta', size: 15, color: '#5e35b1', fn: () => G.setScene(new PlayerSetupScene(this.n)) });
    const L = LEVELS[Game.lvlPref], riv = Game.rivalsPref;
    this.btns.push({ x: mx, y: G.H - 72, w: mw, h: 56, label: L.short, sub: L.desc, size: 21, color: L.col,
      fn: () => { Game.lvlPref = Game.lvlPref % 3 + 1; Lv.i = Game.lvlPref; savePrefs(); this.layout(); } });
    this.btns.push({ x: mx + mw + gap2, y: G.H - 72, w: mw, h: 56, label: riv ? 'AVVERSARI: ' + (8 - this.n) + ' CPU' : 'AVVERSARI: NESSUNO',
      sub: riv ? 'gare a 8 atleti con medaglie' : 'solo contro il cronometro', size: 21, color: riv ? '#8e24aa' : '#546e7a',
      fn: () => { Game.rivalsPref = !Game.rivalsPref; savePrefs(); this.layout(); } });
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    txt(ctx, this.n === 1 ? '1 GIOCATORE' : '2 GIOCATORI', G.W / 2, 32, 24, this.n === 1 ? '#ff6e66' : '#6ab7ff');
    const tot = this.n * 210, sx0 = G.W / 2 - tot / 2;
    for (let i = 0; i < this.n; i++) {
      const pr = Profiles.data[i], ex = sx0 + i * 210 + 10;
      drawFlag(ctx, pr.code, ex, 52, 26, 17);
      txt(ctx, pr.name + ' (' + pr.code + ')', ex + 32, 61, 15, HUMAN_COLS[i].ui, 'left', { italic: false });
    }
    txt(ctx, 'oppure scegli una gara singola:', G.W / 2, 182, 17, '#fff', 'center', { italic: false });
    this.drawButtons(ctx);
  }
  back() { G.setScene(new TitleScene()); return true; }
}

// ---------- event intro / instructions ----------
class IntroScene extends Screen {
  constructor(evIdx) {
    super(); this.evIdx = evIdx; this.meta = evMeta(evIdx); this.music = 'race';
    // le istruzioni a immagini: dietro gira la gara vera, da cui si prendono le fotografie (guida.js)
    this.guida = new Guida(this.meta);
  }
  start() { G.setScene(new EventScene(this.evIdx)); }
  // Si parte solo dal pulsante (o da un tasto): prima bastava toccare lo schermo dovunque, e le
  // istruzioni non le guardava nessuno.
  layout() {
    const cx = G.W / 2;
    this.btns = [{ x: cx - 170, y: G.H - 92, w: 340, h: 58, label: 'TUTTO CHIARO!', color: '#43a047', size: 28, fn: () => this.start() }];
  }
  update(dt) { super.update(dt); this.guida.avanza(7); }
  onKey() { this.start(); }
  back() { G.setScene(Game.menu()); return true; }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, m = this.meta;
    panel(ctx, 40, 14, W - 80, G.H - 28);
    txt(ctx, 'ISTRUZIONI PER LA GARA!', cx, 44, 28, '#ffd600');
    txtFit(ctx, m.name, cx, 78, 22, '#fff', 'center', W - 140);
    if (this.guida.passi) guidaDisegna(ctx, this.guida, 56, 98, W - 112, G.H - 98 - 152, this.t);
    else {
      // una gara senza istruzioni a immagini: restano le righe scritte e i nomi dei tasti
      const help = typeof m.help === 'function' ? m.help() : m.help;
      help.forEach((l, i) => txt(ctx, l, cx, 150 + i * 30, 20, '#fff', 'center', { italic: false }));
      const labels = metaLabels(m, 0), nb = labels.length, passo = nb > 2 ? 205 : 220;
      for (let b = 0; b < nb; b++) {
        const x = cx + (b - (nb - 1) / 2) * passo, y = 290;
        ctx.fillStyle = TASTO_COL[b];
        ctx.beginPath(); ctx.arc(x - 60, y, 26, 0, Math.PI * 2); ctx.fill();
        txt(ctx, 'ABC'[b], x - 60, y + 1, 26, '#fff');
        txt(ctx, labels[b], x - 24, y, 20, '#fff', 'left');
      }
    }
    // sotto, in piccolo, quello che non e' un'istruzione: i record, e a chi toccano i tasti
    const nb = metaLabels(m, 0).length;
    let y = G.H - 146;
    if (nb > 2 && window.OLIMPIADI_PLATFORM) { txt(ctx, 'Tastiera: il tasto C è ' + T(Keys.name(keyIdx(0, 2))) + ' per G1, ' + T(Keys.name(keyIdx(1, 2))) + ' per G2', cx, y, 13, '#b3e5fc', 'center', { italic: false }); y += 20; }
    if (Game.humans > 1) { txt(ctx, 'G1: pulsanti a SINISTRA   •   G2: pulsanti a DESTRA', cx, y, 14, '#b3e5fc', 'center', { italic: false }); y += 20; }
    // i record ai due lati del pulsante, su due righe perche' non lo tocchino
    const lato = (x, a, capo, val, col) => { txt(ctx, capo, x, G.H - 74, 12, col, a, { italic: false }); txtFit(ctx, val, x, G.H - 54, 15, col, a, cx - 170 - 72, { italic: false }); };
    lato(60, 'left', 'IL TUO RECORD', recText(m.id), '#ffcc80');
    if (!m.medievo) lato(W - 60, 'right', 'RECORD DEL MONDO', wrText(m.id), '#a5d6a7');   // il torneo non ha record del mondo
    this.drawButtons(ctx);
  }
}

// ---------- il tabellone di gara ----------
// In una gara a otto si vede solo la corsia del giocatore: gli altri sette gareggiano da qualche
// parte fuori dallo schermo, e l'unica notizia che ne arrivava era una scritta in mezzo allo
// schermo che diceva di aspettare. Adesso la classifica si guarda mentre si compone, e i sorpassi
// si vedono passare: la riga scivola al posto nuovo invece di comparirci.
//
// L'ordine lo decide `liveScore`, che ogni gara sa già calcolare — è lo stesso numero con cui il
// gioco scrive la posizione nell'HUD. Qui si aggiunge solo il come mostrarlo.
class Tabellone {
  constructor(ev) {
    this.ev = ev;
    this.y = Array.from({ length: ev.n }, (_, p) => p);    // dov'è la riga adesso, con la virgola
    this.mira = this.y.slice();                            // e dove sta andando
    this.lampo = new Array(ev.n).fill(0);                  // chi ha appena guadagnato posizioni
    this.vis = 0;                                          // quanto è in vista: entra ed esce sfumando
  }
  /** L'ordine di adesso: davanti chi ha la misura migliore, in fondo chi non ha ancora niente. */
  ordine() {
    const ev = this.ev;
    const v = Array.from({ length: ev.n }, (_, p) => ev.liveScore(p));
    return Array.from({ length: ev.n }, (_, p) => p).sort((a, b) => {
      if (v[a] == null && v[b] == null) return a - b;
      if (v[a] == null) return 1;
      if (v[b] == null) return -1;
      if (v[b] !== v[a]) return v[b] - v[a];
      return a - b;                                        // a pari merito, l'ordine di corsia
    });
  }
  update(dt, pieno) {
    const ord = this.ordine();
    ord.forEach((p, i) => {
      if (i < this.mira[p] - 0.5) this.lampo[p] = 0.7;     // ha scavalcato qualcuno: si accende
      this.mira[p] = i;
    });
    const k = 1 - Math.exp(-9 * dt);
    for (let p = 0; p < this.ev.n; p++) {
      this.y[p] += (this.mira[p] - this.y[p]) * k;
      if (Math.abs(this.mira[p] - this.y[p]) < 0.01) this.y[p] = this.mira[p];
      if (this.lampo[p] > 0) this.lampo[p] -= dt;
    }
    // Entra quando il giocatore non ha niente da fare — prima di partire, fra un tentativo e
    // l'altro, o quando ha finito — e si toglie appena ricomincia a correre: da lì in poi quello
    // spazio serve al cronometro e all'indicatore di alzo.
    // Esce più in fretta di quanto entra: sgombrare il campo è urgente, tornare no.
    this.vis += ((pieno ? 1 : 0) - this.vis) * (1 - Math.exp((pieno ? -5 : -11) * dt));
  }
  box() {
    const W = G.W, w = clamp(W * 0.23, 152, 214);
    const rh = 22;
    return { x: W - w - 8, y: HUD_H + 8, w, rh, h: 26 + this.ev.n * rh + 6 };
  }
  draw(ctx, humans) {
    const b = this.box(), ev = this.ev, a = this.vis;
    ctx.save();
    ctx.translate((1 - a) * (b.w + 12), 0);                // entra scivolando da destra
    ctx.globalAlpha = a;
    // fondo quasi pieno: dietro al tabellone ci passa il cronometro della gara, e due numeri che
    // traspaiono da sotto una classifica sembrano un difetto
    ctx.fillStyle = 'rgba(4,8,18,0.92)';
    rrect(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
    txt(ctx, 'CLASSIFICA', b.x + b.w / 2, b.y + 14, 13, '#ffd600', 'center', { italic: false });

    // si disegna dalla riga più bassa alla più alta: chi sta salendo passa sopra a chi scende
    const righe = Array.from({ length: ev.n }, (_, p) => p).sort((q, p) => this.y[p] - this.y[q]);
    for (const p of righe) {
      const y = b.y + 26 + this.y[p] * b.rh, cy = y + b.rh / 2;
      const umano = p < humans, fatto = !!ev.res[p];
      const posto = Math.round(this.mira[p]) + 1;
      if (this.lampo[p] > 0) {                             // la fiammata del sorpasso
        ctx.globalAlpha = a * this.lampo[p] * 0.5;
        ctx.fillStyle = '#ffd600';
        rrect(ctx, b.x + 3, y + 1, b.w - 6, b.rh - 2, 5); ctx.fill();
        ctx.globalAlpha = a;
      } else if (umano) {
        ctx.fillStyle = PCOL[p].ui;
        ctx.globalAlpha = a * 0.3;
        rrect(ctx, b.x + 3, y + 1, b.w - 6, b.rh - 2, 5); ctx.fill();
        ctx.globalAlpha = a;
      }
      const col = posto <= 3 ? MEDAL_COL[posto - 1] : 'rgba(255,255,255,0.75)';
      txt(ctx, String(posto), b.x + 18, cy, 14, col, 'right', { italic: false, outline: false });
      drawFlag(ctx, PCOL[p].short, b.x + 24, cy - 7, 21, 14);
      const nomeW = b.w - 52 - 60;
      const nm = nomeIn(ctx, T(PCOL[p].name), nomeW, 13, 10);
      txt(ctx, nm.t, b.x + 50, cy, nm.s, fatto ? '#fff' : 'rgba(255,255,255,0.65)', 'left',
        { italic: false, outline: false, crudo: true });
      const mis = fatto ? ev.res[p].disp : ev.liveText(p);
      txtFit(ctx, mis || '\u00b7 \u00b7 \u00b7', b.x + b.w - 8, cy, 13,
        fatto ? '#ffd600' : 'rgba(255,255,255,0.55)', 'right', 58, { italic: false, outline: false });
    }
    ctx.restore();
  }
}

// ---------- gameplay ----------
const TASTO_COL = ['#e53935', '#546e7a', '#ef6c00'];     // A, B e il C delle gare che ne hanno tre
class EventScene {
  constructor(evIdx) {
    this.evIdx = evIdx; this.meta = evMeta(evIdx); this.n = Game.n; this.humans = Game.humans;
    this.ev = new this.meta.cls(this.n, this.meta);
    this.cpus = [];
    if (Game.cpu) for (let p = this.humans; p < this.n; p++) this.cpus.push(new Cpu(this.meta.id, clamp(Game.cpuSkill[p] + rnd(-0.06, 0.06), 0, 1), p));
    // il tabellone serve solo quando c'è qualcuno che non si vede in campo
    this.tab = this.n > this.humans ? new Tabellone(this.ev) : null;
    this.held = [[0, 0, 0], [0, 0, 0]]; this.ptr = {}; this.paused = false; this.btns = []; this.sent = false;
    // il breaking porta la sua musica, a tempo con le note: quella della gara la coprirebbe
    this.music = this.meta.music || 'race';
  }
  enter() { Snd.startTune(); Conta.manda('gara'); }
  // Right-handers press action 1 (A) with the right hand, action 2 (B) with the left; lefties swap.
  // With two players each holds one half: for G1 the dominant hand is the inner button, for G2 the outer one.
  // Tutta la striscia di schermo di un pulsante lo preme, non solo il cerchio. In due giocatori il confine
  // fra i due tasti di uno stesso giocatore sta a meta' strada fra i due cerchi: prima stava a un quarto
  // dello schermo, cioe' sopra il cerchio interno, e toccandone il bordo si premeva l'altro tasto.
  // Le gare con un terzo tasto (C: la caccia al maiale) lo dicono con una terza etichetta. Da soli il C sta
  // di fianco a B, dalla parte della mano che non batte A; in due sta in mezzo fra i due tasti di ognuno.
  zones() {
    const W = G.W, tre = this.ev.labels(0).length > 2;
    const L = p => (PCOL[p] && PCOL[p].lefty ? [0, 1] : [1, 0]); // [button on the left, button on the right]
    const a = L(0);
    if (this.humans === 1) {
      if (tre) return a[0] === 1
        ? [{ p: 0, b: 1, x0: 0, x1: W * 0.2, cx: W * 0.1 }, { p: 0, b: 2, x0: W * 0.2, x1: W / 2, cx: W * 0.3 }, { p: 0, b: 0, x0: W / 2, x1: W, cx: W * 0.9 }]
        : [{ p: 0, b: 0, x0: 0, x1: W / 2, cx: W * 0.1 }, { p: 0, b: 2, x0: W / 2, x1: W * 0.8, cx: W * 0.7 }, { p: 0, b: 1, x0: W * 0.8, x1: W, cx: W * 0.9 }];
      return [{ p: 0, b: a[0], x0: 0, x1: W / 2, cx: W * 0.1 }, { p: 0, b: a[1], x0: W / 2, x1: W, cx: W * 0.9 }];
    }
    const b = L(1);
    if (tre) return [
      { p: 0, b: a[0], x0: 0, x1: W * 0.14, cx: W * 0.07 }, { p: 0, b: 2, x0: W * 0.14, x1: W * 0.285, cx: W * 0.21 }, { p: 0, b: a[1], x0: W * 0.285, x1: W / 2, cx: W * 0.36 },
      { p: 1, b: b[0], x0: W / 2, x1: W * 0.715, cx: W * 0.64 }, { p: 1, b: 2, x0: W * 0.715, x1: W * 0.86, cx: W * 0.79 }, { p: 1, b: b[1], x0: W * 0.86, x1: W, cx: W * 0.93 },
    ];
    return [
      { p: 0, b: a[0], x0: 0, x1: W * 0.185, cx: W * 0.09 }, { p: 0, b: a[1], x0: W * 0.185, x1: W / 2, cx: W * 0.28 },
      { p: 1, b: b[0], x0: W / 2, x1: W * 0.815, cx: W * 0.72 }, { p: 1, b: b[1], x0: W * 0.815, x1: W, cx: W * 0.91 },
    ];
  }
  // Ogni tasto o dito che scende e' un colpo, anche se un altro sta ancora tenendo giu' lo stesso
  // pulsante: prima il secondo si perdeva, e battere A alternando due tasti (M e Spazio) o due dita
  // faceva arrivare alla gara meno colpi che con uno solo. Il rilascio resta uno, quando sono risaliti
  // tutti: chi tiene premuto per caricare (l'alzo, la rincorsa del lungo) non lancia per un tocco in piu'.
  down(p, b) { this.held[p][b]++; if (!this.paused) this.ev.press(p, b); }
  up(p, b) { if (this.held[p][b] > 0 && --this.held[p][b] === 0 && !this.paused) this.ev.release(p, b); }
  pointerDown(x, y, id) {
    if (this.paused) { const b = hitBtn(this.btns, x, y); if (b) { Snd.click(); b.fn(); } return; }
    if (x > G.W - 70 && y < HUD_H + 10) { this.pause(); return; }
    if (y < HUD_H) return;
    const z = this.zones().find(q => x >= q.x0 && x < q.x1);
    if (!z) return;
    this.ptr[id] = z;
    this.down(z.p, z.b);
  }
  pointerUp(id) {
    const z = this.ptr[id];
    if (!z) return;
    delete this.ptr[id];
    this.up(z.p, z.b);
  }
  key(p, b, d) {
    if (this.paused) { if (d) this.resume(); return; }
    if (p >= this.humans) return;
    if (d) this.down(p, b); else this.up(p, b);
  }
  pause() {
    if (this.paused || this.sent) return;
    for (let p = 0; p < this.humans; p++) for (let b = 0; b < 3; b++) if (this.held[p][b] > 0) { this.held[p][b] = 0; this.ev.release(p, b); }
    this.ptr = {};
    this.paused = true;
    const cx = G.W / 2;
    // Chi e' ancora in gara puo' abbandonarla tenendosi quello che ha fatto (EventBase.ritira): sotto
    // al pulsante c'e' scritto cosa gli resta. In due ognuno ha il suo, col nome.
    const vivi = [];
    for (let p = 0; p < this.humans; p++) if (!this.ev.res[p]) vivi.push(p);
    const cosa = p => { const v = this.ev.parziale(p); return v == null ? 'senza risultato' : 'vale ' + this.meta.fmt(v); };
    const h = vivi.length ? 60 : 62, passo = vivi.length ? 72 : 80;
    let y = vivi.length ? 160 : 170;
    const riga = (label, color, fn) => { this.btns.push({ x: cx - 150, y, w: 300, h, label, color, size: 22, fn }); y += passo; };
    this.btns = [];
    riga('RIPRENDI', '#43a047', () => this.resume());
    if (vivi.length) {
      const w = (300 - 10 * (vivi.length - 1)) / vivi.length;
      vivi.forEach((p, i) => this.btns.push({ x: cx - 150 + i * (w + 10), y, w, h, color: '#1e88e5', size: 22,
        label: this.humans > 1 ? 'RITIRA ' + PCOL[p].name : 'ABBANDONA LA GARA', sub: cosa(p), fn: () => this.ritira(p) }));
      y += passo;
    }
    riga('RICOMINCIA GARA', '#fb8c00', () => G.setScene(new EventScene(this.evIdx)));
    riga('MENU PRINCIPALE', '#e53935', () => G.setScene(Game.menu()));
    this.btns[0].size = 24;
  }
  // il giocatore p lascia la gara: gli resta la misura fatta fin qui, e la gara va avanti senza di lui
  ritira(p) { this.resume(); this.ev.ritira(p); }
  resume() { this.paused = false; this.btns = []; }
  back() { if (this.paused) this.resume(); else this.pause(); return true; }
  humansDone() { for (let p = 0; p < this.humans; p++) if (!this.ev.res[p]) return false; return true; }
  /** Nessuno dei giocatori sta facendo niente: si può mostrare il tabellone senza dare fastidio. */
  humansFermi() { for (let p = 0; p < this.humans; p++) if (!this.ev.res[p] && !this.ev.fermo(p)) return false; return true; }
  waitingCpus() { return this.cpus.length > 0 && this.humansDone() && !this.ev.res.every(r => r); }
  // Un passo di gara. L'audio e' dei giocatori: tacciono i tasti premuti dalla CPU e, dentro la gara,
  // tutto quello che riguarda i suoi atleti (EventBase.tocca); restano lo sparo e i segnali di tutti.
  // `attesa`: i giocatori hanno finito e gli altri vanno avanti veloce, allora tace tutto.
  step(dt, attesa) {
    const ev = this.ev, m = [];
    for (let p = 0; p <= ev.n; p++) m.push(attesa || (p >= this.humans && p < ev.n));
    Snd.zitto = true;
    for (const c of this.cpus) c.tick(ev, dt);
    ev.muti = m; Snd.zitto = m[ev.n];
    ev.update(dt);
    ev.muti = null; Snd.zitto = false;
  }
  update(dt) {
    if (this.paused) return;
    // the humans are done: fast-forward the CPU athletes still competing, and in silence. Nobody wants
    // to hear twelve times the crowd, the thuds and the steps of a race he is no longer in. What was
    // already playing (the applause for the player's own last attempt) goes on to its end.
    this.step(dt, this.waitingCpus());
    for (let i = 0; i < 11 && this.waitingCpus(); i++) this.step(dt, true);
    // il tabellone si muove col tempo vero, non undici volte più in fretta
    if (this.tab) this.tab.update(dt, this.humansDone() || this.humansFermi());
    if (this.ev.finished && !this.sent) { this.sent = true; Game.eventDone(this.evIdx, this.ev.res); }
  }
  // Il nome della gara sta in mezzo alla barra. In carriera gli mettiamo accanto la misura che
  // qualifica, perche' e' quella che si tiene d'occhio mentre si gioca, e diventa un segno di spunta
  // appena la si supera. Va a destra del nome, nello spazio libero fino al pulsante di pausa: a
  // sinistra non ci starebbe, perche' li' c'e' gia' la riga dei tentativi.
  drawTitle(ctx, W) {
    const y = HUD_H / 2 + 1;
    txt(ctx, this.meta.name, W / 2, y, 18, '#ffd600');
    if (!Game.careerMode || !Career.data) return;
    const std = Career.std(this.meta.id);
    if (std == null) return;
    const fatto = this.stdDone(std);
    ctx.font = 'italic bold 18px ' + FONT;
    const x = W / 2 + ctx.measureText(T(this.meta.name)).width / 2 + 12;
    txtFit(ctx, (fatto ? '✔  ' : 'obiettivo ') + this.meta.fmt(std), x, y, 13,
      fatto ? '#b9f6ca' : '#90caf9', 'left', Math.max(40, W - 70 - x), { italic: false });
  }
  // La misura che qualifica e' gia' stata battuta? Il risultato finale vale sempre; a gara in corso
  // vale solo dove liveScore e' davvero una misura, che e' quello che dice liveText (nelle corse
  // torna vuota, perche' li' liveScore e' la distanza percorsa e non il tempo).
  stdDone(std) {
    const r = this.ev.res[0];
    const v = r ? r.value : (this.ev.liveText(0) ? this.ev.liveScore(0) : null);
    if (v == null) return false;
    return centrato(v, std, this.meta.lowerBetter);
  }
  hudText(p) {
    const r = this.n > 1 ? this.ev.rank(p) : null, h = this.ev.hud(p);
    // la riga della gara si traduce da sola: con la posizione davanti le regole della lingua non la riconoscerebbero
    return (r ? placeText(r) + '/' + this.n + (h ? '   ' : '') : '') + T(h);
  }
  draw(ctx) {
    const W = G.W, nl = this.humans, avail = G.H - HUD_H - CTRL_H, lh = avail / nl;
    for (let p = 0; p < nl; p++) {
      ctx.save();
      ctx.translate(0, HUD_H + p * lh);
      ctx.beginPath(); ctx.rect(0, 0, W, lh); ctx.clip();
      this.ev.drawLane(ctx, p, W, lh);
      if (nl > 1) {
        ctx.fillStyle = PCOL[p].ui; rrect(ctx, 8, lh - 32, 82, 26, 6); ctx.fill();
        drawFlag(ctx, PCOL[p].short, 12, lh - 29, 30, 20);
        txt(ctx, PCOL[p].short, 68, lh - 19, 14, '#fff', 'center', { outline: false });
      }
      ctx.restore();
    }
    if (nl > 1) { ctx.fillStyle = '#fff'; ctx.fillRect(0, HUD_H + lh - 1, W, 3); }
    if (this.tab && !this.paused && this.tab.vis > 0.01) {
      this.tab.draw(ctx, this.humans);
      // la scritta in mezzo allo schermo non serve più: basta una riga sotto al tabellone
      if (this.waitingCpus()) {
        const b = this.tab.box();
        txt(ctx, 'gli avversari stanno finendo...', b.x + b.w / 2, b.y + b.h + 14, 12,
          '#90caf9', 'center', { italic: false });
      }
    }
    // top HUD
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, HUD_H);
    this.drawTitle(ctx, W);
    txt(ctx, this.hudText(0), 12, HUD_H / 2 + 1, 14, PCOL[0].ui, 'left', { italic: false });
    if (nl > 1) txt(ctx, this.hudText(1), W - 76, HUD_H / 2 + 1, 14, PCOL[1].ui, 'right', { italic: false });
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(ctx, W - 62, 4, 54, HUD_H - 8, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(W - 42, 10, 5, HUD_H - 20); ctx.fillRect(W - 32, 10, 5, HUD_H - 20);
    this.drawControls(ctx);
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, G.H);
      txt(ctx, 'PAUSA', W / 2, this.btns.length > 3 ? 104 : 110, 48, '#ffd600');
      for (const b of this.btns) drawBtn(ctx, b);
    }
  }
  drawControls(ctx) {
    const W = G.W, y0 = G.H - CTRL_H, cy = y0 + CTRL_H / 2;
    const g = ctx.createLinearGradient(0, y0, 0, G.H);
    g.addColorStop(0, '#1c2233'); g.addColorStop(1, '#0a0d16');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, CTRL_H);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, y0, W, 2);
    if (this.humans > 1) { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(W / 2 - 1, y0 + 10, 2, CTRL_H - 20); }
    for (const z of this.zones()) {
      // piu' grandi dalla 1.4.3 (prima 47): sui telefoni si prendevano male
      const on = this.held[z.p][z.b] > 0, r = on ? 51 : 55;
      const base = z.b === 0 ? PCOL[z.p].ui : z.b === 2 ? '#ef6c00' : '#607d8b';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.arc(z.cx + 3, cy + 5, r, 0, Math.PI * 2); ctx.fill();
      const gr = ctx.createRadialGradient(z.cx - r * 0.3, cy - r * 0.4, 4, z.cx, cy, r);
      gr.addColorStop(0, shade(base, on ? 1.7 : 1.4)); gr.addColorStop(1, shade(base, on ? 0.9 : 0.65));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(z.cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = on ? 4 : 2; ctx.stroke();
      const lab = this.ev.labels(z.p)[z.b];
      txt(ctx, 'ABC'[z.b], z.cx, cy - 13, 32, '#fff');
      txtFit(ctx, lab, z.cx, cy + 20, lab.length > 9 ? 12 : 14, '#fff', 'center', r * 1.8, { italic: false });
    }
    if (this.humans > 1 && this.zones().length < 6) {       // coi tre tasti li' c'e' il C
      txt(ctx, PCOL[0].short, W * 0.185, cy, 16, PCOL[0].ui);
      txt(ctx, PCOL[1].short, W * 0.815, cy, 16, PCOL[1].ui);
    }
  }
}

// ---------- results of one event: finishing order (+ overall standings in the decathlon) ----------
class ResultScene extends Screen {
  constructor(evIdx, res, rec, order, pay) {
    super();
    this.evIdx = evIdx; this.meta = evMeta(evIdx); this.res = res; this.rec = rec; this.order = order; this.pay = pay;
  }
  enter() {
    super.enter();
    const humanMedal = Game.n > 1 && this.order.some(o => !Game.isCpu(o.p) && o.place && o.place <= 3);
    if (this.rec.some(r => r) || humanMedal) Snd.fanfare();
  }
  layout() {
    const cx = G.W / 2, y = G.H - 88;
    if (Game.careerMode) {
      this.btns = [
        { x: cx - 250, y, w: 230, h: 64, label: 'RIPETI', color: '#43a047', fn: () => Game.startCareer(this.evIdx) },
        { x: cx + 20, y, w: 230, h: 64, label: '‹ CARRIERA', color: '#7b1fa2', fn: () => G.setScene(new CareerScene()) },
      ];
    } else if (Game.deca) {
      const last = Game.idx >= Game.order.length - 1;
      this.btns = [{ x: cx - 170, y, w: 340, h: 64, label: last ? 'CLASSIFICA FINALE ›' : 'PROSSIMA GARA ›', color: '#43a047', size: 24, fn: () => Game.next() }];
    } else {
      this.btns = [
        { x: cx - 250, y, w: 230, h: 64, label: 'RIPROVA', color: '#43a047', fn: () => Game.retry() },
        { x: cx + 20, y, w: 230, h: 64, label: 'MENU', color: '#1e88e5', fn: () => G.setScene(Game.menu()) },
      ];
    }
  }
  onKey() { if (this.t > 1) this.btns[0].fn(); }
  back() { G.setScene(Game.careerMode ? new CareerScene() : Game.menu()); return true; }
  // Chi sale sul podio: i primi tre dell'ordine d'arrivo che hanno una medaglia. A pari merito (tre
  // secondi, per dire) i posti sul podio non bastano per tutti: passa avanti chi gioca davvero.
  podio() {
    if (Game.n < 2) return [];
    const m = this.order.filter(o => o.place && o.place <= 3);
    m.sort((a, b) => a.place - b.place || (Game.isCpu(a.p) ? 1 : 0) - (Game.isCpu(b.p) ? 1 : 0));
    return m.slice(0, 3);
  }
  /**
   * Il podio, dentro il riquadro dato: il primo in mezzo sul gradino piu' alto, gli altri due ai lati.
   * Ognuno sta sul gradino del suo posto (due secondi stanno alla stessa altezza), di fronte, con la
   * medaglia al collo e la bandiera tenuta alta dietro la schiena.
   */
  drawPodio(ctx, x, y, w, h) {
    const chi = this.podio();
    if (!chi.length) return;
    // la figura con le braccia alzate e' alta 104 unita'; sotto ci sta il gradino piu' alto
    const sc = Math.min((h * 0.64) / 104, (w / 3.15) / 66), passo = 66 * sc + Math.min(14, (w - 3 * 66 * sc) / 2);
    // i gradini: abbastanza alti perche' ci stiano il numero e, sotto, il nome
    const base = y + h, alti = [0.36 * h, 0.27 * h, Math.max(0.19 * h, 38)];
    const posti = [[0, chi[0]], [-1, chi[1]], [1, chi[2]]];
    // prima i gradini, poi gli atleti (le bandiere dei vicini si sfiorano)
    for (const [lato, o] of posti) {
      if (!o) continue;
      const gx = x + w / 2 + lato * passo, gh = alti[o.place - 1], gw = passo - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrect(ctx, gx - gw / 2 + 3, base - gh + 4, gw, gh, 5); ctx.fill();
      const g = ctx.createLinearGradient(0, base - gh, 0, base);
      g.addColorStop(0, shade(MEDAL_COL[o.place - 1], 0.95)); g.addColorStop(1, shade(MEDAL_COL[o.place - 1], 0.5));
      ctx.fillStyle = g; rrect(ctx, gx - gw / 2, base - gh, gw, gh, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(gx - gw / 2 + 4, base - gh + 2, gw - 8, 3);
      const num = Math.min(26, (gh - 18) * 0.8);
      txt(ctx, String(o.place), gx, base - gh + 5 + num / 2, num, '#3e2723', 'center', { outline: false, crudo: true });
      txtFit(ctx, PCOL[o.p].name, gx, base - 10, 12, '#3e2723', 'center', gw - 8, { outline: false, italic: false, crudo: true });
    }
    for (const [lato, o] of posti) {
      if (!o) continue;
      let col = PCOL[o.p];
      // al torneo i colori sono quelli del costume
      if (typeof Vesti !== 'undefined' && Bg.medievo()) col = Vesti.colori(col, Vesti.di(col).veste);
      // chi ha vinto salta appena, gli altri stanno fermi
      const su = o.place === 1 ? Math.abs(Math.sin(this.t * 5)) * 3 * sc * Math.max(0, 1 - this.t / 4) : 0;
      drawDiFronte(ctx, col, x + w / 2 + lato * passo, base - alti[o.place - 1] - su, sc, o.place, this.t + lato);
    }
  }
  drawPay(ctx, x, y, w) {
    const p = this.pay, std = Career.std(this.meta.id);
    panel(ctx, x, y, w, 118);
    txt(ctx, 'CARRIERA', x + w / 2, y + 22, 15, '#ce93d8');
    txt(ctx, 'obiettivo ' + this.meta.fmt(std), x + w / 2, y + 46, 17,
      p.first ? '#7CFC00' : (Career.doneMap()[this.meta.id] ? '#a5d6a7' : '#ff8a65'), 'center', { italic: false });
    // al torneo, col premio in fiorini c'e' anche quello in natura
    const natura = p.valid && p.place && Career.C.premi ? '  ' + T(Career.C.premi[clamp(p.place, 1, 8) - 1]) : '';
    if (p.valid) txtFit(ctx, T('premio ' + Money(p.prize) + (p.bonus ? '   +   obiettivo ' + Money(p.bonus) : '')) + natura, x + w / 2, y + 72, 17, '#ffd600', 'center', w - 20, { italic: false });
    else txt(ctx, 'senza misura: nessun premio', x + w / 2, y + 72, 17, '#ff5252', 'center', { italic: false });
    txt(ctx, 'in cassa: ' + Money(Career.data.money), x + w / 2, y + 98, 16, '#fff', 'center', { italic: false });
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, two = Game.deca;
    panel(ctx, 30, 10, W - 60, G.H - 108);
    txt(ctx, 'RISULTATI', cx, 32, 15, '#90caf9');
    txt(ctx, this.meta.name, cx, 62, 30, '#ffd600');
    const rowH = Math.min(34, 290 / Math.max(this.order.length, 1));
    // a destra dell'ordine d'arrivo: la classifica del decathlon, oppure il podio (sotto il riquadro
    // della carriera, quando c'e')
    const podio = !two && this.podio().length > 0;
    const split = two || !!this.pay || podio;
    const colW = split ? (W - 110) / 2 : Math.min(640, W - 120), xa = split ? 45 : cx - colW / 2, y0 = 112 + rowH / 2;
    txt(ctx, 'ORDINE D\'ARRIVO', xa + colW / 2, 96, 15, '#90caf9');
    this.order.forEach((o, i) => standRow(ctx, xa, y0 + i * rowH, colW, rowH, o.place, o.p, o.r.disp, '+' + o.r.pts, this.rec[o.p] ? 'RECORD!' : ''));
    if (this.pay) this.drawPay(ctx, xa + colW + 20, 104, colW);
    if (podio) { const py = this.pay ? 230 : 100; this.drawPodio(ctx, xa + colW + 20, py, colW, G.H - 110 - py); }
    if (two) {
      const xb = xa + colW + 20;
      txt(ctx, 'CLASSIFICA DOPO ' + (Game.idx + 1) + (Game.idx ? ' GARE' : ' GARA'), xb + colW / 2, 96, 15, '#90caf9');
      rankTotals(Game.totals).forEach((o, i) => standRow(ctx, xb, y0 + i * rowH, colW, rowH, o.place, o.p, '', o.v + ' pt', '', Game.n > 1 ? Game.medals[o.p] : null));
    }
    this.drawButtons(ctx);
  }
}

// ---------- final decathlon standings ----------
class FinalScene extends Screen {
  enter() {
    super.enter();
    this.rec = Game.totals.map((t, p) => Game.isCpu(p) ? false : Records.submit('decathlon', t, false, PCOL[p].name, PCOL[p].short));
    // il decathlon non e' una gara di carriera: il record resta personale, in classifica mondiale non va
    this.order = rankTotals(Game.totals);
    Snd.fanfare();
  }
  layout() { this.btns = [{ x: G.W - 250, y: G.H - 78, w: 200, h: 58, label: 'MENU', color: '#1e88e5', fn: () => G.setScene(Game.menu()) }]; }
  onKey() { if (this.t > 1.5) this.btns[0].fn(); }
  back() { G.setScene(Game.menu()); return true; }
  message() {
    const place = p => this.order.find(o => o.p === p).place;
    if (Game.n === 1) return Game.totals[0] >= 8000 ? 'CAMPIONE DEL MONDO!' : Game.totals[0] >= 6000 ? 'OTTIMA PRESTAZIONE!' : 'BUONA GARA, RIPROVA!';
    if (!Game.cpu) {
      const [a, b] = Game.totals;
      return a === b ? 'PAREGGIO!' : 'VINCE ' + PCOL[a > b ? 0 : 1].name + '!';
    }
    if (Game.humans === 1) { const pl = place(0); return pl === 1 ? 'HAI VINTO IL DECATHLON!' : 'HAI CHIUSO AL ' + pl + '° POSTO'; }
    const a = place(0), b = place(1);
    if (a === 1 || b === 1) return a === b ? 'PAREGGIO IN VETTA!' : 'VINCE ' + PCOL[a === 1 ? 0 : 1].name + '!';
    return 'G1 ' + a + '°   •   G2 ' + b + '°';
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, n = this.order.length;
    panel(ctx, 40, 10, W - 80, G.H - 20);
    txt(ctx, 'DECATHLON  •  CLASSIFICA FINALE', W / 2, 38, 26, '#ffd600');
    const colW = Math.min(720, W - 160), x0 = W / 2 - colW / 2, rowH = Math.min(38, 300 / n), y0 = 86 + rowH / 2;
    if (Game.n > 1) txt(ctx, 'MEDAGLIE', x0 + colW - 120, 70, 12, '#90caf9', 'center', { italic: false });
    txt(ctx, 'PUNTI', x0 + colW - 8, 70, 12, '#90caf9', 'right', { italic: false });
    this.order.forEach((o, i) => standRow(ctx, x0, y0 + i * rowH, colW, rowH, o.place, o.p, '', o.v + ' pt', this.rec[o.p] ? 'RECORD!' : '', Game.n > 1 ? Game.medals[o.p] : null));
    txt(ctx, this.message(), W * 0.4, G.H - 50, 28, '#7CFC00');
    this.drawButtons(ctx);
  }
}

// ---------- records ----------
const ROW_H = 28;                            // l'altezza di una riga dell'elenco
class RecordsScene extends Screen {
  // forza = la parola d'ordine appena scritta: si arriva qui dal pulsante AGGIORNA ORA, passando da lei
  // apri = ci si arriva dal titolo: si sceglie il campionato da mostrare (livelloDeiRecord)
  constructor(o) {
    super(); this.sc = new Scroller(); this.forza = (o && o.forza) || '';
    if (o && o.apri) Lv.i = livelloDeiRecord();
  }
  // diciotto gare più il decathlon: l'elenco è più alto dello schermo e scorre
  rows() { return EVENTS.length + 1; }
  layout() {
    const L = Lv.cur(), W = G.W, cx = W / 2;
    const top = 102, bot = G.H - 86;             // sotto le intestazioni, sopra la riga dei pulsanti
    this.sc.set({ x: 78, y: top, w: W - 156, h: bot - top }, this.rows() * ROW_H + 14);
    // La riga dei pulsanti in basso: quelli che servono, uno dopo l'altro, stretti quanto basta perche'
    // ci stiano anche sugli schermi meno larghi.
    const riga = [{ w: 150, label: '‹ INDIETRO', size: 18, color: '#546e7a', fn: () => G.setScene(new TitleScene()) }];
    // i primi dieci di ogni gara: dal pulsante, o toccando la riga della gara
    if (World.anyTop()) riga.push({ w: 150, label: 'I PRIMI 10', sub: 'o tocca una gara', size: 17, color: '#1565c0', fn: () => G.setScene(new TopScene()) });
    if (this.sc.need) riga.push(
      { w: 58, label: '▲', size: 24, color: '#37474f', fn: () => this.sc.page(-1) },
      { w: 58, label: '▼', size: 24, color: '#37474f', fn: () => this.sc.page(1) });
    // manda subito i propri primati e scarica la classifica senza aspettare il giro dell'ora: solo con
    // la parola d'ordine (la stessa del torneo), che controlla anche il Worker
    if (Share.attivo()) riga.push({ w: 170, label: 'AGGIORNA ORA', sub: 'con la parola d\'ordine', size: 16, color: '#6a1b9a', fn: () => G.setScene(new PasswordScene({
      titolo: 'AGGIORNA ORA', riga: 'manda i tuoi primati e scarica la classifica adesso: serve la parola d\'ordine', medievo: false,
      ok: v => G.setScene(new RecordsScene({ forza: v })), indietro: () => G.setScene(new RecordsScene()) })) });
    riga.push({ w: 190, label: L.short, sub: 'cambia livello', size: 19, color: L.col,
      fn: () => { Lv.i = Lv.i % 3 + 1; Game.lvlPref = Lv.i; savePrefs(); this.layout(); } });
    const larghi = riga.reduce((a, b) => a + b.w, 0), k = Math.min(1, (W - 40 - (riga.length - 1) * 8) / larghi);
    const spazio = (W - 40 - larghi * k) / (riga.length - 1);
    let bx = 20;
    this.btns = riga.map(b => { const q = Object.assign(b, { x: bx, y: G.H - 68, w: b.w * k, h: 50, size: Math.round(b.size * Math.max(0.85, k)) }); bx += q.w + spazio; return q; });
    // l'invio dei propri record alla classifica mondiale: si accende e si spegne da qui (anche dopo
    // aver detto MAI alla domanda del titolo); riacceso, i primati di carriera che entrerebbero fra i
    // primi dieci si mettono in coda e partono tornando al titolo
    if (Share.attivo()) {
      const acceso = Share.d.ok === true;
      this.btns.push({ x: G.W - 214, y: 12, w: 194, h: 44, label: acceso ? 'INVIO MONDIALE: SÌ' : 'INVIO MONDIALE: NO', size: 14,
        sub: acceso ? 'tocca per spegnere' : 'tocca per accendere', color: acceso ? '#2e7d32' : '#6d4c41',
        fn: () => { Share.cambia(); this.layout(); } });
    }
    this.misura();
  }
  /**
   * Quanto grande si può scrivere in ogni colonna perché ci stiano tutte le righe, compresa la
   * peggiore. Si calcola qui e non mentre si disegna: cambia solo quando cambia il livello o quando
   * arriva un file nuovo, cioè quando questa funzione viene richiamata comunque.
   */
  misura() {
    const ctx = G.ctx, C = this.cols();
    if (!ctx) { this.sz = [16, 16, 16]; this.szNome = 16; return; }
    const celle = i => EVENTS.map(e => this.cella(e.id, i, C.n)).concat([this.cellaDeca(i, C.n)]);
    // La grandezza piu' alta a cui ci stanno tutte le caselle di quella colonna, bandiera compresa.
    // Nelle colonne dei giocatori un nome conta al massimo quanto GIOCATORE 1: un solo nome largo
    // come dodici M non deve rimpicciolire tutta la colonna, si stringe lui (vedi casella). I nomi
    // dei record del mondo invece li conosciamo, e contano per intero.
    const adatta = i => {
      const cs = celle(i), tetto = i < C.n - 1 ? 'GIOCATORE 1' : null;
      for (let s = 16; s > 8; s--) if (cs.every(c => this.larga(ctx, c, s, tetto) <= C.colW - 8)) return s;
      return 8;
    };
    // primo tentativo con l'anno del record del mondo; se costringe a scrivere troppo piccolo,
    // l'anno si lascia fuori e si rimisura
    this.corto = false;
    this.sz = C.x.map((_, i) => adatta(i));
    if (this.sz[C.n - 1] < 12) {
      this.corto = true;
      this.sz = C.x.map((_, i) => adatta(i));
    }
    this.szNome = fitSize(ctx, EVENTS.map(e => e.name).concat(['DECATHLON']), C.nameW - 8, 16);
  }
  /**
   * Il contenuto di una casella: la misura, la bandiera e il nome di chi l'ha fatta. La bandiera
   * prende il posto delle parentesi di prima. Il nome passa da nomeCorto: dalla classifica mondiale
   * puo' arrivare un nome piu' lungo di quelli che il gioco lascia scegliere.
   */
  voce(r, fmt, col, anno) {
    if (!r || typeof r.v !== 'number') return { v: '—', who: '', nat: '', col };
    const who = nomeCorto(r.who || '') + (anno && r.anno ? ' ' + r.anno : '');
    // * = fatto con un oggetto leggendario (vale il 10% in piu' dell'atleta)
    if (r.leg) this.conLeg = true;
    return { v: fmt(r.v) + (r.leg ? '*' : ''), who, nat: FLAGS[r.nat] ? r.nat : '', col };
  }
  // quella dei giocatori dice anche in che campionato e' stato fatto: U, T o W
  voceTop(id, fmt) {
    const r = World.top(id)[0], c = this.voce(r, fmt, '#90caf9');
    if (c.who) c.lv = letteraDi(r);
    return c;
  }
  cella(id, i, n) {
    const meta = EVENTS.find(e => e.id === id), fmt = v => meta ? meta.fmt(v) : v + ' pt';
    const mio = this.voce(Records.get(id), fmt, '#ffcc80');
    const mondo = this.nuovo(this.voce(World.wr(id), fmt, '#a5d6a7', !this.corto), id, 'wr');
    if (n === 3) return [mio, this.nuovo(this.voceTop(id, fmt), id, 'top'), mondo][i];
    return [mio, mondo][i];
  }
  // una casella arrivata nuova col file dall'ultima volta che si e' guardata la schermata
  nuovo(c, id, cosa) {
    if (c.who && this.nuovi && this.nuovi[id] && this.nuovi[id][cosa]) { c.col = '#ffd600'; c.nuovo = true; }
    return c;
  }
  cellaDeca(i, n) {
    const fmt = v => v + ' pt';
    const mio = this.voce(Records.get('decathlon'), fmt, '#ffd600');
    const niente = { v: '—', who: '', nat: '', col: '#a5d6a7' };
    if (n === 3) return [mio, this.nuovo(this.voceTop('decathlon', fmt), 'decathlon', 'top'), niente][i];
    return [mio, niente][i];
  }
  // quanto e' larga una casella a quella grandezza, senza il nome: misura, spazio, bandiera, spazio
  base(ctx, c, s) {
    ctx.font = 'bold ' + s + 'px ' + FONT;
    let w = ctx.measureText(T(c.v)).width;
    if (c.who) w += s * 0.6;
    if (c.nat) w += Math.round(s * 0.8) * 1.5 + s * 0.3;
    if (c.lv) w += s * 1.15;
    return w;
  }
  // ...e col nome, che conta al massimo quanto 'tetto'
  larga(ctx, c, s, tetto) {
    let w = this.base(ctx, c, s);
    if (c.who) {
      ctx.font = 'bold ' + s + 'px ' + FONT;
      w += Math.min(ctx.measureText(c.who).width, tetto ? ctx.measureText(tetto).width : Infinity);
    }
    return w;
  }
  // La casella si scrive da destra: il nome, la bandiera, e a sinistra la misura. Un nome che non
  // entra nello spazio rimasto prima si stringe un poco, poi si accorcia coi puntini.
  casella(ctx, c, x, y, s, largo) {
    if (c.lv) {
      // la lettera del campionato, col suo colore, in fondo alla casella
      txt(ctx, c.lv, x, y, s * 0.9, LETTERA_COL[c.lv], 'right', { italic: false, crudo: true });
      x -= s * 1.15;
    }
    if (c.who) {
      const nm = nomeIn(ctx, c.who, largo - this.base(ctx, c, s), s, Math.max(9, Math.round(s * 0.85)));
      txt(ctx, nm.t, x, y, nm.s, c.col, 'right', { italic: false, crudo: true });
      ctx.font = 'bold ' + nm.s + 'px ' + FONT;
      x -= ctx.measureText(nm.t).width;
      if (c.nat) {
        const fh = Math.round(s * 0.8), fw = Math.round(fh * 1.5);
        x -= s * 0.3 + fw;
        drawFlag(ctx, c.nat, Math.round(x), Math.round(y - fh / 2), fw, fh);
      }
      x -= s * 0.6;
    }
    txt(ctx, c.v, x, y, s, c.col, 'right', { italic: false });
    if (c.nuovo) {
      ctx.font = 'bold ' + s + 'px ' + FONT;
      drawStar(ctx, x - ctx.measureText(T(c.v)).width - s * 0.75, y, s * 0.45, '#ffd600');
    }
  }
  back() { G.setScene(new TitleScene()); return true; }
  // Aprire questa schermata vuol dire chiedere i record aggiornati: è il momento giusto, perché è
  // l'unico in cui il giocatore sta aspettando proprio quelli.
  enter() {
    super.enter();
    this.wait = true;
    World.pull(() => {
      this.wait = false;
      this.nuovi = World.novita();
      World.seen();
      this.layout();
      const i = EVENTS.map(e => e.id).concat(['decathlon']).findIndex(id => this.nuovi[id]);
      if (i >= 0) this.sc.by(Math.max(0, i * ROW_H + 12 - this.sc.box.h / 2));
      if (this.forza) this.aggiorna();
    });
  }
  // L'aggiornamento forzato: parte una volta sola, appena entrati con la parola d'ordine.
  aggiorna() {
    const parola = this.forza;
    this.forza = ''; this.forzando = true; this.esitoForza = '';
    Share.forza(parola, (scritta, riuscito) => {
      this.forzando = false;
      this.esitoForza = scritta; this.esitoOk = riuscito; this.esitoForzaT = 8;
      if (riuscito) { Snd.coins(); this.nuovi = Object.assign(this.nuovi || {}, World.novita()); }
      else Snd.fail();
      if (G.scene === this) this.layout();
    });
  }
  update(dt) { super.update(dt); this.sc.update(dt); if (this.esitoForzaT > 0 && (this.esitoForzaT -= dt) <= 0) this.esitoForza = ''; }
  // il dito trascina l'elenco, la rotella lo fa girare: i pulsanti restano per il telecomando
  // Un tocco dentro l'elenco che non diventa un trascinamento apre i primi dieci di quella gara.
  pointerDown(x, y, id) {
    super.pointerDown(x, y, id);
    if (this.t <= 0.3) return;
    this.sc.down(x, y, id);
    this.tocco = this.sc.inside(x, y) ? { id, x, y, fermo: true } : null;
  }
  pointerMove(x, y, id) {
    this.sc.move(x, y, id);
    if (this.tocco && this.tocco.id === id && Math.hypot(x - this.tocco.x, y - this.tocco.y) > 10) this.tocco.fermo = false;
  }
  pointerUp(id) {
    this.sc.up(id);
    const t = this.tocco;
    this.tocco = null;
    if (!t || t.id !== id || !t.fermo) return;
    const i = Math.floor((t.y - (this.sc.box.y - this.sc.off + 12) + ROW_H / 2) / ROW_H);
    const e = EVENTS[i];
    if (e && World.top(e.id).length) { Snd.click(); G.setScene(new TopScene(e.id)); }
  }
  wheel(dy) { this.sc.by(dy); }
  // Le colonne: il nome della gara a sinistra, poi i risultati a destra in parti uguali. Quella dei
  // giocatori compare solo quando in classifica c'è davvero qualcuno: finché non c'è nessuno sarebbe
  // una fila di trattini che sembra un guasto.
  cols() {
    const W = G.W, L = 104, R = W - 94, tot = R - L;
    const n = World.anyTop() ? 3 : 2;
    const nameW = tot * (n === 3 ? 0.27 : 0.34), colW = (tot - nameW) / n;
    const x = [];
    for (let i = 0; i < n; i++) x.push(L + nameW + colW * (i + 1));
    return { L, nameW, colW, x, n };
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, C = this.cols();
    panel(ctx, 70, 12, W - 140, G.H - 90);
    txt(ctx, 'RECORD', cx, 40, 26, '#ffd600');
    txt(ctx, Lv.cur().name, cx, 64, 15, Lv.cur().col, 'center', { italic: false });
    if (Object.keys(this.nuovi || {}).length) {
      drawStar(ctx, 96, 40, 8, '#ffd600');
      txt(ctx, 'nuovo dall\'ultima volta', 110, 40, 13, '#ffd600', 'left', { italic: false });
    }
    const capi = C.n === 3
      ? [['IL TUO RECORD', '#ffcc80'], ['I GIOCATORI', '#90caf9'], ['IL MONDO', '#a5d6a7']]
      : [['IL TUO RECORD', '#ffcc80'], ['RECORD DEL MONDO', '#a5d6a7']];
    capi.forEach((c, i) => txtFit(ctx, c[0], C.x[i], 88, 13, c[1], 'right', C.colW - 8, { italic: false }));

    const y0 = this.sc.clip(ctx) + 12;
    const sz = this.sz || [16, 16, 16];
    const nuovi = this.nuovi || {};
    const sfondo = (y, id) => {
      if (!nuovi[id]) return;
      ctx.fillStyle = 'rgba(255,214,0,' + (0.13 + 0.05 * Math.sin(this.t * 4)).toFixed(3) + ')';
      rrect(ctx, C.L - 22, y - ROW_H / 2 + 1, W - 94 - C.L + 30, ROW_H - 2, 6); ctx.fill();
      drawStar(ctx, C.L - 11, y, 7, '#ffd600');
    };
    const riga = (y, nome, prendi, nomeCol) => {
      txt(ctx, nome, C.L, y, this.szNome || 16, nomeCol || '#fff', 'left', { italic: !!nomeCol });
      for (let i = 0; i < C.n; i++) this.casella(ctx, prendi(i), C.x[i], y, sz[i], C.colW - 8);
    };
    EVENTS.forEach((e, i) => {
      const y = y0 + i * ROW_H;
      if (!this.sc.shows(y, ROW_H)) return;
      sfondo(y, e.id);
      riga(y, e.name, k => this.cella(e.id, k, C.n));
    });
    // il decathlon chiude l'elenco, e scorre con gli altri invece di stare a una riga fissa
    const yd = y0 + EVENTS.length * ROW_H + 6;
    if (this.sc.shows(yd, ROW_H)) { sfondo(yd, 'decathlon'); riga(yd, 'DECATHLON', k => this.cellaDeca(k, C.n), '#ffd600'); }
    ctx.restore();

    this.sc.fade(ctx);
    this.sc.drawBar(ctx, W - 84, 6);
    this.drawButtons(ctx);
    if (this.wait) txt(ctx, 'scarico i record...', cx, G.H - 82, 14, '#90caf9', 'center', { italic: false });
    else if (this.forzando) txt(ctx, 'mando i primati e aggiorno la classifica...', cx, G.H - 82, 15, '#ffd600', 'center', { italic: false });
    else if (this.esitoForza) txt(ctx, this.esitoForza, cx, G.H - 82, 16, this.esitoOk ? '#7CFC00' : '#ff8a80', 'center', { italic: false });
    else if (this.conLeg) txt(ctx, '* con un oggetto leggendario', cx, G.H - 82, 12, '#ffd54f', 'center', { italic: false });
    // sotto il pulsante dell'invio: che cosa finisce nella classifica dei giocatori
    if (Share.attivo()) txt(ctx, 'vanno in classifica solo le gare di carriera', W - 20, 66, 11, '#b0bec5', 'right', { italic: false, outline: false });
    // che cosa vogliono dire le lettere accanto ai nomi dei giocatori
    if (C.n === 3) legendaLivelli(ctx, 88, 64, 11);
  }
}

// U, T, W: il campionato di carriera in cui e' stato fatto un risultato della classifica dei giocatori.
function legendaLivelli(ctx, x, y, s) {
  for (const [l, nome] of [['U', 'University'], ['T', 'Trials'], ['W', 'World']]) {
    txt(ctx, l, x, y, s + 1, LETTERA_COL[l], 'left', { italic: false, crudo: true });
    ctx.font = 'bold ' + (s + 1) + 'px ' + FONT;
    x += ctx.measureText(l).width + 4;
    txt(ctx, nome, x, y, s, '#b0bec5', 'left', { italic: false, crudo: true, outline: false });
    ctx.font = 'bold ' + s + 'px ' + FONT;
    x += ctx.measureText(nome).width + 12;
  }
}

// ---------- i primi dieci di una gara ----------
// La classifica dei giocatori tiene dieci nomi per gara (di ognuno il suo migliore). Qui si vedono
// tutti, una gara alla volta: col posto, la bandiera, il nome, il campionato (U, T, W), la misura e il
// giorno in cui e' stata mandata. Le frecce passano alla gara prima e a quella dopo.
class TopScene extends Screen {
  constructor(id) {
    super();
    this.gare = EVENTS.map(e => e.id);
    if (World.top('decathlon').length) this.gare.push('decathlon');   // quelli mandati prima che ne uscisse
    // senza una gara scelta si apre la prima che ha qualcuno
    this.i = Math.max(0, id ? this.gare.indexOf(id) : this.gare.findIndex(g => World.top(g).length));
  }
  layout() {
    const cx = G.W / 2;
    this.btns = [
      { x: 20, y: G.H - 68, w: 160, h: 50, label: '‹ INDIETRO', size: 18, color: '#546e7a', fn: () => this.back() },
      { x: cx - 150, y: G.H - 68, w: 140, h: 50, label: '◄', sub: 'gara prima', size: 22, color: '#37474f', fn: () => this.gira(-1) },
      { x: cx + 10, y: G.H - 68, w: 140, h: 50, label: '►', sub: 'gara dopo', size: 22, color: '#37474f', fn: () => this.gira(1) },
    ];
  }
  gira(d) { const n = this.gare.length; this.i = (this.i + d + n) % n; }
  back() { G.setScene(new RecordsScene()); return true; }
  onKey(p, b) { this.gira(b === 0 ? 1 : -1); }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, id = this.gare[this.i];
    const meta = EVENTS.find(e => e.id === id), fmt = v => meta ? meta.fmt(v) : v + ' pt';
    panel(ctx, 70, 12, W - 140, G.H - 90);
    txt(ctx, 'I PRIMI 10', cx, 38, 24, '#ffd600');
    txtFit(ctx, meta ? meta.name : 'DECATHLON', cx, 68, 20, '#fff', 'center', W - 420);
    legendaLivelli(ctx, 88, 40, 11);
    txt(ctx, (this.i + 1) + ' / ' + this.gare.length, W - 88, 40, 13, '#90caf9', 'right', { italic: false, crudo: true });
    const t = World.top(id), wr = World.wr(id);
    if (wr) txt(ctx, 'RECORD DEL MONDO: ' + wrText(id), cx, 92, 13, '#a5d6a7', 'center', { italic: false });
    const y0 = 122, passo = Math.min(30, (G.H - 96 - y0) / WORLD_TOP), s = 16;
    const xn = cx - 250, xv = cx + 150, xd = cx + 250;
    if (!t.length) txt(ctx, 'ancora nessuno: il primo posto ti aspetta', cx, y0 + passo * 3, 17, '#b0bec5', 'center', { italic: false });
    t.slice(0, WORLD_TOP).forEach((r, k) => {
      const y = y0 + k * passo, lv = letteraDi(r);
      if (k % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; rrect(ctx, xn - 46, y - passo / 2 + 1, xd - xn + 60, passo - 2, 6); ctx.fill(); }
      txt(ctx, String(k + 1), xn - 14, y, s, k === 0 ? '#ffd600' : '#cfd8dc', 'right', { italic: false, crudo: true });
      const fh = 15, fw = 23;
      if (FLAGS[r.nat]) drawFlag(ctx, r.nat, xn, Math.round(y - fh / 2), fw, fh);
      txt(ctx, nomeCorto(r.who || ''), xn + fw + 10, y, s, k === 0 ? '#ffd600' : '#fff', 'left', { italic: false, crudo: true });
      txt(ctx, lv, xn + fw + 196, y, s, LETTERA_COL[lv], 'center', { italic: false, crudo: true });
      txt(ctx, fmt(r.v) + (r.leg ? '*' : ''), xv, y, s, '#90caf9', 'right', { italic: false });
      if (r.il) txt(ctx, String(r.il).split('-').reverse().join('/'), xd, y, 12, '#78909c', 'right', { italic: false, crudo: true, outline: false });
    });
    this.drawButtons(ctx);
  }
}

// ---------- keyboard: one key per action, remapped here ----------
const keyHint = () => 'Tastiera: G1 = ' + T(Keys.name(0)) + ' / ' + T(Keys.name(1)) +
  '   •   G2 = ' + T(Keys.name(2)) + ' / ' + T(Keys.name(3)) + '   •   Esc = pausa';

class KeysScene extends Screen {
  constructor() { super(); this.wait = null; }
  back() { if (this.wait != null) { this.wait = null; this.layout(); } else G.setScene(new TitleScene()); return true; }
  // while an action is listening, the key pressed is taken raw: it becomes the new binding
  rawKey(code) {
    if (this.wait == null) return false;
    if (!code) return true; // nothing the browser can name: go on listening
    const i = this.wait;
    this.wait = null;
    if (Keys.set(i, code)) Snd.click(); // Esc and Backspace are refused, so they just cancel
    this.layout();
    return true;
  }
  col(j) { return G.W / 2 + (j ? 185 : -185); }
  layout() {
    const cx = G.W / 2;
    this.btns = [];
    // tre azioni per giocatore: A, B e il C delle gare che hanno tre tasti
    for (let j = 0; j < 2; j++) for (let b = 0; b < 3; b++) {
      const i = keyIdx(j, b), listen = this.wait === i;
      this.btns.push({ x: this.col(j) - 60, y: 142 + b * 62, w: 190, h: 54, act: i,
        label: listen ? 'PREMI UN TASTO' : Keys.name(i), size: listen ? 15 : 24,
        sub: b === 2 && !listen ? 'gare a tre tasti' : '',
        color: listen ? '#ffb300' : (j ? '#1565c0' : '#c62828'), sel: listen,
        fn: () => { this.wait = listen ? null : i; this.layout(); } });
    }
    this.btns.push({ x: cx - 100, y: G.H - 76, w: 200, h: 50, label: 'PREDEFINITI', size: 18, color: '#546e7a',
      fn: () => { Keys.reset(); this.wait = null; this.layout(); } });
    this.btns.push({ x: 20, y: G.H - 72, w: 150, h: 46, label: '‹ INDIETRO', size: 16, color: '#37474f', fn: () => this.back() });
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2;
    panel(ctx, 24, 8, W - 48, G.H - 16);
    txt(ctx, 'TASTI', cx, 46, 34, '#ffd600');
    txt(ctx, 'tocca un\'azione e premi il tasto che vuoi usare', cx, 82, 16, '#fff', 'center', { italic: false });
    for (let j = 0; j < 2; j++) {
      txt(ctx, 'GIOCATORE ' + (j + 1), this.col(j) + 20, 120, 20, HUMAN_COLS[j].ui);
      for (let b = 0; b < 3; b++) {
        const y = 142 + b * 62 + 27;
        ctx.fillStyle = TASTO_COL[b];
        ctx.beginPath(); ctx.arc(this.col(j) - 95, y, 23, 0, Math.PI * 2); ctx.fill();
        txt(ctx, 'ABC'[b], this.col(j) - 95, y + 1, 23, '#fff');
      }
    }
    this.drawButtons(ctx);
    txt(ctx, 'Esc e Backspace restano riservati a indietro e pausa.', cx, G.H - 108, 14, '#90caf9', 'center', { italic: false });
    txt(ctx, 'Lo stesso tasto non può servire due azioni: scambiandolo si scambiano anche le azioni.', cx, G.H - 88, 13, 'rgba(255,255,255,0.6)', 'center', { italic: false, outline: false });
  }
}

// ---------- the address to open on the tablet that plays as the pad ----------
class RemoteScene extends Screen {
  back() { G.setScene(new TitleScene()); return true; }
  layout() {
    const on = Remote.srv > 0;
    this.was = Remote.srv;
    this.btns = [{ x: 20, y: G.H - 64, w: 150, h: 48, label: '\u2039 INDIETRO', size: 16, color: '#546e7a', fn: () => this.back() }];
    // Acceso o spento, si decide qui: il server non si apre mai da solo su un telefono, e quando è
    // aperto si deve poterlo chiudere senza uscire dal gioco.
    this.btns.push({
      x: G.W - 290, y: G.H - 66, w: 270, h: 52,
      label: on ? 'SPEGNI IL SERVER' : 'ACCENDI IL SERVER',
      sub: on ? 'chiude la porta 8080' : 'apre la porta 8080 su questa rete',
      size: 19, color: on ? '#c62828' : '#43a047',
      fn: () => { Remote.toggle(); Snd.click(); this.layout(); },
    });
  }
  // l'app risponde al giro dopo: quando cambia davvero, i pulsanti si rifanno.
  // super.update() fa avanzare this.t, ed e' quello che sblocca i tasti: senza, la schermata
  // resta sorda per sempre (pointerDown ignora i tocchi finche' t non supera 0,3).
  update(dt) {
    super.update(dt);
    if (Remote.srv !== this.was) this.layout();
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, n = Remote.peers, on = Remote.srv > 0;
    panel(ctx, 24, 8, W - 48, G.H - 16);
    txt(ctx, 'TELECOMANDO', cx, 50, 32, '#ffd600');
    if (!on) {
      txt(ctx, 'server spento: nessuno pu\u00f2 entrare', cx, 92, 20, '#ff8a80', 'center', { italic: false });
      const off = ['Finch\u00e9 resta spento questo dispositivo non apre nessuna porta',
        'e non \u00e8 raggiungibile da chi sta sulla stessa rete.',
        '',
        'Accendilo solo se vuoi comandare il gioco da un telefono o da un',
        'tablet: serve su un televisore, non serve se giochi qui.'];
      off.forEach((l, i) => txt(ctx, l, cx, 140 + i * 30, 18, '#fff', 'center', { italic: false }));
      txt(ctx, 'La porta resta aperta solo mentre il gioco \u00e8 in primo piano.', cx, G.H - 96, 15, '#90caf9', 'center', { italic: false });
      this.drawButtons(ctx);
      return;
    }
    txt(ctx, 'sul tablet apri il browser e vai a questo indirizzo:', cx, 88, 16, '#fff', 'center', { italic: false });
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(ctx, cx - 300, 112, 600, 66, 12); ctx.fill();
    ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 3; ctx.stroke();
    txt(ctx, Remote.url || '...', cx, 146, 34, '#7CFC00', 'center', { italic: false });
    // whether anyone is actually holding a pad right now
    const col = n ? '#7CFC00' : '#ff8a80';
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx - 150, 204, 8, 0, Math.PI * 2); ctx.fill();
    txt(ctx, n ? 'telecomandi collegati: ' + n : 'nessun telecomando collegato', cx - 132, 205, 18, col, 'left', { italic: false });
    const lines = ['Il tablet deve essere sulla stessa rete del televisore.',
      'La pagina mostra i due tasti della gara con le loro etichette;',
      'nei men\u00f9 diventa un riquadro da toccare come fosse lo schermo.',
      'Due tablet = due giocatori: in alto si sceglie G1 o G2.'];
    lines.forEach((l, i) => txt(ctx, l, cx, 252 + i * 28, 17, '#fff', 'center', { italic: false }));
    txt(ctx, 'La tastiera USB continua a funzionare come prima.', cx, G.H - 96, 15, '#90caf9', 'center', { italic: false });
    this.drawButtons(ctx);
  }
}

// ---------- player profiles: name + flag, saved on the device ----------
const Profiles = {
  key: 'olimpiadi_players_v1',
  data: [{ name: 'GIOCATORE 1', code: 'ITA', lefty: false }, { name: 'GIOCATORE 2', code: 'FRA', lefty: false }],
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key));
      if (Array.isArray(d)) d.forEach((p, i) => {
        if (p && i < 2) {
          const q = { name: String(p.name || this.data[i].name).slice(0, NOME_MAX), code: FLAGS[p.code] ? p.code : this.data[i].code, lefty: !!p.lefty };
          KIT_KEYS.forEach(k => { if (typeof p[k] === 'string' && /^#[0-9a-f]{6}$/i.test(p[k])) q[k] = p[k]; });
          // uomo o donna, i capelli e la divisa: solo da vedere, le gare sono le stesse per tutti
          if (p.sex === 'f') q.sex = 'f';
          if (Number.isInteger(p.capelli) && CAPELLI[p.capelli]) q.capelli = p.capelli;
          if (Number.isInteger(p.tenuta) && p.tenuta >= 0 && p.tenuta < 3) q.tenuta = p.tenuta;
          this.data[i] = q;
        }
      });
    } catch (e) { /* storage unavailable */ }
    return this.data;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  set(i, name, code, lefty, cols, aspetto) {
    const q = { name: (name.trim() || ('GIOCATORE ' + (i + 1))).slice(0, NOME_MAX), code, lefty: !!lefty };
    if (cols) KIT_KEYS.forEach(k => { if (cols[k]) q[k] = cols[k]; });
    if (aspetto) { if (aspetto.sex === 'f') q.sex = 'f'; q.capelli = aspetto.capelli; q.tenuta = aspetto.tenuta | 0; }
    this.data[i] = q;
    this.save();
  },
  // full colour set for drawing that player: identity from HUMAN_COLS, the rest from his profile
  colOf(i) {
    const p = this.data[i] || {}, c = Object.assign({}, HUMAN_COLS[i] || HUMAN_COLS[0]);
    if (p.name) c.name = p.name;
    if (p.code) c.short = p.code;
    c.lefty = !!p.lefty;
    KIT_KEYS.forEach(k => { if (p[k]) c[k] = p[k]; });
    c.sex = p.sex === 'f' ? 'f' : 'm';
    if (p.capelli != null) c.capelli = p.capelli;
    c.tenuta = p.tenuta | 0;
    // il costume del torneo (lo si vede solo nelle prove medievali)
    if (typeof Guardaroba !== 'undefined') Object.assign(c, Guardaroba.di(i));
    return c;
  },
  kitOf(i) {
    const p = this.data[i] || {}, o = {};
    KIT_KEYS.forEach(k => { o[k] = p[k] || HUMAN_COLS[i][k]; });
    return o;
  },
};
Profiles.load();

const KEY_ROWS = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ-'];

// ---------- the ten events of the decathlon: chosen by the player, kept on the device ----------
const DECA_N = 10;
const Deca = {
  key: 'olimpiadi_deca_v1',
  classic: ['100m', '110h', 'lungo', 'alto', 'triplo', 'piattello', 'pesi', '50sl', 'asta', 'tuffi'],
  idsToIdx(ids) { return ids.map(id => EVENTS.findIndex(e => e.id === id)).filter(i => i >= 0); },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key));
      if (Array.isArray(d)) { const o = this.idsToIdx(d); if (o.length === DECA_N) return o; }
    } catch (e) { /* storage unavailable */ }
    return this.idsToIdx(this.classic);
  },
  save(order) {
    try { localStorage.setItem(this.key, JSON.stringify(order.map(i => EVENTS[i].id))); } catch (e) { /* ignore */ }
  },
};

// Pick the ten events, in the order you want to face them: tapping an event adds it at the end,
// tapping it again takes it out and the ones after it move up.
class DecaPickScene extends Screen {
  constructor(n) { super(); this.n = this.humans = n; this.order = Deca.load(); }
  back() { G.setScene(new MenuScene(this.n)); return true; }
  toggle(i) {
    const k = this.order.indexOf(i);
    if (k >= 0) this.order.splice(k, 1);
    else if (this.order.length < DECA_N) this.order.push(i);
    else { Snd.click(); return; }
    Snd.click();
    this.layout();
  }
  start() {
    if (this.order.length < DECA_N) { Snd.click(); return; }
    Deca.save(this.order);
    Game.startDeca(this.n, this.order.slice());
  }
  layout() {
    const W = G.W, cx = W / 2;
    this.btns = [];
    const cols = 6, gx = 9, bw = Math.min(150, (W - 56) / cols - gx), bh = 56;
    const x0 = cx - (cols * bw + (cols - 1) * gx) / 2;
    EVENTS.forEach((e, i) => {
      const r = Math.floor(i / cols), c = i % cols, k = this.order.indexOf(i);
      this.btns.push({ x: x0 + c * (bw + gx), y: 108 + r * (bh + 10), w: bw, h: bh, label: SHORT[e.id], size: 14,
        color: k >= 0 ? '#2e7d32' : '#37474f', pick: k, fn: () => this.toggle(i) });
    });
    const y = G.H - 66, full = this.order.length === DECA_N;
    const bb = Math.min(140, W * 0.17), g2 = 10;
    const bw3 = Math.min(200, (W - 56 - bb - 2 * g2) / 3), x3 = W - 20 - (3 * bw3 + 2 * g2);
    this.btns.push({ x: 20, y: y + 2, w: bb, h: 46, label: '\u2039 INDIETRO', size: 16, color: '#546e7a', fn: () => this.back() });
    this.btns.push({ x: x3, y, w: bw3, h: 50, label: 'CLASSICHE', size: 17, color: '#5e35b1',
      fn: () => { this.order = Deca.idsToIdx(Deca.classic); Snd.click(); this.layout(); } });
    this.btns.push({ x: x3 + bw3 + g2, y, w: bw3, h: 50, label: 'A CASO', size: 17, color: '#00897b',
      fn: () => { this.order = shuffle(EVENTS.map((_, i) => i)).slice(0, DECA_N); Snd.click(); this.layout(); } });
    this.btns.push({ x: x3 + 2 * (bw3 + g2), y, w: bw3, h: 50, label: full ? 'VIA! \u203a' : this.order.length + '/' + DECA_N,
      sub: full ? '' : 'scegline ' + (DECA_N - this.order.length), size: 20, color: full ? '#43a047' : '#37474f',
      fn: () => this.start() });
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2;
    panel(ctx, 24, 8, W - 48, G.H - 16);
    txt(ctx, 'DECATHLON', cx, 42, 30, '#ff8f00');
    txt(ctx, 'scegli le 10 gare, nell\'ordine in cui vuoi affrontarle', cx, 72, 15, '#fff', 'center', { italic: false });
    for (const b of this.btns) {
      drawBtn(ctx, b);
      if (b.pick == null || b.pick < 0) continue;
      // the badge says where that event falls in the programme
      ctx.fillStyle = '#ffd600';
      ctx.beginPath(); ctx.arc(b.x + b.w - 13, b.y + 13, 11, 0, Math.PI * 2); ctx.fill();
      txt(ctx, (b.pick + 1) + '', b.x + b.w - 13, b.y + 14, 14, '#4e342e', 'center', { outline: false });
    }
  }
}

// ---------- name + nationality for each player ----------
class PlayerSetupScene extends Screen {
  constructor(n, opts) {
    super();
    opts = opts || {};
    this.n = this.humans = n; this.i0 = opts.start || 0; this.i = this.i0; this.done = opts.done; this.backTo = opts.back;
    this.tab = 0; // 0 = name, flag and hand   1 = colours
    this.sc = new Scroller();
    this.loadProfile();
  }
  loadProfile() {
    const p = Profiles.data[this.i];
    this.name = p.name; this.code = p.code; this.lefty = !!p.lefty;
    this.col = Profiles.kitOf(this.i);
    // l'aspetto: chi non ha mai scelto i capelli ha quelli che gli da' il nome
    const c0 = Profiles.colOf(this.i);
    this.sex = c0.sex; this.tenuta = c0.tenuta | 0; this.capelli = fisicoDi(c0).capelli;
    this.cont = Math.max(0, CONTINENTS.findIndex(c => c.codes.indexOf(this.code) >= 0));
    this.vaiA = true;          // al prossimo layout la griglia si porta sulla bandiera scelta
  }
  type(ch) {
    if (ch === 'DEL') { Snd.click(); this.name = this.name.slice(0, -1); return; }
    // al limite la tastiera non scrive piu': lo dice con un suono sordo e col contatore che lampeggia
    if (this.name.length >= NOME_MAX) { Snd.tone(150, 0.09, 'square', 0.07); this.pieno = 0.6; return; }
    Snd.click();
    this.name += ch;
  }
  update(dt) {
    super.update(dt);
    if (this.pieno > 0) this.pieno -= dt;
    if (!this.tab) { this.sc.update(dt); this.aggiorna(); }
  }
  textKey(k) {
    if (k === 'Enter') { this.next(); return true; }
    if (this.tab) return false; // on the colour page the keyboard does not write the name
    if (k === 'Backspace') { this.type('DEL'); return true; }
    if (k === 'PageDown' || k === 'PageUp') { this.sc.by((k === 'PageDown' ? 1 : -1) * this.sc.box.h); return true; }
    if (/^[A-Za-z0-9 .'-]$/.test(k)) { this.type(k.toUpperCase()); return true; }
    return false;
  }
  next() { if (this.tab === 0) { Snd.click(); this.tab = 1; this.layout(); } else this.confirm(); }
  confirm() {
    Profiles.set(this.i, this.name, this.code, this.lefty, this.col, { sex: this.sex, capelli: this.capelli, tenuta: this.tenuta });
    if (this.i + 1 < this.i0 + this.n) { this.i++; this.loadProfile(); this.tab = 0; this.t = 0; this.layout(); }
    else if (this.done) this.done();
    else G.setScene(new MenuScene(this.n));
  }
  back() {
    if (this.tab) { this.tab = 0; this.layout(); }
    else if (this.i > this.i0) { this.i--; this.loadProfile(); this.layout(); }
    else if (this.backTo) this.backTo();
    else G.setScene(new TitleScene());
    return true;
  }
  nextLabel() { return this.i + 1 < this.i0 + this.n ? 'GIOCATORE 2 ›' : 'CONFERMA ›'; }
  layout() {
    if (this.tab) return this.layoutColors();
    const cx = G.W / 2, kw = 42, kh = 32, gap = 4;
    this.btns = [];
    KEY_ROWS.forEach((row, r) => {
      const x0 = cx - (row.length * (kw + gap) - gap) / 2;
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        this.btns.push({ x: x0 + c * (kw + gap), y: 116 + r * (kh + gap), w: kw, h: kh, label: ch, size: 18, color: '#37474f', fn: () => this.type(ch) });
      }
    });
    this.btns.push({ x: cx - 150, y: 116 + 3 * (kh + gap), w: 148, h: kh, label: 'SPAZIO', size: 15, color: '#37474f', fn: () => this.type(' ') });
    this.btns.push({ x: cx + 2, y: 116 + 3 * (kh + gap), w: 148, h: kh, label: '← CANCELLA', size: 15, color: '#546e7a', fn: () => this.type('DEL') });
    const tw = Math.min(150, (G.W - 60) / CONTINENTS.length - 8), tx = cx - (CONTINENTS.length * (tw + 8) - 8) / 2;
    CONTINENTS.forEach((c, i) => this.btns.push({ x: tx + i * (tw + 8), y: 264, w: tw, h: 32, label: c.name, size: 14,
      color: i === this.cont ? '#1e88e5' : '#455a64', fn: () => { this.cont = i; this.vaiA = true; this.layout(); } }));
    // Le bandiere: sette per riga nella larghezza della fila dei continenti, tre righe in vista e il
    // resto che scorre (col dito, con la rotella, con Pag su e Pag giu'). A destra le frecce, per il
    // telecomando e per chi non puo' trascinare. La bandiera resta grande come prima: 58x36.
    const largo = CONTINENTS.length * (tw + 8) - 8, cols = 7, fh = 58, fy = 300;
    const gw = largo - 36, fw = gw / cols, codes = CONTINENTS[this.cont].codes;
    this.sc.set({ x: tx, y: fy, w: gw, h: 3 * fh }, Math.ceil(codes.length / cols) * fh);
    if (this.vaiA) {
      // si parte dalla pagina dove sta la bandiera scelta, se e' di questo continente
      this.vaiA = false;
      const i = codes.indexOf(this.code), pagina = i < 0 ? 0 : Math.floor(Math.floor(i / cols) / 3) * 3 * fh;
      this.sc.want = this.sc.off = clamp(pagina, 0, this.sc.max);
    }
    this.bandiere = codes.map((code, i) => ({ x: tx + (i % cols) * fw, y0: fy + Math.floor(i / cols) * fh, y: 0,
      w: fw - 8, h: fh - 6, label: '', flag: code, color: '#263238', fn: () => { Snd.click(); this.code = code; } }));
    if (this.sc.need) {
      const ax = tx + largo - 30;
      this.btns.push({ x: ax, y: fy, w: 30, h: 44, label: '▲', size: 18, color: '#37474f', fn: () => this.sc.by(-this.sc.box.h) });
      this.btns.push({ x: ax, y: fy + 3 * fh - 44, w: 30, h: 44, label: '▼', size: 18, color: '#37474f', fn: () => this.sc.by(this.sc.box.h) });
    }
    this.btns.push({ x: 20, y: G.H - 62, w: 150, h: 46, label: '‹ INDIETRO', size: 16, color: '#546e7a', fn: () => this.back() });
    this.btns.push({ x: cx - 130, y: G.H - 64, w: 260, h: 48, label: this.lefty ? 'MANCINO' : 'DESTRIMANO',
      sub: 'azione 1 a ' + (this.lefty ? 'SINISTRA' : 'DESTRA') + '  •  tocca per cambiare', size: 18,
      color: this.lefty ? '#00897b' : '#3949ab', fn: () => { this.lefty = !this.lefty; this.layout(); } });
    this.btns.push({ x: G.W - 250, y: G.H - 64, w: 230, h: 50, label: 'COLORI ›', sub: 'divisa, pelle e capelli', size: 20, color: '#43a047', fn: () => this.next() });
    this.fissi = this.btns;
    this.aggiorna();
  }
  // Le bandiere seguono lo scorrimento. Fra i pulsanti, che sono anche quelli che vede il
  // telecomando, ci vanno solo quelle col centro nel riquadro: le altre non si devono poter toccare.
  // E vanno per ultime, dopo i pulsanti fissi: il telecomando ne riceve al massimo 64.
  aggiorna() {
    if (this.tab || !this.bandiere) return;
    const g = this.sc.box;
    for (const b of this.bandiere) b.y = b.y0 - this.sc.off;
    this.btns = this.fissi.concat(this.bandiere.filter(b => { const c = b.y + b.h / 2; return c > g.y && c < g.y + g.h; }));
  }
  // Nella griglia un tocco sceglie la bandiera quando il dito si alza, e solo se non si e' mosso:
  // un trascinamento invece fa scorrere, senza scegliere niente per strada.
  pointerDown(x, y, id) {
    if (!this.tab && this.sc.inside(x, y)) {
      this.tocco = { id, x, y, mosso: false };
      this.sc.down(x, y, id);
      return;
    }
    super.pointerDown(x, y, id);
  }
  pointerMove(x, y, id) {
    if (this.tocco && this.tocco.id === id && Math.abs(y - this.tocco.y) > 8) this.tocco.mosso = true;
    this.sc.move(x, y, id);
  }
  pointerUp(id) {
    this.sc.up(id);
    const t = this.tocco;
    this.tocco = null;
    if (!t || t.id !== id || t.mosso || this.t <= 0.3) return;
    this.aggiorna();
    const b = hitBtn(this.btns.filter(q => q.flag), t.x, t.y);
    if (b) b.fn();
  }
  wheel(dy) { if (!this.tab) this.sc.by(dy); }
  // ----- colour page: a live preview on the left, one row of swatches per part -----
  layoutColors() {
    const cx = G.W / 2, gap = 7;
    this.btns = [];
    this.pv = { x: 44, y: 104, w: 210, h: 336, ppm: 108 };
    const x0 = this.pv.x + this.pv.w + 30;
    const sw = Math.min(52, Math.floor((G.W - 32 - x0 + gap) / 12) - gap), sh = 38;
    this.rows = KIT_KEYS.map((k, r) => ({ k, x: x0, y: 158 + r * 70 }));
    // in cima: uomo o donna, i capelli, la divisa (tre pulsanti che girano fra le scelte)
    const bw = Math.min(210, (G.W - 32 - x0 - 16) / 3), tenute = TENUTE[this.sex === 'f' ? 'f' : 'm'];
    if (this.tenuta >= tenute.length) this.tenuta = 0;
    [{ label: this.sex === 'f' ? 'DONNA' : 'UOMO', sub: 'atleta', color: this.sex === 'f' ? '#ad1457' : '#1565c0',
      fn: () => { this.sex = this.sex === 'f' ? 'm' : 'f'; this.tenuta = 0; this.capelli = this.sex === 'f' ? 5 : 0; } },
    { label: CAPELLI[this.capelli], sub: 'capelli', color: '#6d4c41', fn: () => { this.capelli = (this.capelli + 1) % CAPELLI.length; } },
    { label: tenute[this.tenuta], sub: 'divisa', color: '#00796b', fn: () => { this.tenuta = (this.tenuta + 1) % tenute.length; } },
    ].forEach((o, i) => this.btns.push({ x: x0 + i * (bw + 8), y: 76, w: bw, h: 44, label: o.label, sub: o.sub, size: o.label.length > 12 ? 12 : 16, color: o.color,
      fn: () => { Snd.click(); o.fn(); this.layout(); } }));
    this.rows.forEach(row => KIT[row.k].forEach((c, i) => this.btns.push({
      x: row.x + i * (sw + gap), y: row.y, w: sw, h: sh, label: '', swatch: c, part: row.k,
      fn: () => { Snd.click(); this.col[row.k] = c; },
    })));
    this.btns.push({ x: 20, y: G.H - 62, w: 150, h: 46, label: '‹ INDIETRO', size: 16, color: '#546e7a', fn: () => this.back() });
    this.btns.push({ x: cx - 90, y: G.H - 64, w: 180, h: 48, label: 'CASUALE', size: 18, color: '#5e35b1',
      fn: () => { Snd.click(); KIT_KEYS.forEach(k => { this.col[k] = KIT[k][Math.floor(Math.random() * KIT[k].length)]; }); } });
    this.btns.push({ x: G.W - 250, y: G.H - 64, w: 230, h: 50, label: this.nextLabel(), size: 20, color: '#43a047', fn: () => this.confirm() });
  }
  drawColors(ctx) {
    const W = G.W, cx = W / 2, col = HUMAN_COLS[this.i], P = this.pv;
    panel(ctx, 24, 8, W - 48, G.H - 16);
    txt(ctx, 'GIOCATORE ' + (this.i + 1), cx, 32, 26, col.ui);
    txt(ctx, 'scegli l\'atleta, i capelli, la divisa e i colori', cx, 58, 15, '#fff', 'center', { italic: false });
    // live preview: the athlete runs wearing what you are choosing
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(ctx, P.x, P.y, P.w, P.h, 12); ctx.fill();
    ctx.strokeStyle = col.ui; ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    ctx.beginPath(); rrect(ctx, P.x, P.y, P.w, P.h, 12); ctx.clip();
    ctx.fillStyle = '#b0442f'; ctx.fillRect(P.x, P.y + P.h - 40, P.w, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(P.x, P.y + P.h - 40, P.w, 2);
    drawAthlete(ctx, P.x + P.w / 2, P.y + P.h - 28 - 0.86 * P.ppm, P.ppm, Pose.run(this.t * 9, 1),
      Object.assign({}, this.col, { name: this.name, sex: this.sex, capelli: this.capelli, tenuta: this.tenuta }));
    ctx.restore();
    drawFlag(ctx, this.code, P.x + 10, P.y + 10, 30, 20);
    txt(ctx, this.name, P.x + 48, P.y + 21, 16, '#fff', 'left');
    // one row of swatches per part
    for (const row of this.rows) txt(ctx, KIT_NAME[row.k], row.x, row.y - 14, 15, '#90caf9', 'left', { italic: false });
    for (const b of this.btns) if (!b.swatch) drawBtn(ctx, b);
    for (const b of this.btns) {
      if (!b.swatch) continue;
      const sel = this.col[b.part] === b.swatch;
      ctx.fillStyle = b.swatch; rrect(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? '#ffd600' : 'rgba(0,0,0,0.55)';
      rrect(ctx, b.x, b.y, b.w, b.h, 6); ctx.stroke();
    }
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    if (this.tab) return this.drawColors(ctx);
    const W = G.W, cx = W / 2, col = HUMAN_COLS[this.i];
    panel(ctx, 24, 8, W - 48, G.H - 16);
    txt(ctx, 'GIOCATORE ' + (this.i + 1), cx, 32, 26, col.ui);
    txt(ctx, 'scrivi il nome, scegli la nazione e la mano', cx, 58, 15, '#fff', 'center', { italic: false });
    const nw = 440;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; rrect(ctx, cx - nw / 2, 72, nw, 38, 8); ctx.fill();
    ctx.strokeStyle = col.ui; ctx.lineWidth = 2; ctx.stroke();
    drawFlag(ctx, this.code, cx - nw / 2 + 10, 82, 28, 18);
    txt(ctx, this.name + (Math.sin(this.t * 6) > 0 ? '_' : ' '), cx + 14, 92, 22, '#fff', 'center', { crudo: true });
    // quanti caratteri restano: diventa giallo al limite, e lampeggia se si prova ad andare oltre
    const pieno = this.name.length >= NOME_MAX, lampo = this.pieno > 0 && Math.sin(this.t * 30) > 0;
    txt(ctx, this.name.length + '/' + NOME_MAX, cx + nw / 2 - 10, 92, 14,
      lampo ? '#ff5252' : pieno ? '#ffd600' : 'rgba(255,255,255,0.5)', 'right', { italic: false, crudo: true });
    for (const b of this.btns) if (!b.flag) drawBtn(ctx, b);
    const g = this.sc.box;
    ctx.save();
    ctx.beginPath(); ctx.rect(g.x - 4, g.y, g.w + 8, g.h); ctx.clip();
    for (const b of this.bandiere) {
      if (b.y + b.h < g.y || b.y > g.y + g.h) continue;
      const sel = b.flag === this.code;
      ctx.fillStyle = sel ? 'rgba(255,214,0,0.25)' : 'rgba(0,0,0,0.4)';
      rrect(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      drawFlag(ctx, b.flag, b.x + b.w / 2 - 29, b.y + 3, 58, 36);
      txt(ctx, b.flag, b.x + b.w / 2, b.y + b.h - 6, 12, sel ? '#ffd600' : '#fff', 'center', { italic: false, crudo: true });
      if (sel) { ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 3; rrect(ctx, b.x, b.y, b.w, b.h, 6); ctx.stroke(); }
    }
    ctx.restore();
    this.sc.fade(ctx, 14);
    if (this.sc.need) {
      // a che pagina si e', fra le due frecce
      const pag = Math.round(this.sc.off / g.h) + 1, tot = Math.ceil((this.sc.max + g.h - 1) / g.h);
      txt(ctx, pag + '/' + tot, g.x + g.w + 21, g.y + g.h / 2, 12, 'rgba(255,255,255,0.7)', 'center', { italic: false, crudo: true });
    }
    txt(ctx, 'anche da tastiera  •  INVIO = conferma', cx, 30, 12, 'rgba(255,255,255,0.55)', 'center', { italic: false, outline: false });
  }
}

// Fino alla 1.3.7 le gare di carriera non facevano record personale: i migliori di allora stanno solo
// nelle carriere. Una volta sola, all'avvio, diventano record (del livello in cui sono stati fatti, a
// nome del giocatore di quella carriera), per le Olimpiadi e per il torneo.
function importaRecordCarriera() {
  const FATTO = 'olimpiadi_record_carriera_v1';
  try { if (localStorage.getItem(FATTO)) return; } catch (e) { return; }
  const circuiti = [CIRCUITO_BASE].concat(typeof CIRCUITO_TORNEO !== 'undefined' ? [CIRCUITO_TORNEO] : []);
  for (const C of circuiti) {
    let slots = null;
    try { slots = JSON.parse(localStorage.getItem(C.key)); } catch (e) { /* niente */ }
    if (!Array.isArray(slots)) continue;
    slots.forEach((d, i) => {
      const pr = Profiles.data[i];
      if (!d || !d.best || !pr) return;
      for (const lv in d.best) {
        for (const id in d.best[lv]) {
          const meta = C.events.find(e => e.id === id), v = d.best[lv][id];
          if (!meta || typeof v !== 'number') continue;
          recordsOf(meta).submit(id, v, meta.lowerBetter, pr.name, pr.code, lv);
        }
      }
    });
  }
  // quelli del Mondiale che entrerebbero in classifica vanno in coda: se non gli e' mai stato chiesto,
  // la domanda arriva dal titolo; se ha detto MAI, niente
  if (Share.d.ok !== false) { Share.ricoda(); Share.save(); }
  try { localStorage.setItem(FATTO, '1'); } catch (e) { /* niente */ }
}
