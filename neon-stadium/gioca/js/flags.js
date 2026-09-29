'use strict';
// ===== Flags: tiny canvas drawings with IOC-style 3-letter codes =====

function starPath(ctx, cx, cy, R, r, n, rot) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i * Math.PI / n, rr = i % 2 ? r : R;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}
const FBands = (vert, cols) => (ctx, x, y, w, h) => {
  for (let i = 0; i < cols.length; i++) {
    ctx.fillStyle = cols[i];
    if (vert) ctx.fillRect(x + w * i / cols.length, y, w / cols.length + 0.6, h);
    else ctx.fillRect(x, y + h * i / cols.length, w, h / cols.length + 0.6);
  }
};
const H = (...c) => FBands(false, c);
const V = (...c) => FBands(true, c);
const over = (...fns) => (ctx, x, y, w, h) => fns.forEach(f => f(ctx, x, y, w, h));
const solid = c => (ctx, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const disc = (c, r, cx, cy) => (ctx, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(x + w * (cx == null ? 0.5 : cx), y + h * (cy == null ? 0.5 : cy), h * r, 0, 6.2832); ctx.fill();
};
const ringF = (c, r, lw) => (ctx, x, y, w, h) => {
  ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, h * lw);
  ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * r, 0, 6.2832); ctx.stroke();
};
const starF = (c, r, cx, cy, n) => (ctx, x, y, w, h) => {
  starPath(ctx, x + w * cx, y + h * cy, h * r, h * r * 0.45, n || 5, -Math.PI / 2);
  ctx.fillStyle = c; ctx.fill();
};
const dots = (c, list, r) => (ctx, x, y, w, h) => {
  ctx.fillStyle = c;
  list.forEach(d => { ctx.beginPath(); ctx.arc(x + w * d[0], y + h * d[1], h * (r || 0.07), 0, 6.2832); ctx.fill(); });
};
const crescentF = (c, r, cx) => (ctx, x, y, w, h) => {
  const CX = x + w * cx, CY = y + h / 2, R = h * r;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0.85, -0.85);
  ctx.arc(CX + R * 0.38, CY, R * 0.8, -0.75, 0.75, true);
  ctx.closePath(); ctx.fill();
};
const crossF = (bg, c, t) => (ctx, x, y, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c;
  ctx.fillRect(x + w / 2 - w * t / 2, y + h * 0.16, w * t, h * 0.68);
  ctx.fillRect(x + w * 0.5 - h * 0.34, y + h / 2 - h * t * 0.9, h * 0.68, h * t * 1.8);
};
const nordic = (bg, c) => (ctx, x, y, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c; ctx.fillRect(x, y + h * 0.4, w, h * 0.2); ctx.fillRect(x + w * 0.26, y, w * 0.13, h);
};
const triF = (c, frac) => (ctx, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * frac, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
};
function unionJack(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#012169'; ctx.fillRect(x, y, w, h);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.24;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
  ctx.strokeStyle = '#C8102E'; ctx.lineWidth = h * 0.1; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.32;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  ctx.strokeStyle = '#C8102E'; ctx.lineWidth = h * 0.18; ctx.stroke();
  ctx.restore();
}
const cantonF = (bg, extra) => (ctx, x, y, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  unionJack(ctx, x, y, w * 0.5, h * 0.5);
  if (extra) extra(ctx, x, y, w, h);
};

const usaF = (ctx, x, y, w, h) => {
  for (let i = 0; i < 13; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#B31942'; ctx.fillRect(x, y + h * i / 13, w, h / 13 + 0.6); }
  ctx.fillStyle = '#0A3161'; ctx.fillRect(x, y, w * 0.42, h * 7 / 13);
  ctx.fillStyle = '#fff';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) ctx.fillRect(x + w * (0.05 + c * 0.078), y + h * (0.06 + r * 0.115), Math.max(1, w * 0.022), Math.max(1, h * 0.035));
  }
};
const braF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#009B3A'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#FEDF00';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h * 0.08); ctx.lineTo(x + w * 0.9, y + h / 2);
  ctx.lineTo(x + w / 2, y + h * 0.92); ctx.lineTo(x + w * 0.1, y + h / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#002776'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.22, 0, 6.2832); ctx.fill();
};
const canF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#D80621'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.25, y, w * 0.5, h);
  starPath(ctx, x + w / 2, y + h / 2, h * 0.32, h * 0.13, 6, -Math.PI / 2);
  ctx.fillStyle = '#D80621'; ctx.fill();
};
const chiF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#D52B1E'; ctx.fillRect(x, y + h / 2, w, h / 2);
  ctx.fillStyle = '#0039A6'; ctx.fillRect(x, y, w * 0.33, h * 0.5);
  starF('#fff', 0.15, 0.165, 0.25)(ctx, x, y, w, h);
};
const cubF = (ctx, x, y, w, h) => {
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#002A8F'; ctx.fillRect(x, y + h * i / 5, w, h / 5 + 0.6); }
  triF('#CF142B', 0.4)(ctx, x, y, w, h);
  starF('#fff', 0.12, 0.12, 0.5)(ctx, x, y, w, h);
};
const jamF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#009B3A'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.5, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w * 0.5, y + h / 2); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FED100'; ctx.lineWidth = h * 0.13;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
};
const korF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h / 2, r = h * 0.22;
  ctx.fillStyle = '#CD2E3A'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#0047A0'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#000';
  [[0.2, 0.22], [0.8, 0.22], [0.2, 0.78], [0.8, 0.78]].forEach(d => ctx.fillRect(x + w * d[0] - w * 0.055, y + h * d[1] - h * 0.05, w * 0.11, h * 0.1));
};
const phiF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#0038A8'; ctx.fillRect(x, y, w, h / 2);
  ctx.fillStyle = '#CE1126'; ctx.fillRect(x, y + h / 2, w, h / 2);
  triF('#fff', 0.42)(ctx, x, y, w, h);
  starPath(ctx, x + w * 0.13, y + h / 2, h * 0.11, h * 0.045, 8, 0);
  ctx.fillStyle = '#FCD116'; ctx.fill();
};
const rsaF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#E03C31'; ctx.fillRect(x, y, w, h * 0.42);
  ctx.fillStyle = '#001489'; ctx.fillRect(x, y + h * 0.58, w, h * 0.42);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y + h * 0.34, w, h * 0.32);
  ctx.fillStyle = '#007A4D'; ctx.fillRect(x, y + h * 0.42, w, h * 0.16);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.48, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.14); ctx.lineTo(x + w * 0.32, y + h / 2); ctx.lineTo(x, y + h * 0.86); ctx.closePath(); ctx.fill();
};
const kenF = over(H('#000', '#fff', '#BB0000', '#fff', '#006600'), disc('#BB0000', 0.2),
  (ctx, x, y, w, h) => { ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2 - w * 0.015, y + h * 0.22, w * 0.03, h * 0.56); });
const pngF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#CE1126';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  dots('#fff', [[0.68, 0.55], [0.78, 0.66], [0.6, 0.72], [0.72, 0.82]], 0.05)(ctx, x, y, w, h);
  starF('#FCD116', 0.15, 0.3, 0.28)(ctx, x, y, w, h);
};
const samF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#CE1126'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#002B7F'; ctx.fillRect(x, y, w * 0.5, h * 0.5);
  dots('#fff', [[0.16, 0.12], [0.28, 0.2], [0.19, 0.3], [0.3, 0.37], [0.11, 0.39]], 0.042)(ctx, x, y, w, h);
};
const tgaF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#C10000'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w * 0.42, h * 0.5);
  ctx.fillStyle = '#C10000';
  ctx.fillRect(x + w * 0.17, y + h * 0.06, w * 0.08, h * 0.38);
  ctx.fillRect(x + w * 0.07, y + h * 0.19, w * 0.28, h * 0.12);
};
const vanF = (ctx, x, y, w, h) => {
  ctx.fillStyle = '#D21034'; ctx.fillRect(x, y, w, h / 2);
  ctx.fillStyle = '#009543'; ctx.fillRect(x, y + h / 2, w, h / 2);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.45, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FDCE12'; ctx.fillRect(x, y + h * 0.45, w, h * 0.1);
};

