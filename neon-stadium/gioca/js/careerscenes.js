'use strict';
// ===== Schermate della Carriera: quadro, negozio, allenamenti =====

function careerHeader(ctx, title) {
  const W = G.W, cx = W / 2, d = Career.data, L = Career.C.livello(d.lvl), pr = Profiles.data[Career.slot];
  txt(ctx, title, cx, 30, 24, '#ffd600');
  drawFlag(ctx, pr.code, 44, 20, 30, 20);
  txt(ctx, pr.name, 82, 31, 17, HUMAN_COLS[Career.slot].ui, 'left', { italic: false });
  txt(ctx, L.name, cx, 54, 15, L.col, 'center', { italic: false });
  txt(ctx, Money(d.money), W - 44, 31, 22, '#ffd600', 'right');
}

// A line of text shrunk to fit the width given (the event names are long in a narrow tile).
function fitTxt(ctx, s, x, y, size, w, color, align) {
  const t = T(s), it = align ? { italic: false } : undefined;
  ctx.font = (align ? 'bold ' : 'italic bold ') + size + 'px ' + FONT;
  while (size > 8 && ctx.measureText(t).width > w) { size--; ctx.font = (align ? 'bold ' : 'italic bold ') + size + 'px ' + FONT; }
  txt(ctx, s, x, y, size, color, align, it);
}

// One attribute bar, 0..100, with a notch at the ceiling this tier allows.
function attrBar(ctx, x, y, w, a, v, extra, cap) {
  fitTxt(ctx, a.name, x, y, 13, 104, '#fff', 'left');
  const bx = x + 110, bw = w - 110 - (extra ? 56 : 0);
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(ctx, bx, y - 7, bw, 14, 4); ctx.fill();
  if (cap && cap < ATTR_MAX) { // the stretch of the bar out of reach until the next championship
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(bx + 1 + (bw - 2) * cap / ATTR_MAX, y - 6, (bw - 2) * (1 - cap / ATTR_MAX), 12);
  }
  ctx.fillStyle = a.col;
  ctx.fillRect(bx + 1, y - 6, (bw - 2) * clamp(v / ATTR_MAX, 0, 1), 12);
  if (cap && cap < ATTR_MAX) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(bx + (bw - 2) * cap / ATTR_MAX, y - 8, 2, 16);
  }
  txt(ctx, v + '', bx + bw + (extra ? 28 : -6), y, 13, '#fff', extra ? 'center' : 'right', { italic: false });
}

// The medal tally: gold, silver and bronze side by side with how many of each, centred on cx.
// topY is where the ribbons start: pass it where there is something just above them.
function medalTally(ctx, cx, y, r, medals, topY) {
  const size = Math.round(r * 1.45), gap = r * 1.5;
  ctx.font = 'italic bold ' + size + 'px ' + FONT;
  const w = medals.map(n => 2 * r + 6 + ctx.measureText('× ' + n).width);
  let x = cx - (w[0] + w[1] + w[2] + gap * 2) / 2;
  medals.forEach((n, i) => {
    drawMedal(ctx, x + r, y, r, i + 1, topY == null ? y - r * 2.4 : topY);
    txt(ctx, '× ' + n, x + 2 * r + 6, y, size, n > 0 ? '#fff' : 'rgba(255,255,255,0.45)', 'left');
    x += w[i] + gap;
  });
}

