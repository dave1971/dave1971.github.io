'use strict';
// ===== Articulated athlete renderer + pose library =====
// Body frame: hip at origin, meters, y down. Limb angles measured from straight down,
// positive = forward. Torso angle measured from straight up, positive = lean forward.
// l* = far side limbs (drawn behind), r* = near side limbs.

const BODY = { torso: 0.55, head: 0.72, headR: 0.12, ua: 0.3, fa: 0.28, th: 0.45, sh: 0.45 };

// Come ci si veste dove non si va in canotta e scarpette: lo dice la posa.
const NUOTO = { petto: true, nudi: true, cuffia: true }, TUFFO = { petto: true, nudi: true }, SCALZO = { nudi: true };

// Com'e' fatto ognuno: corporatura e capelli, decisi dal nome (sempre gli stessi per lo stesso atleta).
// Cosi' il campo non e' fatto di otto gemelli.
const FISICO = {};
function fisicoDi(col) {
  const k = String(col.name || '') + '|' + (col.hair || '');
  if (FISICO[k]) return FISICO[k];
  let h = 11;
  for (const ch of k) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return (FISICO[k] = { g: 0.94 + ((h >>> 3) % 8) * 0.02, capelli: (h >>> 7) % 5 });
}

/**
 * L'atleta. Lo scheletro e' quello di sempre (anca nell'origine, angoli della posa, le giunture
 * restituite in J): cambia solo come lo si veste di carne. Ogni arto e' un pezzo affusolato col suo
 * muscolo, il busto ha petto, schiena e vita, la testa e' un profilo con naso, occhio, orecchio e
 * capelli, ai piedi ci sono le scarpe; un bordo scuro stacca la figura dallo sfondo.
 * La posa puo' dire com'e' vestito: `petto` (a torso nudo: nuoto e tuffi), `nudi` (scalzo),
 * `cuffia` (cuffia e occhialini).
 */
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
  const F = fisicoDi(col), g = F.g;
  if (V) col = Vesti.colori(col, V.veste);
  const hang = Math.atan2(J.head[1] - J.sh[1], J.head[0] - J.sh[0]);
  const fw = [Math.cos(hang + facing * Math.PI / 2), Math.sin(hang + facing * Math.PI / 2)];   // davanti
  const lw = Math.max(2, ppm * 0.1);           // la misura dei vecchi tratti: la usano ancora i costumi
  const ow = Math.max(0.7, ppm * 0.013);       // il bordo scuro
  const BORDO = '#17171f';
  const pieno = ctx.globalAlpha > 0.9;        // le figure in trasparenza (gli avversari in corsia) non hanno bordo
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const skinD = shade(col.skin, 0.72), shortsD = shade(col.shorts, 0.7);
  const maglia = pose.petto && !V ? col.skin : col.shirt;
  const armN = col.armC || col.skin, legN = col.legC || col.skin;
  const armF = col.armC ? shade(col.armC, 0.72) : skinD, legF = col.legC ? shade(col.legC, 0.72) : skinD;
  const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // Ogni pezzo si disegna due volte: prima il bordo (un tratto scuro tutto intorno), poi il colore.
  // Facendo tutti i bordi di un arto prima dei colori, fra coscia e polpaccio non restano righe.
  let bordo = false;
  const pinta = colore => {
    if (bordo) { if (pieno) { ctx.strokeStyle = BORDO; ctx.lineWidth = 2 * ow; ctx.stroke(); } }
    else { ctx.fillStyle = colore; ctx.fill(); }
  };
  const tondo = (p, r, colore) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); pinta(colore); };
  // un contorno chiuso e morbido che passa vicino ai punti dati
  const liscio = pts => {
    const n = pts.length, m0 = mid(pts[n - 1], pts[0], 0.5);
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n], 0.5); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    ctx.closePath();
  };
  // Un pezzo d'arto da a a b, largo ra all'inizio e rb alla fine (metri), col muscolo che sporge davanti
  // (mf) e dietro (mb) a un terzo della lunghezza. `fine` = false lascia l'estremita' tagliata dritta.
  const pezzo = (a, b, ra, rb, mf, mb, colore, fine) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const nx = uy * facing, ny = -ux * facing;                 // il davanti di un arto che pende
    const A = ra * g * ppm, B = rb * g * ppm, M = lerp(A, B, 0.36), mx = a[0] + dx * 0.36, my = a[1] + dy * 0.36;
    const cf = M + 2 * mf * g * ppm, cb = M + 2 * mb * g * ppm;
    ctx.beginPath();
    ctx.moveTo(a[0] + nx * A, a[1] + ny * A);
    ctx.quadraticCurveTo(mx + nx * cf, my + ny * cf, b[0] + nx * B, b[1] + ny * B);
    ctx.lineTo(b[0] - nx * B, b[1] - ny * B);
    ctx.quadraticCurveTo(mx - nx * cb, my - ny * cb, a[0] - nx * A, a[1] - ny * A);
    ctx.closePath(); pinta(colore);
    tondo(a, A, colore);
    if (fine !== false) tondo(b, B, colore);
  };
  // la scarpa (o il piede nudo): la suola sta dove la posa mette il piede, la punta guarda avanti
  const piede = (knee, foot, colore, suola) => {
    const dx = foot[0] - knee[0], dy = foot[1] - knee[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const tx = uy * facing, ty = -ux * facing, k = ppm * g * (pose.nudi ? 0.86 : 1);
    const Q = (t, u) => [foot[0] + tx * t * k + ux * u * k, foot[1] + ty * t * k + uy * u * k];
    liscio([Q(-0.07, -0.085), Q(-0.075, -0.01), Q(-0.02, 0.012), Q(0.15, 0.012), Q(0.215, -0.012), Q(0.19, -0.05), Q(0.09, -0.085), Q(0.03, -0.11)]);
    pinta(colore);
    if (!bordo && suola && ppm > 26) {
      ctx.strokeStyle = suola; ctx.lineWidth = Math.max(1, 0.022 * ppm);
      const a = Q(-0.06, 0.004), b = Q(0.2, 0.0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  };
  const gamba = (knee, foot, lontana) => {
    const pelle = lontana ? legF : legN, braga = lontana ? shortsD : col.shorts;
    const scarpa = pose.nudi && !V ? pelle : (col.boot ? (lontana ? shade(col.boot, 0.75) : col.boot) : (lontana ? '#9e9e9e' : '#f5f5f5'));
    const orlo = mid(J.hip, knee, pose.petto ? 0.34 : 0.56);
    for (bordo of [true, false]) {
      pezzo(J.hip, knee, 0.09, 0.058, 0.014, 0.008, pelle);
      pezzo(knee, foot, 0.056, 0.034, 0.002, 0.024, pelle);
      if (!bordo) {
        // il calzino, e i calzoncini sopra la coscia (con la riga sul fianco)
        if (!col.legC && !pose.nudi) pezzo(mid(knee, foot, 0.8), foot, 0.04, 0.036, 0, 0, lontana ? '#bdbdbd' : '#fafafa');
        pezzo(J.hip, orlo, 0.097, 0.082, 0.014, 0.008, braga, false);
        if (!lontana && !col.legC && ppm > 30) {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, 0.02 * ppm);
          ctx.beginPath(); ctx.moveTo(J.hip[0], J.hip[1]); ctx.lineTo(orlo[0], orlo[1]); ctx.stroke();
        }
      }
      piede(knee, foot, scarpa, pose.nudi && !V ? null : (col.boot ? shade(col.boot, 0.6) : (lontana ? '#616161' : col.ui || '#e53935')));
    }
  };
  const braccio = (elbow, hand, lontano) => {
    const pelle = lontano ? armF : armN, mano = lontano ? skinD : col.skin;
    const dx = hand[0] - elbow[0], dy = hand[1] - elbow[1], L = Math.hypot(dx, dy) || 1;
    const dita = [hand[0] + dx / L * 0.035 * ppm, hand[1] + dy / L * 0.035 * ppm];
    for (bordo of [true, false]) {
      pezzo(J.sh, elbow, 0.052, 0.04, 0.012, 0.004, pelle);
      pezzo(elbow, hand, 0.04, 0.027, 0.007, 0.002, pelle);
      pezzo(hand, dita, 0.03, 0.026, 0, 0, mano);
    }
  };

  if (V) Vesti.dietro(ctx, V, J, ppm, fw);
  braccio(J.elbowF, J.handF, true);
  gamba(J.kneeF, J.footF, true);

  // ---- il busto: il davanti (petto) da una parte, la schiena dall'altra ----
  const bx = J.sh[0] - J.hip[0], by = J.sh[1] - J.hip[1], bL = Math.hypot(bx, by) || 1;
  const fx = -by / bL * facing, fy = bx / bL * facing;       // il davanti del busto
  const B = (t, o) => [J.hip[0] + bx * t + fx * o * g * ppm, J.hip[1] + by * t + fy * o * g * ppm];
  const busto = [B(-0.03, 0.085), B(0.1, 0.105), B(0.36, 0.088), B(0.62, 0.118), B(0.8, 0.128), B(0.96, 0.09), B(1.05, 0.03),
    B(1.05, -0.05), B(0.94, -0.108), B(0.7, -0.112), B(0.38, -0.086), B(0.14, -0.118), B(-0.03, -0.1)];
  const bacino = [B(-0.07, 0.06), B(0, 0.1), B(0.12, 0.108), B(0.25, 0.097), B(0.25, -0.094), B(0.14, -0.12), B(0, -0.107), B(-0.07, -0.07)];
  const collo0 = mid(J.hip, J.sh, 0.98), collo1 = mid(J.sh, J.head, 0.6);
  const R = BODY.headR * ppm;
  // la testa nel suo verso: +x davanti, -y in alto, in raggi di testa
  const testa = () => {
    ctx.save();
    ctx.translate(J.head[0], J.head[1]); ctx.rotate(hang + Math.PI / 2); ctx.scale(facing, 1);
    const T = pts => pts.map(q => [q[0] * R, q[1] * R]);
    liscio(T([[0.55, -0.98], [0.93, -0.5], [0.9, -0.12], [1.27, 0.2], [0.95, 0.36], [1.0, 0.6], [0.85, 0.97], [0.25, 1.06],
      [-0.38, 0.78], [-0.92, 0.3], [-1.03, -0.3], [-0.62, -0.97], [0, -1.1]]));
    pinta(col.skin);
    if (!bordo) {
      if (R >= 3.2) {
        // l'orecchio, l'occhio col sopracciglio, la bocca
        ctx.fillStyle = shade(col.skin, 0.84); ctx.beginPath(); ctx.ellipse(-0.14 * R, 0.08 * R, 0.16 * R, 0.25 * R, 0, 0, Math.PI * 2); ctx.fill();
        if (R >= 5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0.62 * R, -0.16 * R, 0.17 * R, 0.12 * R, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(0.68 * R, -0.16 * R, Math.max(0.9, 0.085 * R), 0, Math.PI * 2); ctx.fill();
        if (R >= 5) {
          ctx.strokeStyle = shade(col.hair, 0.8); ctx.lineWidth = Math.max(1, 0.09 * R);
          ctx.beginPath(); ctx.moveTo(0.42 * R, -0.42 * R); ctx.lineTo(0.88 * R, -0.4 * R); ctx.stroke();
          ctx.strokeStyle = shade(col.skin, 0.55); ctx.lineWidth = Math.max(1, 0.07 * R);
          ctx.beginPath(); ctx.moveTo(0.7 * R, 0.62 * R); ctx.lineTo(0.98 * R, 0.58 * R); ctx.stroke();
        }
      }
      // i capelli (o la cuffia): cinque teste diverse
      if (pose.cuffia && !V) {
        liscio(T([[0.75, -0.72], [0.2, -1.2], [-0.7, -1.08], [-1.12, -0.3], [-0.95, 0.35], [-0.4, 0.0], [0.2, -0.45]])); ctx.fillStyle = col.shirt; ctx.fill();
        ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.ellipse(0.62 * R, -0.16 * R, 0.26 * R, 0.17 * R, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#263238'; ctx.lineWidth = Math.max(1, 0.08 * R); ctx.beginPath(); ctx.moveTo(0.4 * R, -0.2 * R); ctx.lineTo(-1.0 * R, -0.1 * R); ctx.stroke();
      } else {
        ctx.fillStyle = col.hair;
        const st = F.capelli;
        if (st === 3) {            // ricci
          for (const [hx, hy, hr] of [[0.35, -0.95, 0.42], [-0.2, -1.12, 0.46], [-0.72, -0.9, 0.46], [-1.02, -0.4, 0.44], [-0.98, 0.12, 0.38], [0.62, -0.72, 0.3]]) {
            ctx.beginPath(); ctx.arc(hx * R, hy * R, hr * R, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          const base = [[0.72, -0.78], [0.25, -1.22], [-0.68, -1.1], [-1.13, -0.35]];
          const giu = st === 1 ? [[-1.12, 0.75], [-0.5, 0.82], [-0.42, 0.0]] : [[-0.98, 0.36], [-0.56, 0.22], [-0.4, -0.22]];
          liscio(T(base.concat(giu, [[0.0, -0.52], [0.5, -0.62]])));
          if (st === 4) ctx.globalAlpha = 0.6;                    // rasato
          ctx.fill(); ctx.globalAlpha = 1;
          if (st === 2) {            // la coda, che pende sempre verso terra
            ctx.restore(); ctx.save();
            const cx0 = J.head[0] - fw[0] * R * 0.95, cy0 = J.head[1] - fw[1] * R * 0.95;
            ctx.strokeStyle = col.hair; ctx.lineWidth = Math.max(1.5, 0.34 * R); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.quadraticCurveTo(cx0 - fw[0] * R * 0.7, cy0 - fw[1] * R * 0.7 + R * 0.2, cx0 - fw[0] * R * 0.55, cy0 + R * 1.0); ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  };
  for (bordo of [true, false]) {
    liscio(busto); pinta(maglia);
    liscio(bacino); pinta(col.shorts);
    pezzo(collo0, collo1, 0.05, 0.043, 0, 0, col.skin);
    testa();
  }
  if (!V && !pose.petto && ppm > 30) {
    // l'elastico dei calzoncini e lo scollo della canotta
    const a = B(0.25, 0.097), b = B(0.25, -0.094);
    ctx.strokeStyle = shade(col.shorts, 1.35); ctx.lineWidth = Math.max(1, 0.022 * ppm);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const p0 = B(0.97, 0.085), p1 = B(0.86, 0.0), p2 = B(0.98, -0.1);
    ctx.strokeStyle = shade(col.shirt, 0.72); ctx.lineWidth = Math.max(1, 0.02 * ppm);
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke();
  }
  if (V) Vesti.busto(ctx, V, J, ppm, fw, lw);
  if (V) Vesti.testa(ctx, V, J, ppm, hang, facing);

  gamba(J.kneeN, J.footN, false);
  if (V) Vesti.davanti(ctx, V, J, ppm);
  braccio(J.elbowN, J.handN, false);
  if (V) Vesti.sopra(ctx, V, J, ppm);
  ctx.restore();
  return J;
}

/**
 * Un tiratore visto di spalle, dalla vita in su, in fondo allo schermo: schiena con le spalle larghe e
 * la vita piu' stretta, collo, testa (capelli e orecchie), cappello, e le due braccia che reggono
 * l'arma puntata verso (aimX, aimY). `arma` e' 'fucile' (il piattello: berretto con la visiera,
 * cuffie e gilet da tiro) o 'balestra' (il torneo: cappello da arciere con la penna e faretra).
 * `tinta` sono i colori dei vestiti (quelli del costume, nel torneo). sc = pixel per unita' (h / 200).
 */
function drawDiSpalle(ctx, col, tinta, cx, by, sc, aimX, aimY, arma) {
  const X = d => cx + d * sc, Y = d => by - d * sc, bal = arma === 'balestra';
  const gx = X(3), gy = Y(56), ga = Math.atan2(aimY - gy, aimX - gx), ca = Math.cos(ga), sa = Math.sin(ga);
  const P = (l, o) => [gx + ca * l * sc - sa * o * sc, gy + sa * l * sc + ca * o * sc];   // lungo l'arma, e di traverso
  const BORDO = '#17171f';
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (bal) {
    // la faretra, dietro la spalla
    ctx.save(); ctx.translate(X(-14), Y(44)); ctx.rotate(-0.35);
    ctx.fillStyle = '#6d4c41'; rrect(ctx, -5 * sc, -22 * sc, 10 * sc, 30 * sc, 3 * sc); ctx.fill();
    ctx.fillStyle = '#e53935'; for (const dx of [-3, 0, 3]) ctx.fillRect((dx - 1) * sc, -27 * sc, 2 * sc, 6 * sc);
    ctx.restore();
  }
  // la schiena: spalle larghe e tonde, vita piu' stretta
  ctx.beginPath();
  ctx.moveTo(X(-19), by + 2);
  ctx.bezierCurveTo(X(-22), Y(22), X(-30), Y(40), X(-25), Y(50));
  ctx.quadraticCurveTo(X(-20), Y(59), X(-7), Y(60));
  ctx.lineTo(X(7), Y(60));
  ctx.quadraticCurveTo(X(20), Y(59), X(25), Y(50));
  ctx.bezierCurveTo(X(30), Y(40), X(22), Y(22), X(19), by + 2);
  ctx.strokeStyle = BORDO; ctx.lineWidth = 2.4 * sc; ctx.stroke();
  ctx.fillStyle = tinta.shirt; ctx.fill();
  // la piega della schiena, e la tracolla o il gilet da tiro
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2 * sc;
  ctx.beginPath(); ctx.moveTo(X(0), Y(54)); ctx.quadraticCurveTo(X(1.5), Y(30), X(0), Y(4)); ctx.stroke();
  if (bal) {
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3.5 * sc;
    ctx.beginPath(); ctx.moveTo(X(-20), Y(56)); ctx.quadraticCurveTo(X(0), Y(34), X(18), Y(12)); ctx.stroke();
  } else {
    ctx.fillStyle = shade(tinta.shorts || '#37474f', 0.9);
    ctx.beginPath(); ctx.moveTo(X(-16), Y(57)); ctx.quadraticCurveTo(X(-21), Y(30), X(-17), by + 2); ctx.lineTo(X(17), by + 2);
    ctx.quadraticCurveTo(X(21), Y(30), X(16), Y(57)); ctx.quadraticCurveTo(X(0), Y(46), X(-16), Y(57)); ctx.fill();
  }
  // il collo e la testa (di spalle: capelli, e le orecchie ai lati)
  ctx.fillStyle = col.skin; ctx.fillRect(X(-5), Y(66), 10 * sc, 9 * sc);
  ctx.beginPath(); ctx.arc(X(-11), Y(71), 3 * sc, 0, Math.PI * 2); ctx.arc(X(11), Y(71), 3 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(X(0), Y(73), 11 * sc, 12 * sc, 0, 0, Math.PI * 2);
  ctx.strokeStyle = BORDO; ctx.lineWidth = 2 * sc; ctx.stroke(); ctx.fillStyle = col.hair; ctx.fill();
  if (bal) {
    // il cappello da arciere, con la penna
    ctx.fillStyle = shade(tinta.shorts || '#2e7d32', 0.9);
    ctx.beginPath(); ctx.moveTo(X(-14), Y(77)); ctx.quadraticCurveTo(X(-2), Y(96), X(15), Y(82)); ctx.quadraticCurveTo(X(2), Y(80), X(-14), Y(77)); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(X(6), Y(84)); ctx.quadraticCurveTo(X(14), Y(98), X(22), Y(96)); ctx.stroke();
  } else {
    // il berretto (di spalle si vede la calotta col cinturino) e le cuffie
    ctx.fillStyle = col.ui || '#ffeb3b';
    ctx.beginPath(); ctx.ellipse(X(0), Y(78), 11.5 * sc, 8.5 * sc, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(X(-11.5), Y(78.5), 23 * sc, 2.5 * sc);
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 2.2 * sc;
    ctx.beginPath(); ctx.arc(X(0), Y(73), 12.5 * sc, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.fillStyle = '#e53935';
    for (const d of [-12, 12]) { ctx.beginPath(); ctx.ellipse(X(d), Y(71), 3.2 * sc, 5 * sc, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // l'arma
  if (bal) {
    const a0 = P(8, 0), a1 = P(54, 0), l0 = P(46, -17), l1 = P(46, 17), lm = P(52, 0), c0 = P(34, 0);
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 5 * sc;
    ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3.5 * sc;
    ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.quadraticCurveTo(lm[0], lm[1], l1[0], l1[1]); ctx.stroke();
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 1.2 * sc;
    ctx.beginPath(); ctx.moveTo(l0[0], l0[1]); ctx.lineTo(c0[0], c0[1]); ctx.lineTo(l1[0], l1[1]); ctx.stroke();
  } else {
    // il fucile: il calcio di legno alla spalla, le due canne
    const c0 = P(2, 0), c1 = P(20, 0), k0 = P(18, 0), k1 = P(62, 0);
    ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 7 * sc;
    ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.stroke();
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 4.2 * sc;
    ctx.beginPath(); ctx.moveTo(k0[0], k0[1]); ctx.lineTo(k1[0], k1[1]); ctx.stroke();
    ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 1.2 * sc;
    ctx.beginPath(); ctx.moveTo(k0[0], k0[1]); ctx.lineTo(k1[0], k1[1]); ctx.stroke();
  }
  // le braccia: gomito in fuori, mani sull'arma (la sinistra avanti, la destra al grilletto)
  const manica = tinta.armC || (bal ? shade(tinta.shirt, 0.82) : null);
  const braccio = (sx, sy, gomito, mano) => {
    for (const giro of [0, 1]) {
      const piu = giro ? 0 : 2.2 * sc;
      ctx.strokeStyle = giro ? (manica || col.skin) : BORDO; ctx.lineWidth = 8 * sc + piu;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(gomito[0], gomito[1]); ctx.stroke();
      ctx.strokeStyle = giro ? col.skin : BORDO; ctx.lineWidth = 6 * sc + piu;
      ctx.beginPath(); ctx.moveTo(gomito[0], gomito[1]); ctx.lineTo(mano[0], mano[1]); ctx.stroke();
    }
    ctx.fillStyle = col.skin; ctx.beginPath(); ctx.arc(mano[0], mano[1], 4 * sc, 0, Math.PI * 2); ctx.fill();
  };
  braccio(X(-22), Y(51), [X(-27) + ca * 8 * sc, Y(38) + sa * 6 * sc], P(30, -1));
  braccio(X(22), Y(51), [X(28) + ca * 4 * sc, Y(36) + sa * 4 * sc], P(12, 1));
  ctx.restore();
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