const FLAGS = {
  // Europa
  ITA: V('#008C45', '#F4F9FF', '#CD212A'),
  FRA: V('#0055A4', '#FFFFFF', '#EF4135'),
  GER: H('#000000', '#DD0000', '#FFCE00'),
  ESP: over(solid('#AA151B'), (ctx, x, y, w, h) => { ctx.fillStyle = '#F1BF00'; ctx.fillRect(x, y + h * 0.25, w, h * 0.5); }, dots('#AA151B', [[0.32, 0.5]], 0.09)),
  GBR: (ctx, x, y, w, h) => unionJack(ctx, x, y, w, h),
  NED: H('#AE1C28', '#FFFFFF', '#21468B'),
  POR: over((ctx, x, y, w, h) => {
    ctx.fillStyle = '#046A38'; ctx.fillRect(x, y, w * 0.4, h);
    ctx.fillStyle = '#DA291C'; ctx.fillRect(x + w * 0.4, y, w * 0.6, h);
  }, disc('#FFE900', 0.2, 0.4)),
  SUI: crossF('#DA291C', '#FFFFFF', 0.2),
  SWE: nordic('#006AA7', '#FECC02'),
  POL: H('#FFFFFF', '#DC143C'),
  // Americhe
  USA: usaF,
  CAN: canF,
  BRA: braF,
  ARG: over(H('#75AADB', '#FFFFFF', '#75AADB'), disc('#F6B40E', 0.12)),
  MEX: over(V('#006847', '#FFFFFF', '#CE1126'), disc('#8B5A2B', 0.11)),
  COL: H('#FCD116', '#FCD116', '#003893', '#CE1126'),
  CHI: chiF,
  CUB: cubF,
  JAM: jamF,
  PER: V('#D91023', '#FFFFFF', '#D91023'),
  // Asia
  JPN: over(solid('#FFFFFF'), disc('#BC002D', 0.3)),
  CHN: over(solid('#EE1C25'), starF('#FFFF00', 0.17, 0.17, 0.3), dots('#FFFF00', [[0.31, 0.13], [0.37, 0.25], [0.35, 0.42], [0.28, 0.53]], 0.04)),
  KOR: korF,
  IND: over(H('#FF9933', '#FFFFFF', '#138808'), ringF('#000080', 0.13, 0.035)),
  THA: H('#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'),
  INA: H('#CE1126', '#FFFFFF'),
  TUR: over(solid('#E30A17'), crescentF('#FFFFFF', 0.24, 0.36), starF('#FFFFFF', 0.11, 0.55, 0.5)),
  IRI: over(H('#239F40', '#FFFFFF', '#DA0000'), disc('#DA0000', 0.1)),
  PHI: phiF,
  VIE: over(solid('#DA251D'), starF('#FFFF00', 0.27, 0.5, 0.5)),
  // Africa
  RSA: rsaF,
  KEN: kenF,
  NGR: V('#008751', '#FFFFFF', '#008751'),
  EGY: over(H('#CE1126', '#FFFFFF', '#000000'), disc('#C09300', 0.12)),
  MAR: over(solid('#C1272D'), starF('#006233', 0.25, 0.5, 0.5)),
  ETH: over(H('#078930', '#FCDD09', '#DA121A'), disc('#0F47AF', 0.22), starF('#FCDD09', 0.13, 0.5, 0.5)),
  ALG: over(V('#006233', '#FFFFFF'), crescentF('#D21034', 0.24, 0.5), starF('#D21034', 0.1, 0.62, 0.5)),
  GHA: over(H('#CE1126', '#FCD116', '#006B3F'), starF('#000000', 0.16, 0.5, 0.5)),
  TUN: over(solid('#E70013'), disc('#FFFFFF', 0.3), crescentF('#E70013', 0.2, 0.49), starF('#E70013', 0.1, 0.56, 0.5)),
  SEN: over(V('#00853F', '#FDEF42', '#E31B23'), starF('#00853F', 0.19, 0.5, 0.5)),
  // Oceania
  AUS: cantonF('#00008B', dots('#FFFFFF', [[0.25, 0.8], [0.62, 0.26], [0.72, 0.44], [0.64, 0.62], [0.78, 0.72], [0.7, 0.85]], 0.045)),
  NZL: cantonF('#00247D', dots('#CC142B', [[0.72, 0.28], [0.8, 0.5], [0.7, 0.72], [0.62, 0.5]], 0.05)),
  FIJ: cantonF('#68BFE5', dots('#FFFFFF', [[0.73, 0.5]], 0.13)),
  PNG: pngF,
  SAM: samF,
  TGA: tgaF,
  VAN: vanF,
  PLW: over(solid('#4AADD6'), disc('#FFDE00', 0.28, 0.42)),
};

// ===== Tutte le altre bandiere del mondo =====
// I 206 comitati olimpici riconosciuti dal CIO, coi loro codici, piu' il Vaticano (uno stato senza
// comitato olimpico). Gli stemmi complicati sono ridotti a poche forme, come quelli qui sopra: a
// 58x36 pixel si riconosce la bandiera dai colori e dalla disposizione, non dai dettagli.

// ---------- attrezzi ----------
// bande orizzontali e verticali di larghezze diverse (pesi relativi)
const Hw = (cols, pesi) => (ctx, x, y, w, h) => {
  const tot = pesi.reduce((a, b) => a + b, 0);
  let yy = y;
  cols.forEach((c, i) => { const hh = h * pesi[i] / tot; ctx.fillStyle = c; ctx.fillRect(x, yy, w, hh + 0.6); yy += hh; });
};
const Vw = (cols, pesi) => (ctx, x, y, w, h) => {
  const tot = pesi.reduce((a, b) => a + b, 0);
  let xx = x;
  cols.forEach((c, i) => { const ww = w * pesi[i] / tot; ctx.fillStyle = c; ctx.fillRect(xx, y, ww + 0.6, h); xx += ww; });
};
// un rettangolo e un poligono in coordinate del campo, da 0 a 1
const rect = (c, x0, y0, x1, y1) => (ctx, x, y, w, h) => {
  ctx.fillStyle = c; ctx.fillRect(x + w * x0, y + h * y0, w * (x1 - x0), h * (y1 - y0));
};
const poly = (c, pts) => (ctx, x, y, w, h) => {
  ctx.fillStyle = c; ctx.beginPath();
  pts.forEach(([a, b], i) => (i ? ctx.lineTo(x + w * a, y + h * b) : ctx.moveTo(x + w * a, y + h * b)));
  ctx.closePath(); ctx.fill();
};
// una banda diagonale spessa t (in altezze del campo): sale da in basso a sinistra, o scende
const diag = (c, t, scende) => (ctx, x, y, w, h) => {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = h * t; ctx.lineCap = 'butt';
  ctx.beginPath();
  if (scende) { ctx.moveTo(x - w * 0.1, y - h * 0.1); ctx.lineTo(x + w * 1.1, y + h * 1.1); }
  else { ctx.moveTo(x - w * 0.1, y + h * 1.1); ctx.lineTo(x + w * 1.1, y - h * 0.1); }
  ctx.stroke(); ctx.restore();
};
// la croce nordica col filo di un altro colore dentro (Norvegia, Islanda)
const nordic2 = (bg, c1, c2) => over(nordic(bg, c1), (ctx, x, y, w, h) => {
  ctx.fillStyle = c2; ctx.fillRect(x, y + h * 0.44, w, h * 0.12); ctx.fillRect(x + w * 0.2875, y, w * 0.075, h);
});
// stelle in un elenco di punti, e in cerchio
const stelle = (c, pts, r, n) => (ctx, x, y, w, h) => pts.forEach(([a, b]) => starF(c, r, a, b, n)(ctx, x, y, w, h));
const cerchioStelle = (c, cx, cy, R, k, r) => (ctx, x, y, w, h) => {
  for (let i = 0; i < k; i++) {
    const a = i * 6.2832 / k - 1.5708;
    starF(c, r, cx + R * Math.cos(a) * h / w, cy + R * Math.sin(a), 5)(ctx, x, y, w, h);
  }
};
// una mezzaluna in un punto qualunque: un disco coperto da un altro del colore del fondo
const luna = (c, fondo, r, cx, cy, dx, dy) => (ctx, x, y, w, h) => {
  disc(c, r, cx, cy)(ctx, x, y, w, h);
  disc(fondo, r * 0.8, cx + (dx == null ? r * 0.35 : dx) * h / w, cy + (dy || 0))(ctx, x, y, w, h);
};
// un sole a raggi: dischetto e punte
const sole = (c, cx, cy, r, n, R) => (ctx, x, y, w, h) => {
  const X = x + w * cx, Y = y + h * cy;
  ctx.fillStyle = c;
  starPath(ctx, X, Y, h * R, h * r, n, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, h * r, 0, 6.2832); ctx.fill();
};
// la stella di Davide, a contorno
const davide = (c, cx, cy, r) => (ctx, x, y, w, h) => {
  const X = x + w * cx, Y = y + h * cy, R = h * r;
  ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, h * 0.045);
  for (const s of [1, -1]) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -s * Math.PI / 2 + i * 2.0944, px = X + Math.cos(a) * R, py = Y + Math.sin(a) * R;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
};
// un'aquila a due teste, a sagoma (Albania, Montenegro, Serbia...)
const aquila = (c, cx, cy, s) => (ctx, x, y, w, h) => {
  const X = x + w * cx, Y = y + h * cy, S = h * s;
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(X, Y - S * 0.3);
  ctx.lineTo(X - S * 0.95, Y - S * 0.65); ctx.lineTo(X - S * 0.6, Y + S * 0.15); ctx.lineTo(X - S * 0.22, Y + S * 0.2);
  ctx.lineTo(X - S * 0.32, Y + S * 0.8); ctx.lineTo(X, Y + S * 0.5); ctx.lineTo(X + S * 0.32, Y + S * 0.8);
  ctx.lineTo(X + S * 0.22, Y + S * 0.2); ctx.lineTo(X + S * 0.6, Y + S * 0.15); ctx.lineTo(X + S * 0.95, Y - S * 0.65);
  ctx.closePath(); ctx.fill();
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(X + d * S * 0.2, Y - S * 0.5, S * 0.15, 0, 6.2832); ctx.fill(); }
};
// la scacchiera della Croazia
const scacchi = (cx, cy, s, n) => (ctx, x, y, w, h) => {
  const S = h * s / n, X = x + w * cx - S * n / 2, Y = y + h * cy - S * n / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ctx.fillStyle = (i + j) % 2 ? '#FFFFFF' : '#FF0000'; ctx.fillRect(X + i * S, Y + j * S, S + 0.3, S + 0.3);
  }
};
// un rombo (San Vincenzo)
const rombo = (c, cx, cy, r) => (ctx, x, y, w, h) =>
  poly(c, [[cx, cy - r], [cx + r * h / w, cy], [cx, cy + r], [cx - r * h / w, cy]])(ctx, x, y, w, h);