// ---------- career hub ----------
class CareerScene extends Screen {
  layout() {
    const W = G.W, cx = W / 2, d = Career.data, D = Career.doneMap();
    this.btns = [];
    // file da sei: con 18 gare tre file di riquadri alti, con di piu' quattro file basse, quanto
    // basta a starci tutte sopra i pulsanti
    const cols = 6, gx = 9, bw = Math.min(150, (W - 56) / cols - gx), fitta = Career.C.events.length > 18, bh = fitta ? 64 : 86;
    const x0 = cx - (cols * bw + (cols - 1) * gx) / 2;
    Career.C.events.forEach((e, i) => {
      const r = Math.floor(i / cols), c = i % cols, ok = !!D[e.id];
      this.btns.push({
        x: x0 + c * (bw + gx), y: 178 + r * (bh + (fitta ? 6 : 8)), w: bw, h: bh, label: '', // the tile draws its own lines
        color: ok ? '#2e7d32' : '#1e88e5', ok, ev: e,
        best: Career.bestMap()[e.id], place: Career.placeMap()[e.id],
        fn: () => Game.startCareer(Career.C.idx(i)),
      });
    });
    // bottom row: back on the left, then the three main buttons, narrowed so they never overlap it
    const bb = Math.min(150, W * 0.18), gap = 12;
    const mw = Math.min(200, (W - 60 - bb - 2 * gap) / 3), mx = W - 20 - (3 * mw + 2 * gap);
    this.btns.push({ x: 20, y: G.H - 64, w: bb, h: 48, label: '‹ INDIETRO', size: 16, color: '#546e7a', fn: () => Career.C.esci() });
    this.btns.push({ x: mx, y: G.H - 66, w: mw, h: 52, label: 'ALLENAMENTI', size: 18, color: '#00897b', fn: () => G.setScene(new TrainScene()) });
    this.btns.push({ x: mx + mw + gap, y: G.H - 66, w: mw, h: 52, label: 'NEGOZIO', size: 18, color: '#ef6c00', fn: () => G.setScene(new ShopScene()) });
    // si parte solo con gli obiettivi centrati e i soldi della trasferta in cassa
    const ready = Career.ready(), last = d.lvl >= 3, soldi = Career.canAfford(), via = ready && soldi;
    this.btns.push({
      x: mx + 2 * (mw + gap), y: G.H - 66, w: mw, h: 52,
      label: via ? (last ? Career.C.testi.titoloBtn : 'QUALIFICATI ›') : 'QUALIFICAZIONE',
      sub: !ready ? Career.doneCount() + (Career.doneCount() === 1 ? ' obiettivo su ' : ' obiettivi su ') + Career.need()
        : !soldi ? Career.C.testi.manca + Money(Career.promoFee() - d.money) : '',
      size: 18, color: via ? '#43a047' : '#37474f',
      fn: () => {
        if (!Career.canPromote()) { Snd.click(); return; }
        if (last) { Career.promote(); Snd.fanfare(); G.setScene(new PromoScene()); return; }
        this.ask = true; this.layout();   // warn about the fare before it is taken
      },
    });
    if (this.ask) {
      this.btns = [
        { x: cx - 230, y: 330, w: 210, h: 56, label: 'ANNULLA', size: 19, color: '#78909c',
          fn: () => { this.ask = false; this.layout(); } },
        { x: cx + 20, y: 330, w: 210, h: 56, label: 'SÌ, PARTI', size: 19, color: '#43a047',
          fn: () => { Career.promote(); Snd.fanfare(); G.setScene(new PromoScene()); } },
      ];
    }
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, d = Career.data;
    panel(ctx, 24, 8, W - 48, G.H - 84);
    careerHeader(ctx, Career.C.testi.titolo);
    // attributes
    const aw = Math.min(300, (W - 120) / 2);
    Career.C.attrs.forEach((a, i) => attrBar(ctx, 60 + (i % 2) * (aw + 40), 82 + Math.floor(i / 2) * 24, aw, a, d.attr[a.k], false, Career.attrCap()));
    txt(ctx, 'MEDAGLIE VINTE  ' + d.medals[0] + ' oro  ·  ' + d.medals[1] + ' argento  ·  ' + d.medals[2] + ' bronzo   •   ' + d.races + ' gare',
      cx, 148, 13, '#ffcc80', 'center', { italic: false });
    txt(ctx, d.lvl >= 3 ? Career.C.testi.ultimo
      : Career.ready() && !Career.canAfford() ? 'obiettivi centrati: per partire servono ' + Money(Career.promoFee())
        : Career.C.testi.sali || 'centra l\'obiettivo in ' + Career.need() + ' specialità su ' + Career.C.events.length + ' per salire di livello',
      cx, 166, 14, '#fff', 'center', { italic: false });
    if (this.ask) {
      const L = Career.C.livello(d.lvl + 1);
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, G.H);
      panel(ctx, cx - 300, 150, 600, 240);
      txt(ctx, 'QUALIFICARSI ORA?', cx, 196, 26, '#7CFC00');
      txt(ctx, 'passi a', cx, 234, 16, '#fff', 'center', { italic: false });
      txt(ctx, L.name, cx, 262, 24, L.col);
      txt(ctx, Career.C.testi.tassa + Money(Career.promoFee()), cx, 296, 18, '#ffd600', 'center', { italic: false });
      txt(ctx, Career.C.testi.resto, cx, 320, 15, '#fff', 'center', { italic: false });
    }
    // last, so the dialog's dark veil never falls on its own buttons
    for (const b of this.btns) { if (b.ev) this.drawTile(ctx, b); else drawBtn(ctx, b); }
  }
  // One event of the championship: name, target, your best mark and the best you ever placed in it.
  // A podium hangs its medal at the foot of the tile, so you see at a glance where you won what.
  drawTile(ctx, b) {
    drawBtn(ctx, b); // frame only: the tiles carry no label
    const e = b.ev, cx = b.x + b.w / 2, w = b.w - 10;
    // due misure: il riquadro alto (18 gare, tre file) e quello basso (quattro file)
    const Y = b.h >= 80 ? { n: 15, o: 34, mai: 55, tuo: 50, pos: 71, med: 72, nastro: 60, s: 11, sn: 14, so: 12, r: 8 }
      : { n: 12, o: 27, mai: 45, tuo: 41, pos: 55, med: 56, nastro: 48, s: 10, sn: 13, so: 11, r: 6 };
    fitTxt(ctx, SHORT[e.id], cx, b.y + Y.n, Y.sn, w, '#fff');
    fitTxt(ctx, (b.ok ? '✔  ' : 'obiettivo ') + e.fmt(Career.std(e.id)), cx, b.y + Y.o, Y.so, w, b.ok ? '#b9f6ca' : '#e3f2fd');
    if (b.best == null) { fitTxt(ctx, 'mai gareggiato', cx, b.y + Y.mai, 11, w, 'rgba(255,255,255,0.6)'); return; }
    fitTxt(ctx, 'tuo ' + e.fmt(b.best), cx, b.y + Y.tuo, 11, w, '#ffd600');
    if (b.place == null) return;
    // written with the degree sign so the whole line is translated in one go ("4° su 8" -> "4th of 8")
    if (b.place > 3) { fitTxt(ctx, b.place + '° su ' + Game.CAREER_N, cx, b.y + Y.pos, Y.s, w, '#fff'); return; }
    // the medal won here, hanging from its ribbon, with the size of the field beside it
    const lab = 'su ' + Game.CAREER_N, r = Y.r, gap = 5;
    ctx.font = 'bold ' + Y.s + 'px ' + FONT;
    const tw = ctx.measureText(T(lab)).width, x0 = cx - (2 * r + gap + tw) / 2;
    drawMedal(ctx, x0 + r, b.y + Y.med, r, b.place, b.y + Y.nastro);
    txt(ctx, lab, x0 + 2 * r + gap, b.y + Y.pos, Y.s, '#fff', 'left', { italic: false });
  }
  back() {
    if (this.ask) { this.ask = false; this.layout(); return true; }
    Career.C.esci();
    return true;
  }
}

