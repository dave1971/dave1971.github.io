'use strict';
// ===== Volteggio =====
// A = rincorsa, sempre più veloce. B quando arrivi sulla pedana elastica: più sei centrato, più
// spinta ti restituisce. Da lì l'atleta si ribalta sulle mani, appoggia al castello e vola: da quel
// momento i comandi sono quelli dei tuffi, A tenuto per raggrupparsi e girare veloce, B per gli
// avvitamenti. Si atterra in piedi sul tappeto, quindi i salti mortali vanno contati interi.
// 3 volteggi, punteggi sommati.
//
// Quanto puoi girare non lo decidi in aria: lo decidono la velocità della rincorsa e i DUE stacchi,
// quello sulla pedana e la repulsione delle braccia sul castello, che insieme fanno l'altezza e
// quindi il tempo che hai. È per questo che qui servono sia la corsa che la tecnica.
//
// Il corpo teso gira sempre quel tanto che basta a rimettere i piedi sotto: un volteggio teso si
// chiude, sempre, a qualunque livello e anche con un brutto stacco. Tutto il resto lo aggiunge il
// raggruppamento, e lì conta quanto sei salito: i giri in più si pagano in tempo di volo.

class Vault extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.vaults = 3;
    this.runup = 25;          // metri di rincorsa
    this.boardX = 0;          // la pedana elastica
    this.tableX = 2.15; this.tableW = 1.2; this.tableH = 1.25;
    this.matX = 3.6; this.matW = 4.6;
    // Quando e' a testa in giu' le mani stanno 1,13 m oltre l'anca (busto piu' braccia): perche'
    // appoggino sul piano del castello, l'anca deve stare a quell'altezza piu' 1,13.
    this.hip0 = this.tableH + 1.13;
    this.pushAng = Math.PI;            // la repulsione si dà sulla verticale: il corpo dritto sulle mani
    this.pushBand = Math.PI * 0.16;    // quanto si può sbagliare prima di non spingere più niente
    this.pushEnd = Math.PI * 1.30;     // oltre questo le mani lasciano comunque, senza spinta
    this.handW = 1.15;                 // quanto in fretta il corpo passa per la verticale, rad/s
    this.hipStand = 0.93;     // e quando i piedi tornano sul tappeto
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ k: 0, total: 0 }, p));
  }
  // mezzi avvitamenti concessi dal campionato, come nei tuffi e nel trampolino
  // Il secondo volo dura meno di un secondo e ogni mezzo avvitamento ne chiede un quarto: chiederne
  // sei sarebbe chiederne di impossibili, quindi qui il campionato ne concede meno che sul trampolino.
  twMax() { return [2, 3, 4][clamp(Lv.i, 1, 3) - 1]; }
  fresh(o, p) {
    return { k: o.k, total: o.total, ph: 'ready', r: new Runner({ x: -this.runup, vmax: this.capP(p), gain: passoUnDito(this.capP(p)) }),   // col solo A: B e' la battuta
      x: -this.runup, y: 0, vy: 0, v: 0, q: 0, q2: 0, ang: 0, w: 0, w0: 1, wt: 1, zoom: 5.6,
      tuck: false, twist: 0, tw: 0,
      t: 0, pt: 0, sc: null, foul: false, why: '' };
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (s.ph === 'ready') { if (b === 0) { s.ph = 'run'; s.r.tap(); } return; }
    if (s.ph === 'run') { if (b === 0) s.r.tap(); else this.punch(p, s); return; }
    if (s.ph === 'hands') { if (b === 1) this.repulse(p, s); return; }
    if (s.ph === 'air') {
      if (b === 0) s.tuck = true;
      else if (s.twist < this.twMax()) { s.twist++; s.tw = 0.25; Snd.click(); }
    }
  }
  release(p, b) { if (b === 0) this.S[p].tuck = false; }

  /** B sulla pedana: la distanza dal centro decide quanta spinta torna indietro. */
  punch(p, s) {
    const d = Math.abs(s.r.x - this.boardX);
    s.q = clamp(1 - d / 0.85, 0, 1);
    s.x = s.r.x; s.v = s.r.v;
    s.ph = 'board'; s.t = 0; s.pt = 0;
    Snd.jump();
  }
  /**
   * La repulsione: le braccia spingono via il castello. Va data quando il corpo è in verticale
   * sopra le mani — prima si spinge in avanti invece che in alto, dopo si è già persa la spinta.
   */
  repulse(p, s) {
    if (s.q2) return;
    s.q2 = clamp(1 - Math.abs(s.ang - this.pushAng) / this.pushBand, 0, 1);
    Snd.step();
    this.fly(p, s);
  }
  /** Quanto dura il secondo volo, dall'altezza delle mani ai piedi sul tappeto. */
  flight(vy) { return (vy + Math.sqrt(vy * vy + 19.6 * (this.hip0 - this.hipStand))) / 9.8; }
  /** Le mani lasciano il castello: da qui in poi è un tuffo. */
  fly(p, s) {
    // altezza del secondo volo: la rincorsa dice quanta ce n'e' in tutto, i due stacchi quanta
    // se ne trasforma in salita. Senza repulsione si passa il castello e basta.
    // La rincorsa conta, ma conta poco: un salto mortale deve stare in aria a ogni livello e per
    // ogni atleta, anche per quello appena iscritto alla carriera. Con una pendenza piu' ripida
    // l'universitario restava in aria otto decimi, e in otto decimi il giro non ci sta comunque
    // tu prenda i due stacchi. Il minimo e' solo una rete di sicurezza.
    s.vy = Math.max(2.2, 4.40 + 0.56 * (s.v - 6)) * (0.55 + 0.25 * s.q + 0.20 * s.q2);
    s.vx = 1.9 + 0.1 * s.v;
    s.y = this.hip0; s.ang = Math.PI;
    // Il corpo teso fa mezzo giro nel tempo che sta in aria, né uno di più né uno di meno: così un
    // volteggio teso finisce sempre in piedi. Chi vola più in alto non gira più in fretta, gira più
    // a lungo — e quel tempo in più se lo prende raggruppandosi.
    s.w = s.w0 = Math.PI / this.flight(s.vy);
    s.wt = 7.6 + 4.0 * this.pf[p];      // raggruppato: quanto stretto sai stare
    s.ph = 'air'; s.t = 0; s.tuck = false;
    Snd.step();
  }
  update(dt0) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      const dt = dt0;
      s.t += dt;
      // la telecamera si allarga mentre l'atleta sale, se no la testa esce dal quadro; e torna
      // indietro piano, così l'atterraggio non fa un salto di zoom
      const zw = 5.6 + clamp(s.y - 2.3, 0, 2.2) * 0.55;
      s.zoom += (zw - s.zoom) * Math.min(1, (zw > s.zoom ? 9 : 2.5) * dt);
      switch (s.ph) {
        case 'run':
          s.r.update(dt); s.x = s.r.x;
          if (s.r.x > 0.85) {
            s.ph = 'done'; s.t = 0; s.foul = true; s.why = 'non hai staccato sulla pedana';
            this.say(p, 'NULLO!', '#ff5555', 1.9, s.why); Snd.fail();
          }
          break;
        case 'board':                       // la pedana si schiaccia e restituisce
          s.pt += dt; s.x += s.v * 0.55 * dt;
          if (s.pt > 0.14) { s.ph = 'pre'; s.pt = 0; }
          break;
        case 'pre': {                       // primo volo: il corpo si ribalta verso il castello
          s.pt += dt;
          const k = clamp(s.pt / 0.30, 0, 1);
          s.x = lerp(this.boardX + 0.2, this.tableX + 0.15, k);
          s.ang = Math.PI * 0.86 * k;
          if (k >= 1) { s.ph = 'hands'; s.pt = 0; }
          break;
        }
        case 'hands':                       // appoggio: il corpo passa per la verticale sulle mani
          s.pt += dt;
          s.ang += this.handW * dt;
          if (s.ang >= this.pushEnd) { s.q2 = 0; this.fly(p, s); }   // nessuna repulsione: si sale poco
          break;
        case 'air':
          s.vy -= 9.8 * dt; s.y += s.vy * dt; s.x += s.vx * dt;
          // raggruppandosi si gira più in fretta; distendendosi si torna alla rotazione del corpo
          // teso, che è quella che rimette i piedi sotto: distesi si atterra sempre in piedi
          s.w += ((s.tuck ? s.wt : s.w0) - s.w) * Math.min(1, (s.tuck ? 9 : 13) * dt);
          s.ang += s.w * dt;
          s.tw -= dt;
          if (s.y <= this.hipStand && s.vy < 0) this.landing(p, s);
          break;
        case 'land':
          if (s.t > 0.9) { s.ph = 'score'; s.t = 0; this.showScore(p, s); }
          break;
        case 'done':
          if (s.foul) { s.r.e = 0; s.r.update(dt); s.x = s.r.x; }
          if (s.t > 2.2) this.next(p, s);
          break;
        case 'score':
          if (s.t > 3) this.next(p, s);
          break;
      }
    }
    this.baseUpdate(dt0);
  }
  next(p, s) {
    s.k++;
    if (s.k >= this.vaults) this.finish(p, s.total);
    else this.S[p] = this.fresh(s, p);
  }
  /** Piedi sul tappeto: contano solo i giri interi, come sul trampolino. */
  landing(p, s) {
    s.y = this.hipStand;
    const turns = Math.max(0, Math.round(s.ang / TAU));
    const err = Math.abs(s.ang - turns * TAU) * 180 / Math.PI;
    const dd = Math.round((1.0 + 0.4 * turns + 0.2 * s.twist) * 10) / 10;
    let ex = 10 - err / 14 - (s.tuck ? 3 : 0) - (s.tw > 0 ? 2 : 0) - (1 - s.q) * 0.9 - (1 - s.q2) * 0.9;
    ex = clamp(ex, 0, 10) * this.pf[p];
    const judges = [0, 1, 2].map(() => clamp(Math.round((ex + rnd(-0.6, 0.6)) * 2) / 2, 0, 10));
    const score = Math.round(judges.reduce((a, b) => a + b, 0) * dd * 100) / 100;
    s.total = Math.round((s.total + score) * 100) / 100;
    s.sc = { judges, dd, score, turns, err };
    s.ph = 'land'; s.t = 0;
    Snd.thud();
  }
  showScore(p, s) {
    const c = s.sc;
    const name = (c.turns <= 1 ? 'volteggio teso' : (c.turns - 1) + (c.turns === 2 ? ' salto mortale' : ' salti mortali'))
      + (s.twist ? ' + ' + (s.twist / 2) + ' avv.' : '');
    const col = c.score >= 60 ? '#7CFC00' : c.score >= 30 ? '#fff' : '#ff8a80';
    this.say(p, c.score.toFixed(2), col, 3, name + '  •  giudici ' + c.judges.join(' - ') + '  •  coeff. ' + c.dd.toFixed(1));
    if (c.score >= 45) Snd.applause(); else Snd.fail();
  }
  liveScore(q) { return this.S[q].total; }
  hud(p) { const s = this.S[p]; return 'Volteggio ' + Math.min(s.k + 1, this.vaults) + '/' + this.vaults + '  •  Totale ' + s.total.toFixed(2); }

  /** Dove finisce l'asse del corpo se molli il raggruppamento adesso. */
  predict(s) {
    let y = s.y, vy = s.vy, w = s.w, ang = s.ang;
    const dt = 1 / 120;
    for (let i = 0; i < 2000 && (y > this.hipStand || vy > 0); i++) {
      vy -= 9.8 * dt; y += vy * dt;
      w += (s.w0 - w) * Math.min(1, 13 * dt);
      ang += w * dt;
    }
    return ang;
  }

  // ---------- disegno ----------
  drawKit(ctx, sx, gy, ppm) {
    // pedana elastica: un piano inclinato spesso, con la molla sotto e il bordo di richiamo
    const bx = sx(this.boardX - 0.6), bw = 1.2 * ppm, th = 0.09 * ppm;
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(bx + bw * 0.52, gy - 0.2 * ppm, 0.09 * ppm, 0.2 * ppm);   // la molla
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(bx, gy - 0.03 * ppm); ctx.lineTo(bx + bw, gy - 0.32 * ppm);
    ctx.lineTo(bx + bw, gy - 0.32 * ppm + th); ctx.lineTo(bx, gy - 0.03 * ppm + th);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx + bw - 0.1 * ppm, gy - 0.32 * ppm, 0.1 * ppm, th);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(bx, gy - 0.02 * ppm, bw, 0.03 * ppm);
    // castello
    const tx = sx(this.tableX - this.tableW / 2), tw = this.tableW * ppm, ty = gy - this.tableH * ppm;
    ctx.fillStyle = '#607d8b'; ctx.fillRect(tx + tw * 0.42, ty, 0.14 * ppm, this.tableH * ppm);
    ctx.fillStyle = '#455a64'; ctx.fillRect(tx + tw * 0.3, gy - 0.05 * ppm, tw * 0.4, 0.05 * ppm);
    ctx.fillStyle = '#e0e0e0';
    rrect(ctx, tx, ty, tw, 0.22 * ppm, 0.1 * ppm); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(tx, ty + 0.16 * ppm, tw, 0.05 * ppm);
    // tappeto
    const mx = sx(this.matX), mw = this.matW * ppm;
    ctx.fillStyle = '#1565c0'; ctx.fillRect(mx, gy - 0.2 * ppm, mw, 0.2 * ppm);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(mx, gy - 0.2 * ppm, mw, 0.03 * ppm);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(mx + mw * 0.45, gy - 0.2 * ppm, 2, 0.2 * ppm);
  }
  // La zona di stacco sulla pedana: la fascia verde è dove la pedana rende tutto, la gialla dove
  // rende ancora qualcosa. La lancetta segue i piedi e cambia colore come la fascia che tocca.
  drawBoardZone(ctx, sx, gy, ppm, s) {
    const band = (a, b, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(sx(a), gy - 0.06 * ppm, Math.max(2, sx(b) - sx(a)), 0.06 * ppm);
    };
    band(-0.85, 0.85, 'rgba(255,214,0,0.30)');
    band(-0.28, 0.28, 'rgba(0,230,60,0.55)');
    if (s.ph !== 'run' && s.ph !== 'ready') return;
    const d = Math.abs(s.r.x - this.boardX);
    const col = s.r.x > 0.6 ? '#ff5252' : d <= 0.28 ? '#00e63c' : d <= 0.85 ? '#ffd600' : '#ff9800';
    const x = sx(s.r.x);
    ctx.fillStyle = col;
    ctx.fillRect(x - 2, gy - 0.5 * ppm, 4, 0.5 * ppm);
    ctx.beginPath();
    ctx.moveTo(x - 9, gy - 0.5 * ppm - 12); ctx.lineTo(x + 9, gy - 0.5 * ppm - 12);
    ctx.lineTo(x, gy - 0.5 * ppm); ctx.closePath(); ctx.fill();
  }
  // Il quadrante della repulsione: l'angolo del corpo sulle mani, con lo spicchio verde dove
  // spingere. Compare dal primo volo, così lo si vede arrivare invece di subirlo.
  drawPush(ctx, w, h, s) {
    const R = clamp(h * 0.16, 34, 74), cx = w - R - 22, cy = h * 0.46;
    const err = Math.abs(s.ang - this.pushAng);
    const live = s.ph === 'hands';
    const col = !live ? '#90a4ae' : err <= this.pushBand * 0.35 ? '#00e63c' : err <= this.pushBand ? '#ffd600' : '#ff5252';
    // sul quadrante l'angolo 0 è il corpo in piedi e cresce in avanti, come la rotazione vera
    const A = a => a - Math.PI / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,0,0.28)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, A(this.pushAng - this.pushBand), A(this.pushAng + this.pushBand));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,230,60,0.55)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, A(this.pushAng - this.pushBand * 0.35), A(this.pushAng + this.pushBand * 0.35));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(A(s.ang)) * R * 0.28, cy - Math.sin(A(s.ang)) * R * 0.28);
    ctx.lineTo(cx + Math.cos(A(s.ang)) * R * 0.92, cy + Math.sin(A(s.ang)) * R * 0.92);
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    txt(ctx, 'REPULSIONE', cx, cy - R - 12, Math.max(10, R * 0.22), '#fff');
    txt(ctx, live ? 'PREMI B' : 'arriva...', cx, cy + R + 14, Math.max(11, R * 0.26), live ? col : '#90a4ae');
  }
  pose(s) {
    if (s.ph === 'ready') return Pose.stand();
    if (s.ph === 'run' || (s.ph === 'done' && s.foul)) return Pose.run(s.r.ph, s.r.k());
    if (s.ph === 'board') return lerpPose(Pose.run(1.3, 1), Pose.armsOut(), 0.6);
    if (s.ph === 'pre') { const q = Pose.straight(); q.rot = s.ang; return q; }
    if (s.ph === 'hands') {                       // sulle mani: le gambe si aprono appena, poi spingono
      const q = Pose.straight();
      const k = clamp((s.ang - Math.PI * 0.86) / (this.pushEnd - Math.PI * 0.86), 0, 1);
      q.lt = -0.12 * k; q.rt = 0.12 * k; q.ls = -0.1 * k; q.rs = 0.1 * k;
      q.rot = s.ang;
      return q;
    }
    if (s.ph === 'air') { const q = s.tuck ? Pose.tuck() : Pose.straight(); q.rot = s.ang; return q; }
    return Pose.stand();                                    // atterrato: in piedi sul tappeto
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / s.zoom, ax = w * 0.3;
    // la telecamera insegue la rincorsa e poi si ferma, così pedana, castello e tappeto restano in quadro
    const camX = Math.min(s.x, 1.35);
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = X => ax + (X - camX) * ppm;
    const gy = L.gy;
    this.drawKit(ctx, sx, gy, ppm);
    this.drawBoardZone(ctx, sx, gy, ppm, s);
    // l'atleta
    const hy = s.ph === 'air' || s.ph === 'land' ? gy - s.y * ppm
      : s.ph === 'pre' ? gy - lerp(1.0, this.hip0, clamp(s.ang / (Math.PI * 0.86), 0, 1)) * ppm
        : s.ph === 'hands' ? gy - this.hip0 * ppm
        : s.ph === 'board' ? gy - (0.86 + 0.1 * Math.sin(s.pt / 0.14 * Math.PI)) * ppm
          : gy - (0.87 + 0.05 * Math.abs(Math.sin(s.r.ph))) * ppm;
    const hx = sx(s.ph === 'run' || (s.ph === 'done' && s.foul) ? s.r.x : s.x);
    if (s.ph !== 'land' || s.t < 0.75) shadow(ctx, hx, gy, ppm, s.ph === 'air' ? 0.6 : 1);
    ctx.save();
    if (s.tw > 0) { ctx.translate(hx, hy); ctx.scale(Math.max(0.16, Math.abs(Math.cos((0.3 - s.tw) / 0.3 * Math.PI))), 1); ctx.translate(-hx, -hy); }
    drawAthlete(ctx, hx, hy, ppm, this.pose(s), PCOL[p]);
    ctx.restore();
    // indicatori: la velocità della rincorsa e, in volo, dove finirà l'asse del corpo
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), (s.ph === 'run' ? s.r.v : s.v) / this.capP(p),
      PCOL[p].ui, ((s.ph === 'run' ? s.r.v : s.v) * 3.6).toFixed(0) + ' km/h');
    if (s.ph === 'pre' || s.ph === 'hands') this.drawPush(ctx, w, h, s);
    if (s.ph === 'air') {
      txt(ctx, (s.ang / TAU).toFixed(1) + ' giri', w - 16, h * 0.12, clamp(h * 0.09, 15, 30), '#fff', 'right');
      txt(ctx, s.tuck ? 'RAGGRUPPATO' : 'DISTESO', w - 16, h * 0.12 + clamp(h * 0.09, 15, 30), clamp(h * 0.06, 11, 20),
        s.tuck ? '#ffeb3b' : '#b2ff59', 'right');
      this.drawSpin(ctx, w, h, s);
    }
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'VOLTEGGIO ' + (s.k + 1) + ' DI ' + this.vaults, w / 2, h * 0.28, clamp(h * 0.12, 20, 42), '#ffeb3b');
      txt(ctx, 'premi A per la rincorsa', w / 2, h * 0.28 + clamp(h * 0.1, 16, 32), clamp(h * 0.07, 13, 24), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}
// il quadrante è quello del trampolino: un solo spicchio verde, si atterra in piedi
Vault.prototype.drawSpin = Trampoline.prototype.drawSpin;

registerEvent({
  id: 'volteggio', name: 'VOLTEGGIO', cls: Vault, lowerBetter: false,
  labels: ['CORRI/RAGGR.', 'STACCA/AVVITA'],
  help: ['A: rincorsa. B sulla pedana elastica (fascia verde) per staccare,',
    'B di nuovo quando sei in verticale sulle mani: e\u0300 la repulsione, e ti manda in alto.',
    'Poi A tenuto per girare, B per gli avvitamenti. Distendendoti atterri in piedi.'],
  fmt: Fmt.pts, pts: v => v == null ? 0 : Math.round(v * 3),
});
