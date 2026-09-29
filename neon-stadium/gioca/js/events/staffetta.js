'use strict';
// ===== Staffetta 4×100 =====
// Si corre l'ultima frazione. Le prime tre le hanno corse i compagni: il tempo della squadra e'
// gia' sul cronometro quando il terzo frazionista arriva lanciato col testimone. Il mestiere e' il
// cambio, che nella realta' fa vincere e perdere piu' staffette delle gambe:
//   A  = parti (quando il compagno passa sul segno bianco) e poi corri
//   B  = tieni B per allungare la mano indietro: il testimone passa appena il compagno ti arriva
//        a un braccio di distanza. Con la mano indietro si corre un po' piu' piano.
// Il cambio va fatto dentro la zona di 30 metri: uscirne col testimone ancora in mano al compagno
// squalifica la squadra. Dopo il cambio corrono tutti e due i tasti, come nei 100.
//
// Le distanze sono quelle vere del giro di pista, in metri dalla partenza: la zona del terzo
// cambio va dai 290 ai 320, l'arrivo e' ai 400.

class Staffetta extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.Z0 = 290; this.Z1 = 320; this.END = 400;
    this.X0 = 250;            // dove si comincia a guardare la gara: il compagno a 40 m dalla zona
    // Il tempo delle prime tre frazioni, squadra per squadra: 100 m dai blocchi e 150 lanciati.
    // Chi ha i compagni piu' lenti parte dietro, cosi' in pista le posizioni sono quelle vere.
    const t0 = this.pcap.map(v => this.X0 / v + 1.0 + rnd(-0.06, 0.08));
    this.T = Math.min(...t0);
    this.clock = 0; this.place = 0;
    this.S = [];
    for (let p = 0; p < n; p++) {
      const vIn = this.capP(p) * 0.98;
      this.S.push({
        ph: 'wait', inX: this.X0 - vIn * (t0[p] - this.T), inV: vIn,
        // partenza in piedi e senza blocchi: si accelera piu' piano che nei 100
        r: new Runner({ vmax: this.capP(p), resp: 1.3 }),
        hand: false, got: false, gotAt: 0, fin: null, hop: 0, look: 0,
        // Il segno sulla pista, tanti metri prima della zona: ogni squadra lo mette a misura delle
        // sue gambe. Partendo li' al momento giusto il compagno ti raggiunge a meta' zona.
        mark: 0.77 * vIn,
      });
      this.S[p].r.x = this.Z0;
    }
    this.cam = this.S.map(s => ({ x: (s.inX + this.Z0) / 2, ppm: 0 }));
  }
  labels(p) { return this.S && this.S[p].got ? ['CORRI', 'CORRI'] : ['PARTI / CORRI', 'MANO']; }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p] || s.fin != null) return;
    if (s.got) { s.r.tap(); return; }
    if (b === 0) {
      if (s.ph === 'wait') { s.ph = 'run'; Snd.step(); }
      s.r.tap();
    } else s.hand = true;
  }
  release(p, b) { if (b === 1) this.S[p].hand = false; }
  gap(s) { return s.r.x - s.inX; }
  update(dt) {
    this.clock += dt;
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p], r = s.r;
      if (this.res[p]) { this.coast(s, dt); continue; }
      // l'ultimo frazionista
      if (s.ph === 'run') {
        r.vmax = this.capP(p) * (s.hand && !s.got ? 0.9 : 1);
        r.update(dt);
      }
      // il compagno che arriva: lanciato finche' non ha passato il testimone, poi si ferma
      if (!s.got) {
        let v = s.inV;
        const g = this.gap(s);
        if (g < 0.75) v = Math.min(v, Math.max(r.v, 0));          // non puo' passarti sopra
        s.inX += v * dt;
        if (g < 2.2 && g > 0.4) s.hop = 0.5;                         // "hop!": la voce del compagno
        if (s.hand && g <= 1.6 && g >= 0.45) {
          s.got = true; s.gotAt = r.x; s.hand = false;
          Snd.clang();
          if (r.x < this.Z0 + 0.01 && s.ph === 'wait') s.ph = 'run';
          this.say(p, 'CAMBIO!', '#7CFC00', 0.9);
        } else if (r.x > this.Z1) {
          this.finish(p, null, 'SQUALIF.');
          this.say(p, 'FUORI ZONA!', '#ff5252', 3, 'il testimone doveva passare entro la zona');
          Snd.fail();
          s.fin = -1;
        }
      } else {
        s.inV = Math.max(0, s.inV - 6 * dt);
        s.inX += s.inV * dt;
      }
      if (s.hop > 0) s.hop -= dt;
      if (s.got && s.fin == null && r.x >= this.END) {
        const t = this.T + this.clock - (r.x - this.END) / Math.max(r.v, 0.1);
        s.fin = t; this.place++; s.ph = 'done';
        this.finish(p, t);
        this.say(p, Fmt.time(t), PCOL[p].ui, 4, this.n > 1 ? this.place + '° posto' : '');
        Snd.applause();
      }
      if (s.fin == null && this.clock > 40) { s.fin = -1; this.finish(p, null, 'RITIRATO'); }
    }
    this.baseUpdate(dt);
  }
  // dopo il traguardo (o la squalifica) si rallenta, non ci si pianta
  coast(s, dt) { const r = s.r; r.e = 0; r.vmax = Math.max(0, r.v - 5 * dt); r.update(dt); }
  // dove sta il testimone: e' lui che fa la gara
  baton(q) { const s = this.S[q]; return s.got ? s.r.x : s.inX; }
  liveScore(q) {
    const s = this.S[q];
    if (s.fin === -1) return -1;
    return s.fin != null ? 1e6 - s.fin : this.baton(q);
  }
  liveText() { return ''; }
  fermo(p) { return this.S[p].ph === 'done'; }
  hud(p) {
    const s = this.S[p];
    if (s.fin === -1) return '';
    if (s.got) return 'Cambio a ' + Math.round(s.gotAt - this.Z0) + ' m';
    return '';
  }

  // ---------- disegno ----------
  anchorPose(s, gy, ppm) {
    const r = s.r;
    if (s.ph === 'wait') {
      // in attesa: mezzo accosciato, il peso avanti, la testa girata a guardare il segno
      const q = { torso: 0.75, neck: -0.3, lu: 0.5, lf: 0.9, ru: -0.4, rf: 0.1, lt: 0.55, ls: -0.2, rt: -0.15, rs: -0.55 };
      return [q, gy - 0.8 * ppm];
    }
    const q = Pose.run(r.ph, r.k());
    if (s.hand && !s.got) { q.ru = -1.25; q.rf = -1.05; }          // la mano indietro, il palmo in alto
    return [q, gy - (0.87 + 0.05 * Math.abs(Math.sin(r.ph))) * ppm];
  }
  incomingPose(s, gy, ppm) {
    const ph = this.clock * (0.35 + s.inV * 0.17) * TAU + 1;
    const q = Pose.run(ph, clamp(s.inV / 11, 0.15, 1));
    if (!s.got && this.gap(s) < 2.4) { q.ru = 1.35; q.rf = 1.45; }   // il braccio teso col testimone
    return [q, gy - (0.87 + 0.05 * Math.abs(Math.sin(ph))) * ppm];
  }
  drawBaton(ctx, J, ppm, dir) {
    const h = J.handN, e = J.elbowN;
    const dx = h[0] - e[0], dy = h[1] - e[1], L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, k = 0.15 * ppm;
    ctx.strokeStyle = '#ffca28'; ctx.lineWidth = Math.max(2, ppm * 0.05); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(h[0] - ux * k * (dir ? 0.3 : 1), h[1] - uy * k * (dir ? 0.3 : 1));
    ctx.lineTo(h[0] + ux * k * (dir ? 1 : 0.3), h[1] + uy * k * (dir ? 1 : 0.3));
    ctx.stroke();
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], r = s.r;
    // La camera tiene dentro tutti e due finche' il testimone non e' passato: da lontano si vede
    // il compagno arrivare, e piu' si avvicina piu' si stringe l'inquadratura.
    const c = this.cam[p], near = h / 5;
    let tx, tp;
    if (!s.got) {
      // il frazionista resta a destra, il compagno entra da sinistra; se e' ancora troppo lontano
      // non si rimpicciolisce tutto: c'e' la freccia coi metri che mancano
      const a = Math.min(s.inX, r.x), b = Math.max(s.inX, r.x);
      tp = clamp(w * 0.72 / (b - a + 2), near * 0.5, near);
      tx = b - (w * 0.84 - w * 0.32) / tp;
    } else { tp = near; tx = r.x; }
    if (!c.ppm) { c.ppm = tp; c.x = tx; }
    const k = 1 - Math.exp(-4 * (1 / 120));
    c.ppm += (tp - c.ppm) * k * 2; c.x += (tx - c.x) * k * 3;
    const ppm = c.ppm, ax = w * 0.32, camX = c.x;
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = x => ax + (x - camX) * ppm;
    Bg.distMarks(ctx, w, h, camX, ppm, ax, L, 260, 390, 10, d => d + ' m');
    // la zona del cambio: due righe gialle e la scritta, il segno bianco prima
    const yl = h * 0.7, yh = h * 0.285;
    ctx.fillStyle = 'rgba(255,214,0,0.18)'; ctx.fillRect(sx(this.Z0), yl, (this.Z1 - this.Z0) * ppm, yh);
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(sx(this.Z0) - 2, yl, 4, yh); ctx.fillRect(sx(this.Z1) - 2, yl, 4, yh);
    txt(ctx, 'ZONA CAMBIO', sx((this.Z0 + this.Z1) / 2), yl + yh * 0.5, Math.max(10, Math.min(22, ppm * 0.4)), 'rgba(255,214,0,0.8)', 'center', { italic: false });
    const mx = sx(this.Z0 - s.mark);
    ctx.fillStyle = '#fff'; ctx.fillRect(mx - 3, yl + yh * 0.15, 6, yh * 0.7);
    ctx.fillRect(mx - 0.25 * ppm, yl + yh * 0.45, 0.5 * ppm, 5);
    if (s.ph === 'wait') txt(ctx, 'SEGNO', mx, yl - 12, Math.max(10, h * 0.04), '#fff', 'center', { italic: false });
    // il traguardo
    const fx = sx(this.END);
    if (fx > -40 && fx < w + 40) {
      const sq = Math.max(3, h * 0.02);
      for (let y = yl, i = 0; y < h; y += sq, i++) {
        ctx.fillStyle = i % 2 ? '#111' : '#fff'; ctx.fillRect(fx - sq, y, sq, sq);
        ctx.fillStyle = i % 2 ? '#fff' : '#111'; ctx.fillRect(fx, y, sq, sq);
      }
      txt(ctx, 'ARRIVO', fx, yl - 1.5 * ppm, Math.max(10, h * 0.05), '#ffeb3b');
    }
    // le altre squadre, dietro: il testimone e chi lo porta
    ctx.save(); ctx.globalAlpha = 0.4;
    let k2 = 0;
    for (let q = 0; q < this.n; q++) {
      if (q === p || this.S[q].fin === -1) continue;
      k2++;
      const o = this.S[q], gp = ppm * (0.92 - 0.03 * (k2 % 4)), gg = L.gy - (k2 % 4 + 1) * 0.13 * ppm;
      const x = sx(o.got ? o.r.x : o.inX);
      if (x < -60 || x > w + 60) continue;
      const [pose, hy] = o.got ? this.anchorPose(o, gg, gp) : this.incomingPose(o, gg, gp);
      drawAthlete(ctx, x, hy, gp, pose, PCOL[q]);
    }
    ctx.restore();
    // il compagno e il nostro frazionista
    const team = PCOL[p];
    const [ip, ih] = this.incomingPose(s, L.gy, ppm);
    const ix = sx(s.inX);
    if (ix > -60 && ix < w + 60) {
      shadow(ctx, ix, L.gy, ppm);
      const J = drawAthlete(ctx, ix, ih, ppm, ip, team);
      if (!s.got) this.drawBaton(ctx, J, ppm, true);
      if (s.hop > 0 && !s.got) txt(ctx, 'HOP!', ix + 0.3 * ppm, ih - 1.4 * ppm, Math.max(14, ppm * 0.4), '#fff');
    } else if (!s.got && ix < 0) {
      // il compagno e' ancora fuori dall'inquadratura: una freccia dice quanto manca
      txt(ctx, '◀ ' + Math.round(r.x - s.inX) + ' m', 14, L.gy - 1.2 * near, 16, '#fff', 'left');
    }
    const [pose, hipY] = this.anchorPose(s, L.gy, ppm);
    shadow(ctx, sx(r.x), L.gy, ppm);
    const J = drawAthlete(ctx, sx(r.x), hipY, ppm, pose, team);
    if (s.got) this.drawBaton(ctx, J, ppm, false);
    // HUD: il tempo della squadra
    const t = s.fin != null && s.fin >= 0 ? s.fin : this.T + this.clock;
    txt(ctx, t.toFixed(2), w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), r.v / this.capP(p), PCOL[p].ui, (r.v * 3.6).toFixed(0) + ' km/h');
    if (this.n > 1) drawRaceBar(ctx, w, h, this.S.map((_, q) => this.baton(q) - this.X0 + 40), this.END - this.X0 + 40, p);
    if (!this.msg[p] && s.ph === 'wait') {
      txt(ctx, 'ULTIMA FRAZIONE', w / 2, h * 0.26, clamp(h * 0.1, 18, 40), '#ffeb3b');
      txt(ctx, 'parti (A) quando il compagno passa sul segno', w / 2, h * 0.26 + clamp(h * 0.09, 15, 30), clamp(h * 0.055, 12, 20), '#fff');
    } else if (!this.msg[p] && !s.got && s.fin == null && this.gap(s) < 2.6) {
      if (Math.sin(G.t * 16) > -0.3) txt(ctx, 'MANO! (B)', w / 2, h * 0.3, clamp(h * 0.12, 20, 44), '#7CFC00');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'staffetta', name: 'STAFFETTA 4×100', cls: Staffetta, lowerBetter: true,
  labels: ['PARTI / CORRI', 'MANO'],
  help: ['Corri l\'ultima frazione. A: parti quando il compagno passa sul segno,', 'poi corri. Tieni B per allungare la mano: il testimone passa', 'quando ti arriva vicino. Fuori dalla zona gialla è squalifica!'],
  fmt: Fmt.time, pts: Pts.track(11.3, 50, 1.81),
});