// ---------- promotion / end of career ----------
class PromoScene extends Screen {
  layout() {
    this.btns = [{ x: G.W / 2 - 120, y: G.H - 90, w: 240, h: 58, label: 'AVANTI ›', size: 20, color: '#43a047',
      fn: () => G.setScene(new CareerScene()) }];
  }
  onKey() { this.btns[0].fn(); }
  back() { G.setScene(new CareerScene()); return true; }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, d = Career.data, L = Career.C.livello(d.lvl);
    panel(ctx, cx - 320, 80, 640, G.H - 200);
    if (d.champion) {
      txt(ctx, Career.C.testi.campione, cx, 150, 40, '#ffd600');
      txt(ctx, 'hai centrato l\'obiettivo in tutte le ' + Career.C.events.length + ' specialità', cx, 200, 17, '#fff', 'center', { italic: false });
      txt(ctx, Career.C.testi.finale, cx, 226, 17, '#fff', 'center', { italic: false });
    } else {
      txt(ctx, 'QUALIFICATO!', cx, 140, 38, '#7CFC00');
      txt(ctx, 'passi a', cx, 186, 17, '#fff', 'center', { italic: false });
      txt(ctx, L.name, cx, 216, 28, L.col);
      txt(ctx, Career.C.testi.promo[0], cx, 250, 16, '#fff', 'center', { italic: false });
      txt(ctx, Career.C.testi.promo[1], cx, 272, 16, '#fff', 'center', { italic: false });
      if (d.spent > 0) txt(ctx, Career.C.testi.tassa + Money(d.spent), cx, 300, 17, '#ffab40', 'center', { italic: false });
    }
    // One medal per speciality, the best taken in it: ten events, ten medals at most. The champion
    // looks back at the whole career, the qualifier at the championship he has just closed.
    const ty = d.champion ? 316 : 368, tr = d.champion ? 20 : 15;
    txt(ctx, d.champion ? 'il meglio in ogni specialità, campionato per campionato' : 'il meglio in ogni specialità di questo campionato',
      cx, ty - tr - 25, 14, '#90caf9', 'center', { italic: false });
    medalTally(ctx, cx, ty, tr, Career.bestMedals(d.champion ? 0 : d.lvl - 1), ty - tr - 10);
    txt(ctx, d.races + ' gare   •   ' + Money(d.money), cx, ty + tr + 22, 15, '#ffcc80', 'center', { italic: false });
    this.drawButtons(ctx);
  }
}

