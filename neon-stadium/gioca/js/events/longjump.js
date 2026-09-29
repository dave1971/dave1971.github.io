'use strict';
// ===== Salto in lungo =====
// A = run. Hold B to raise the take-off angle, release B to jump (before the board!). 3 attempts, best counts.

class LongJump extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.cfg();
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ att: 0, best: null, marks: [] }, p));
  }
  cfg() { this.runup = 40; this.pit = [1, 10.5]; this.signs = [5, 6, 7, 8, 9]; this.showAngle = true; this.attempts = 3; }
  // La rincorsa si fa col solo A (B e' lo stacco): passo da un dito solo (passoUnDito, in base.js).
  // Vale anche per il triplo e per il salto del fossato, che sono figli di questa classe.
  fresh(o, p) {
    return { att: o.att, best: o.best, marks: o.marks, ph: 'ready', r: new Runner({ x: -this.runup, vmax: this.capP(p), gain: passoUnDito(this.capP(p)) }), x: -this.runup,
      y: 0, vx: 0, vy: 0, ang: 0, hold: false, t: 0, pt: 0, x0: 0, v0: 0, dist: null, seg: 0, buf: null, at: 0, ct: 0, foul: false, slide: false, landX: null };
  }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (s.ph === 'ready') { if (b === 0) { s.ph = 'run'; s.r.tap(); } return; }
    if (s.ph === 'run') { if (b === 0) s.r.tap(); else this.bDown(p, s); }
    else if (b === 1) this.bAir(p, s);
  }
  release(p, b) {
    const s = this.S[p];
    if (b === 1 && s.ph === 'push') this.launch(p, s);
  }
  // B pressed while running = take-off right here (foul if past the red line); holding B raises the angle
  bDown(p, s) {
    s.foul = s.r.x > 0.02;
    s.x0 = s.x = s.r.x; s.v0 = s.r.v; s.ang = 0; s.pt = 0; s.ph = 'push';
    Snd.step();
  }
  bAir() { }
  launch(p, s) {
    const a = Math.max(s.ang, 5) * Math.PI / 180, v = s.v0;
    s.vy = v * Math.sin(a) * 0.58;
    // land where a jump straight from the take-off point x0 would: the push time must not add distance
    const T = (s.vy + Math.sqrt(s.vy * s.vy + 2 * 9.8 * 0.4)) / 9.8;
    s.vx = Math.max(0.5, v * Math.cos(a) - (s.x - s.x0) / T);
    s.y = 0; s.ph = 'air'; s.at = 0;
    Snd.jump();
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      switch (s.ph) {
        case 'run':
          s.r.update(dt); s.x = s.r.x;
          if (s.r.x > 0.15) this.foulRun(p, s);
          break;
        case 'push':
          // take-off: the angle climbs while B is held, the athlete keeps rolling over the board
          s.pt += dt; s.ang = Math.min(75, s.pt * 150); s.x += s.v0 * 0.35 * dt;
          if (s.ang >= 75) this.launch(p, s);
          break;
        case 'air': case 'contact':
          this.airStep(p, s, dt);
          break;
        case 'done':
          if (s.slide) { s.r.e = 0; s.r.update(dt); s.x = s.r.x; }
          if (s.t > (s.landX != null && !s.slide ? 2.9 : 2.1)) this.nextAttempt(p, s);
          break;
      }
    }
    this.baseUpdate(dt);
  }
  airStep(p, s, dt) {
    s.at += dt; s.x += s.vx * dt; s.vy -= 9.8 * dt; s.y += s.vy * dt;
    if (s.y <= -0.4) { s.y = -0.4; this.land(p, s, s.x + 0.25); }
  }
  land(p, s, lx) {
    Snd.thud();
    s.ph = 'done'; s.t = 0; s.landX = lx;
    s.camLock = s.x;              // da qui la telecamera non segue piu': il segno deve stare fermo
    s.poseLand = this.poseAir(s); // si riparte dalla posa che aveva in aria, per non fare uno scatto
    if (s.foul) {
      s.dist = null;
      this.say(p, 'NULLO!', '#ff5555', 1.9, 'piede oltre la linea di battuta');
      Snd.fail();
    } else {
      s.dist = Math.max(0, lx);
      const nb = s.best == null || s.dist > s.best;
      if (nb) s.best = s.dist;
      this.say(p, Fmt.m(s.dist), '#fff', 1.9, nb && s.att > 0 ? 'Miglior salto!' : '');
      Snd.applause();
    }
    s.marks.push(s.dist);
  }
  foulRun(p, s) {
    s.ph = 'done'; s.t = 0; s.foul = true; s.slide = true; s.dist = null; s.hold = false;
    s.marks.push(null);
    this.say(p, 'NULLO!', '#ff5555', 1.9, 'non hai saltato in tempo');
    Snd.fail();
  }
  nextAttempt(p, s) {
    s.att++;
    if (s.att >= this.attempts) this.finish(p, s.best);
    else this.S[p] = this.fresh(s, p);
  }
  hud(p) {
    const s = this.S[p];
    return 'Salto ' + Math.min(s.att + 1, this.attempts) + '/' + this.attempts + (s.best != null ? '  •  ' + Fmt.m(s.best) : '');
  }
  liveScore(q) { return this.S[q].best; }
  poseAir(s) {
    return lerpPose(Pose.airJump(), Pose.landSit(), clamp(-s.vy / 5, 0, 1) * 0.8);
  }
  // L'atterraggio, secondo per secondo. Prima restava una figura seduta, immobile, che sembrava
  // sospesa: adesso i piedi si piantano nella sabbia, il corpo cade in avanti sulle mani (che e'
  // poi il motivo per cui il salto si misura dal segno piu' arretrato), si rialza, si gira verso
  // la pedana e resta a guardare il salto con le mani sui fianchi.
  // hh = altezza dell'anca sopra la sabbia, dx = quanto e' avanzato, sq = schiacciamento del giro.
  landAnim(s) {
    const t = s.t, ease = k => k * k * (3 - 2 * k);
    if (t < 0.20) {                                   // impatto: le ginocchia assorbono
      const k = t / 0.20;
      return { pose: lerpPose(s.poseLand || Pose.landSit(), Pose.landDeep(), k), hh: lerp(0.78, 0.55, k), dx: 0.06 * k, face: 1, sq: 1 };
    }
    if (t < 0.62) {                                   // si butta in avanti, mani nella sabbia
      const e = ease((t - 0.20) / 0.42);
      return { pose: lerpPose(Pose.landDeep(), Pose.allFours(), e), hh: lerp(0.55, 0.56, e), dx: 0.06 + 0.36 * e, face: 1, sq: 1 };
    }
    if (t < 1.12) {                                   // si rialza
      const e = ease((t - 0.62) / 0.50);
      return { pose: lerpPose(Pose.allFours(), Pose.stand(), e), hh: lerp(0.56, 0.93, e), dx: 0.42 + 0.12 * e, face: 1, sq: 1 };
    }
    if (t < 1.46) {                                   // si gira verso il salto
      const k = (t - 1.12) / 0.34;
      return { pose: lerpPose(Pose.stand(), Pose.hips(), k), hh: 0.93, dx: 0.54, face: k < 0.5 ? 1 : -1,
        sq: Math.max(0.24, Math.abs(Math.cos(k * Math.PI))) };
    }
    return { pose: Pose.hips(), hh: 0.93, dx: 0.54, face: -1, sq: 1 };   // guarda il segno
  }
  // Take-off markings on the runway: every metre left before the board is a metre lost on the measure,
  // so the green band hugs the line. A marker follows the athlete's feet and turns red past the line.
  drawTakeoff(ctx, sx, h, y0, y1, s) {
    const hh = y1 - y0;
    const band = (a, b, col) => { ctx.fillStyle = col; ctx.fillRect(sx(a), y0, Math.max(2, sx(b) - sx(a)), hh); };
    band(-1.5, 0, 'rgba(255,214,0,0.13)');
    band(-0.45, 0, 'rgba(0,230,60,0.30)');
    const lx = sx(0);
    if (lx > 30 && lx < G.W - 30) txt(ctx, 'STACCO', lx - 26, y1 - 12, Math.max(11, h * 0.042), '#fff', 'right');
    if (s.ph !== 'run' && s.ph !== 'ready') return;
    const d = -s.x;
    const col = s.x > 0.02 ? '#ff5252' : d <= 0.45 ? '#00e63c' : d <= 1.5 ? '#ffd600' : '#ff9800';
    const x = sx(s.x);
    ctx.fillStyle = col;
    ctx.fillRect(x - 2, y0, 4, hh);
    ctx.beginPath(); ctx.moveTo(x - 10, y0 - 14); ctx.lineTo(x + 10, y0 - 14); ctx.lineTo(x, y0 - 1); ctx.closePath(); ctx.fill();
  }
  drawPit(ctx, sx, L, h, ppm, s, p) {
    const y0 = h * 0.71, y1 = h * 0.985;
    // sand pit
    const a = sx(this.pit[0]), b = sx(this.pit[1]);
    ctx.fillStyle = '#e3c170'; ctx.fillRect(a, y0, b - a, y1 - y0);
    ctx.fillStyle = 'rgba(160,120,50,0.35)';
    for (let i = 0; i < 40; i++) ctx.fillRect(a + ((i * 97) % 1000) / 1000 * (b - a), y0 + ((i * 53) % 100) / 100 * (y1 - y0), 3, 2);
    this.drawTakeoff(ctx, sx, h, y0, y1, s);
    // take-off board
    ctx.fillStyle = '#fafafa'; ctx.fillRect(sx(-0.2), L.gy - 2, 0.2 * ppm, 5);
    ctx.fillStyle = '#e53935'; ctx.fillRect(sx(0), y0, 3, y1 - y0);
    // distance signs
    for (const d of this.signs) {
      const x = sx(d);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 1, y0, 2, (y1 - y0) * 0.2);
      txt(ctx, d + ' m', x, (L.boardBot + L.grassBot) / 2, Math.max(10, h * 0.045), '#fff', 'center', { italic: false });
    }
    // personal best flag
    if (s.best != null) {
      const x = sx(s.best);
      ctx.fillStyle = '#eee'; ctx.fillRect(x - 1, y0 - 0.6 * ppm, 2, 0.6 * ppm);
      ctx.fillStyle = PCOL[p].ui; ctx.fillRect(x + 1, y0 - 0.6 * ppm, 0.3 * ppm, 0.2 * ppm);
    }
    // L'orma: la sabbia spostata dai talloni, con il bordo chiaro di quella sollevata, e la
    // strisciata di chi si e' buttato in avanti. E' da qui che si misura il salto.
    if (s.landX != null && s.ph === 'done' && !s.slide) {
      const x = sx(s.landX), r = Math.max(4, 0.34 * ppm), yb = L.gy + 0.05 * ppm;
      if (s.t > 0.24) {                                  // la strisciata compare quando cade avanti
        const k = clamp((s.t - 0.24) / 0.4, 0, 1);
        ctx.fillStyle = 'rgba(150,110,45,0.35)';
        ctx.beginPath();
        ctx.ellipse(x + r * 1.3 * k, yb, r * 1.1 * k, 0.05 * ppm, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,241,205,0.55)';          // sabbia alzata davanti all'orma
      ctx.beginPath(); ctx.ellipse(x - r * 0.15, yb - 0.035 * ppm, r * 0.95, 0.055 * ppm, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(122,86,34,0.65)';            // la buca dei talloni
      ctx.beginPath(); ctx.ellipse(x, yb, r, 0.085 * ppm, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(86,58,20,0.75)';
      ctx.beginPath(); ctx.ellipse(x + r * 0.12, yb + 0.012 * ppm, r * 0.5, 0.05 * ppm, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Large take-off angle gauge: quarter dial 0°..90° with the ideal zone highlighted
  drawAngle(ctx, w, h, ang, active) {
    const r = clamp(h * 0.34, 46, 110), pw = r * 1.45 + 40, ph = r + 44;
    const px = w - pw - 12, py = Math.max(6, h * 0.05);
    const cx = px + 18, cy = py + ph - 16, D = Math.PI / 180;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; rrect(ctx, px, py, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = active ? '#ffeb3b' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = active ? 3 : 2; ctx.stroke();
    const wedge = (a0, a1, col) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, -a1 * D, -a0 * D); ctx.closePath(); ctx.fill();
    };
    const gb = this.angBand || [38, 48], yb = this.angWide || [28, 56];
    wedge(0, 90, 'rgba(255,255,255,0.1)');
    wedge(yb[0], yb[1], 'rgba(255,235,59,0.3)');
    wedge(gb[0], gb[1], 'rgba(80,255,80,0.6)');
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
    for (let a = 0; a <= 90; a += 15) {
      const c = Math.cos(-a * D), s = Math.sin(-a * D), k = a % 45 ? 0.9 : 0.8;
      ctx.beginPath(); ctx.moveTo(cx + c * r * k, cy + s * r * k); ctx.lineTo(cx + c * r, cy + s * r); ctx.stroke();
      if (a % 45 === 0) txt(ctx, a + '°', cx + c * (r + 13), cy + s * (r + 11), Math.max(10, r * 0.13), 'rgba(255,255,255,0.85)', 'center', { italic: false });
    }
    const na = -ang * D;
    ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = Math.max(3, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * r * 0.95, cy + Math.sin(na) * r * 0.95); ctx.stroke();
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, r * 0.07), 0, Math.PI * 2); ctx.fill();
    txt(ctx, 'ANGOLO', px + pw - 10, py + 14, Math.max(10, r * 0.13), '#fff', 'right', { italic: false });
    const good = ang >= gb[0] && ang <= gb[1];
    txt(ctx, Math.round(ang) + '°', px + pw - 10, py + 20 + r * 0.28, Math.max(16, r * 0.32), good ? '#7CFC00' : '#fff', 'right');
    ctx.restore();
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 4.8, ax = w * 0.3;
    // atterrato, la telecamera si ferma: il segno sta fermo e si vede l'atleta rialzarsi
    const camX = s.ph === 'done' && s.camLock != null && !s.slide ? s.camLock : s.x;
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = X => ax + (X - camX) * ppm;
    this.drawPit(ctx, sx, L, h, ppm, s, p);
    let pose, hipY, bx = s.x, face = 1, sq = 1;
    if (s.ph === 'ready') { pose = Pose.stand(); hipY = L.gy - 0.93 * ppm; }
    else if (s.ph === 'run' || (s.ph === 'done' && s.slide)) { pose = Pose.run(s.r.ph, s.r.k()); hipY = L.gy - (0.87 + 0.05 * Math.abs(Math.sin(s.r.ph))) * ppm; }
    else if (s.ph === 'push') { const k = clamp(s.ang / 60, 0, 1); pose = lerpPose(Pose.run(1.3, 1), Pose.airJump(), k * 0.7); hipY = L.gy - (0.88 + 0.12 * k) * ppm; }
    else if (s.ph === 'done' && s.landX != null && !s.fell) {
      const A = this.landAnim(s);
      pose = A.pose; hipY = L.gy - (A.hh - 0.4) * ppm; bx = s.x + A.dx; face = A.face; sq = A.sq;
    }
    else if (s.ph === 'done') { pose = this.fellPose ? this.fellPose(s) : Pose.landSit(); hipY = L.gy - 0.5 * ppm; }
    else { pose = this.poseAir(s); hipY = L.gy - (0.9 + s.y) * ppm; }
    shadow(ctx, sx(bx), L.gy, ppm, s.ph === 'air' ? 0.7 : 1);
    ctx.save();
    if (sq < 1) { ctx.translate(sx(bx), hipY); ctx.scale(sq, 1); ctx.translate(-sx(bx), -hipY); }
    drawAthlete(ctx, sx(bx), hipY, ppm, pose, PCOL[p], face);
    ctx.restore();
    // HUD
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), s.r.v / this.capP(p), PCOL[p].ui, (s.r.v * 3.6).toFixed(0) + ' km/h');
    if (this.showAngle && s.ph !== 'ready') this.drawAngle(ctx, w, h, s.ang, s.ph === 'push');
    if (s.ph === 'ready' && !this.msg[p]) {
      txt(ctx, 'SALTO ' + (s.att + 1) + ' DI ' + this.attempts, w / 2, h * 0.28, clamp(h * 0.12, 20, 42), '#ffeb3b');
      txt(ctx, 'premi A per partire', w / 2, h * 0.28 + clamp(h * 0.1, 16, 32), clamp(h * 0.07, 13, 24), '#fff');
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'lungo', name: 'SALTO IN LUNGO', cls: LongJump, lowerBetter: false,
  labels: ['CORRI', 'SALTA'],
  help: ['A: premi velocemente per prendere la rincorsa', 'B: premi vicino alla linea rossa (senza superarla) per staccare,', 'tienilo premuto per alzare l\'angolo (ideale ~43°) e rilascia. 3 salti.'],
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.14354, 220, 1.4)),
});
