'use strict';
// ===== Salto con l'asta =====
// A = run-up, B = plant the pole near the white mark. The vaulter hangs from the tip of the pole, rocks back,
// extends upside down along it and turns the belly toward the bar. B again at the top = let go of the pole
// and arch back over the bar.

const POLE_L = 4.6;
const PV_INV = { torso: 0, lu: Math.PI - 0.08, lf: Math.PI - 0.02, ru: Math.PI - 0.1, rf: Math.PI - 0.04, lt: 0.02, ls: 0, rt: -0.02, rs: 0 };
// legs folded forward over the crossbar (the body wraps around it, belly toward the bar)
const PV_PIKE_OVER = { torso: 0.05, neck: 0.25, lu: Math.PI - 0.2, lf: Math.PI - 0.1, ru: Math.PI - 0.25, rf: Math.PI - 0.15, lt: 1.9, ls: 1.85, rt: 1.8, rs: 1.75 };
// torso, head and arms recovered: upright with the feet down
const PV_UP = { torso: 0.1, neck: -0.1, lu: Math.PI - 0.25, lf: Math.PI - 0.15, ru: Math.PI - 0.35, rf: Math.PI - 0.25, lt: 0.35, ls: 0.15, rt: 0.2, rs: 0.05 };
const PV_FALL = 1.2; // seconds from letting go of the pole to landing
const PV_LIE ={ torso: 0, lu: Math.PI - 0.3, lf: Math.PI - 0.1, ru: Math.PI - 0.4, rf: Math.PI - 0.2, lt: 0.4, ls: 0.3, rt: 0.5, rs: 0.4 };
const ease = u => u * u * (3 - 2 * u);

// hip -> near hand in the body frame (meters, y down): same formulas as drawAthlete
function pvHand(pose) {
  const sh = [Math.sin(pose.torso) * BODY.torso, -Math.cos(pose.torso) * BODY.torso];
  const e = [sh[0] + Math.sin(pose.ru) * BODY.ua, sh[1] + Math.cos(pose.ru) * BODY.ua];
  return [e[0] + Math.sin(pose.rf) * BODY.fa, e[1] + Math.cos(pose.rf) * BODY.fa];
}
// body-frame vector -> world meters (y up), with the body rotation and facing (mirror) applied
function pvToWorld(v, rot, f) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [f * (v[0] * c - v[1] * s), -(v[0] * s + v[1] * c)];
}