// ---------- shop ----------
class ShopScene extends Screen {
  constructor() { super(); this.sc = new Scroller(); }
  // Diciassette attrezzi non stanno in una schermata: l'elenco scorre come quello dei record, col
  // dito, con la rotella e con le frecce in basso (dal telecomando arrivano solo tocchi).
  layout() {
    const W = G.W, cx = W / 2, x = cx - 300, RH = ShopScene.riga();
    if (this.ask) {             // vendere tutto chiede un secondo tocco, deciso
      this.btns = [
        { x: cx - 230, y: 330, w: 210, h: 56, label: 'ANNULLA', size: 19, color: '#78909c',
          fn: () => { this.ask = false; this.layout(); } },
        { x: cx + 20, y: 330, w: 210, h: 56, label: 'SÌ, VENDI', size: 19, color: '#ef6c00',
          fn: () => { Career.sellAllGear(); Snd.cashIn(); this.ask = false; this.layout(); } },
      ];
      this.righe = null;
      return;
    }
    const top = 84, bot = G.H - 76;
    const LG = Career.C.leggendari || [];
    this.sc.set({ x, y: top, w: 600, h: bot - top }, Career.C.gear.length * RH + (LG.length ? LEG_TESTA + LG.length * LEG_RIGA : 0));
    this.btns = [{ x: 20, y: G.H - 62, w: 150, h: 46, label: '‹ CARRIERA', size: 16, color: '#546e7a', fn: () => G.setScene(new CareerScene()) }];
    // Tutto indietro a quanto e' stato pagato, per riprovare le gare con attrezzi piu' bassi
    const rientro = Career.gearSpent();
    this.btns.push({
      x: W - 20 - 230, y: G.H - 62, w: 230, h: 46, label: 'VENDI TUTTO', size: 16,
      sub: rientro ? 'rientrano ' + Money(rientro) : 'niente da vendere',
      color: rientro ? '#ef6c00' : '#37474f',
      fn: () => { if (Career.gearSpent()) { this.ask = true; this.layout(); } else Snd.click(); },
    });
    if (this.sc.need) this.btns.push(
      { x: cx - 70, y: G.H - 62, w: 58, h: 46, label: '▲', size: 22, color: '#37474f', fn: () => this.sc.page(-1) },
      { x: cx + 12, y: G.H - 62, w: 58, h: 46, label: '▼', size: 22, color: '#37474f', fn: () => this.sc.page(1) });
    this.fissi = this.btns;
    this.righe = Career.C.gear.map((g, i) => {
      const n = Career.nextGear(g.k), can = Career.canBuy(g.k), t = Career.gearOf(g.k);
      // col nome del gradino il pulsante e' piu' alto: il nome sopra, il prezzo sotto
      return {
        g, y0: top + i * RH, x: x + 430, y: 0, w: 170, h: RH - 3, buy: true,
        label: n ? (g.gradi ? g.gradi[t] : n.n + '  ' + Money(n.c)) : 'COMPLETO', sub: n && g.gradi ? Money(n.c) : '', size: 14,
        color: n ? (can ? '#43a047' : '#455a64') : '#2e7d32',
        fn: () => {
          if (!Career.buy(g.k)) { Snd.click(); return; }
          Snd.coins();
          if (g.battute) this.nota = { testo: g.battute[Career.gearOf(g.k) - 1], t: 3.5 };
          this.layout();
        },
      };
    });
    // Gli oggetti leggendari, sotto gli attrezzi. Nell'exe si comprano coi soldi della carriera (il
    // pagamento in euro non c'e' ancora); nell'apk e sul web si vedono soltanto: arrivano su PC.
    const gy0 = top + Career.C.gear.length * RH + LEG_TESTA;
    LG.forEach((g, i) => {
      const y0 = gy0 + i * LEG_RIGA, h = LEG_RIGA - 6, suo = Career.hasLeg(g.k);
      const nota = testo => { Snd.click(); this.nota = { testo, t: 3.5 }; };
      if (suo) { this.righe.push({ g, y0, x: x + 430, y: 0, w: 170, h, buy: true, label: 'TUO', sub: '+10% oltre il tetto', size: 15, color: '#b8860b', fn: () => Snd.click() }); return; }
      if (!legAttivi()) {
        this.righe.push({ g, y0, x: x + 430, y: 0, w: 170, h, buy: true, label: 'PRESTO SU PC', sub: 'solo su Windows', size: 14, color: '#455a64',
          fn: () => nota('gli oggetti leggendari arrivano con la versione per Windows') });
        return;
      }
      const can = Career.canBuyLeg(g.k);
      this.righe.push({ g, y0, x: x + 430, y: 0, w: 82, h, buy: true, label: Money(LEG_PREZZO), sub: 'in gara', size: 14, color: can ? '#43a047' : '#455a64',
        fn: () => {
          if (!Career.buyLeg(g.k)) { nota('servono ' + Money(LEG_PREZZO) + ': ne hai ' + Money(Career.data.money)); return; }
          Snd.cashIn(); Snd.fanfare();
          this.nota = { testo: g.battuta, t: 4 };
          this.layout();
        } });
      this.righe.push({ g, y0, x: x + 518, y: 0, w: 82, h, buy: true, label: LEG_EURO + ' €', sub: 'veri', size: 15, color: '#6a1b9a',
        fn: () => nota('il pagamento in euro non e\' ancora aperto: presto') });
    });
    this.aggiorna();
  }
  // Fra i pulsanti, che sono anche quelli che vede il telecomando, vanno solo le righe in vista.
  aggiorna() {
    if (!this.righe) return;
    const b = this.sc.box;
    for (const r of this.righe) r.y = r.y0 - this.sc.off;
    this.btns = this.fissi.concat(this.righe.filter(r => r.y >= b.y - 2 && r.y + r.h <= b.y + b.h + 2));
  }
  update(dt) { super.update(dt); this.sc.update(dt); this.aggiorna(); if (this.nota && (this.nota.t -= dt) <= 0) this.nota = null; }
  // l'altezza di una riga: piu' alta al torneo, dove c'e' anche il nome dell'attrezzo che hai
  static riga() { return Career.C.gear.some(g => g.gradi) ? 46 : 31; }
  // Nell'elenco si compra quando il dito si alza senza essersi mosso: trascinare fa solo scorrere.
  pointerDown(x, y, id) {
    if (!this.ask && this.righe && this.sc.inside(x, y)) {
      this.tocco = { id, x, y, mosso: false };
      this.sc.down(x, y, id);
      return;
    }
    super.pointerDown(x, y, id);
  }
  pointerMove(x, y, id) {
    if (this.tocco && this.tocco.id === id && Math.abs(y - this.tocco.y) > 8) this.tocco.mosso = true;
    this.sc.move(x, y, id);
  }
  pointerUp(id) {
    this.sc.up(id);
    const t = this.tocco;
    this.tocco = null;
    if (!t || t.id !== id || t.mosso || this.t <= 0.3) return;
    this.aggiorna();
    const b = hitBtn(this.btns.filter(q => q.buy), t.x, t.y);
    if (b) { Snd.click(); b.fn(); }
  }
  wheel(dy) { if (!this.ask) this.sc.by(dy); }
  back() {
    if (this.ask) { this.ask = false; this.layout(); return true; }
    G.setScene(new CareerScene());
    return true;
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, x = cx - 300;
    panel(ctx, 24, 8, W - 48, G.H - 80);
    careerHeader(ctx, 'NEGOZIO');
    // la battuta del bottegaio sull'ultimo acquisto prende il posto della riga di spiegazione
    if (this.nota) txtFit(ctx, '« ' + T(this.nota.testo) + ' »', cx, 74, 15, '#ffd54f', 'center', W - 80, { italic: true });
    else txt(ctx, 'l\'attrezzatura non si consuma: si sostituisce con la versione migliore', cx, 74, 14, '#fff', 'center', { italic: false });
    if (this.righe) {
      const y0 = this.sc.clip(ctx);
      const RH = ShopScene.riga();
      Career.C.gear.forEach((g, i) => {
        const y = y0 + i * RH + 2, t = Career.gearOf(g.k);
        if (!this.sc.shows(y, RH)) return;
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; rrect(ctx, x, y, 600, RH - 3, 6); ctx.fill();
        ctx.fillStyle = g.col; ctx.fillRect(x + 6, y + 5, 5, RH - 13);
        fitTxt(ctx, g.name, x + 20, y + 10, 13, 200, '#fff', 'left');
        fitTxt(ctx, g.evs.map(e => T(SHORT[e])).join(' · ').toLowerCase(), x + 20, y + 22, 10, 260, '#b0bec5', 'left');
        if (g.gradi) fitTxt(ctx, t ? g.gradi[t - 1] : 'a mani nude', x + 20, y + 35, 11, 270, t ? '#ffd54f' : '#90a4ae', 'left');
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = k < t ? g.col : 'rgba(255,255,255,0.16)';
          rrect(ctx, x + 300 + k * 26, y + 9, 20, 10, 3); ctx.fill();
        }
        txt(ctx, t ? (g.gradi ? '' : Career.C.tiers[t - 1].n + '  ') + '+' + Math.round(Career.C.tiers[t - 1].b * 100) + '%' : 'niente',
          x + 424, y + 15, 12, t ? '#7CFC00' : '#90a4ae', 'right', { italic: false });
      });
      const LG = Career.C.leggendari || [];
      if (LG.length) {
        const yt = y0 + Career.C.gear.length * RH + 2;
        if (this.sc.shows(yt, LEG_TESTA)) {
          drawStar(ctx, x + 12, yt + LEG_TESTA / 2, 8, '#ffd600');
          txt(ctx, 'LEGGENDARI', x + 26, yt + LEG_TESTA / 2, 17, '#ffd600', 'left');
          txt(ctx, '+10% oltre il tetto  •  in classifica con l\'asterisco', x + 600, yt + LEG_TESTA / 2, 12, '#ffcc80', 'right', { italic: false });
        }
        LG.forEach((g, i) => {
          const y = yt + LEG_TESTA + i * LEG_RIGA - 2, suo = Career.hasLeg(g.k);
          if (!this.sc.shows(y, LEG_RIGA)) return;
          ctx.fillStyle = suo ? 'rgba(255,214,0,0.16)' : 'rgba(255,214,0,0.07)'; rrect(ctx, x, y, 600, LEG_RIGA - 4, 6); ctx.fill();
          ctx.strokeStyle = 'rgba(255,214,0,' + (suo ? 0.9 : 0.45) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = g.col; ctx.fillRect(x + 6, y + 6, 5, LEG_RIGA - 16);
          fitTxt(ctx, g.name, x + 20, y + 11, 13, legAttivi() || suo ? 400 : 280, '#ffd600', 'left');
          // nella vetrina (apk e web) il prezzo sta nella riga: il pulsante dice solo dove si compra
          if (!legAttivi() && !suo) fitTxt(ctx, Money(LEG_PREZZO) + ' in gara o ' + LEG_EURO + ' € veri', x + 424, y + 11, 11, 130, '#ffcc80', 'right');
          fitTxt(ctx, g.evs.map(e => T(SHORT[e])).join(' · ').toLowerCase(), x + 20, y + 25, 10, 400, '#b0bec5', 'left');
          fitTxt(ctx, '« ' + T(g.battuta) + ' »', x + 20, y + 38, 10, 400, '#ffcc80', 'left');
        });
      }
      for (const b of this.righe) if (this.sc.shows(b.y, b.h)) drawBtn(ctx, b);
      ctx.restore();
      this.sc.fade(ctx, 16);
      this.sc.drawBar(ctx, x + 608, 5);
    }
    if (this.ask) {
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, G.H);
      panel(ctx, cx - 300, 150, 600, 240);
      txt(ctx, 'VENDERE TUTTA L\'ATTREZZATURA?', cx, 196, 24, '#ffd600');
      txt(ctx, 'rientrano ' + Money(Career.gearSpent()), cx, 238, 22, '#7CFC00', 'center', { italic: false });
      txt(ctx, 'tutto quello che hai pagato, gradino per gradino', cx, 272, 15, '#fff', 'center', { italic: false });
      txt(ctx, 'i bonus tornano a zero finché non ricompri', cx, 296, 15, '#fff', 'center', { italic: false });
    }
    // per ultimi, cosi' il velo del dialogo non copre i suoi stessi pulsanti
    for (const b of this.btns) if (!b.buy) drawBtn(ctx, b);
  }
}

