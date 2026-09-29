'use strict';
// ===== Salto in alto (+ shared bar-event logic used by pole vault) =====
// A = run-up, B = take off near the white mark, B again in the air (over the bar) to arch the back.
// Bar rises after every clearance; 3 consecutive failures end the competition.

class BarEvent extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.cfg();
    this.S = [];
    for (let p = 0; p < n; p++) this.S.push(this.fresh({ bar: this.start, fails: 0, best: null }, p));
  }
  fresh(o, p) {
    return { bar: o.bar, fails: o.fails, best: o.best, ph: 'ready', r: new Runner({ x: -this.runup, vmax: this.vmax, gain: passoUnDito(this.vmax) }),   // col solo A: B e' lo stacco
      x: -this.runup, t: 0, ft: 0, ok: null, press: null, base: 0, x0: 0, knock: -1, refused: false, q: 0 };
  }
  // In career you may pass every mark you have already cleared at this level and go straight to the
  // first one you have never made — the one you actually have to attempt. A passed mark counts as
  // cleared, since you proved it in an earlier meeting. Nelle gare singole vale lo stesso con le
  // misure superate nelle gare singole di prima (Superate, in base.js).
  skipLimit(p) {
    if (Superate.conta(p)) return Superate.get(this.meta.id, p);
    if (!Game.careerMode || p !== 0 || !Career.data) return null;
    const b = Career.bestMap()[this.meta.id];
    return b == null ? null : b;
  }
  canSkip(p, s) {
    const m = this.skipLimit(p);
    return m != null && s.ph === 'ready' && s.bar <= m + 1e-6;
  }
  skip(p, s) {
    const best = Math.max(s.best == null ? 0 : s.best, s.bar);
    Snd.click();
    this.S[p] = this.fresh({ bar: Math.round((s.bar + this.inc) * 100) / 100, fails: 0, best }, p);
  }
  // Left limit of the camera pan. It stops once the approach is framed, but never so early that the
  // athlete would start off screen: the narrower the screen, the fewer metres fit left of the athlete,
  // so the limit follows the width instead of being a fixed number of metres.
  camLow(w, ppm, ax) { return Math.min(this.camLo, -this.runup + (ax - w * 0.12) / ppm); }
  press(p, b) {
    const s = this.S[p];
    if (this.res[p]) return;
    if (s.ph === 'ready') {
      if (b === 0) { s.ph = 'run'; s.r.tap(); }
      else if (this.canSkip(p, s)) this.skip(p, s);
      return;
    }
    if (s.ph === 'run') { if (b === 0) s.r.tap(); else this.takeoff(p, s); return; }
    if (s.ph === 'flight' && b === 1 && s.press == null) s.press = s.ft;
  }
  takeoff(p, s) {
    s.q = clamp(1 - Math.abs(s.x - this.ideal) / this.tol, 0, 1);
    s.v = s.r.v;
    s.base = this.baseHeight(s.v, s.q, p);
    s.x0 = s.x; s.ph = 'flight'; s.ft = 0; s.press = null; s.ok = null;
    Snd.jump();
  }
  decide(p, s) {
    let bonus = 0;
    if (s.press != null) {
      const d = Math.abs(s.press - this.center);
      bonus = this.maxBonus * clamp(1 - (d - 0.06) / 0.24, 0, 1);
    }
    s.height = s.base + bonus;
    s.ok = s.height >= s.bar;
    if (!s.ok) { s.knock = 0; Snd.clang(); }
  }
  update(dt) {
    for (let p = 0; p < this.n; p++) {
      const s = this.S[p];
      if (this.res[p]) continue;
      s.t += dt;
      if (s.knock >= 0) s.knock += dt;
      if (s.ph === 'run') {
        s.r.update(dt); s.x = s.r.x;
        if (s.x > this.lateX) this.refuse(p, s);
      } else if (s.ph === 'flight') {
        s.ft += dt;
        if (s.ok == null && s.ft >= this.center + 0.3) this.decide(p, s);
        if (s.ft >= (this.landTime ? this.landTime(s) : this.T)) this.land(p, s);
      } else if (s.ph === 'done') {
        if (s.refused) { s.r.e = 0; s.r.v *= Math.max(0, 1 - 2.5 * dt); s.r.update(dt, false); s.x = s.r.x; }
        if (s.t > 2) this.next(p, s);
      }
    }
    this.baseUpdate(dt);
  }
  refuse(p, s) {
    s.ph = 'done'; s.t = 0; s.ok = false; s.refused = true; s.fails++;
    this.say(p, 'NULLO', '#ff5555', 1.9, 'non hai staccato! (errore ' + s.fails + ' di 3)');
    Snd.fail();
  }
  land(p, s) {
    s.ph = 'done'; s.t = 0;
    Snd.thud();
    if (s.ok) {
      s.best = s.bar; s.fails = 0;
      Superate.metti(this.meta.id, p, s.bar);
      this.say(p, 'VALIDO!', '#7CFC00', 1.9, Fmt.m(s.bar));
      Snd.applause();
    } else {
      s.fails++;
      this.say(p, 'NULLO', '#ff5555', 1.9, 'errore ' + s.fails + ' di 3');
      Snd.fail();
    }
  }
  next(p, s) {
    if (s.fails >= 3) { this.finish(p, s.best, s.best == null ? 'NESSUNA MISURA' : undefined); return; }
    this.S[p] = this.fresh({ bar: s.ok ? Math.round((s.bar + this.inc) * 100) / 100 : s.bar, fails: s.fails, best: s.best }, p);
  }
  hud(p) {
    const s = this.S[p];
    return 'Asticella ' + Fmt.m(s.bar) + '  •  Errori ' + s.fails + '/3';
  }
  liveScore(q) { return this.S[q].best; }
  // uprights + bar with a little depth perspective; part = 'back' | 'front'
  drawRig(ctx, sx, sy, ppm, s, postX, postH, part) {
    const d = 0.4 * ppm, lift = 0.28 * ppm, x = sx(postX);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = Math.max(2, ppm * 0.07);
    if (part === 'back') {
      ctx.beginPath(); ctx.moveTo(x + d, sy(0) - lift); ctx.lineTo(x + d, sy(postH) - lift); ctx.stroke();
      // bar
      let by = s.bar, tilt = 0;
      if (s.knock >= 0) { const k = clamp(s.knock / 0.45, 0, 1); by = lerp(s.bar, this.matTop + 0.05, k * k); tilt = k * 0.25 * ppm; }
      const n = 8;
      ctx.lineWidth = Math.max(3, ppm * 0.06); ctx.lineCap = 'butt';
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = i % 2 ? '#fdd835' : '#fafafa';
        ctx.beginPath();
        ctx.moveTo(x + d * i / n + tilt * i / n, sy(by) - lift * i / n);
        ctx.lineTo(x + d * (i + 1) / n + tilt * (i + 1) / n, sy(by) - lift * (i + 1) / n);
        ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(x, sy(0)); ctx.lineTo(x, sy(postH)); ctx.stroke();
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(x - 0.12 * ppm, sy(0) - 3, 0.24 * ppm, 4);
    }
    ctx.restore();
  }
  drawMat(ctx, sx, sy, ppm, x0, x1, top) {
    const d = 0.4 * ppm, lift = 0.28 * ppm;
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.moveTo(sx(x0), sy(top)); ctx.lineTo(sx(x0) + d, sy(top) - lift); ctx.lineTo(sx(x1) + d, sy(top) - lift); ctx.lineTo(sx(x1), sy(top));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d47a1'; ctx.fillRect(sx(x0), sy(top), sx(x1) - sx(x0), sy(0) - sy(top));
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(sx(x0), sy(top), sx(x1) - sx(x0), 3);
  }
  // Take-off markings on the runway: the band where the take-off still counts, the sweet spot inside it,
  // the line not to cross, and a marker that follows the athlete's feet so the run-up can be judged.
  drawTakeoff(ctx, sx, h, ppm, s, bodyX) {
    const y0 = h * 0.72, hh = h * 0.26;
    const band = (a, b, col) => { ctx.fillStyle = col; ctx.fillRect(sx(a), y0, Math.max(2, sx(b) - sx(a)), hh); };
    band(this.ideal - this.tol, this.ideal + this.tol, 'rgba(255,214,0,0.13)');
    band(this.ideal - this.tol * 0.3, this.ideal + this.tol * 0.3, 'rgba(0,230,60,0.30)');
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(sx(this.ideal) - 2, y0, 4, hh);
    ctx.fillStyle = '#e53935'; ctx.fillRect(sx(this.lateX) - 2, y0, 4, hh);
    const lx = sx(this.ideal);
    if (lx > 30 && lx < G.W - 30) txt(ctx, 'STACCO', lx, y0 + hh - 12, Math.max(11, h * 0.042), '#fff');
    if (s.ph !== 'run' && s.ph !== 'ready') return;
    // how good a take-off right here would be: green in the sweet spot, red once it is too late
    const q = clamp(1 - Math.abs(bodyX - this.ideal) / this.tol, 0, 1);
    const col = bodyX > this.lateX ? '#ff5252' : q > 0.7 ? '#00e63c' : q > 0.3 ? '#ffd600' : '#ff9800';
    const x = sx(bodyX);
    ctx.fillStyle = col;
    ctx.fillRect(x - 2, y0, 4, hh);
    ctx.beginPath(); ctx.moveTo(x - 10, y0 - 14); ctx.lineTo(x + 10, y0 - 14); ctx.lineTo(x, y0 - 1); ctx.closePath(); ctx.fill();
  }
  drawReady(ctx, p, w, h, s) {
    if (s.ph !== 'ready' || this.msg[p]) return;
    const y = h * 0.26, st = clamp(h * 0.1, 16, 32);
    txt(ctx, 'ASTICELLA ' + Fmt.m(s.bar), w / 2, y, clamp(h * 0.11, 20, 40), '#ffeb3b');
    txt(ctx, 'premi A per partire', w / 2, y + st, clamp(h * 0.07, 13, 24), '#fff');
    if (this.canSkip(p, s)) txt(ctx, 'B: passa a ' + Fmt.m(Math.round((s.bar + this.inc) * 100) / 100),
      w / 2, y + st * 1.8, clamp(h * 0.065, 12, 22), '#7CFC00');
  }
}

