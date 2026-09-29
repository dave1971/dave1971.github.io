'use strict';
// ===== 100 metri piani =====
// Both buttons run (alternate them like the arcade classic). Pressing before the gun = false start.

class Sprint100 extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.len = 100;
    this.st = new Starter(n);
    this.place = 0;
    this.resetRace();
  }
  resetRace() {
    this.r = [];
    for (let p = 0; p < this.n; p++) this.r.push(new Runner({ vmax: this.capP(p) }));
    this.fin = Array(this.n).fill(null);
  }
  press(p, b) {
    if (this.fin[p] != null || this.res[p]) return;
    const s = this.st.press(p);
    if (s === 'ok') this.action(p, b);
  }
  action(p) { this.r[p].tap(); }
  stepRunner(p, dt) { this.r[p].update(dt); }
  update(dt) {
    if (this.st.update(dt) === 'restart') this.resetRace();
    for (let p = 0; p < this.n; p++) if (this.st.dq[p] && !this.res[p]) this.finish(p, null, 'SQUALIF.');
    if (this.st.running()) {
      for (let p = 0; p < this.n; p++) {
        if (this.st.dq[p]) continue;
        const r = this.r[p];
        this.stepRunner(p, dt);
        if (this.fin[p] == null) {
          if (r.x >= this.len) {
            const t = this.st.raceT - (r.x - this.len) / Math.max(r.v, 0.1);
            this.fin[p] = t;
            this.place++;
            this.finish(p, t);
            this.say(p, Fmt.time(t), PCOL[p].ui, 4, this.n > 1 ? this.place + '° posto' : '');
            Snd.applause();
          } else if (this.st.raceT > 60) {
            this.fin[p] = -1;
            this.finish(p, null, 'RITIRATO');
          }
        }
      }
    }
    this.baseUpdate(dt);
  }
  hud(p) {
    if (this.st.dq[p]) return 'SQUALIFICATO';
    return this.st.fs[p] ? 'Falsa partenza: 1' : '';
  }
  liveScore(q) {
    if (this.st.dq[q] || this.fin[q] === -1) return -1;
    return this.fin[q] != null ? 1e6 - this.fin[q] : this.r[q].x;
  }
  // finché corre, sul tabellone non c'è niente da scrivere: conta solo dove taglia il traguardo
  liveText() { return ''; }
  // the other athletes run as ghosts in the lanes behind ours (farthest first)
  drawGhosts(ctx, p, camX, ppm, ax, gy, w) {
    const others = [];
    for (let q = 0; q < this.n; q++) if (q !== p) others.push(q);
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let k = others.length; k >= 1; k--) {
      const q = others[k - 1];
      if (this.st.dq[q]) continue;
      const x = ax + (this.r[q].x - camX) * ppm;
      if (x < -60 || x > w + 60) continue;
      const gp = ppm * (0.92 - 0.03 * k), gg = gy - k * 0.13 * ppm;
      const [pose, hipY] = this.poseFor(q, gg, gp);
      drawAthlete(ctx, x, hipY, gp, pose, PCOL[q]);
    }
    ctx.restore();
  }
  drawLines(ctx, w, h, camX, ppm, ax) {
    const sx = x => ax + (x - camX) * ppm;
    // start line + blocks
    let x = sx(0);
    if (x > -20 && x < w + 20) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, h * 0.7, 4, h * 0.285); }
    // finish line (checkered)
    x = sx(this.len);
    if (x > -40 && x < w + 40) {
      const sq = Math.max(3, h * 0.02);
      for (let y = h * 0.7, i = 0; y < h; y += sq, i++) {
        ctx.fillStyle = i % 2 ? '#111' : '#fff'; ctx.fillRect(x - sq, y, sq, sq);
        ctx.fillStyle = i % 2 ? '#fff' : '#111'; ctx.fillRect(x, y, sq, sq);
      }
      ctx.fillStyle = '#ddd'; ctx.fillRect(x + 0.3 * ppm, h * 0.7 - 1.3 * ppm, 3, 1.3 * ppm + h * 0.02);
      ctx.fillStyle = '#ffeb3b'; ctx.fillRect(x - 1, h * 0.7 - 1.25 * ppm, 0.3 * ppm + 4, 3);
      txt(ctx, 'ARRIVO', x, h * 0.7 - 1.5 * ppm, Math.max(10, h * 0.05), '#ffeb3b');
    }
  }
  drawProps() { }
  poseFor(p, gy, ppm) {
    const r = this.r[p], s = this.st.state;
    if (this.st.dq[p]) return [Pose.stand(), gy - 0.93 * ppm];
    if (r.x === 0 && s !== 'go') {
      if (s === 'set') {
        const q = Pose.crouch(); q.rt = 1.5; q.rs = -0.15; q.lt = 0.35; q.ls = -1.0; q.torso = 1.45;
        return [q, gy - 0.66 * ppm];
      }
      return [Pose.crouch(), gy - 0.55 * ppm];
    }
    return [Pose.run(r.ph, r.k()), gy - (0.87 + 0.05 * Math.abs(Math.sin(r.ph))) * ppm];
  }
  // l'inquadratura: quanti pixel per metro e dove sta il corridore; chi estende la corsa la puo' cambiare
  vista(w, h, p) { return { ppm: h / 5, ax: w * 0.32 }; }
  drawLane(ctx, p, w, h) {
    const r = this.r[p], { ppm, ax } = this.vista(w, h, p);
    const camX = r.x;
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    Bg.distMarks(ctx, w, h, camX, ppm, ax, L, 10, this.len - 10, 10, d => d + ' m');
    this.drawLines(ctx, w, h, camX, ppm, ax);
    this.drawProps(ctx, p, w, h, camX, ppm, ax, L);
    this.drawGhosts(ctx, p, camX, ppm, ax, L.gy, w);
    const [pose, hipY] = this.poseFor(p, L.gy, ppm);
    shadow(ctx, ax, L.gy, ppm);
    drawAthlete(ctx, ax, hipY, ppm, pose, PCOL[p]);
    // HUD
    const t = this.fin[p] != null && this.fin[p] >= 0 ? this.fin[p] : this.st.raceT;
    txt(ctx, t.toFixed(2), w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), r.v / this.capP(p), PCOL[p].ui, (r.v * 3.6).toFixed(0) + ' km/h');
    if (this.n > 1) drawRaceBar(ctx, w, h, this.r.map(q => q.x), this.len, p);
    if (this.st.text && !this.msg[p]) {
      const c = this.st.state === 'go' ? '#7CFC00' : this.st.state === 'false' ? '#ff5555' : '#ffeb3b';
      txt(ctx, this.st.text, w / 2, h * 0.3, clamp(h * 0.14, 22, 50), c);
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: '100m', name: '100 METRI', cls: Sprint100, lowerBetter: true,
  labels: ['CORRI', 'CORRI'],
  help: ['Premi velocemente i pulsanti per correre:', 'alternare A e B è ancora più veloce!', 'Non partire prima dello sparo!'],
  fmt: Fmt.time, pts: Pts.track(25.4347, 18, 1.81),
});
