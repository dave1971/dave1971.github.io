'use strict';
// ===== Arrampicata, specialità speed =====
// Quindici metri di parete, sempre la stessa via, e si sale a mani alterne: A la mano destra, B la
// sinistra. Non vince chi preme più in fretta: dopo ogni presa il corpo ha bisogno di un attimo per
// caricarsi sulla mano nuova, e chi parte prima **scivola** e perde mezzo secondo a ritrovare la
// presa. L'anello attorno alla mano che deve partire si riempie e diventa verde quando si può:
// il segreto è andare a ritmo, non aspettare il verde e poi reagire.
// La stessa mano due volte di fila non sale: è una presa buttata.

// La via: di quanto sale ogni presa, in metri. Quasi tutte uguali, qualcuna lunga (un lancio) e
// qualcuna corta: un ritmo tutto uguale si imparerebbe in una gara sola.
const VIA_SPEED = [0.72, 0.78, 0.74, 1.05, 0.66, 0.80, 0.78, 0.95, 0.62, 0.84, 0.76, 1.08, 0.70, 0.80, 0.86, 0.96];
const MURO_H = 15;

// Braccio (o gamba) a due segmenti risolto all'indietro: dalla radice al punto dove deve finire la
// mano. Dei due gomiti possibili si tiene quello dal lato "segno" (in su per le braccia, verso la
// parete per le ginocchia). Angoli come nelle pose: 0 = verso il basso, positivo = in avanti.
function ik2(sx, sy, tx, ty, L1, L2, alto) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const hi = L1 + L2 - 0.004, lo = Math.abs(L1 - L2) + 0.004;
  if (d > hi || d < lo) { const k = (d > hi ? hi : lo) / Math.max(d, 1e-6); dx *= k; dy *= k; d = Math.hypot(dx, dy); }
  const base = Math.atan2(dx, dy);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  let best = null;
  for (const sign of [-1, 1]) {
    const u = base + sign * a, ex = sx + Math.sin(u) * L1, ey = sy + Math.cos(u) * L1;
    const score = alto ? -ey : ex;                 // gomito alto, oppure ginocchio verso la parete
    if (!best || score > best[2]) best = [u, Math.atan2(tx - ex, ty - ey), score];
  }
  return best;
}