class HighJump extends BarEvent {
  cfg() {
    this.runup = 14; this.vmax = 8.5; this.ideal = -1.4; this.tol = 1.5; this.lateX = -0.3; this.camLo = -9;
    this.T = 1.0; this.center = 0.45; this.maxBonus = 0.3; this.inc = 0.05; this.matTop = 0.6;
    this.start = [1.65, 1.95, 2.10][clamp(Lv.i, 1, 3) - 1];
  }
  baseHeight(v, q, p) { return (this.capP(p) + 0.075 * v) * (0.85 + 0.15 * q); }
  body(s) { // hip position + pose
    if (s.ph === 'ready') return { x: s.x, y: 0.93, pose: Pose.stand(), f: 1 };
    if (s.ph === 'run' || s.refused) return { x: s.x, y: 0.87 + 0.05 * Math.abs(Math.sin(s.r.ph)), pose: Pose.run(s.r.ph, s.r.k()), f: 1 };
    const t = s.ph === 'flight' ? s.ft : this.T, c = this.center, T = this.T, apex = s.bar + 0.04;
    const rate = (0.1 - s.x0) / c;
    const x = t < c ? s.x0 + rate * t : 0.1 + (t - c) * rate * 0.75;
    const y = t < c ? 0.93 + (apex - 0.93) * (1 - Math.pow(1 - t / c, 2)) : apex - (apex - 0.72) * Math.pow((t - c) / (T - c), 2);
    // the back arches over the bar until the 2nd press, which rotates the pelvis the other way: legs kick UP
    const arch = 0.15 + 0.6 * clamp(t / c, 0, 1);
    const kick = s.press != null ? clamp((t - s.press) / 0.15, 0, 1) : 0;
    const pose = s.ph === 'done' ? Pose.flopKick(s.press != null ? 0.7 : 0.15, 0.3) : Pose.flopKick(kick, arch);
    pose.rot = s.ph === 'done' ? -1.75 : -lerp(0.2, 2.0, clamp(t / T, 0, 1));
    return { x, y, pose, f: -1 };
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 4.4, ax = w * 0.45;
    const B = this.body(s);
    const camX = clamp(B.x, this.camLow(w, ppm, ax), 1.2);
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = X => ax + (X - camX) * ppm, sy = Y => L.gy - Y * ppm;
    this.drawTakeoff(ctx, sx, h, ppm, s, B.x);
    this.drawMat(ctx, sx, sy, ppm, 0.25, 4.2, this.matTop);
    this.drawRig(ctx, sx, sy, ppm, s, 0, 2.6, 'back');
    shadow(ctx, sx(B.x), L.gy, ppm, 0.8);
    drawAthlete(ctx, sx(B.x), sy(B.y), ppm, B.pose, PCOL[p], B.f);
    this.drawRig(ctx, sx, sy, ppm, s, 0, 2.6, 'front');
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), s.r.v / this.vmax, PCOL[p].ui, (s.r.v * 3.6).toFixed(0) + ' km/h');
    this.drawReady(ctx, p, w, h, s);
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: 'alto', name: 'SALTO IN ALTO', cls: HighJump, lowerBetter: false,
  labels: ['CORRI', 'SALTA'],
  help: ['A: rincorsa  •  B: stacca vicino al segno bianco', 'B di nuovo in volo, quando sei sopra l\'asticella,', 'per inarcare la schiena. 3 errori consecutivi = fine.',
    'A gara ferma B passa le misure che hai già superato.'],
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.8465, 75, 1.42)),
});