// ---------- training ----------
class TrainScene extends Screen {
  layout() {
    const W = G.W, x = W / 2 - 300;
    this.btns = [{ x: 20, y: G.H - 62, w: 150, h: 46, label: '‹ CARRIERA', size: 16, color: '#546e7a', fn: () => G.setScene(new CareerScene()) }];
    const RH = TrainScene.riga();
    Career.C.attrs.forEach((a, i) => {
      const full = Career.atCap(a.k), top = Career.attrCap() >= ATTR_MAX, can = Career.canTrain(a.k);
      this.btns.push({
        x: x + 430, y: 104 + i * RH, w: 170, h: RH - 10,
        label: full ? (top ? 'AL MASSIMO' : 'TETTO DEL LIVELLO') : Money(Career.trainCost(a.k)),
        sub: full ? '' : '+2 punti', size: 16,
        color: full ? (top ? '#2e7d32' : '#455a64') : (can ? '#43a047' : '#455a64'),
        fn: () => {
          if (!Career.train(a.k)) { Snd.click(); return; }
          Snd.levelUp();
          const al = Career.C.allenamenti && Career.C.allenamenti[a.k];
          if (al) this.nota = { testo: pick(al.frasi), t: 3 };
          this.layout();
        },
      });
    });
  }
  static riga() { return Career.C.allenamenti ? 64 : 56; }
  update(dt) { super.update(dt); if (this.nota && (this.nota.t -= dt) <= 0) this.nota = null; }
  back() { G.setScene(new CareerScene()); return true; }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2, x = cx - 300, d = Career.data;
    panel(ctx, 24, 8, W - 48, G.H - 80);
    careerHeader(ctx, 'ALLENAMENTI');
    // com'e' andata l'ultima sessione prende il posto della riga di spiegazione
    if (this.nota) txtFit(ctx, '« ' + T(this.nota.testo) + ' »', cx, 74, 15, '#ffd54f', 'center', W - 80, { italic: true });
    else txt(ctx, 'ogni sessione vale 2 punti  •  in questo campionato si arriva a ' + Career.attrCap() + ' su 100',
      cx, 74, 14, '#fff', 'center', { italic: false });
    const RH = TrainScene.riga();
    Career.C.attrs.forEach((a, i) => {
      const y = 104 + i * RH, al = Career.C.allenamenti && Career.C.allenamenti[a.k];
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rrect(ctx, x, y, 600, RH - 10, 6); ctx.fill();
      if (al) fitTxt(ctx, al.nome, x + 16, y + 34, 12, 406, '#ffd54f', 'left');
      attrBar(ctx, x + 16, y + 18, 400, a, d.attr[a.k], true, Career.attrCap());
      // le gare dove questo allenamento pesa di piu' vengono prima; se non ci stanno tutte, le
      // ultime lasciano il posto ai puntini invece di uscire dalla riga
      const W = e => (Career.C.evAttr[e.id] || {})[a.k] || 0;
      const uses = Career.C.events.filter(e => W(e) >= 0.3).sort((p, q) => W(q) - W(p)).map(e => T(SHORT[e.id]).toLowerCase());
      ctx.font = 'bold 9px ' + FONT;
      let riga = uses.join(' · ');
      while (uses.length > 1 && ctx.measureText(riga).width > 406) { uses.pop(); riga = uses.join(' · ') + ' …'; }
      fitTxt(ctx, riga, x + 16, al ? y + 48 : y + 36, 11, 406, '#b0bec5', 'left');
    });
    this.drawButtons(ctx);
  }
}