// uno scudo o uno stemma ridotto a una forma: un ovale di un colore con dentro un altro
const stemma = (c1, c2, cx, cy, r) => over(disc(c1, r, cx, cy), disc(c2, r * 0.55, cx, cy));
// le bande a zig-zag al lato dell'asta (Bahrein, Qatar)
const dentiF = (bg, c, frac, n) => (ctx, x, y, w, h) => {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 0; i < n; i++) {
    ctx.lineTo(x + w * frac, y + h * i / n);
    ctx.lineTo(x + w * (frac + 0.1), y + h * (i + 0.5) / n);
  }
  ctx.lineTo(x + w * frac, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
};
// le bandiere a strisce con un cantone (Grecia, Liberia, Malesia, Uruguay, Togo)
const strisceF = (n, c1, c2, cantone) => (ctx, x, y, w, h) => {
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? c2 : c1; ctx.fillRect(x, y + h * i / n, w, h / n + 0.6); }
  if (cantone) cantone(ctx, x, y, w, h);
};

// ---------- Europa ----------
Object.assign(FLAGS, {
  ALB: over(solid('#E41E20'), aquila('#000000', 0.5, 0.5, 0.36)),
  AND: over(V('#10069F', '#FEDF00', '#D50032'), stemma('#C7B37F', '#D50032', 0.5, 0.5, 0.16)),
  ARM: H('#D90012', '#0033A0', '#F2A800'),
  AUT: H('#ED2939', '#FFFFFF', '#ED2939'),
  AZE: over(H('#0092BC', '#E4002B', '#00AF66'), luna('#FFFFFF', '#E4002B', 0.13, 0.47, 0.5), starF('#FFFFFF', 0.07, 0.56, 0.5, 8)),
  BEL: V('#000000', '#FDDA24', '#EF3340'),
  BIH: over(solid('#002395'), poly('#FECB00', [[0.25, 0], [0.75, 0], [0.75, 1]]),
    stelle('#FFFFFF', [[0.2, 0.06], [0.28, 0.21], [0.35, 0.36], [0.43, 0.51], [0.51, 0.66], [0.58, 0.81], [0.66, 0.96]], 0.06)),
  BLR: over(Hw(['#C8313E', '#4AA657'], [2, 1]), rect('#FFFFFF', 0, 0, 0.11, 1),
    dots('#C8313E', [[0.055, 0.15], [0.055, 0.38], [0.055, 0.62], [0.055, 0.85]], 0.05)),
  BUL: H('#FFFFFF', '#00966E', '#D62612'),
  CRO: over(H('#FF0000', '#FFFFFF', '#171796'), scacchi(0.5, 0.52, 0.38, 5)),
  CYP: over(solid('#FFFFFF'), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#D57800';
    ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.4, w * 0.2, h * 0.12, -0.15, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#4E5B31'; ctx.lineWidth = Math.max(1, h * 0.05);
    ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.3, 0.5, 1.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.3, 1.8, 2.65); ctx.stroke();
  }),
  CZE: over(H('#FFFFFF', '#D7141A'), triF('#11457E', 0.5)),
  DEN: nordic('#C8102E', '#FFFFFF'),
  EST: H('#0072CE', '#000000', '#FFFFFF'),
  FIN: nordic('#FFFFFF', '#002F6C'),
  GEO: over(solid('#FFFFFF'), (ctx, x, y, w, h) => {
    const t = h * 0.2, s = h * 0.17, k = Math.max(1, h * 0.05);
    ctx.fillStyle = '#E8112D';
    ctx.fillRect(x, y + h / 2 - t / 2, w, t); ctx.fillRect(x + w / 2 - t / 2, y, t, h);
    for (const [a, b] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {   // le quattro croci piccole
      const px = x + w * a, py = y + h * b;
      ctx.fillRect(px - s / 2, py - k / 2, s, k); ctx.fillRect(px - k / 2, py - s / 2, k, s);
    }
  }),
  GRE: strisceF(9, '#0D5EAF', '#FFFFFF', (ctx, x, y, w, h) => {
    const c = h * 5 / 9;
    ctx.fillStyle = '#0D5EAF'; ctx.fillRect(x, y, c, c);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + c * 0.4, c, c * 0.2); ctx.fillRect(x + c * 0.4, y, c * 0.2, c);
  }),
  HUN: H('#CD2A3E', '#FFFFFF', '#436F4D'),
  IRL: V('#169B62', '#FFFFFF', '#FF883E'),
  ISL: nordic2('#02529C', '#FFFFFF', '#DC1E35'),
  ISR: over(solid('#FFFFFF'), rect('#0038B8', 0, 0.1, 1, 0.25), rect('#0038B8', 0, 0.75, 1, 0.9), davide('#0038B8', 0.5, 0.5, 0.2)),
  KOS: over(solid('#244AA5'), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#D0A650';
    ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.6, w * 0.16, h * 0.2, 0.3, 0, 6.2832); ctx.fill();
  }, stelle('#FFFFFF', [[0.3, 0.3], [0.38, 0.22], [0.46, 0.18], [0.54, 0.18], [0.62, 0.22], [0.7, 0.3]], 0.05)),
  LAT: Hw(['#9E3039', '#FFFFFF', '#9E3039'], [2, 1, 2]),
  LIE: over(H('#002B7F', '#CE1126'), rect('#FFD83D', 0.17, 0.18, 0.33, 0.3), dots('#FFD83D', [[0.19, 0.16], [0.25, 0.13], [0.31, 0.16]], 0.04)),
  LTU: H('#FDB913', '#006A44', '#C1272D'),
  LUX: H('#EF3340', '#FFFFFF', '#00A3E0'),
  MDA: over(V('#0046AE', '#FFD200', '#CC092F'), stemma('#8C5A2B', '#CC092F', 0.5, 0.5, 0.15)),
  MKD: (ctx, x, y, w, h) => {
    ctx.fillStyle = '#D20000'; ctx.fillRect(x, y, w, h);
    const X = x + w / 2, Y = y + h / 2, L = Math.hypot(w, h);
    ctx.fillStyle = '#FFE600';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(X, Y);
      ctx.lineTo(X + Math.cos(a - 0.12) * L, Y + Math.sin(a - 0.12) * L);
      ctx.lineTo(X + Math.cos(a + 0.12) * L, Y + Math.sin(a + 0.12) * L);
      ctx.closePath(); ctx.fill();
    }
    disc('#D20000', 0.2)(ctx, x, y, w, h); disc('#FFE600', 0.16)(ctx, x, y, w, h);
  },
  MLT: over(V('#FFFFFF', '#CF142B'), (ctx, x, y, w, h) => {          // la croce di San Giorgio, grigia
    ctx.fillStyle = '#9A9A9A';
    ctx.fillRect(x + w * 0.09, y + h * 0.12, w * 0.14, h * 0.07); ctx.fillRect(x + w * 0.13, y + h * 0.06, w * 0.06, h * 0.2);
  }),
  MNE: over(solid('#D4AF37'), rect('#C40308', 0.04, 0.06, 0.96, 0.94), aquila('#D4AF37', 0.5, 0.5, 0.3)),
  MON: H('#CE1126', '#FFFFFF'),
  NOR: nordic2('#BA0C2F', '#FFFFFF', '#00205B'),
  ROU: V('#002B7F', '#FCD116', '#CE1126'),
  RUS: H('#FFFFFF', '#0039A6', '#D52B1E'),
  SLO: over(H('#FFFFFF', '#005DA4', '#ED1C24'), poly('#005DA4', [[0.2, 0.18], [0.36, 0.18], [0.36, 0.42], [0.28, 0.52], [0.2, 0.42]]),
    poly('#FFFFFF', [[0.22, 0.38], [0.28, 0.3], [0.34, 0.38], [0.28, 0.46]])),
  SMR: over(H('#FFFFFF', '#5EB6E4'), stemma('#D4AF37', '#5EB6E4', 0.5, 0.5, 0.14)),
  SRB: over(H('#C6363C', '#0C4076', '#FFFFFF'), stemma('#C6363C', '#FFFFFF', 0.33, 0.47, 0.2), aquila('#FFFFFF', 0.33, 0.47, 0.12)),
  SVK: over(H('#FFFFFF', '#0B4EA2', '#EE1C25'), poly('#FFFFFF', [[0.2, 0.22], [0.42, 0.22], [0.42, 0.62], [0.31, 0.8], [0.2, 0.62]]),
    poly('#EE1C25', [[0.22, 0.25], [0.4, 0.25], [0.4, 0.61], [0.31, 0.76], [0.22, 0.61]]),
    rect('#FFFFFF', 0.3, 0.3, 0.32, 0.62), rect('#FFFFFF', 0.26, 0.38, 0.36, 0.42), rect('#FFFFFF', 0.25, 0.47, 0.37, 0.51),
    poly('#0B4EA2', [[0.23, 0.72], [0.31, 0.6], [0.39, 0.72], [0.31, 0.76]])),
  UKR: H('#0057B7', '#FFD700'),
  VAT: over(V('#FFE000', '#FFFFFF'), dots('#B0B0B0', [[0.7, 0.55], [0.8, 0.55]], 0.08), dots('#FFE000', [[0.75, 0.42]], 0.07),
    (ctx, x, y, w, h) => { ctx.fillStyle = '#C8102E'; ctx.fillRect(x + w * 0.72, y + h * 0.28, w * 0.06, h * 0.08); }),
});

