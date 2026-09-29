'use strict';
// ===== Equitazione: salto ostacoli =====
// Un percorso corto di sette ostacoli, con una gabbia (due salti a una falcata l'uno dall'altro),
// giudicato come la "tabella C": ogni barriera abbattuta aggiunge 4 secondi al tempo.
//   A = sprona: il cavallo accelera, e se non lo si spinge torna a un galoppo raccolto
//   B = salta: si stacca da dove si è. Davanti a ogni ostacolo c'è il punto buono per staccare
//       (la striscia verde a terra): più si va forte, più quel punto si stringe.
// Arrivare sull'ostacolo senza aver chiesto il salto è un rifiuto: il cavallo si pianta, si
// torna indietro e si riparte. Al secondo rifiuto si è eliminati.

class Equitazione extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    // l'altezza degli ostacoli cresce col livello: 1,30 all'universitario, 1,60 alle Olimpiadi
    this.H = [1.30, 1.45, 1.60][clamp(Lv.i, 1, 3) - 1];
    this.F = [22, 46, 70, 78, 104, 128, 150].map((x, i) => ({ x, oxer: i === 3 || i === 5 }));
    this.END = 166;
    this.f = this.pcap.map(v => v / this.cap);
    this.S = [];
    for (let p = 0; p < n; p++) {
      this.S.push({ ph: 'run', x: -8, v: this.capP(p) * 0.6, e: 3, y: 0, jump: null, next: 0, faults: 0, ref: 0,
        down: [], t: 0, clock: null, fin: null, gait: rnd(0, TAU), stop: 0, pitch: 0 });
    }
  }
  labels() { return ['SPRONA', 'SALTA']; }
  // quanto prima dell'ostacolo si stacca bene: un po' più dell'altezza, di più per un largo
  ideal(i) { return 1.25 * this.H + (this.F[i].oxer ? 0.5 : 0.2); }
  // quanto si può sbagliare il punto di stacco senza toccare: a un galoppo tondo ci sta quasi un
  // metro; a tutta velocità il cavallo si allunga e il punto buono si stringe
  window(p, s) {
    const k = s.v / this.capP(p);
    let w = 0.85 * (1 - 2.4 * Math.max(0, k - 0.84)) * clamp((k - 0.45) / 0.2, 0, 1);
    w *= [1.15, 1, 0.88][clamp(Lv.i, 1, 3) - 1];
    w *= 0.8 + 0.2 * clamp((this.f[p] - 0.8) / 0.2, 0, 1);
    return Math.max(0.12, w);
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p] || s.fin != null || s.ph === 'stop') return;
    if (b === 0) { s.e = Math.min(10, s.e + 1); return; }
    if (s.ph !== 'run' || s.next >= this.F.length) return;
    const Fi = this.F[s.next], d = Fi.x - s.x;
    if (d > 6) return;                                   // troppo lontano: il cavallo non stacca
    const err = d - this.ideal(s.next), w = this.window(p, s);
    // salta sempre, ma se il punto era sbagliato tocca la barriera
    const clean = Math.abs(err) <= w;
    const knock = !clean;
    s.jump = { x0: s.x, span: 2 * Math.max(1.4, d) + 0.4, h: this.H + 0.25, knock, i: s.next, err };
    s.ph = 'air';
    Snd.jump();
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) { s.v = Math.max(0, s.v - 3 * dt); s.x += s.v * dt; s.gait += s.v / 3.4 * TAU * dt; continue; }
      s.t += dt;
      const cap = this.capP(p);
      if (s.ph === 'stop') {
        // il rifiuto: fermo, poi si gira e riparte da una dozzina di metri prima
        s.stop -= dt; s.v = 0;
        if (s.stop <= 0) { s.ph = 'run'; s.x = this.F[s.next].x - 13; s.v = cap * 0.5; s.e = 3; }
      } else {
        s.e = Math.max(0, s.e - 0.28 * dt);
        const tgt = cap * Math.min(1, 0.55 + 0.05 * s.e);
        s.v += (tgt - s.v) * Math.min(1, 1.1 * dt);
        s.x += s.v * dt;
      }
      s.gait += s.v / 3.4 * TAU * dt;                    // una falcata di galoppo: 3,4 metri
      if (s.x >= 0 && s.clock == null) s.clock = s.x / Math.max(1, s.v);
      if (s.clock != null && s.fin == null) s.clock += dt;
      if (s.ph === 'air') {
        const J = s.jump, u = (s.x - J.x0) / J.span;
        s.y = Math.max(0, 4 * J.h * u * (1 - u));
        s.pitch = lerp(-0.32, 0.3, clamp(u, 0, 1));
        // si passa sopra la barriera: se il punto era sbagliato cade
        if (!J.done && s.x >= this.F[J.i].x) {
          J.done = true;
          if (J.knock) {
            s.faults++; s.down.push(J.i);
            Snd.clang();
            this.say(p, 'BARRIERA!', '#ff8a80', 1, '+4 secondi');
          } else Snd.tone(700, 0.06, 'triangle', 0.05);
        }
        if (u >= 1) { s.ph = 'run'; s.y = 0; s.pitch = 0; s.next = J.i + 1; s.jump = null; Snd.thud(); }
      } else if (s.ph === 'run' && s.next < this.F.length && s.x >= this.F[s.next].x - 0.6) {
        // arrivati sulla barriera senza saltare: rifiuto
        s.ref++;
        Snd.fail();
        if (s.ref >= 2) {
          s.fin = -1; this.finish(p, null, 'ELIMINATO');
          this.say(p, 'ELIMINATO', '#ff5252', 3, 'secondo rifiuto');
        } else {
          s.ph = 'stop'; s.stop = 1.2; s.x = this.F[s.next].x - 1.2; s.clock += 4;
          this.say(p, 'RIFIUTO!', '#ff8a80', 1.2, '+4 secondi');
        }
      }
      if (s.fin == null && s.clock != null && s.x >= this.END) {
        const t = s.clock - (s.x - this.END) / Math.max(1, s.v) + 4 * s.faults;
        s.fin = t; s.ph = 'done';
        this.finish(p, t);
        this.say(p, Fmt.time(t), PCOL[p].ui, 4, s.faults ? s.faults + (s.faults === 1 ? ' barriera' : ' barriere') : 'PERCORSO NETTO');
        Snd.applause(s.faults ? 0.5 : 1);
      }
      if (s.fin == null && s.t > 80) { s.fin = -1; this.finish(p, null, 'RITIRATO'); }
    }
    this.baseUpdate(dt);
  }
  liveScore(q) {
    const s = this.S[q];
    if (s.fin === -1) return -1;
    return s.fin != null ? 1e6 - s.fin : s.x - 30 * s.faults;
  }
  liveText() { return ''; }
  fermo(p) { return this.S[p].ph === 'done'; }
  hud(p) {
    const s = this.S[p];
    return 'Ostacolo ' + Math.min(s.next + 1, this.F.length) + '/' + this.F.length + (s.faults ? '  •  Barriere ' + s.faults : '') + (s.ref ? '  •  Rifiuti ' + s.ref : '');
  }

  // ---------- disegno ----------
  // Il cavallo di profilo, verso destra, con gli zoccoli a terra in (x, gy). Il galoppo muove le
  // quattro gambe sfasate; in salto le anteriori si ripiegano sotto il petto e le posteriori si
  // allungano dietro, e il corpo si impenna e poi si abbassa.
  drawHorse(ctx, x, gy, ppm, s, col, jump) {
    const coat = col.horse || '#7b4a26', dark = shade(coat, 0.55);
    const c = Math.cos(s.pitch), sn = Math.sin(s.pitch);
    const P = (px, py) => [x + (px * c - py * sn) * ppm, gy - s.y * ppm + (px * sn + py * c) * ppm];
    const g = s.gait, air = !!jump;
    const k = jump ? clamp((s.x - jump.x0) / jump.span, 0, 1) : 0;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const leg = (hx, hy, a1, a2, far) => {
      const h0 = P(hx, hy);
      const kx = hx + Math.sin(a1) * 0.52, ky = hy + Math.cos(a1) * 0.52;
      const fx = kx + Math.sin(a2) * 0.55, fy = ky + Math.cos(a2) * 0.55;
      const kn = P(kx, ky), ft = P(fx, fy);
      ctx.strokeStyle = far ? dark : coat; ctx.lineWidth = Math.max(3, ppm * 0.11);
      ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(kn[0], kn[1]); ctx.stroke();
      ctx.lineWidth = Math.max(2, ppm * 0.07);
      ctx.beginPath(); ctx.moveTo(kn[0], kn[1]); ctx.lineTo(ft[0], ft[1]); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(ft[0], ft[1], Math.max(2, ppm * 0.05), 0, TAU); ctx.fill();
    };
    // angoli delle gambe: al galoppo un'oscillazione avanti-indietro, lo stinco si piega quando la gamba torna avanti
    const gl = (off, front) => {
      if (air) {
        return front ? [lerp(0.9, 1.3, k), lerp(-1.5, -0.2, k * k)] : [lerp(-0.6, 0.5, k), lerp(-0.2, -1.0, k)];
      }
      const a = Math.sin(g + off);
      const back = Math.cos(g + off) < 0;
      const a1 = (front ? 0.08 : 0) + a * 0.55;
      return [a1, a1 - (back ? 0 : 0.9 * Math.max(0, Math.cos(g + off)))];
    };
    const hindF = gl(0.6, false), frontF = gl(1.6, true), hindN = gl(0, false), frontN = gl(1.0, true);
    leg(-0.62, -1.02, hindF[0], hindF[1], true);
    leg(0.58, -1.02, frontF[0], frontF[1], true);
    // corpo, collo, testa, coda
    const body = P(0, -1.3);
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(body[0], body[1], 0.86 * ppm, 0.36 * ppm, s.pitch, 0, TAU); ctx.fill();
    const n0 = P(0.62, -1.45), n1 = P(1.02, -2.02), hd = P(1.3, -1.86);
    ctx.strokeStyle = coat; ctx.lineWidth = Math.max(5, ppm * 0.3);
    ctx.beginPath(); ctx.moveTo(n0[0], n0[1]); ctx.lineTo(n1[0], n1[1]); ctx.stroke();
    ctx.lineWidth = Math.max(4, ppm * 0.2);
    ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(2, ppm * 0.08);            // criniera
    const m0 = P(0.55, -1.62), m1 = P(0.98, -2.15);
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke();
    const e = P(1.1, -2.12);                                                     // orecchio
    ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    const t0 = P(-0.84, -1.42), t1 = P(-1.2, -1.2 + Math.sin(g) * 0.08), t2 = P(-1.25, -0.8);
    ctx.lineWidth = Math.max(3, ppm * 0.1);
    ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.quadraticCurveTo(t1[0], t1[1], t2[0], t2[1]); ctx.stroke();
    ctx.fillStyle = '#111'; const ey = P(1.18, -1.98);
    ctx.beginPath(); ctx.arc(ey[0], ey[1], Math.max(1.2, ppm * 0.025), 0, TAU); ctx.fill();
    // sella
    const sa = P(-0.05, -1.66);
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.ellipse(sa[0], sa[1], 0.3 * ppm, 0.07 * ppm, s.pitch, 0, TAU); ctx.fill();
    leg(-0.62, -1.02, hindN[0], hindN[1], false);
    leg(0.58, -1.02, frontN[0], frontN[1], false);
    ctx.restore();
    // il cavaliere: seduto al galoppo, in avanti sulle staffe ("due punti") sopra l'ostacolo
    const two = air ? Math.sin(k * Math.PI) : 0;
    const hip = P(-0.08, -1.78 - 0.12 * two);
    const pose = { torso: 0.3 + 0.7 * two + s.pitch, neck: -0.12 - 0.12 * two, ru: 0.9 + 0.3 * two, rf: 1.5 + 0.2 * two, lu: 0.85 + 0.3 * two, lf: 1.45 + 0.2 * two,
      rt: 1.0 + s.pitch, rs: -0.15 + s.pitch, lt: 0.95 + s.pitch, ls: -0.2 + s.pitch };
    const J = drawAthlete(ctx, hip[0], hip[1], ppm * 0.95, pose, col);
    // caschetto nero
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(J.head[0], J.head[1] - 0.02 * ppm, BODY.headR * ppm * 1.05, Math.PI * 1.05, TAU * 1.0); ctx.fill();
    // le redini: dalle mani alla bocca
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(J.handN[0], J.handN[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
  }
  // L'ostacolo visto di fianco e un po' dall'alto: due ritti, uno vicino e uno lontano, e le
  // barriere a strisce che vanno dall'uno all'altro. Una barriera abbattuta sta per terra, di traverso.
  drawFence(ctx, x, gy, ppm, fence, down, H) {
    const col = ['#e53935', '#fff', '#1e88e5', '#fff'];
    const DX = 0.55 * ppm, DY = -0.42 * ppm, top = (H + 0.28) * ppm;
    const rail = (x0, y0, x1, y1) => {
      ctx.lineWidth = Math.max(3, 0.09 * ppm); ctx.lineCap = 'butt';
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = col[i];
        ctx.beginPath(); ctx.moveTo(lerp(x0, x1, i / 4), lerp(y0, y1, i / 4)); ctx.lineTo(lerp(x0, x1, (i + 1) / 4), lerp(y0, y1, (i + 1) / 4)); ctx.stroke();
      }
    };
    const one = ox => {
      const px = x + ox * ppm;
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(px + DX - 0.05 * ppm, gy + DY - top, 0.1 * ppm, top);     // ritto lontano
      const rails = down ? [0.4, 0.85] : [0.4, 0.85, H];
      for (const r of rails) rail(px, gy - r * ppm, px + DX, gy + DY - r * ppm);
      ctx.fillStyle = '#eceff1'; ctx.fillRect(px - 0.06 * ppm, gy - top, 0.12 * ppm, top);            // ritto vicino
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(px - 0.12 * ppm, gy - 0.05 * ppm, 0.24 * ppm, 0.05 * ppm);
    };
    ctx.fillStyle = '#66bb6a';                                                     // le siepi ai piedi
    ctx.beginPath(); ctx.moveTo(x - 0.3 * ppm, gy); ctx.lineTo(x + DX - 0.3 * ppm, gy + DY); ctx.lineTo(x + DX + 0.3 * ppm, gy + DY);
    ctx.lineTo(x + 0.3 * ppm, gy); ctx.fill();
    if (fence.oxer) one(1.1);
    one(0);
    if (down) rail(x - 0.2 * ppm, gy - 0.04 * ppm, x + 1.0 * ppm, gy - 0.22 * ppm);
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 4.6, ax = w * 0.3, camX = s.x;
    const sx = X => ax + (X - camX) * ppm;
    const gy = h * 0.9;
    Bg.sky(ctx, w, h, h * 0.35);
    Bg.crowdBand(ctx, w, h * 0.08, h * 0.4, camX * ppm * 0.3);
    ctx.fillStyle = '#c8a26b'; ctx.fillRect(0, h * 0.4, w, h * 0.6);                // la sabbia del campo
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let X = Math.floor(camX - ax / ppm); sx(X) < w; X += 1.3) ctx.fillRect(sx(X), h * 0.4 + ((X * 37) % 17) / 17 * h * 0.5, 3, 2);
    // il punto buono per staccare, davanti all'ostacolo che viene
    if (s.next < this.F.length && s.ph !== 'done') {
      const Fi = this.F[s.next], id = Fi.x - this.ideal(s.next), wv = this.window(p, s);
      ctx.fillStyle = 'rgba(118,255,3,0.35)';
      ctx.fillRect(sx(id - wv), gy - 3, 2 * wv * ppm, 8);
    }
    this.F.forEach((Fi, i) => {
      const x = sx(Fi.x);
      if (x < -120 || x > w + 120) return;
      this.drawFence(ctx, x, gy, ppm, Fi, s.down.indexOf(i) >= 0, this.H);
      txt(ctx, (i + 1) + (Fi.oxer ? '' : ''), x, gy - (this.H + 0.55) * ppm, Math.max(11, h * 0.04), '#fff', 'center', { italic: false });
    });
    for (const [X, lab] of [[0, 'PARTENZA'], [this.END, 'ARRIVO']]) {
      const x = sx(X);
      if (x < -60 || x > w + 60) continue;
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, h * 0.42, 4, gy - h * 0.42);
      txt(ctx, lab, x, h * 0.44, Math.max(11, h * 0.04), '#ffeb3b');
    }
    // gli altri binomi in trasparenza
    ctx.save(); ctx.globalAlpha = 0.28;
    for (let q = 0; q < this.n; q++) {
      if (q === p) continue;
      const o = this.S[q], x = sx(o.x);
      if (x < -120 || x > w + 120) continue;
      this.drawHorse(ctx, x, gy - 0.15 * ppm, ppm * 0.85, o, Object.assign({}, PCOL[q], { horse: q % 2 ? '#5d4037' : '#a1887f' }), o.jump);
    }
    ctx.restore();
    shadow(ctx, sx(s.x), gy, ppm, 2.2);
    this.drawHorse(ctx, sx(s.x), gy, ppm, s, Object.assign({}, PCOL[p], { horse: '#7b4a26' }), s.jump);
    // HUD
    const t = s.fin != null && s.fin >= 0 ? s.fin : (s.clock || 0) + 4 * s.faults;
    txt(ctx, t.toFixed(2), w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    const k = s.v / this.capP(p);
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), k, k > 0.9 ? '#ff7043' : PCOL[p].ui, 'GALOPPO', [0.72, 0.9]);
    if (this.n > 1) drawRaceBar(ctx, w, h, this.S.map(q => q.x + 8), this.END + 8, p);
    if (!this.msg[p] && s.ph === 'run' && s.next === 0 && s.x < 8) {
      txt(ctx, 'SPRONA (A) E SALTA (B)', w / 2, h * 0.24, clamp(h * 0.08, 16, 32), '#ffeb3b');
      txt(ctx, 'stacca sulla striscia verde: più vai forte, più si stringe', w / 2, h * 0.24 + clamp(h * 0.08, 15, 28), clamp(h * 0.048, 11, 18), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'equitazione', name: 'SALTO OSTACOLI', cls: Equitazione, lowerBetter: true,
  labels: ['SPRONA', 'SALTA'],
  help: ['A: sprona il cavallo per andare più forte.', 'B: salta quando sei sulla striscia verde davanti all\'ostacolo.', 'Ogni barriera abbattuta vale 4 secondi, due rifiuti eliminano.'],
  fmt: Fmt.time, pts: Pts.track(8, 40, 1.6),
});