// ---------- which player's career ----------
class CareerPickScene extends Screen {
  layout() {
    const W = G.W, cx = W / 2;
    this.btns = [{ x: 20, y: G.H - 64, w: 150, h: 48, label: '‹ INDIETRO', size: 16, color: '#546e7a', fn: () => Career.C.esci() }];
    for (let i = 0; i < 2; i++) {
      const x = cx - 330 + i * 340, started = Career.started(i), d = Career.slots[i];
      this.btns.push({ x, y: 344, w: 320, h: 54, label: started ? 'CONTINUA' : 'NUOVA CARRIERA',
        sub: started ? Career.C.livello(d.lvl).short + '  •  ' + Career.doneCountOf(i) + '/' + Career.C.events.length : '',
        size: 20, color: HUMAN_COLS[i].ui, textColor: '#10141f',
        fn: () => { Career.use(i); G.setScene(new CareerScene()); } });
      this.btns.push({ x, y: 406, w: 155, h: 42, label: 'MODIFICA', size: 15, color: '#5e35b1',
        fn: () => G.setScene(new PlayerSetupScene(1, { start: i, done: () => G.setScene(new CareerPickScene()), back: () => G.setScene(new CareerPickScene()) })) });
      this.btns.push({ x: x + 165, y: 406, w: 155, h: 42, label: 'AZZERA', size: 15, color: started ? '#c62828' : '#37474f',
        fn: () => { if (Career.started(i)) { this.ask = i; this.layout(); } else Snd.click(); } });
    }
    // In basso a destra, la porta del torneo medievale: 1245 A.D. Nell'app e nell'exe vuole la parola
    // d'ordine (js/specials/scene.js); nella versione web il torneo non c'e' proprio (i suoi file non si
    // pubblicano) e la porta dice solo che ci si sta lavorando.
    if (!Career.C.medievo) this.btns.push({ x: W - 20 - 170, y: G.H - 64, w: 170, h: 48, label: '1245 A.D.', size: 18, color: '#6a1b9a',
      fn: () => { if (typeof Specials !== 'undefined' && window.OLIMPIADI_PLATFORM !== 'web') Specials.entra(); else { Snd.click(); this.lavori = true; this.layout(); } } });
    if (this.lavori) this.btns = [{ x: cx - 105, y: 318, w: 210, h: 54, label: 'OK', size: 20, color: '#6a1b9a', fn: () => { this.lavori = false; this.layout(); } }];
    if (this.ask != null) {
      // wiping a career needs a second, deliberate tap
      const i = this.ask;
      this.btns = [
        { x: cx - 230, y: 296, w: 210, h: 56, label: 'ANNULLA', size: 19, color: '#78909c',
          fn: () => { this.ask = null; this.layout(); } },
        { x: cx + 20, y: 296, w: 210, h: 56, label: 'SÌ, AZZERA', size: 19, color: '#c62828',
          fn: () => { Career.reset(i); Snd.fail(); this.ask = null; this.layout(); } },
      ];
    }
  }
  back() {
    if (this.ask != null) { this.ask = null; this.layout(); return true; }
    if (this.lavori) { this.lavori = false; this.layout(); return true; }
    Career.C.esci();
    return true;
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const W = G.W, cx = W / 2;
    panel(ctx, 24, 8, W - 48, G.H - 84);
    txt(ctx, Career.C.testi.titolo, cx, 44, 30, '#ffd600');
    txt(ctx, 'ogni giocatore ha la sua carriera, salvata sul dispositivo', cx, 74, 15, '#fff', 'center', { italic: false });
    for (let i = 0; i < 2; i++) {
      const x = cx - 330 + i * 340, pr = Profiles.data[i], d = Career.slots[i];
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; rrect(ctx, x, 100, 320, 230, 10); ctx.fill();
      ctx.strokeStyle = HUMAN_COLS[i].ui; ctx.lineWidth = 2; ctx.stroke();
      drawFlag(ctx, pr.code, x + 20, 118, 42, 28);
      txt(ctx, pr.name, x + 74, 133, 20, HUMAN_COLS[i].ui, 'left', { italic: false });
      txt(ctx, Career.C.livello(d.lvl).name, x + 160, 170, 16, Career.C.livello(d.lvl).col);
      txt(ctx, Money(d.money) + '   •   ' + d.races + ' gare', x + 160, 194, 14, '#ffcc80', 'center', { italic: false });
      Career.C.attrs.forEach((a, k) => attrBar(ctx, x + 20, 211 + k * 15, 280, a, d.attr[a.k], false, ATTR_CAP[clamp(d.lvl, 1, 3) - 1]));
      medalTally(ctx, x + 160, 310, 9, Career.bestMedalsOf(i), 296);
    }
    if (this.ask != null) {
      const pr = Profiles.data[this.ask];
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, G.H);
      panel(ctx, cx - 280, 170, 560, 200);
      txt(ctx, 'AZZERARE LA CARRIERA?', cx, 212, 26, '#ff8a80');
      drawFlag(ctx, pr.code, cx - 90, 238, 34, 22);
      txt(ctx, pr.name, cx - 46, 250, 20, HUMAN_COLS[this.ask].ui, 'left', { italic: false });
      txt(ctx, 'si perdono livello, soldi, allenamenti e attrezzatura', cx, 278, 15, '#fff', 'center', { italic: false });
    }
    if (this.lavori) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, G.H);
      panel(ctx, cx - 280, 160, 560, 230);
      txt(ctx, '1245 A.D.', cx, 204, 30, '#ffd54f');
      txt(ctx, 'LAVORI IN CORSO', cx, 244, 22, '#ff9100');
      txt(ctx, 'ci stiamo ancora lavorando: torna presto!', cx, 282, 16, '#fff', 'center', { italic: false });
    }
    this.drawButtons(ctx);
  }
}