class PoleVault extends BarEvent {
  cfg() {
    this.runup = 30; this.vmax = 12.2; this.ideal = -3.2; this.tol = 2.0; this.lateX = -0.6; this.camLo = -26;
    this.T = 1.7; this.center = 0.8; this.maxBonus = 0.45; this.inc = 0.1; this.matTop = 0.8;
    this.start = [3.8, 4.6, 5.2][clamp(Lv.i, 1, 3) - 1];
  }
  baseHeight(v, q, p) { return (this.capP(p) + 0.18 * v) * (0.8 + 0.2 * q); }
  // the hands leave the pole at the 2nd press (clamped around the top), or late if B is never pressed
  releaseTime(s) { const c = this.center; return s.press != null ? clamp(s.press, c - 0.2, c + 0.3) : c + 0.3; }
  landTime(s) { return this.releaseTime(s) + PV_FALL; }
  // on the pole, u = 0 (plant) .. 1 (upside down on the vertical pole): rock back with the knees up, then extend
  swingPose(u) {
    const k = clamp(u / 0.75, 0, 1), fl = Math.sin(Math.PI * k);
    const p = lerpPose(PV_INV, { torso: 0.15, lt: 1.3, ls: 0.15, rt: 1.2, rs: 0.05 }, fl);
    p.rot = lerp(0.2, -Math.PI, ease(k));
    return p;
  }
  // tip of the pole (= hands): from the plant point, around the box, up to vertical above it
  tip(s, u) {
    const p0 = this.swingPose(0), o0 = pvToWorld(pvHand(p0), p0.rot, 1);
    const P0 = [s.x0 + o0[0], 0.93 + o0[1]];
    const oT = pvToWorld(pvHand(PV_INV), -Math.PI, -1);
    const r0 = Math.hypot(P0[0], P0[1]), r1 = s.bar + 0.1 + oT[1]; // hip ends just above the bar
    const e = ease(u), phi = Math.atan2(P0[0], P0[1]) * (1 - e), r = lerp(r0, r1, e) - 0.7 * Math.sin(Math.PI * u);
    return [Math.sin(phi) * r + 0.05 * e, Math.cos(phi) * r];
  }
  onPole(s, u) {
    const pose = this.swingPose(u);
    // half turn along the body axis at the top: the belly ends up facing the bar
    const f0 = u < 0.75 ? 1 : Math.cos(Math.PI * (u - 0.75) / 0.25);
    const f = (f0 < 0 ? -1 : 1) * Math.max(Math.abs(f0), 0.12);
    const P = this.tip(s, u), o = pvToWorld(pvHand(pose), pose.rot, f);
    return { x: P[0] - o[0], y: P[1] - o[1], pose, f, u };
  }
  body(s) {
    if (s.ph === 'ready') return { x: s.x, y: 0.93, pose: Pose.poleRun(0, 0.15), f: 1 };
    if (s.ph === 'run' || s.refused) return { x: s.x, y: 0.87 + 0.05 * Math.abs(Math.sin(s.r.ph)), pose: Pose.poleRun(s.r.ph, s.r.k()), f: 1 };
    const c = this.center, tr = this.releaseTime(s);
    const t = s.ph === 'flight' ? s.ft : this.landTime(s);
    if (t <= tr) return this.onPole(s, clamp(t / c, 0, 1));
    // released, always rolling the same way (270° in total):
    //  A) legs fold forward over the crossbar, hips pass above it   (~60°)
    //  B) torso, head and arms come back up: upright, feet down     (to 360°)
    //  C) 90° backward rotation while falling, landing on the back  (to 450°)
    // Without the 2nd press in time the legs do not fold and the body drops into the bar.
    const r = this.onPole(s, clamp(tr / c, 0, 1)), v = clamp((t - tr) / PV_FALL, 0, 1);
    const armed = s.press != null && s.press <= c + 0.3;
    const seg = (a, b) => ease(clamp((v - a) / (b - a), 0, 1));
    const kA = seg(0, 0.3), kB = seg(0.3, 0.6), kC = seg(0.6, 1);
    let pose = armed ? lerpPose(r.pose, PV_PIKE_OVER, seg(0, 0.2)) : r.pose;
    pose = lerpPose(pose, PV_UP, kB);
    pose = lerpPose(pose, PV_LIE, kC);
    let rot = lerp(r.pose.rot, -1.35 * Math.PI, kA);
    rot = lerp(rot, -2 * Math.PI, kB);
    pose.rot = lerp(rot, -2.5 * Math.PI, kC);
    let x = lerp(r.x, 0.5, kA), y = lerp(r.y, s.bar + 0.18, kA);
    x = lerp(x, 1.1, kB); y = lerp(y, s.bar - 0.4, kB);
    x = lerp(x, 1.9, kC); y = lerp(y, this.matTop + 0.35, kC);
    return { x, y, pose, f: r.f };
  }
  drawLane(ctx, p, w, h) {
    const s = this.S[p], ppm = h / 7.4, ax = w * 0.42;
    const B = this.body(s);
    const camX = clamp(B.x, this.camLow(w, ppm, ax), 1.0);
    const L = Bg.stadium(ctx, w, h, camX, ppm, ax);
    const sx = X => ax + (X - camX) * ppm, sy = Y => L.gy - Y * ppm;
    this.drawTakeoff(ctx, sx, h, ppm, s, B.x);
    Bg.distMarks(ctx, w, h, camX, ppm, ax, L, -25, -5, 5, d => (-d) + ' m');
    this.drawMat(ctx, sx, sy, ppm, 0.4, 5.5, this.matTop);
    // planting box
    ctx.fillStyle = '#37474f';
    ctx.beginPath(); ctx.moveTo(sx(-0.9), sy(0)); ctx.lineTo(sx(0), sy(0)); ctx.lineTo(sx(0), sy(0) + 0.15 * ppm); ctx.closePath(); ctx.fill();
    this.drawRig(ctx, sx, sy, ppm, s, 0.4, 6.4, 'back');
    shadow(ctx, sx(B.x), L.gy, ppm, 0.8);
    const J = drawAthlete(ctx, sx(B.x), sy(B.y), ppm, B.pose, PCOL[p], B.f);
    this.drawPole(ctx, s, J, sx, sy, ppm);
    this.drawRig(ctx, sx, sy, ppm, s, 0.4, 6.4, 'front');
    drawMeter(ctx, 16, h * 0.09, w * 0.2, Math.max(10, h * 0.045), s.r.v / 12.2, PCOL[p].ui, (s.r.v * 3.6).toFixed(0) + ' km/h');
    this.drawReady(ctx, p, w, h, s);
    this.drawMsg(ctx, p, w, h);
  }
  drawPole(ctx, s, J, sx, sy, ppm) {
    ctx.save();
    ctx.strokeStyle = '#ffb300'; ctx.lineWidth = Math.max(2, ppm * 0.06); ctx.lineCap = 'round';
    ctx.beginPath();
    const hx = J.handN[0], hy = J.handN[1];
    const tr = s.ph === 'flight' || s.ph === 'done' ? this.releaseTime(s) : 0;
    if (s.ph === 'ready' || s.ph === 'run' || s.refused) {
      // carried: tip lowers while approaching the box
      const k = clamp((s.x + this.runup) / (this.runup - 3), 0, 1);
      const a = lerp(-0.55, 0.12, k);
      const dx = Math.cos(a), dy = Math.sin(a);
      ctx.moveTo(hx - dx * 0.7 * ppm, hy - dy * 0.7 * ppm);
      ctx.lineTo(hx + dx * (POLE_L - 0.7) * ppm, hy + dy * (POLE_L - 0.7) * ppm);
    } else if (s.ph === 'flight' && s.ft < tr) {
      // bent pole from the box to the hands, straightening toward the top
      const bx = sx(0), by = sy(0);
      const len = Math.hypot(hx - bx, hy - by) || 1;
      const bend = Math.sin(Math.PI * clamp(s.ft / this.center, 0, 1)) * 0.9 * ppm;
      const nx = -(hy - by) / len, ny = (hx - bx) / len;
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + hx) / 2 + nx * bend, (by + hy) / 2 + ny * bend, hx, hy);
    } else {
      // released pole falls back toward the runway
      const P = this.tip(s, clamp(tr / this.center, 0, 1));
      const t = (s.ph === 'flight' ? s.ft : this.landTime(s) + s.t) - tr;
      const a = Math.atan2(P[0], P[1]) - clamp(t * 1.6, 0, 1.45), len = Math.hypot(P[0], P[1]);
      ctx.moveTo(sx(0), sy(0));
      ctx.lineTo(sx(0) + Math.sin(a) * len * ppm, sy(0) - Math.cos(a) * len * ppm);
    }
    ctx.stroke();
    ctx.restore();
  }
}

registerEvent({
  id: 'asta', name: 'SALTO CON L\'ASTA', cls: PoleVault, lowerBetter: false,
  labels: ['CORRI', 'ASTA'],
  help: ['A: rincorsa  •  B: pianta l\'asta vicino al segno bianco', 'B di nuovo quando sei capovolto in cima: lasci l\'asta, pieghi', 'le gambe oltre l\'asticella e cadi di schiena. 3 errori = fine.',
    'In carriera B passa le misure già superate.'],
  fmt: Fmt.m, pts: (f => m => f(m == null ? null : m * 100))(Pts.field(0.2797, 100, 1.35)),
});