// ---------- Americhe ----------
Object.assign(FLAGS, {
  ANT: over(solid('#CE1126'), (ctx, x, y, w, h) => {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w / 2, y + h); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#000000'; ctx.fillRect(x, y, w, h * 0.42);
    sole('#FCD116', 0.5, 0.42, 0.13, 8, 0.24)(ctx, x, y, w, h);
    ctx.fillStyle = '#0072C6'; ctx.fillRect(x, y + h * 0.42, w, h * 0.23);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + h * 0.65, w, h * 0.35);
    ctx.restore();
  }),
  ARU: over(solid('#418FDE'), rect('#F9D616', 0, 0.66, 1, 0.71), rect('#F9D616', 0, 0.77, 1, 0.82),
    starF('#FFFFFF', 0.19, 0.17, 0.26, 4), starF('#EF3340', 0.14, 0.17, 0.26, 4)),
  BAH: over(H('#00ABC9', '#FAE042', '#00ABC9'), triF('#000000', 0.42)),
  BAR: over(V('#00267F', '#FFC726', '#00267F'), (ctx, x, y, w, h) => {
    ctx.strokeStyle = '#000000'; ctx.lineWidth = Math.max(1, h * 0.06);
    const X = x + w / 2;
    ctx.beginPath(); ctx.moveTo(X, y + h * 0.22); ctx.lineTo(X, y + h * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - w * 0.1, y + h * 0.22); ctx.quadraticCurveTo(X - w * 0.1, y + h * 0.52, X, y + h * 0.52);
    ctx.quadraticCurveTo(X + w * 0.1, y + h * 0.52, X + w * 0.1, y + h * 0.22); ctx.stroke();
  }),
  BER: cantonF('#CF142B', stemma('#FFFFFF', '#CF142B', 0.75, 0.5, 0.17)),
  BIZ: over(Hw(['#CE1126', '#003F87', '#CE1126'], [1, 8, 1]), disc('#FFFFFF', 0.3), disc('#3A7728', 0.2), disc('#FFFFFF', 0.1)),
  BOL: H('#D52B1E', '#F9E300', '#007934'),
  CAY: cantonF('#012169', stemma('#FFFFFF', '#CF142B', 0.75, 0.5, 0.17)),
  CRC: Hw(['#002B7F', '#FFFFFF', '#CE1126', '#FFFFFF', '#002B7F'], [1, 1, 2, 1, 1]),
  DMA: over(solid('#006B3F'),
    rect('#FCD116', 0, 0.4, 1, 0.467), rect('#000000', 0, 0.467, 1, 0.533), rect('#FFFFFF', 0, 0.533, 1, 0.6),
    rect('#FCD116', 0.44, 0, 0.48, 1), rect('#000000', 0.48, 0, 0.52, 1), rect('#FFFFFF', 0.52, 0, 0.56, 1),
    disc('#D41C30', 0.24), cerchioStelle('#3F8A3F', 0.5, 0.5, 0.18, 10, 0.035), disc('#6BA34D', 0.08)),
  DOM: over(solid('#FFFFFF'), rect('#002D62', 0, 0, 0.45, 0.42), rect('#CE1126', 0.55, 0, 1, 0.42),
    rect('#CE1126', 0, 0.58, 0.45, 1), rect('#002D62', 0.55, 0.58, 1, 1), disc('#2E7D32', 0.07)),
  ECU: over(Hw(['#FFD100', '#0072CE', '#EF3340'], [2, 1, 1]), stemma('#8C6A2B', '#6CACE4', 0.5, 0.5, 0.15)),
  ESA: over(H('#0047AB', '#FFFFFF', '#0047AB'), stemma('#D4AF37', '#2E7D32', 0.5, 0.5, 0.12)),
  GRN: over(solid('#CE1126'), (ctx, x, y, w, h) => {
    const x0 = x + w * 0.08, y0 = y + h * 0.13, x1 = x + w * 0.92, y1 = y + h * 0.87, X = x + w / 2, Y = y + h / 2;
    ctx.fillStyle = '#FCD116'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#007A5E';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(X, Y); ctx.lineTo(x0, y1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x1, y0); ctx.lineTo(X, Y); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill();
  }, disc('#CE1126', 0.13), starF('#FCD116', 0.09, 0.5, 0.5),
    stelle('#FCD116', [[0.3, 0.065], [0.5, 0.065], [0.7, 0.065], [0.3, 0.935], [0.5, 0.935], [0.7, 0.935]], 0.045)),
  GUA: over(V('#4997D0', '#FFFFFF', '#4997D0'), stemma('#6DA544', '#FFFFFF', 0.5, 0.5, 0.12)),
  GUY: over(solid('#009E49'), poly('#FFFFFF', [[0, 0], [1, 0.5], [0, 1]]), poly('#FCD116', [[0, 0.04], [0.95, 0.5], [0, 0.96]]),
    poly('#000000', [[0, 0], [0.5, 0.5], [0, 1]]), poly('#CE1126', [[0, 0.06], [0.45, 0.5], [0, 0.94]])),
  HAI: over(H('#00209F', '#D21034'), rect('#FFFFFF', 0.36, 0.3, 0.64, 0.7), disc('#2E7D32', 0.1)),
  HON: over(H('#18C3DF', '#FFFFFF', '#18C3DF'),
    stelle('#18C3DF', [[0.5, 0.5], [0.39, 0.42], [0.39, 0.58], [0.61, 0.42], [0.61, 0.58]], 0.05)),
  ISV: over(solid('#FFFFFF'), aquila('#F9D616', 0.5, 0.48, 0.3), stemma('#0A3161', '#CE1126', 0.5, 0.52, 0.09),
    rect('#0A3161', 0.14, 0.4, 0.18, 0.6), rect('#0A3161', 0.83, 0.4, 0.86, 0.6)),
  IVB: cantonF('#012169', stemma('#2E7D32', '#FFFFFF', 0.75, 0.5, 0.18)),
  LCA: over(solid('#66CCFF'), poly('#FFFFFF', [[0.5, 0.1], [0.72, 0.9], [0.28, 0.9]]),
    poly('#000000', [[0.5, 0.18], [0.68, 0.9], [0.32, 0.9]]), poly('#FCD116', [[0.5, 0.52], [0.72, 0.9], [0.28, 0.9]])),
  NCA: over(H('#0067C6', '#FFFFFF', '#0067C6'), poly('#3A7D44', [[0.5, 0.38], [0.57, 0.6], [0.43, 0.6]])),
  PAN: over(solid('#FFFFFF'), rect('#DA121A', 0.5, 0, 1, 0.5), rect('#072357', 0, 0.5, 0.5, 1),
    starF('#072357', 0.12, 0.25, 0.25), starF('#DA121A', 0.12, 0.75, 0.75)),
  PAR: over(H('#D52B1E', '#FFFFFF', '#0038A8'), ringF('#2E7D32', 0.12, 0.03), dots('#F2C200', [[0.5, 0.5]], 0.05)),
  PUR: over(strisceF(5, '#ED0000', '#FFFFFF'), triF('#0050F0', 0.45), starF('#FFFFFF', 0.13, 0.15, 0.5)),
  SKN: over(solid('#009E49'), poly('#CE1126', [[1, 0], [1, 1], [0, 1]]), diag('#FCD116', 0.42), diag('#000000', 0.3),
    starF('#FFFFFF', 0.08, 0.36, 0.62), starF('#FFFFFF', 0.08, 0.64, 0.38)),
  SUR: over(Hw(['#377E3F', '#FFFFFF', '#B40A2D', '#FFFFFF', '#377E3F'], [2, 1, 4, 1, 2]), starF('#ECC81D', 0.17, 0.5, 0.5)),
  TTO: over(solid('#DA1A35'), diag('#FFFFFF', 0.4, true), diag('#000000', 0.3, true)),
  URU: strisceF(9, '#FFFFFF', '#0038A8', (ctx, x, y, w, h) => {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w * 0.37, h * 5 / 9);
    sole('#FCD116', 0.185, 0.28, 0.09, 16, 0.17)(ctx, x, y, w, h);
  }),
  VEN: over(H('#FFCC00', '#00247D', '#CF142B'), (ctx, x, y, w, h) => {
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * (1.18 + i * 0.64 / 7);
      starF('#FFFFFF', 0.04, 0.5 + Math.cos(a) * 0.17 * h / w * 1.9, 0.62 + Math.sin(a) * 0.19, 5)(ctx, x, y, w, h);
    }
  }),
  VIN: over(Vw(['#002674', '#FCD022', '#009E60'], [1, 2, 1]), rombo('#009E60', 0.42, 0.42, 0.11),
    rombo('#009E60', 0.58, 0.42, 0.11), rombo('#009E60', 0.5, 0.62, 0.11)),
});

