'use strict';
// ===== Ciclismo su pista: 200 metri lanciati =====
// Il giro di lancio si fa in alto, sulla sopraelevata del velodromo, pedalando (A) per prendere
// velocità. Poi si picchia (B): scendendo verso la linea nera la pendenza regala velocità, ed è lì
// che si entra nei 200 metri cronometrati. Picchiare presto vuol dire aver perso la spinta prima
// della linea; picchiare tardi vuol dire correre i primi metri in alto, dove la strada è più lunga.
// Negli ultimi metri B è il colpo di reni: la bici spinta avanti sul traguardo, qualche centesimo.

class Ciclismo extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.LEN = 200; this.RUN = 90;      // metri di lancio prima della linea dei 200
    this.S = [];
    for (let p = 0; p < n; p++) {
      this.S.push({ ph: 'lancio', s: -this.RUN, v: this.capP(p) * 0.8, e: 4, y: 1, dive: -1, crank: rnd(0, TAU),
        t: 0, clock: null, fin: null, thrown: false, lunge: 0, boost: 0 });
    }
    this.time = 0;
  }
  labels(p) {
    const s = this.S && this.S[p];
    return ['PEDALA', !s || s.dive < 0 ? 'PICCHIATA' : 'COLPO DI RENI'];
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p] || s.fin != null) return;
    if (b === 0) { s.e = Math.min(12, s.e + 1); return; }
    if (s.dive < 0) { s.dive = 0; Snd.whoosh(); return; }
    // il colpo di reni vale solo sugli ultimi metri, e si fa una volta
    if (!s.thrown) {
      s.thrown = true;
      if (this.LEN - s.s < 3.2) { s.lunge = 0.26; Snd.tone(300, 0.08, 'square', 0.06, 1.6); }
    }
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      s.crank += (s.v / 8.6) * TAU * dt;               // rapporto da velocista: 8,6 m a pedalata
      if (this.res[p]) { s.v = Math.max(0, s.v - 1.2 * dt); s.s += s.v * dt; continue; }
      s.t += dt;
      // la pedalata: ogni colpo aggiunge spinta, che si spegne in fretta. La bici però non si
      // pianta come un corridore: smettendo di pedalare si rallenta piano, per inerzia.
      s.e -= s.e * 1.5 * dt;
      // In cima alla curva si pedala in salita: la punta e' un po' piu' bassa. Quello che la
      // picchiata regala oltre la punta si consuma in pochi secondi: chi picchia presto arriva
      // alla linea che l'ha gia' perso.
      const cap = this.capP(p);
      const tgt = Math.min(cap * (1 - 0.08 * s.y), s.e * cap / 5.2);
      if (s.v > cap) s.v -= (s.v - cap) * 0.28 * dt;
      else if (tgt > s.v) s.v += (tgt - s.v) * 0.55 * dt;
      else s.v = Math.max(tgt, s.v - 0.35 * dt);
      // la picchiata: dall'alto della curva alla linea nera in poco più di un secondo; la
      // pendenza aggiunge velocità finché si scende
      if (s.dive >= 0 && s.y > 0) {
        s.dive += dt;
        const y0 = s.y;
        s.y = Math.max(0, 1 - s.dive / 1.2);
        s.v += (y0 - s.y) * 2.6 * (this.capP(p) / 22.3);
      }
      // in alto la strada è più lunga: il cronometro conta i metri sulla linea nera
      const ds = s.v * dt / (1 + 0.06 * s.y);
      const was = s.s;
      s.s += ds;
      if (s.lunge > 0) { const k = Math.min(s.lunge, 3 * dt); s.s += k; s.lunge -= k; }
      if (was < 0 && s.s >= 0) { s.clock = -s.s / Math.max(s.v, 1); Snd.beep(false); }
      if (s.clock != null) s.clock += dt;
      if (s.clock != null && s.fin == null && s.s >= this.LEN) {
        const t = s.clock - (s.s - this.LEN) / Math.max(s.v, 1);
        s.fin = t; s.ph = 'done';
        this.finish(p, t);
        this.say(p, t.toFixed(3) + ' s', PCOL[p].ui, 4, (s.v * 3.6).toFixed(1) + ' km/h');
        Snd.applause();
      }
      if (s.fin == null && s.t > 45) { s.fin = -1; this.finish(p, null, 'RITIRATO'); }
    }
    this.baseUpdate(dt);
  }
  liveScore(q) {
    const s = this.S[q];
    if (s.fin === -1) return -1;
    return s.fin != null ? 1e6 - s.fin : s.s;
  }
  liveText() { return ''; }
  fermo(p) { return this.S[p].ph === 'done'; }
  hud(p) {
    const s = this.S[p];
    if (s.fin != null) return '';
    return s.dive < 0 ? (s.s < 0 ? 'Lancio: ' + Math.round(-s.s) + ' m alla linea' : 'Sei ancora in alto!') : '';
  }

  // ---------- disegno ----------
  // La bici e il corridore, di profilo. Tutto parte dal movimento centrale (bb): le ruote, il telaio,
  // la sella; i piedi girano sui pedali e le gambe si risolvono all'indietro fino all'anca.
  drawBike(ctx, x, gy, ppm, s, col) {
    const R = 0.34, bb = [x, gy - 0.3 * ppm];
    const P = (dx, dy) => [bb[0] + dx * ppm, bb[1] + dy * ppm];
    const rear = P(-0.41, 0.04), front = P(0.58, 0.04), seat = P(-0.17, -0.58), head = P(0.47, -0.52), bar = P(0.55, -0.5);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // ruota dietro lenticolare, davanti a tre razze
    ctx.fillStyle = '#263238';
    ctx.beginPath(); ctx.arc(rear[0], rear[1], R * ppm, 0, TAU); ctx.fill();
    ctx.fillStyle = '#455a64';
    ctx.beginPath(); ctx.arc(rear[0], rear[1], R * ppm * 0.88, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(2, ppm * 0.035);
    ctx.beginPath(); ctx.arc(front[0], front[1], R * ppm, 0, TAU); ctx.stroke();
    ctx.lineWidth = Math.max(2, ppm * 0.03); ctx.strokeStyle = '#cfd8dc';
    for (let i = 0; i < 3; i++) {
      const a = s.crank * 1.3 + i * TAU / 3;
      ctx.beginPath(); ctx.moveTo(front[0], front[1]); ctx.lineTo(front[0] + Math.cos(a) * R * ppm * 0.92, front[1] + Math.sin(a) * R * ppm * 0.92); ctx.stroke();
    }
    // telaio in carbonio col colore della squadra
    ctx.strokeStyle = col.shirt; ctx.lineWidth = Math.max(3, ppm * 0.055);
    ctx.beginPath();
    ctx.moveTo(rear[0], rear[1]); ctx.lineTo(bb[0], bb[1]); ctx.lineTo(seat[0], seat[1]); ctx.lineTo(rear[0], rear[1]);
    ctx.moveTo(seat[0], seat[1]); ctx.lineTo(head[0], head[1]); ctx.lineTo(bb[0], bb[1]);
    ctx.moveTo(head[0], head[1]); ctx.lineTo(front[0], front[1]);
    ctx.stroke();
    ctx.strokeStyle = '#212121'; ctx.lineWidth = Math.max(2, ppm * 0.04);
    ctx.beginPath(); ctx.moveTo(seat[0] - 0.08 * ppm, seat[1] - 0.03 * ppm); ctx.lineTo(seat[0] + 0.09 * ppm, seat[1] - 0.03 * ppm); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(head[0], head[1]); ctx.lineTo(bar[0], bar[1]); ctx.lineTo(bar[0] + 0.02 * ppm, bar[1] + 0.12 * ppm); ctx.stroke();
    ctx.restore();
    // il corridore: anca sulla sella, busto quasi orizzontale, mani sul manubrio basso
    const hipM = [-0.17, -0.66], torso = 1.3;
    const shM = [hipM[0] + Math.sin(torso) * BODY.torso, hipM[1] - Math.cos(torso) * BODY.torso];
    const handM = [0.57, -0.4];
    const arm = ik2(shM[0], shM[1], handM[0], handM[1], BODY.ua, BODY.fa, false);
    const foot = a => [Math.cos(a) * 0.17, Math.sin(a) * 0.17];
    const fR = foot(s.crank), fL = foot(s.crank + Math.PI);
    const leg = f => ik2(hipM[0], hipM[1], f[0], f[1] + 0.02, BODY.th, BODY.sh, false);
    const lR = leg(fR), lL = leg(fL);
    const pose = { torso, neck: -0.12, ru: arm[0], rf: arm[1], lu: arm[0] - 0.05, lf: arm[1] - 0.05, rt: lR[0], rs: lR[1], lt: lL[0], ls: lL[1] };
    const J = drawAthlete(ctx, bb[0] + hipM[0] * ppm, bb[1] + hipM[1] * ppm, ppm, pose, col);
    // casco da crono, a goccia
    ctx.fillStyle = col.shirt;
    ctx.beginPath();
    ctx.ellipse(J.head[0] - 0.05 * ppm, J.head[1] - 0.03 * ppm, 0.2 * ppm, 0.11 * ppm, 0.15, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(J.head[0] + 0.02 * ppm, J.head[1] - 0.02 * ppm, 0.08 * ppm, 0.03 * ppm);
    // pedivella e pedali
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = Math.max(2, ppm * 0.03);
    ctx.beginPath(); ctx.moveTo(bb[0] + fL[0] * ppm, bb[1] + fL[1] * ppm); ctx.lineTo(bb[0] + fR[0] * ppm, bb[1] + fR[1] * ppm); ctx.stroke();
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 4.6, ax = w * 0.34, camX = s.s;
    const sx = X => ax + (X - camX) * ppm;
    // il velodromo: tribune, poi il parquet che sale verso l'alto della curva
    Bg.sky(ctx, w, h, h * 0.08);
    Bg.crowdBand(ctx, w, h * 0.05, h * 0.3, camX * ppm * 0.3);
    const top = h * 0.3, base = h * 0.94;
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, '#c49a6c'); g.addColorStop(1, '#e0bb8a');
    ctx.fillStyle = g; ctx.fillRect(0, top, w, h - top);
    // le assi del parquet, che scorrono
    ctx.strokeStyle = 'rgba(120,80,40,0.25)'; ctx.lineWidth = 1;
    for (let X = Math.floor(camX - ax / ppm); sx(X) < w; X += 0.5) {
      ctx.beginPath(); ctx.moveTo(sx(X), top); ctx.lineTo(sx(X) - 0.3 * ppm, base); ctx.stroke();
    }
    // la côte d'azur azzurra in basso, poi la linea nera (quella che misura), la rossa e la blu
    const yl = k => lerp(base, top + 0.1 * h, k);        // k = 0 in basso, 1 in cima alla curva
    ctx.fillStyle = '#4fc3f7'; ctx.fillRect(0, base, w, h - base);
    ctx.fillStyle = '#111'; ctx.fillRect(0, yl(0.04), w, 4);
    ctx.fillStyle = '#e53935'; ctx.fillRect(0, yl(0.3), w, 3);
    ctx.fillStyle = '#1e88e5'; ctx.fillRect(0, yl(0.75), w, 3);
    // la linea dei 200 metri e l'arrivo
    for (const [X, lab, col] of [[0, 'INIZIO 200 M', '#fff'], [this.LEN, 'ARRIVO', '#ffeb3b']]) {
      const x = sx(X);
      if (x < -60 || x > w + 60) continue;
      ctx.fillStyle = X ? '#111' : '#fff'; ctx.fillRect(x - 3, top, 6, base - top);
      if (X) { ctx.fillStyle = '#fff'; for (let y = top; y < base; y += 12) ctx.fillRect(x - 3, y, 6, 6); }
      txt(ctx, lab, x, top - 10, Math.max(12, h * 0.045), col);
    }
    for (let d = Math.ceil((camX - ax / ppm) / 25) * 25; sx(d) < w + 30; d += 25) {
      if (d <= 0 || d >= this.LEN) continue;
      txt(ctx, (this.LEN - d) + ' m', sx(d), base + (h - base) / 2, Math.max(10, h * 0.04), '#01579b', 'center', { italic: false, outline: false });
    }
    // gli altri, in trasparenza, alla loro altezza sulla curva
    ctx.save(); ctx.globalAlpha = 0.33;
    for (let q = 0; q < this.n; q++) {
      if (q === p) continue;
      const o = this.S[q], x = sx(o.s);
      if (x < -80 || x > w + 80) continue;
      this.drawBike(ctx, x, yl(o.y * 0.85 + 0.04) + 0.05 * ppm, ppm * 0.9, o, PCOL[q]);
    }
    ctx.restore();
    this.drawBike(ctx, sx(s.s), yl(s.y * 0.85 + 0.04) + 0.05 * ppm, ppm, s, PCOL[p]);
    // HUD
    const t = s.fin != null && s.fin >= 0 ? s.fin : s.clock;
    txt(ctx, t == null ? '--.---' : t.toFixed(3), w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), s.v / (this.capP(p) * 1.12), PCOL[p].ui, (s.v * 3.6).toFixed(1) + ' km/h');
    if (this.n > 1) drawRaceBar(ctx, w, h, this.S.map(q => q.s + this.RUN), this.LEN + this.RUN, p);
    if (!this.msg[p] && s.fin == null) {
      if (s.dive < 0 && s.s < -35) {
        txt(ctx, 'GIRO DI LANCIO', w / 2, h * 0.2, clamp(h * 0.09, 18, 36), '#ffeb3b');
        txt(ctx, 'pedala (A), poi picchia (B) prima della linea', w / 2, h * 0.2 + clamp(h * 0.085, 15, 28), clamp(h * 0.05, 12, 19), '#fff');
      } else if (s.dive < 0 && Math.sin(G.t * 14) > -0.3) txt(ctx, s.s < 0 ? 'PICCHIA! (B)' : 'SEI IN ALTO!', w / 2, h * 0.22, clamp(h * 0.1, 18, 40), '#7CFC00');
      else if (this.LEN - s.s < 12 && !s.thrown) txt(ctx, 'COLPO DI RENI (B)', w / 2, h * 0.22, clamp(h * 0.08, 16, 32), '#ffd600');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'ciclismo', name: 'CICLISMO 200 M LANCIATO', cls: Ciclismo, lowerBetter: true,
  labels: ['PEDALA', 'PICCHIATA'],
  help: ['A: pedala per prendere velocità in alto sulla curva.', 'B: picchia verso la linea nera poco prima dei 200 metri,', 'e sul traguardo B è il colpo di reni.'],
  fmt: v => v.toFixed(3) + ' s', pts: Pts.track(63, 14, 1.8),
});
