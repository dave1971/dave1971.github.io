'use strict';
// ===== Salto triplo =====
// A = run. B at the board = hop; then press B again each time the foot touches the ground (step, jump).

class TripleJump extends LongJump {
  cfg() { this.runup = 40; this.pit = [11, 20]; this.signs = [12, 13, 14, 15, 16, 17, 18]; this.showAngle = false; this.attempts = 3; }
  bDown(p, s) {
    s.foul = s.r.x > 0.02;
    s.x = s.r.x; s.vx = s.r.v; s.vy = 2.4; s.y = 0;
    s.ph = 'air'; s.seg = 0; s.at = 0; s.buf = null;
    Snd.jump();
  }
  bAir(p, s) {
    if (s.ph === 'air' && s.seg < 2) s.buf = s.at;
    else if (s.ph === 'contact') this.nextSeg(p, s, 1 - s.ct / 0.2);
  }
  airStep(p, s, dt) {
    if (s.ph === 'contact') {
      s.ct += dt; s.x += s.vx * dt;
      if (s.ct > 0.2) this.fall(p, s);
      return;
    }
    s.at += dt; s.x += s.vx * dt; s.vy -= 10 * dt; s.y += s.vy * dt;
    const floor = s.seg < 2 ? 0 : -0.4;
    if (s.y <= floor) {
      s.y = floor;
      if (s.seg === 2) { this.land(p, s, s.x + 0.25); return; }
      Snd.step();
      if (s.buf != null && s.at - s.buf < 0.2) this.nextSeg(p, s, 1 - (s.at - s.buf) / 0.2 * 0.6);
      else { s.ph = 'contact'; s.ct = 0; }
    }
  }
  nextSeg(p, s, q) {
    q = clamp(q, 0, 1);
    s.seg++;
    s.vx *= 0.8 + 0.14 * q;
    s.vy = s.seg === 1 ? 2.1 : 2.8 * (0.85 + 0.15 * q);
    s.ph = 'air'; s.at = 0; s.buf = null;
    Snd.jump();
    if (q > 0.75) this.say(p, 'PERFETTO!', '#7CFC00', 0.6);
  }
  fall(p, s) {
    s.ph = 'done'; s.t = 0; s.foul = true; s.dist = null; s.fell = true;
    s.marks.push(null);
    this.say(p, 'CADUTO!', '#ff5555', 1.9, 'premi B quando il piede tocca terra');
    Snd.thud(); Snd.fail();
  }
  fellPose(s) { return s.fell ? { rot: 1.3, torso: 0.2, lu: 2.0, lf: 2.2, ru: 1.8, rf: 2.0, lt: -0.3, ls: -0.6, rt: 0.2, rs: -0.3 } : Pose.landSit(); }
  poseAir(s) {
    if (s.ph === 'contact') return Pose.run(1.2, 1);
    if (s.seg < 2) {
      const k = Math.sin(clamp(s.at / 0.55, 0, 1) * Math.PI);
      const q = Pose.stride(0.6 + 0.4 * k);
      if (s.seg === 1) { [q.lt, q.rt] = [q.rt, q.lt]; [q.ls, q.rs] = [q.rs, q.ls]; [q.lu, q.ru] = [q.ru, q.lu]; [q.lf, q.rf] = [q.rf, q.lf]; }
      return q;
    }
    return super.poseAir(s);
  }
  drawLane(ctx, p, w, h) {
    super.drawLane(ctx, p, w, h);
    const s = this.S[p];
    if ((s.ph === 'air' || s.ph === 'contact') && !this.msg[p]) {
      const names = ['SALTELLO', 'PASSO', 'SALTO'];
      txt(ctx, names[s.seg], w / 2, h * 0.22, clamp(h * 0.09, 16, 32), '#ffeb3b');
    }
  }
}

registerEvent({
  id: 'triplo', name: 'SALTO TRIPLO', cls: TripleJump, lowerBetter: false,
  labels: ['CORRI', 'SALTA'],
  help: ['A: premi velocemente per la rincorsa', 'B: stacca prima della linea rossa, poi premi B', 'ogni volta che il piede tocca terra (3 balzi). 3 salti.'],
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.0653, 640, 1.4)),
});