// ---------- Asia ----------
Object.assign(FLAGS, {
  AFG: over(V('#000000', '#D32011', '#007A36'), ringF('#FFFFFF', 0.16, 0.035)),
  BAN: over(solid('#006A4E'), disc('#F42A41', 0.3, 0.45)),
  BHU: over(solid('#FF4E12'), poly('#FFD520', [[0, 0], [1, 0], [0, 1]]), (ctx, x, y, w, h) => {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, h * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + w * 0.25, y + h * 0.7);
    ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.35, x + w * 0.55, y + h * 0.55);
    ctx.quadraticCurveTo(x + w * 0.65, y + h * 0.75, x + w * 0.78, y + h * 0.3); ctx.stroke();
  }),
  BRN: dentiF('#CE1126', '#FFFFFF', 0.22, 5),
  BRU: over(solid('#F7E017'), poly('#FFFFFF', [[0, 0.1], [1, 0.52], [1, 0.72], [0, 0.3]]),
    poly('#000000', [[0, 0.3], [1, 0.72], [1, 0.88], [0, 0.46]]), stemma('#CF1126', '#F7E017', 0.5, 0.5, 0.17)),
  CAM: over(Hw(['#032EA1', '#E00025', '#032EA1'], [1, 2, 1]),
    poly('#FFFFFF', [[0.3, 0.68], [0.7, 0.68], [0.66, 0.55], [0.34, 0.55]]),
    poly('#FFFFFF', [[0.45, 0.55], [0.5, 0.3], [0.55, 0.55]]), poly('#FFFFFF', [[0.36, 0.55], [0.4, 0.38], [0.44, 0.55]]),
    poly('#FFFFFF', [[0.56, 0.55], [0.6, 0.38], [0.64, 0.55]])),
  HKG: over(solid('#DE2910'), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2566 - 1.5708;
      ctx.beginPath();
      ctx.ellipse(x + w / 2 + Math.cos(a) * h * 0.16, y + h / 2 + Math.sin(a) * h * 0.16, h * 0.15, h * 0.08, a, 0, 6.2832);
      ctx.fill();
    }
  }),
  IRQ: over(H('#CE1126', '#FFFFFF', '#000000'), rect('#007A3D', 0.36, 0.44, 0.64, 0.56)),
  JOR: over(H('#000000', '#FFFFFF', '#007A3D'), triF('#CE1126', 0.5), starF('#FFFFFF', 0.08, 0.17, 0.5, 7)),
  KAZ: over(solid('#00AFCA'), sole('#FEC50C', 0.52, 0.4, 0.13, 16, 0.2), aquila('#FEC50C', 0.52, 0.7, 0.14),
    rect('#FEC50C', 0.04, 0.05, 0.08, 0.95)),
  KGZ: over(solid('#E8112D'), sole('#FFEF00', 0.5, 0.5, 0.22, 20, 0.36), ringF('#E8112D', 0.14, 0.04), ringF('#E8112D', 0.07, 0.035)),
  KSA: over(solid('#006C35'), rect('#FFFFFF', 0.22, 0.3, 0.78, 0.44), rect('#FFFFFF', 0.25, 0.62, 0.75, 0.67),
    rect('#FFFFFF', 0.25, 0.58, 0.28, 0.71)),
  KUW: over(H('#007A3D', '#FFFFFF', '#CE1126'), poly('#000000', [[0, 0], [0.25, 0.33], [0.25, 0.67], [0, 1]])),
  LAO: over(Hw(['#CE1126', '#002868', '#CE1126'], [1, 2, 1]), disc('#FFFFFF', 0.2)),
  LBN: over(Hw(['#ED1C24', '#FFFFFF', '#ED1C24'], [1, 2, 1]), poly('#00A651', [[0.5, 0.28], [0.62, 0.64], [0.38, 0.64]]),
    rect('#00A651', 0.48, 0.64, 0.52, 0.72)),
  MAS: strisceF(14, '#CC0001', '#FFFFFF', (ctx, x, y, w, h) => {
    ctx.fillStyle = '#010066'; ctx.fillRect(x, y, w * 0.5, h * 8 / 14);
    luna('#FFCC00', '#010066', 0.2, 0.17, 0.29)(ctx, x, y, w, h);
    starF('#FFCC00', 0.13, 0.33, 0.29, 14)(ctx, x, y, w, h);
  }),
  MDV: over(solid('#D21034'), rect('#007E3A', 0.25, 0.25, 0.75, 0.75), luna('#FFFFFF', '#007E3A', 0.16, 0.52, 0.5, -0.06)),
  MGL: over(V('#C4272F', '#015197', '#C4272F'), rect('#F9CF02', 0.13, 0.35, 0.21, 0.85), disc('#F9CF02', 0.07, 0.17, 0.25)),
  MYA: over(H('#FECB00', '#34B233', '#EA2839'), starF('#FFFFFF', 0.42, 0.5, 0.56)),
  NEP: (ctx, x, y, w, h) => {
    poly('#003893', [[0.12, 0], [0.8, 0.46], [0.42, 0.46], [0.84, 1], [0.12, 1]])(ctx, x, y, w, h);
    poly('#DC143C', [[0.15, 0.06], [0.7, 0.43], [0.34, 0.43], [0.76, 0.96], [0.15, 0.96]])(ctx, x, y, w, h);
    luna('#FFFFFF', '#DC143C', 0.09, 0.3, 0.3, 0, -0.04)(ctx, x, y, w, h);
    sole('#FFFFFF', 0.3, 0.74, 0.07, 12, 0.12)(ctx, x, y, w, h);
  },
  OMA: over(solid('#DB161B'), rect('#FFFFFF', 0.25, 0, 1, 0.33), rect('#008000', 0.25, 0.67, 1, 1),
    dots('#FFFFFF', [[0.11, 0.16]], 0.08)),
  PAK: over(Vw(['#FFFFFF', '#01411C'], [1, 3]), luna('#FFFFFF', '#01411C', 0.26, 0.62, 0.52, 0.12, -0.08),
    starF('#FFFFFF', 0.1, 0.7, 0.36)),
  PLE: over(H('#000000', '#FFFFFF', '#007A3D'), triF('#CE1126', 0.36)),
  PRK: over(Hw(['#024FA2', '#FFFFFF', '#ED1C27', '#FFFFFF', '#024FA2'], [6, 1, 15, 1, 6]), disc('#FFFFFF', 0.24, 0.34),
    starF('#ED1C27', 0.22, 0.34, 0.5)),
  QAT: dentiF('#8A1538', '#FFFFFF', 0.28, 9),
  SGP: over(H('#EF3340', '#FFFFFF'), luna('#FFFFFF', '#EF3340', 0.17, 0.17, 0.25),
    stelle('#FFFFFF', [[0.3, 0.13], [0.36, 0.23], [0.34, 0.36], [0.26, 0.36], [0.24, 0.23]], 0.04)),
  SRI: over(solid('#FFBE29'), rect('#00534E', 0.04, 0.07, 0.14, 0.93), rect('#EB7400', 0.14, 0.07, 0.24, 0.93),
    rect('#8D153A', 0.28, 0.07, 0.96, 0.93), (ctx, x, y, w, h) => {
      ctx.fillStyle = '#FFBE29';
      ctx.beginPath(); ctx.ellipse(x + w * 0.62, y + h * 0.52, w * 0.13, h * 0.24, 0, 0, 6.2832); ctx.fill();
    }, dots('#FFBE29', [[0.33, 0.17], [0.91, 0.17], [0.33, 0.83], [0.91, 0.83]], 0.05)),
  SYR: over(H('#007A3D', '#FFFFFF', '#000000'), stelle('#CE1126', [[0.32, 0.5], [0.5, 0.5], [0.68, 0.5]], 0.11)),
  TJK: over(Hw(['#CC0000', '#FFFFFF', '#006600'], [2, 3, 2]), rect('#F8C300', 0.46, 0.46, 0.54, 0.56),
    stelle('#F8C300', [[0.38, 0.44], [0.42, 0.37], [0.46, 0.33], [0.5, 0.32], [0.54, 0.33], [0.58, 0.37], [0.62, 0.44]], 0.035)),
  TKM: over(solid('#00843D'), rect('#D22630', 0.1, 0, 0.25, 1), dots('#FFC72C', [[0.175, 0.2], [0.175, 0.4], [0.175, 0.6], [0.175, 0.8]], 0.05),
    luna('#FFFFFF', '#00843D', 0.12, 0.38, 0.24, 0.05),
    stelle('#FFFFFF', [[0.46, 0.14], [0.52, 0.2], [0.49, 0.3], [0.45, 0.38], [0.55, 0.3]], 0.035)),
  TLS: over(solid('#DC241F'), triF('#FFC726', 0.5), triF('#000000', 0.33), starF('#FFFFFF', 0.12, 0.12, 0.5)),
  // Il Taipei cinese gareggia sotto il fiore di pruno bianco col sole. Nella bandiera vera sotto ci
  // sono anche i cinque anelli, che pero' sono un emblema protetto (Trattato di Nairobi): qui no.
  TPE: over(solid('#FFFFFF'), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#DE2910';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2566 - 1.5708;
      ctx.beginPath(); ctx.arc(x + w / 2 + Math.cos(a) * h * 0.2, y + h / 2 + Math.sin(a) * h * 0.2, h * 0.15, 0, 6.2832); ctx.fill();
    }
  }, disc('#000095', 0.19, 0.5, 0.5), sole('#FFFFFF', 0.5, 0.5, 0.06, 12, 0.13)),
  UAE: over(H('#00732F', '#FFFFFF', '#000000'), rect('#FF0000', 0, 0, 0.25, 1)),
  UZB: over(Hw(['#0099B5', '#CE1126', '#FFFFFF', '#CE1126', '#1EB53A'], [10, 1, 10, 1, 10]),
    luna('#FFFFFF', '#0099B5', 0.11, 0.12, 0.16),
    dots('#FFFFFF', [[0.22, 0.1], [0.27, 0.1], [0.32, 0.1], [0.22, 0.19], [0.27, 0.19], [0.32, 0.19]], 0.025)),
  YEM: H('#CE1126', '#FFFFFF', '#000000'),
});