class Arrampicata extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.st = new Starter(n);
    this.place = 0;
    // l'altezza di ogni presa delle mani: si parte con le mani a 1,9 e 2,1 m, l'ultima è la pedana in cima
    this.H = [1.9, 2.1];
    for (const s of VIA_SPEED) this.H.push(this.H[this.H.length - 1] + s * (MURO_H - 2.1) / VIA_SPEED.reduce((a, b) => a + b, 0));
    this.moves = VIA_SPEED.length;
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push({ k: 0, ready: 0, need: this.need(p, 0), last: -1, anim: 1, slip: 0, slips: 0, fin: null, hipY: 0, mv: 0 });
  }
  // quanto deve aspettare il corpo prima della presa numero k: più lunga la presa, più tempo
  need(p, k) { return (VIA_SPEED[Math.min(k, this.moves - 1)] / 0.8) / this.capP(p); }
  labels() { return ['DESTRA', 'SINISTRA']; }
  press(p, b) {
    const s = this.S[p];
    if (s.fin != null || this.res[p]) return;
    if (this.st.press(p) !== 'ok') return;
    if (s.slip > 0) return;                               // sta ancora ritrovando la presa
    const want = s.k % 2 === 0 ? 0 : 1;                   // A per la prima, poi alterne
    if (b !== want) { s.slip = 0.25; s.slips++; Snd.tone(180, 0.08, 'square', 0.06); this.say(p, 'MANO SBAGLIATA', '#ffab40', 0.6); return; }
    if (s.ready < s.need) {
      // troppo presto: il piede scappa e si perde mezzo secondo a ritrovare la presa
      s.slip = 0.5; s.slips++; s.ready = 0;
      Snd.tone(420, 0.25, 'sawtooth', 0.06, 0.4);
      this.say(p, 'SCIVOLA!', '#ff5252', 0.7);
      return;
    }
    s.k++; s.ready = 0; s.anim = 0; s.mv = b;
    s.need = this.need(p, s.k);
    Snd.tone(150 + s.k * 12, 0.05, 'triangle', 0.1);
    if (s.k >= this.moves) {
      const t = this.st.raceT;
      s.fin = t; this.place++;
      this.finish(p, t);
      this.say(p, Fmt.time(t), PCOL[p].ui, 4, this.n > 1 ? this.place + '° posto' : '');
      Snd.beep(true); Snd.applause();
    }
  }
  update(dt) {
    if (this.st.update(dt) === 'restart') for (const s of this.S) Object.assign(s, { k: 0, ready: 0, slip: 0, anim: 1 });
    for (let p = 0; p < this.n; p++) if (this.st.dq[p] && !this.res[p]) this.finish(p, null, 'SQUALIF.');
    if (this.st.running()) {
      for (let p = 0; p < this.n; p++) {
        const s = this.S[p];
        if (this.st.dq[p] || s.fin != null) continue;
        if (s.slip > 0) s.slip -= dt; else s.ready += dt;
        if (this.st.raceT > 45) { s.fin = -1; this.finish(p, null, 'RITIRATO'); }
      }
    }
    for (const s of this.S) s.anim = Math.min(1, s.anim + dt / 0.16);
    this.baseUpdate(dt);
  }
  hud(p) {
    if (this.st.dq[p]) return 'SQUALIFICATO';
    const s = this.S[p];
    return this.st.fs[p] ? 'Falsa partenza: 1' : s.slips ? 'Scivolate: ' + s.slips : '';
  }
  height(q) {
    const s = this.S[q], k = Math.min(s.k, this.moves);
    return this.H[k + 1] || MURO_H;
  }
  liveScore(q) {
    const s = this.S[q];
    if (this.st.dq[q] || s.fin === -1) return -1;
    return s.fin != null ? 1e6 - s.fin : this.height(q);
  }
  liveText() { return ''; }

  // ---------- disegno ----------
  // Dove stanno le due mani: la destra sull'ultima presa dispari, la sinistra sull'ultima pari.
  // La mano che si sta muovendo va dalla presa vecchia a quella nuova con un piccolo arco.
  handsOf(s) {
    const k = s.k, e = s.anim;
    const top = k + 1, other = k;                         // la presa appena presa e quella sotto
    const tip = this.H[Math.min(top, this.H.length - 1)], low = this.H[other];
    const from = this.H[Math.max(0, top - 2)];
    const yMoving = lerp(from, tip, e * e * (3 - 2 * e));
    const moving = (top % 2 === 0) ? 'R' : 'L';           // le prese pari sono della destra
    // il bacino sale insieme alla mano: resta un metro sotto la presa piu' alta, cosi' le braccia
    // (lunghe 58 cm) ci arrivano davvero
    const hip = lerp(Math.max(from, low), Math.max(tip, low), e) - 1.0;
    return { R: moving === 'R' ? yMoving : low, L: moving === 'L' ? yMoving : low, arc: Math.sin(e * Math.PI) * 0.12, moving, hip };
  }
  climber(ctx, s, wx, yOf, ppm, col, alpha) {
    const hands = this.handsOf(s);
    const hip = hands.hip;
    const hipX = -0.36;                                   // metri dalla parete
    const torso = -0.08, ssx = hipX + Math.sin(torso) * BODY.torso, ssy = hip + Math.cos(torso) * BODY.torso;
    // le mani sulle prese, sulla faccia della parete (x = 0): in coordinate del corpo y va in giu'
    const arm = (hy, extra) => ik2(ssx, -ssy, -0.02 - extra, -hy, BODY.ua, BODY.fa, true);
    const aR = arm(hands.R, hands.moving === 'R' ? hands.arc : 0), aL = arm(hands.L, hands.moving === 'L' ? hands.arc : 0);
    // i piedi su due appoggi sotto il bacino, alterni come le mani
    const f1 = hip - (s.k % 2 ? 0.45 : 0.8), f2 = hip - (s.k % 2 ? 0.85 : 0.4);
    const leg = fy => ik2(hipX, -hip, -0.03, -fy, BODY.th, BODY.sh, false);
    const lR = leg(f1), lL = leg(f2);
    const pose = { torso, neck: -0.25, ru: aR[0], rf: aR[1], lu: aL[0], lf: aL[1], rt: lR[0], rs: lR[1], lt: lL[0], ls: lL[1] };
    // il corpo si disegna con l'anca nell'origine: le coordinate sopra sono relative alla parete
    ctx.save();
    ctx.globalAlpha = alpha;
    drawAthlete(ctx, wx + hipX * ppm, yOf(hip), ppm, pose, col);
    ctx.restore();
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 5.6, wx = w * 0.56;
    // la camera segue il bacino, senza scendere sotto il pavimento
    const hip = this.handsOf(s).hip;
    const camY = Math.max(h * 0.9 / ppm - 0.2, hip + h * 0.52 / ppm);
    const yOf = m => (camY - m) * ppm;                    // metri da terra -> pixel sullo schermo
    Bg.sky(ctx, w, h, h);
    Bg.crowdBand(ctx, w, yOf(9), yOf(0.6), 0);
    // la parete: pannelli, righe dei metri, prese rosse, la pedana in cima
    ctx.fillStyle = '#546e7a'; ctx.fillRect(wx, 0, w - wx, h);
    for (let m = 0; m <= MURO_H; m += 1.5) {
      const y = yOf(m);
      if (y < -10 || y > h + 10) continue;
      ctx.fillStyle = (m / 1.5) % 2 ? '#5f7d8c' : '#577482'; ctx.fillRect(wx, y - 1.5 * ppm, w - wx, 1.5 * ppm);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(wx, 0, 4, h);
    for (let m = 1; m < MURO_H; m++) {
      const y = yOf(m);
      if (y < -10 || y > h + 10) continue;
      txt(ctx, m + ' m', wx + 0.9 * ppm, y, Math.max(10, h * 0.035), 'rgba(255,255,255,0.45)', 'center', { italic: false });
    }
    for (let i = 0; i < this.H.length - 1; i++) {
      const y = yOf(this.H[i]);
      if (y < -20 || y > h + 20) continue;
      const next = i === s.k + 2 && s.fin == null && this.st.running();
      ctx.fillStyle = next ? (s.ready >= s.need ? '#76ff03' : '#ffca28') : '#e53935';
      ctx.beginPath(); ctx.ellipse(wx + 0.06 * ppm, y, 0.09 * ppm, 0.07 * ppm, 0, 0, TAU); ctx.fill();
    }
    // gli appoggi dei piedi, piu' piccoli
    ctx.fillStyle = '#c62828';
    for (let m = 0.4; m < MURO_H - 0.5; m += 0.55) {
      const y = yOf(m);
      if (y > -10 && y < h + 10) { ctx.beginPath(); ctx.arc(wx + 0.04 * ppm, y, 0.045 * ppm, 0, TAU); ctx.fill(); }
    }
    const pad = yOf(MURO_H);
    if (pad > -40) {
      ctx.fillStyle = s.fin != null && s.fin >= 0 ? '#76ff03' : '#ffd600';
      ctx.fillRect(wx - 0.05 * ppm, pad - 0.3 * ppm, 0.7 * ppm, 0.3 * ppm);
      txt(ctx, 'TOP', wx + 0.3 * ppm, pad - 0.5 * ppm, Math.max(12, h * 0.05), '#ffd600');
    }
    // il pavimento con il materasso
    const gy = yOf(0);
    if (gy < h + 5) { ctx.fillStyle = '#1565c0'; ctx.fillRect(0, gy, w, h - gy + 5); ctx.fillStyle = '#0d47a1'; ctx.fillRect(0, gy, w, 5); }
    // l'arrampicatore
    this.climber(ctx, s, wx, yOf, ppm, PCOL[p], s.slip > 0 && Math.sin(G.t * 40) > 0 ? 0.55 : 1);
    // l'anello del ritmo attorno alla mano che deve partire
    if (this.st.running() && s.fin == null && s.slip <= 0) {
      const k = clamp(s.ready / s.need, 0, 1), y = yOf(this.H[Math.min(s.k + 2, this.H.length - 1)]);
      ctx.strokeStyle = k >= 1 ? '#76ff03' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(wx + 0.06 * ppm, y, 0.24 * ppm, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      txt(ctx, s.k % 2 ? 'B' : 'A', wx - 0.45 * ppm, y, Math.max(14, ppm * 0.3), k >= 1 ? '#76ff03' : '#fff');
    }
    // a destra, la parete in piccolo con tutti gli avversari
    if (this.n > 1) {
      const bx = w - 26, by0 = h * 0.18, by1 = h * 0.92;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; rrect(ctx, bx - 8, by0 - 8, 16, by1 - by0 + 16, 8); ctx.fill();
      for (let q = this.n - 1; q >= 0; q--) {
        const qq = q === p ? -1 : q;
        if (qq < 0) continue;
        const y = lerp(by1, by0, clamp(this.height(q) / MURO_H, 0, 1));
        ctx.fillStyle = PCOL[q].ui; ctx.beginPath(); ctx.arc(bx, y, 4.5, 0, TAU); ctx.fill();
      }
      const y = lerp(by1, by0, clamp(this.height(p) / MURO_H, 0, 1));
      ctx.fillStyle = PCOL[p].ui; ctx.beginPath(); ctx.arc(bx, y, 7, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    const t = s.fin != null && s.fin >= 0 ? s.fin : this.st.raceT;
    txt(ctx, t.toFixed(2), wx - 20, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), this.height(p) / MURO_H, PCOL[p].ui, this.height(p).toFixed(1) + ' m');
    if (this.st.text && !this.msg[p]) {
      const c = this.st.state === 'go' ? '#7CFC00' : this.st.state === 'false' ? '#ff5555' : '#ffeb3b';
      txt(ctx, this.st.text, w * 0.28, h * 0.3, clamp(h * 0.12, 20, 44), c);
    }
    if (!this.msg[p] && this.st.state === 'marks') {
      txt(ctx, 'mani alterne, a ritmo: aspetta il verde', w * 0.28, h * 0.42, clamp(h * 0.05, 12, 18), '#fff');
    }
    ctx.save(); ctx.translate(-w * 0.22, 0); this.drawMsg(ctx, p, w, h); ctx.restore();
  }
}

registerEvent({
  id: 'arrampicata', name: 'ARRAMPICATA SPEED', cls: Arrampicata, lowerBetter: true,
  labels: ['DESTRA', 'SINISTRA'],
  help: ['Sali a mani alterne: A destra, B sinistra. Quando l\'anello', 'diventa verde la presa è pronta: se premi prima scivoli', 'e perdi tempo. Non mashare: trova il ritmo!'],
  fmt: Fmt.time, pts: Pts.track(32.3, 12, 1.8),
});
