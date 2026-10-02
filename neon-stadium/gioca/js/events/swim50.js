'use strict';
// ===== 50 metri stile libero =====
// A = dive at the gun, then mash A to swim. B = breathe when the oxygen runs low.
// Qui si nuota con A soltanto (B serve a respirare), quindi ogni bracciata vale di piu' che un passo
// nelle corse: alla velocita' massima si arriva con circa quattro colpi e mezzo al secondo. Prima ne
// servivano piu' di sei e mezzo per tutta la vasca, e un giocatore vero non ci arrivava mai.
// Nella seconda meta' la velocita' massima cala un poco, tanto meno quanta piu' resistenza si ha.
const NUOTO_COLPO = 0.75;   // m/s di velocita' cercata per ogni colpo ancora 'in circolo'
const NUOTO_CALO = 0.08;    // quanto della velocita' massima si perde all'arrivo, senza resistenza

class Swim50 extends EventBase {
  constructor(n, meta) {
    super(n, meta);
    this.len = 50; this.place = 0;
    this.st = new Starter(n);
    this.resetRace();
  }
  resetRace() {
    this.S = [];
    for (let p = 0; p < this.n; p++) this.S.push({ x: 0, v: 0, e: 0, ph: 'block', dt: 0, o2: 1, breath: 0, fin: null, sph: 0, splash: [] });
  }
  press(p, b) {
    const s = this.S[p];
    if (s.fin != null || this.res[p]) return;
    if (this.st.press(p) !== 'ok') return;
    if (s.ph === 'block') { if (b === 0) { s.ph = 'dive'; s.dt = 0; Snd.jump(); } return; }
    if (s.ph !== 'swim') return;
    if (b === 0) s.e = Math.min(s.e + 1, 12);
    else if (s.breath <= 0) { s.breath = 0.5; s.o2 = 1; Snd.tone(500, 0.15, 'sine', 0.08, 1.5); }
  }
  update(dt) {
    if (this.st.update(dt) === 'restart') this.resetRace();
    for (let p = 0; p < this.n; p++) if (this.st.dq[p] && !this.res[p]) this.finish(p, null, 'SQUALIF.');
    if (this.st.running()) {
      for (let p = 0; p < this.n; p++) {
        const s = this.S[p];
        if (this.st.dq[p]) continue;
        if (s.ph === 'dive') {
          s.dt += dt; s.x = 4.2 * clamp(s.dt / 0.75, 0, 1);
          if (s.dt >= 0.75) { s.ph = 'swim'; s.v = 2.6; Snd.splash(); this.addSplash(s, 1.5); }
        } else if (s.ph === 'swim') {
          s.e -= s.e * 1.5 * dt;
          const calo = NUOTO_CALO * (1 - this.resist(p)) * clamp((s.x - 25) / 25, 0, 1);
          let tgt = Math.min(this.capP(p) * (1 - calo), s.e * NUOTO_COLPO);
          if (s.o2 <= 0) tgt = Math.min(tgt, 0.7);
          if (s.breath > 0) { tgt *= 0.75; s.breath -= dt; }
          s.v += (tgt - s.v) * Math.min(1, 2 * dt);
          s.x += s.v * dt;
          const before = Math.floor(s.sph / Math.PI);
          s.sph += dt * (1.2 + s.v * 1.7);
          if (Math.floor(s.sph / Math.PI) !== before && s.v > 0.3) { Snd.stroke(); this.addSplash(s, 0.5); }
          if (s.fin == null) s.o2 = Math.max(0, s.o2 - (0.08 + 0.06 * s.v) * dt);
        }
        for (const q of s.splash) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= 6 * dt; q.t -= dt; }
        s.splash = s.splash.filter(q => q.t > 0);
        if (s.fin == null) {
          if (s.x >= this.len) {
            s.x = this.len; s.v = 0;
            const t = this.st.raceT;
            s.fin = t; this.place++;
            this.finish(p, t);
            this.say(p, Fmt.time(t), PCOL[p].ui, 4, this.n > 1 ? this.place + '° posto' : '');
            Snd.applause();
          } else if (this.st.raceT > 90) { s.fin = -1; this.finish(p, null, 'RITIRATO'); }
        }
      }
    }
    this.baseUpdate(dt);
  }
  // La resistenza, da 0 a 1: in carriera quella allenata dal giocatore; per gli avversari di carriera
  // viene dal loro sviluppo; in gara singola tutti a meta'.
  resist(p) {
    if (!Game.careerMode || !Career.data) return 0.5;
    if (p === 0) return clamp((Career.data.attr.sta || 0) / 100, 0, 1);
    return clamp((this.pf[p] - 0.8) / 0.2, 0, 1);
  }
  addSplash(s, k) {
    for (let i = 0; i < 6 * k; i++) s.splash.push({ x: s.x + rnd(0.2, 1.1), y: 0, vx: rnd(-0.6, 0.8), vy: rnd(1, 2.4) * Math.sqrt(k), t: rnd(0.3, 0.6) });
  }
  hud(p) { return this.st.dq[p] ? 'SQUALIFICATO' : (this.st.fs[p] ? 'Falsa partenza: 1' : ''); }
  liveScore(q) {
    const s = this.S[q];
    if (this.st.dq[q] || s.fin === -1) return -1;
    return s.fin != null ? 1e6 - s.fin : s.x;
  }
  liveText() { return ''; }        // come nelle corse: conta il tocco, non dove sei adesso
  swimmerPose(q, wy, ppm) {
    const s = this.S[q];
    let pose, hy;
    if (s.ph === 'block') {
      pose = this.st.state === 'set' ? Pose.crouch() : Pose.stand();
      hy = wy - 0.75 * ppm - (this.st.state === 'set' ? 0.55 : 0.93) * ppm;
      if (this.st.dq[q]) { pose = Pose.stand(); hy = wy - 1.68 * ppm; }
    } else if (s.ph === 'dive') {
      const k = clamp(s.dt / 0.75, 0, 1);
      pose = Pose.straight(); pose.rot = lerp(0.6, Math.PI / 2 + 0.25, k);
      hy = wy - (1.3 + 1.2 * k - 2.6 * k * k) * ppm;
    } else {
      pose = Pose.swim(s.sph);
      if (s.breath > 0) pose.neck = -0.6;
      if (s.fin != null) { pose = Pose.swim(0.5); }
      hy = wy + 0.12 * ppm;
    }
    return [pose, hy];
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 4.2, ax = w * 0.35, camX = s.x, wy = h * 0.52;
    const sx = X => ax + (X - camX) * ppm;
    Bg.sky(ctx, w, h, h * 0.06);
    Bg.crowdBand(ctx, w, h * 0.04, h * 0.38, camX * ppm * 0.35);
    ctx.fillStyle = '#eceff1'; ctx.fillRect(0, h * 0.38, w, wy - h * 0.38);
    for (let d = Math.ceil((camX - ax / ppm) / 5) * 5; sx(d) < w + 30; d += 5) {
      if (d <= 0 || d >= this.len) continue;
      txt(ctx, d + ' m', sx(d), h * 0.45, Math.max(10, h * 0.05), '#37474f', 'center', { outline: false, italic: false });
    }
    // water
    const g = ctx.createLinearGradient(0, wy, 0, h);
    g.addColorStop(0, '#29b6f6'); g.addColorStop(1, '#01579b');
    ctx.fillStyle = g; ctx.fillRect(0, wy, w, h - wy);
    ctx.fillStyle = 'rgba(0,40,90,0.5)'; ctx.fillRect(0, h * 0.93, w, 3);
    for (let d = Math.ceil((camX - ax / ppm) / 1) * 1; sx(d) < w + 10; d += 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(sx(d), wy + 3 + 2 * Math.sin(G.t * 3 + d), 0.5 * ppm, 2);
    }
    // walls and block
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(sx(0) - 0.4 * ppm, h * 0.38, 0.4 * ppm, h - h * 0.38);
    ctx.fillRect(sx(this.len), h * 0.38, 0.4 * ppm, h - h * 0.38);
    ctx.fillStyle = PCOL[p].ui; ctx.fillRect(sx(-0.2), wy - 0.75 * ppm, 0.55 * ppm, 0.12 * ppm);
    ctx.fillStyle = '#90a4ae'; ctx.fillRect(sx(-0.2), wy - 0.63 * ppm, 0.12 * ppm, 0.63 * ppm);
    // rivals as ghosts (once in the water), then our swimmer
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let q = 0, k = 0; q < this.n; q++) {
      if (q === p || this.st.dq[q] || this.S[q].ph === 'block') continue;
      k++;
      const gx = sx(this.S[q].x);
      if (gx < -80 || gx > w + 80) continue;
      const [gp, gh] = this.swimmerPose(q, wy, ppm * 0.9);
      drawAthlete(ctx, gx, gh - (k % 3) * 0.06 * ppm, ppm * 0.9, Object.assign(gp, NUOTO), PCOL[q]);
    }
    ctx.restore();
    const [pose, hy] = this.swimmerPose(p, wy, ppm);
    drawAthlete(ctx, sx(s.x), hy, ppm, Object.assign(pose, NUOTO), PCOL[p]);
    // water overlay so the body looks submerged
    ctx.fillStyle = 'rgba(3,120,200,0.35)'; ctx.fillRect(0, wy + 0.08 * ppm, w, h - wy);
    // lane rope
    for (let d = Math.floor(camX - ax / ppm); sx(d) < w + 10; d += 0.5) {
      ctx.fillStyle = (Math.round(d * 2) % 4 < 2) ? '#e53935' : '#fff';
      ctx.beginPath(); ctx.arc(sx(d), wy + 0.5 * ppm, 0.1 * ppm, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    for (const q of s.splash) ctx.fillRect(sx(q.x), wy - q.y * ppm, 3, 3);
    // HUD
    const t = s.fin != null && s.fin >= 0 ? s.fin : this.st.raceT;
    txt(ctx, t.toFixed(2), w - 16, h * 0.12, clamp(h * 0.11, 18, 36), '#fff', 'right');
    const low = s.o2 < 0.3;
    const mh = Math.max(10, h * 0.045);
    drawMeter(ctx, 16, h * 0.09, w * 0.2, mh, s.o2, low ? '#ff1744' : '#00e5ff', 'OSSIGENO');
    // la tacca bianca: il momento migliore per respirare (tardi, ma prima di restare senz'aria)
    ctx.fillStyle = '#fff'; ctx.fillRect(16 + w * 0.2 * 0.15 - 1, h * 0.09 - 3, 2, mh + 6);
    // la velocita', come nelle corse: piena vuol dire la massima che l'atleta puo' tenere
    drawMeter(ctx, 16, h * 0.09 + mh + 10, w * 0.2, mh, s.v / this.capP(p), PCOL[p].ui, (s.v * 3.6).toFixed(1) + ' km/h');
    if (s.ph === 'swim' && low && s.fin == null && Math.sin(G.t * 14) > -0.2) txt(ctx, 'RESPIRA! (B)', 16 + w * 0.1, h * 0.09 + 2 * mh + 34, clamp(h * 0.07, 13, 22), '#ff5252');
    if (this.n > 1) drawRaceBar(ctx, w, h, this.S.map(q => q.x), this.len, p);
    if (this.st.text && !this.msg[p]) {
      const c = this.st.state === 'go' ? '#7CFC00' : this.st.state === 'false' ? '#ff5555' : '#ffeb3b';
      txt(ctx, this.st.text, w / 2, h * 0.28, clamp(h * 0.14, 22, 50), c);
    }
    this.drawMsg(ctx, p, w, h);
  }
}

registerEvent({
  id: '50sl', name: '50 M STILE LIBERO', cls: Swim50, lowerBetter: true,
  labels: ['NUOTA', 'RESPIRA'],
  help: ['A: tuffati allo sparo, poi premi velocemente per nuotare', 'B: respira tardi, verso la tacca bianca, ma prima di finire l\'aria', '(senza ossigeno rallenti moltissimo!)'],
  fmt: Fmt.time, pts: Pts.track(6.6, 45, 1.6),
});