// Le schermate della carriera del torneo hanno lo sfondo del torneo (Bg.medievo guarda la scena).
for (const K of [CareerScene, PromoScene, ShopScene, TrainScene, CareerPickScene]) {
  Object.defineProperty(K.prototype, 'medievo', { get() { return !!Career.C.medievo; } });
}

// ---------- language, shown once on the first launch ----------
class LangScene extends Screen {
  layout() {
    const cx = G.W / 2;
    this.btns = [
      { x: cx - 230, y: 244, w: 200, h: 126, label: '', name: 'ITALIANO', color: '#1b5e20', flag: 'ITA',
        fn: () => { setLang('it'); G.setScene(new TitleScene()); } },
      { x: cx + 30, y: 244, w: 200, h: 126, label: '', name: 'ENGLISH', color: '#0d47a1', flag: 'GBR',
        fn: () => { setLang('en'); G.setScene(new TitleScene()); } },
    ];
  }
  draw(ctx) {
    menuBg(ctx, this.t);
    const cx = G.W / 2;
    txt(ctx, 'NEON', cx, 96, 68, '#ff4fd8');
    txt(ctx, 'STADIUM', cx, 152, 44, '#3ff0ff');
    txt(ctx, 'LINGUA  /  LANGUAGE', cx, 212, 22, '#fff', 'center', { italic: false });
    for (const b of this.btns) {
      drawBtn(ctx, b);
      drawFlag(ctx, b.flag, b.x + b.w / 2 - 48, b.y + 14, 96, 62);
      txt(ctx, b.name, b.x + b.w / 2, b.y + 100, 22, '#fff');
    }
    // on a television this is the first thing on screen and there is nothing to click with yet
    if (Remote.url) txt(ctx, 'TELECOMANDO  ' + Remote.url, cx, G.H - 40, 18, '#7CFC00', 'center', { italic: false });
  }
}
