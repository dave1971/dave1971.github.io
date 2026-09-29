'use strict';
// ===== Articulated athlete renderer + pose library =====
// Body frame: hip at origin, meters, y down. Limb angles measured from straight down,
// positive = forward. Torso angle measured from straight up, positive = lean forward.
// l* = far side limbs (drawn behind), r* = near side limbs.

const BODY = { torso: 0.55, head: 0.72, headR: 0.12, ua: 0.3, fa: 0.28, th: 0.45, sh: 0.45 };

function drawAthlete(ctx, x, y, ppm, pose, col, facing) {
  facing = facing || 1;
  const rot = pose.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
  const P = (px, py) => [x + facing * (px * c - py * s) * ppm, y + (px * s + py * c) * ppm];
  const limb = (x0, y0, a, L) => [x0 + Math.sin(a) * L, y0 + Math.cos(a) * L];

  const shB = [Math.sin(pose.torso) * BODY.torso, -Math.cos(pose.torso) * BODY.torso];
  const hdB = [Math.sin(pose.torso + (pose.neck || 0)) * BODY.head, -Math.cos(pose.torso + (pose.neck || 0)) * BODY.head];
  const kR = limb(0, 0, pose.rt, BODY.th), fR = limb(kR[0], kR[1], pose.rs, BODY.sh);
  const kL = limb(0, 0, pose.lt, BODY.th), fL = limb(kL[0], kL[1], pose.ls, BODY.sh);
  const eR = limb(shB[0], shB[1], pose.ru, BODY.ua), hR = limb(eR[0], eR[1], pose.rf, BODY.fa);
  const eL = limb(shB[0], shB[1], pose.lu, BODY.ua), hL = limb(eL[0], eL[1], pose.lf, BODY.fa);

  const hip = P(0, 0), sh = P(shB[0], shB[1]), hd = P(hdB[0], hdB[1]);
  const J = {
    hip, sh, head: hd,
    kneeN: P(kR[0], kR[1]), footN: P(fR[0], fR[1]), kneeF: P(kL[0], kL[1]), footF: P(fL[0], fL[1]),
    elbowN: P(eR[0], eR[1]), handN: P(hR[0], hR[1]), elbowF: P(eL[0], eL[1]), handF: P(hL[0], hL[1]),
  };

  // nel torneo medievale ognuno ha il suo costume (js/specials/guardaroba.js)
  const V = typeof Vesti !== 'undefined' && Bg.medievo() ? Vesti.di(col) : null;
  if (V) col = Vesti.colori(col, V.veste);
  const hang = Math.atan2(J.head[1] - J.sh[1], J.head[0] - J.sh[0]);
  const fw = [Math.cos(hang + facing * Math.PI / 2), Math.sin(hang + facing * Math.PI / 2)];   // davanti
  const lw = Math.max(2, ppm * 0.1);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts, color, w) => {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };
  const skinD = shade(col.skin, 0.72), shortsD = shade(col.shorts, 0.7);
  const armN = col.armC || col.skin, legN = col.legC || col.skin;
  const armF = col.armC ? shade(col.armC, 0.72) : skinD, legF = col.legC ? shade(col.legC, 0.72) : skinD;
  const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const shoe = (knee, foot, color) => {
    // toe points forward, perpendicular to the shin
    const dx = foot[0] - knee[0], dy = foot[1] - knee[1], L = Math.hypot(dx, dy) || 1;
    const tx = dy / L * facing, ty = -dx / L * facing;
    line([foot, [foot[0] + tx * 0.16 * ppm, foot[1] + ty * 0.16 * ppm]], color, lw * 1.1);
  };

  if (V) Vesti.dietro(ctx, V, J, ppm, fw);
  // far arm
  line([J.sh, J.elbowF, J.handF], armF, lw);
  // far leg
  line([J.hip, mid(J.hip, J.kneeF, 0.55)], shortsD, lw * 1.5);
  line([mid(J.hip, J.kneeF, 0.5), J.kneeF, J.footF], legF, lw * 1.05);
  shoe(J.kneeF, J.footF, col.boot || '#333');
  // torso (shirt)
  line([J.hip, J.sh], col.shirt, lw * 2.2);
  line([J.hip, mid(J.hip, J.sh, 0.25)], col.shorts, lw * 2.3);
  if (V) Vesti.busto(ctx, V, J, ppm, fw, lw);
  // neck + head
  line([J.sh, mid(J.sh, J.head, 0.5)], col.skin, lw * 0.9);
  ctx.fillStyle = col.skin;
  ctx.beginPath(); ctx.arc(J.head[0], J.head[1], BODY.headR * ppm, 0, Math.PI * 2); ctx.fill();
  // hair (back of head)
  const hx = J.head[0] - (J.head[0] - J.sh[0]) * 0.15, hy = J.head[1] - (J.head[1] - J.sh[1]) * 0.15;
  ctx.fillStyle = col.hair;
  ctx.beginPath();
  ctx.arc(hx, hy, BODY.headR * ppm * 1.02, hang - Math.PI * 0.5 - (facing > 0 ? 0.9 : -0.9) * 0, hang + Math.PI * 0.5);
  ctx.closePath();
  ctx.save(); ctx.globalAlpha = 0.95;
  // only draw hair on the back half: clip to half-plane behind the face
  ctx.fill();
  ctx.restore();
  // face dot (eye) on the front side
  const fx = Math.cos(hang + facing * Math.PI / 2), fy = Math.sin(hang + facing * Math.PI / 2);
  ctx.fillStyle = col.skin;
  ctx.beginPath(); ctx.arc(J.head[0] + fx * 0.03 * ppm, J.head[1] + fy * 0.03 * ppm, BODY.headR * ppm * 0.78, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(J.head[0] + fx * 0.07 * ppm, J.head[1] + fy * 0.07 * ppm - 0.01 * ppm, Math.max(1, 0.018 * ppm), 0, Math.PI * 2); ctx.fill();
  if (V) Vesti.testa(ctx, V, J, ppm, hang, facing);
  // bib number on shirt
  // near leg
  line([J.hip, mid(J.hip, J.kneeN, 0.55)], col.shorts, lw * 1.5);
  line([mid(J.hip, J.kneeN, 0.5), J.kneeN, J.footN], legN, lw * 1.05);
  shoe(J.kneeN, J.footN, col.boot || '#fff');
  if (V) Vesti.davanti(ctx, V, J, ppm);
  // near arm
  line([J.sh, J.elbowN, J.handN], armN, lw);
  if (V) Vesti.sopra(ctx, V, J, ppm);
  ctx.restore();
  return J;
}