// ---------- Africa ----------
Object.assign(FLAGS, {
  ANG: over(H('#CC092F', '#000000'), (ctx, x, y, w, h) => {
    ctx.strokeStyle = '#FFCB00'; ctx.lineWidth = Math.max(1, h * 0.06);
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.17, 3.6, 7.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.42, y + h * 0.66); ctx.lineTo(x + w * 0.6, y + h * 0.36); ctx.stroke();
  }, starF('#FFCB00', 0.06, 0.45, 0.4)),
  BDI: over(solid('#CE1126'), poly('#1EB53A', [[0, 0], [0.5, 0.5], [0, 1]]), poly('#1EB53A', [[1, 0], [0.5, 0.5], [1, 1]]),
    (ctx, x, y, w, h) => {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = h * 0.13;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke();
    }, disc('#FFFFFF', 0.27), stelle('#CE1126', [[0.5, 0.38], [0.44, 0.58], [0.56, 0.58]], 0.07, 6)),
  BEN: over(rect('#FCD116', 0.4, 0, 1, 0.5), rect('#E8112D', 0.4, 0.5, 1, 1), rect('#008751', 0, 0, 0.4, 1)),
  BOT: Hw(['#6DA9D2', '#FFFFFF', '#000000', '#FFFFFF', '#6DA9D2'], [9, 1, 4, 1, 9]),
  BUR: over(H('#EF2B2D', '#009E49'), starF('#FCD116', 0.18, 0.5, 0.5)),
  CAF: over(H('#003082', '#FFFFFF', '#289728', '#FFCE00'), rect('#D21034', 0.44, 0, 0.56, 1), starF('#FFCE00', 0.09, 0.14, 0.12)),
  CGO: over(solid('#FBDE4A'), poly('#009543', [[0, 0], [0.66, 0], [0, 1]]), poly('#DC241F', [[1, 0], [1, 1], [0.34, 1]])),
  CHA: V('#002664', '#FECB00', '#C60C30'),
  CIV: V('#F77F00', '#FFFFFF', '#009E60'),
  CMR: over(V('#007A5E', '#CE1126', '#FCD116'), starF('#FCD116', 0.14, 0.5, 0.5)),
  COD: over(solid('#007FFF'), diag('#F7D618', 0.36), diag('#CE1021', 0.26), starF('#F7D618', 0.14, 0.15, 0.22)),
  COM: over(H('#FFC61E', '#FFFFFF', '#CE1126', '#3A75C4'), triF('#3D8E33', 0.45), luna('#FFFFFF', '#3D8E33', 0.17, 0.13, 0.5),
    stelle('#FFFFFF', [[0.2, 0.36], [0.22, 0.45], [0.22, 0.55], [0.2, 0.64]], 0.03)),
  CPV: over(solid('#003893'), rect('#FFFFFF', 0, 0.5, 1, 0.583), rect('#CF2027', 0, 0.583, 1, 0.667), rect('#FFFFFF', 0, 0.667, 1, 0.75),
    cerchioStelle('#F7D116', 0.375, 0.625, 0.22, 10, 0.04)),
  DJI: over(H('#6AB2E7', '#12AD2B'), triF('#FFFFFF', 0.5), starF('#D7141A', 0.1, 0.16, 0.5)),
  ERI: over(rect('#12AD2B', 0, 0, 1, 0.5), rect('#4189DD', 0, 0.5, 1, 1), poly('#EA0437', [[0, 0], [1, 0.5], [0, 1]]),
    (ctx, x, y, w, h) => {                                              // la corona d'ulivo
      ctx.strokeStyle = '#FFC726'; ctx.lineWidth = Math.max(1, h * 0.035);
      ctx.beginPath(); ctx.arc(x + w * 0.24, y + h / 2, h * 0.15, 0, 6.2832); ctx.stroke();
    }),
  GAB: H('#009E60', '#FCD116', '#3A75C4'),
  GAM: Hw(['#CE1126', '#FFFFFF', '#0C1C8C', '#FFFFFF', '#3A7728'], [6, 1, 4, 1, 6]),
  GBS: over(rect('#FCD116', 0.33, 0, 1, 0.5), rect('#009E49', 0.33, 0.5, 1, 1), rect('#CE1126', 0, 0, 0.33, 1),
    starF('#000000', 0.14, 0.165, 0.5)),
  GEQ: over(H('#3E9A00', '#FFFFFF', '#E32118'), triF('#0073CE', 0.3), stemma('#9E9E9E', '#FFFFFF', 0.5, 0.5, 0.1)),
  GUI: V('#CE1126', '#FCD116', '#009460'),
  LBA: over(Hw(['#E70013', '#000000', '#239E46'], [1, 2, 1]), luna('#FFFFFF', '#000000', 0.14, 0.48, 0.5),
    starF('#FFFFFF', 0.07, 0.56, 0.5)),
  LBR: strisceF(11, '#BF0A30', '#FFFFFF', (ctx, x, y, w, h) => {
    const c = h * 5 / 11;
    ctx.fillStyle = '#002868'; ctx.fillRect(x, y, c, c);
    starF('#FFFFFF', 0.16, c / 2 / w, 5 / 22)(ctx, x, y, w, h);
  }),
  LES: over(Hw(['#00209F', '#FFFFFF', '#009543'], [3, 4, 3]), poly('#000000', [[0.5, 0.36], [0.58, 0.58], [0.42, 0.58]]),
    rect('#000000', 0.4, 0.58, 0.6, 0.62)),
  MAD: over(rect('#FC3D32', 0.33, 0, 1, 0.5), rect('#007E3A', 0.33, 0.5, 1, 1), rect('#FFFFFF', 0, 0, 0.33, 1)),
  MAW: over(H('#000000', '#CE1126', '#339E35'), sole('#CE1126', 0.5, 0.33, 0.1, 31, 0.2), rect('#CE1126', 0, 0.28, 1, 0.34)),
  MLI: V('#14B53A', '#FCD116', '#CE1126'),
  MOZ: over(Hw(['#007168', '#FFFFFF', '#000000', '#FFFFFF', '#FCE100'], [5, 1, 5, 1, 5]), triF('#D21034', 0.42),
    starF('#FCE100', 0.14, 0.15, 0.5)),
  MRI: H('#EA2839', '#1A206D', '#FFD500', '#00A551'),
  MTN: over(Hw(['#D01C1F', '#00A95C', '#D01C1F'], [1, 6, 1]), luna('#FFD700', '#00A95C', 0.22, 0.5, 0.5, 0, -0.08),
    starF('#FFD700', 0.1, 0.5, 0.33)),
  NAM: over(solid('#009543'), poly('#003580', [[0, 0], [1, 0], [0, 1]]), diag('#FFFFFF', 0.36), diag('#D21034', 0.26),
    sole('#FFCE00', 0.2, 0.25, 0.08, 12, 0.15)),
  NIG: over(H('#E05206', '#FFFFFF', '#0DB02B'), disc('#E05206', 0.11)),
  RWA: over(Hw(['#00A1DE', '#FAD201', '#20603D'], [2, 1, 1]), sole('#FAD201', 0.82, 0.25, 0.07, 24, 0.14)),
  SEY: (ctx, x, y, w, h) => {
    poly('#003F87', [[0, 1], [0, 0], [0.33, 0]])(ctx, x, y, w, h);
    poly('#FCD856', [[0, 1], [0.33, 0], [0.67, 0]])(ctx, x, y, w, h);
    poly('#D62828', [[0, 1], [0.67, 0], [1, 0], [1, 0.33]])(ctx, x, y, w, h);
    poly('#FFFFFF', [[0, 1], [1, 0.33], [1, 0.67]])(ctx, x, y, w, h);
    poly('#007A3D', [[0, 1], [1, 0.67], [1, 1]])(ctx, x, y, w, h);
  },
  SLE: H('#1EB53A', '#FFFFFF', '#0072C6'),
  SOM: over(solid('#4189DD'), starF('#FFFFFF', 0.28, 0.5, 0.52)),
  SSD: over(Hw(['#000000', '#FFFFFF', '#DA121A', '#FFFFFF', '#078930'], [6, 1, 6, 1, 6]), triF('#0F47AF', 0.36),
    starF('#FCDD09', 0.1, 0.12, 0.5)),
  STP: over(Hw(['#12AD2B', '#FFCE00', '#12AD2B'], [2, 3, 2]), triF('#D21034', 0.3),
    stelle('#000000', [[0.47, 0.5], [0.68, 0.5]], 0.11)),
  SUD: over(H('#D21034', '#FFFFFF', '#000000'), triF('#007229', 0.35)),
  SWZ: over(Hw(['#3E5EB9', '#FFD900', '#B10C0C', '#FFD900', '#3E5EB9'], [3, 1, 8, 1, 3]), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * 0.2, h * 0.17, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * 0.2, h * 0.17, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
  }),
  TAN: over(solid('#00A3DD'), poly('#1EB53A', [[0, 0], [1, 0], [0, 1]]), diag('#FCD116', 0.36), diag('#000000', 0.26)),
  TOG: strisceF(5, '#006A4E', '#FFCE00', (ctx, x, y, w, h) => {
    const c = h * 3 / 5;
    ctx.fillStyle = '#D21034'; ctx.fillRect(x, y, c, c);
    starF('#FFFFFF', 0.17, c / 2 / w, 0.3)(ctx, x, y, w, h);
  }),
  UGA: over(H('#000000', '#FCDC04', '#D90000', '#000000', '#FCDC04', '#D90000'), disc('#FFFFFF', 0.22),
    dots('#9CA69C', [[0.5, 0.5]], 0.1), rect('#D90000', 0.52, 0.36, 0.56, 0.42)),
  ZAM: over(solid('#198A00'), rect('#DE2010', 0.66, 0.4, 0.77, 1), rect('#000000', 0.77, 0.4, 0.88, 1),
    rect('#EF7D00', 0.88, 0.4, 1, 1), aquila('#EF7D00', 0.83, 0.2, 0.13)),
  ZIM: over(H('#319208', '#FFD200', '#DE2010', '#000000', '#DE2010', '#FFD200', '#319208'),
    poly('#000000', [[0, 0], [0.5, 0.5], [0, 1]]), poly('#FFFFFF', [[0, 0.03], [0.46, 0.5], [0, 0.97]]),
    starF('#DE2010', 0.12, 0.13, 0.5), rect('#FFD200', 0.12, 0.44, 0.16, 0.58)),
});

// ---------- Oceania ----------
Object.assign(FLAGS, {
  ASA: over(solid('#002B7F'), poly('#BF0A30', [[1, 0], [0, 0.5], [1, 1]]), poly('#FFFFFF', [[1, 0.08], [0.12, 0.5], [1, 0.92]]),
    aquila('#8B5A2B', 0.72, 0.5, 0.16)),
  COK: cantonF('#012169', cerchioStelle('#FFFFFF', 0.75, 0.5, 0.28, 15, 0.035)),
  FSM: over(solid('#75B2DD'), stelle('#FFFFFF', [[0.5, 0.22], [0.5, 0.78], [0.33, 0.5], [0.67, 0.5]], 0.11)),
  GUM: over(solid('#C62139'), rect('#00297B', 0.04, 0.06, 0.96, 0.94), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#6FB6E5';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * 0.13, h * 0.3, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#C62139'; ctx.lineWidth = Math.max(1, h * 0.03); ctx.stroke();
    ctx.fillStyle = '#E8C46A'; ctx.fillRect(x + w * 0.4, y + h * 0.58, w * 0.2, h * 0.08);
  }),
  KIR: over(rect('#CE1126', 0, 0, 1, 0.52), sole('#FCD116', 0.5, 0.52, 0.12, 17, 0.2), (ctx, x, y, w, h) => {
    // il sole sorge dietro le onde: le onde si disegnano dopo
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#003F87'; ctx.fillRect(x, y + h * (0.52 + i * 0.08), w, h * 0.08 + 0.6); }
  }, poly('#FCD116', [[0.36, 0.2], [0.5, 0.26], [0.64, 0.18], [0.52, 0.32]])),
  MHL: over(solid('#003893'), (ctx, x, y, w, h) => {
    ctx.fillStyle = '#DD7500';
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.1); ctx.lineTo(x, y + h * 0.95); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.95); ctx.lineTo(x + w, y + h * 0.1); ctx.lineTo(x + w, y + h * 0.22); ctx.lineTo(x, y + h * 0.9); ctx.fill();
  }, starF('#FFFFFF', 0.16, 0.2, 0.28, 24)),
  NRU: over(solid('#002B7F'), rect('#FFC61E', 0, 0.46, 1, 0.54), starF('#FFFFFF', 0.13, 0.25, 0.73, 12)),
  SOL: over(solid('#215B33'), poly('#0051BA', [[0, 0], [1, 0], [0, 1]]), diag('#FCD116', 0.08),
    stelle('#FFFFFF', [[0.1, 0.12], [0.24, 0.12], [0.17, 0.25], [0.1, 0.38], [0.24, 0.38]], 0.05)),
  TUV: cantonF('#009FCA', stelle('#FCD116', [[0.62, 0.3], [0.72, 0.22], [0.82, 0.3], [0.6, 0.55], [0.7, 0.62], [0.8, 0.55],
    [0.9, 0.62], [0.68, 0.82], [0.86, 0.85]], 0.05)),
});