// ---------- pose library ----------
const Pose = {
  stand() { return { torso: 0.03, lu: 0.1, lf: 0.18, ru: -0.06, rf: 0.05, lt: 0.05, ls: 0, rt: -0.04, rs: -0.04 }; },
  run(ph, k) {
    k = clamp(k, 0.15, 1);
    const rt = 0.2 + Math.sin(ph) * 0.9 * k, lt = 0.2 + Math.sin(ph + Math.PI) * 0.9 * k;
    const bR = 0.15 + k * (0.75 - 0.75 * Math.sin(ph + 0.9)), bL = 0.15 + k * (0.75 - 0.75 * Math.sin(ph + Math.PI + 0.9));
    const ru = -Math.sin(ph) * 0.95 * k, lu = Math.sin(ph) * 0.95 * k;
    return { torso: 0.1 + 0.2 * k, lu, lf: lu + 1.35, ru, rf: ru + 1.35, lt, ls: lt - bL, rt, rs: rt - bR };
  },
  // sprinter "set" position in blocks
  crouch() { return { torso: 1.35, neck: -0.3, lu: 0.02, lf: 0.02, ru: -0.05, rf: -0.05, lt: 0.55, ls: -1.25, rt: 1.75, rs: 0.05 }; },
  airJump() { return { torso: 0.35, lu: 2.5, lf: 2.9, ru: 2.1, rf: 2.6, lt: 1.2, ls: 0.4, rt: 1.45, rs: 0.95 }; },
  airSail() { return { torso: 0.1, lu: 3.0, lf: 3.1, ru: 2.8, rf: 3.0, lt: 0.6, ls: -0.2, rt: 1.0, rs: 0.3 }; },
  landSit() { return { torso: 0.9, neck: 0.3, lu: 1.3, lf: 1.5, ru: 1.4, rf: 1.6, lt: 1.45, ls: 1.35, rt: 1.55, rs: 1.45 }; },
  // ---- atterraggio in buca: assorbi, cadi in avanti sulle mani, ti rialzi, ti giri a guardare ----
  landDeep() { return { torso: 1.0, neck: 0.2, lu: 1.5, lf: 1.65, ru: 1.4, rf: 1.55, lt: 1.55, ls: 1.5, rt: 1.45, rs: 1.4 }; },
  // A quattro zampe per davvero: perche' le mani tocchino terra il busto deve essere quasi
  // orizzontale (le braccia sono lunghe 0,58 m e l'anca sta a mezzo metro da terra), le braccia
  // scendono dritte e le ginocchia stanno sotto il corpo.
  allFours() { return { torso: 1.45, neck: -0.25, lu: 0.06, lf: 0.06, ru: -0.06, rf: -0.06,
    lt: -0.46, ls: -1.45, rt: -0.34, rs: -1.32 }; },
  // mani sui fianchi: braccio appena indietro, avambraccio in avanti, la mano torna all'anca
  hips() { return { torso: 0.0, neck: 0.02, lu: -0.52, lf: 1.22, ru: -0.46, rf: 1.16, lt: 0.07, ls: 0.02, rt: -0.06, rs: -0.02 }; },
  hurdle() { return { torso: 0.75, neck: -0.4, lu: -0.5, lf: 0.5, ru: 1.7, rf: 1.65, lt: 0.9, ls: -0.6, rt: 1.6, rs: 1.55 }; },
  stride(k) { // bounding stride (triple jump hop/step)
    return { torso: 0.2, lu: -0.7 * k, lf: 0.3, ru: 1.2 * k, rf: 1.8, lt: -0.5 * k, ls: -1.2 * k, rt: 1.3 * k, rs: 0.3 };
  },
  flop(arch) {
    return { torso: -0.3 - 0.5 * arch, neck: -0.3 * arch, lu: 0.2, lf: 0.3, ru: 0.1, rf: 0.2, lt: -0.4 * arch, ls: -0.1 - 1.0 * arch, rt: -0.3 * arch, rs: -0.1 - 0.9 * arch };
  },
  // Fosbury clearance: k = 0 back arched over the bar (legs trailing), k = 1 hips flexed, legs kicked up
  flopKick(k, arch) {
    const kicked = { torso: -0.1, neck: 0.5, lu: 0.3, lf: 0.5, ru: 0.2, rf: 0.4, lt: 1.35, ls: 1.45, rt: 1.25, rs: 1.35 };
    return lerpPose(Pose.flop(arch == null ? 0.7 : arch), kicked, clamp(k, 0, 1));
  },
  swim(ph) {
    // freestyle: hand enters in front of the head, pulls under the body to the hip, recovers over the water
    const kick = Math.sin(ph * 3) * 0.25, a = Math.PI - ph;
    return { rot: Math.PI / 2, torso: 0, neck: 0.25, lu: a + Math.PI, lf: a + Math.PI - 0.3, ru: a, rf: a - 0.3, lt: kick, ls: kick - 0.1, rt: -kick, rs: -kick - 0.1 };
  },
  tuck() { return { torso: 0.35, neck: 0.3, lu: 1.5, lf: 0.5, ru: 1.4, rf: 0.4, lt: 2.3, ls: 0.25, rt: 2.4, rs: 0.35 }; },
  straight() { return { torso: 0, lu: Math.PI, lf: Math.PI, ru: Math.PI - 0.04, rf: Math.PI - 0.04, lt: 0.02, ls: 0.02, rt: -0.02, rs: -0.02 }; },
  armsOut() { return { torso: 0, lu: 1.6, lf: 1.6, ru: 1.5, rf: 1.5, lt: 0.02, ls: 0.02, rt: -0.02, rs: -0.02 }; },
  // weightlifting
  liftDown() { return { torso: 0.95, neck: -0.6, lu: 0.1, lf: 0.1, ru: 0.05, rf: 0.05, lt: 1.45, ls: -0.25, rt: 1.35, rs: -0.2 }; },
  liftPull() { return { torso: 0.25, neck: -0.2, lu: 0.1, lf: 0.1, ru: 0.05, rf: 0.05, lt: 0.5, ls: -0.1, rt: 0.45, rs: -0.1 }; },
  liftRack() { return { torso: 0.02, lu: 0.5, lf: 2.95, ru: 0.45, rf: 2.9, lt: 0.12, ls: -0.05, rt: 0.08, rs: -0.05 }; },
  liftOver() { return { torso: -0.05, lu: 3.0, lf: 3.08, ru: 2.95, rf: 3.05, lt: -0.45, ls: -0.65, rt: 0.55, rs: 0.1 }; },
  // pole vault
  poleRun(ph, k) {
    const p = Pose.run(ph, k);
    p.ru = 0.6; p.rf = 1.5; p.lu = 0.3; p.lf = 1.9; p.torso = 0.15;
    return p;
  },
};

function lerpPose(a, b, t) {
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k] !== undefined ? b[k] : a[k], t);
  for (const k in b) if (o[k] === undefined) o[k] = lerp(0, b[k], t);
  return o;
}