// L'Unione Sovietica serve solo a disegnare Sedykh nella schermata dei record: non sta in
// CONTINENTS, quindi nessun giocatore la puo' scegliere.
FLAGS.URS = over(solid('#CC0000'), (ctx, x, y, w, h) => {
  ctx.fillStyle = '#FFD700';
  starPath(ctx, x + w * 0.18, y + h * 0.15, h * 0.08, h * 0.035, 5, -Math.PI / 2); ctx.fill();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = Math.max(1, h * 0.06);   // falce e martello, in piccolo
  ctx.beginPath(); ctx.arc(x + w * 0.18, y + h * 0.42, h * 0.13, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + h * 0.58); ctx.lineTo(x + w * 0.26, y + h * 0.3); ctx.stroke();
});

// I continenti come li divide il CIO (per questo Turchia, Israele e Cipro stanno in Europa), e
// dentro ogni continente in ordine di codice, che e' quello che si legge sotto la bandiera.
const CONTINENTS = [
  { name: 'EUROPA', codes: ['ALB', 'AND', 'ARM', 'AUT', 'AZE', 'BEL', 'BIH', 'BLR', 'BUL', 'CRO', 'CYP', 'CZE', 'DEN', 'ESP',
    'EST', 'FIN', 'FRA', 'GBR', 'GEO', 'GER', 'GRE', 'HUN', 'IRL', 'ISL', 'ISR', 'ITA', 'KOS', 'LAT', 'LIE', 'LTU', 'LUX',
    'MDA', 'MKD', 'MLT', 'MNE', 'MON', 'NED', 'NOR', 'POL', 'POR', 'ROU', 'RUS', 'SLO', 'SMR', 'SRB', 'SUI', 'SVK', 'SWE',
    'TUR', 'UKR', 'VAT'] },
  { name: 'AMERICHE', codes: ['ANT', 'ARG', 'ARU', 'BAH', 'BAR', 'BER', 'BIZ', 'BOL', 'BRA', 'CAN', 'CAY', 'CHI', 'COL',
    'CRC', 'CUB', 'DMA', 'DOM', 'ECU', 'ESA', 'GRN', 'GUA', 'GUY', 'HAI', 'HON', 'ISV', 'IVB', 'JAM', 'LCA', 'MEX', 'NCA',
    'PAN', 'PAR', 'PER', 'PUR', 'SKN', 'SUR', 'TTO', 'URU', 'USA', 'VEN', 'VIN'] },
  { name: 'ASIA', codes: ['AFG', 'BAN', 'BHU', 'BRN', 'BRU', 'CAM', 'CHN', 'HKG', 'INA', 'IND', 'IRI', 'IRQ', 'JOR', 'JPN',
    'KAZ', 'KGZ', 'KOR', 'KSA', 'KUW', 'LAO', 'LBN', 'MAS', 'MDV', 'MGL', 'MYA', 'NEP', 'OMA', 'PAK', 'PHI', 'PLE', 'PRK',
    'QAT', 'SGP', 'SRI', 'SYR', 'THA', 'TJK', 'TKM', 'TLS', 'TPE', 'UAE', 'UZB', 'VIE', 'YEM'] },
  { name: 'AFRICA', codes: ['ALG', 'ANG', 'BDI', 'BEN', 'BOT', 'BUR', 'CAF', 'CGO', 'CHA', 'CIV', 'CMR', 'COD', 'COM', 'CPV',
    'DJI', 'EGY', 'ERI', 'ETH', 'GAB', 'GAM', 'GBS', 'GEQ', 'GHA', 'GUI', 'KEN', 'LBA', 'LBR', 'LES', 'MAD', 'MAR', 'MAW',
    'MLI', 'MOZ', 'MRI', 'MTN', 'NAM', 'NGR', 'NIG', 'RSA', 'RWA', 'SEN', 'SEY', 'SLE', 'SOM', 'SSD', 'STP', 'SUD', 'SWZ',
    'TAN', 'TOG', 'TUN', 'UGA', 'ZAM', 'ZIM'] },
  { name: 'OCEANIA', codes: ['ASA', 'AUS', 'COK', 'FIJ', 'FSM', 'GUM', 'KIR', 'MHL', 'NRU', 'NZL', 'PLW', 'PNG', 'SAM', 'SOL',
    'TGA', 'TUV', 'VAN'] },
];

function drawFlag(ctx, code, x, y, w, h) {
  const f = FLAGS[code];
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (f) f(ctx, x, y, w, h); else { ctx.fillStyle = '#90a4ae'; ctx.fillRect(x, y, w, h); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
