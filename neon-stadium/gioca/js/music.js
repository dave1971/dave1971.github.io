'use strict';
// ===== Musica =====
// Niente file audio: le tracce sono scritte qui come righe di note e suonate dagli stessi
// oscillatori degli effetti, così l'apk non cresce di un byte e il suono resta quello giusto.
//
// Un ciclo di gioco a 120 passi al secondo non basta a tenere il tempo di una musica: basta un
// fotogramma lungo e la nota arriva in ritardo. Quindi si programma in anticipo sull'orologio della
// scheda audio (un quarto di secondo avanti), che non sbanda mai.
//
// ---- come si scrive un brano ----
// Ogni brano è fatto di **parti** di quattro battute, e di un **ordine** che dice in che sequenza
// suonarle. È qui la differenza con la prima versione: quella era un giro solo di quattro battute
// che tornava da capo ogni sei secondi, e dopo tre volte lo sapevi a memoria. Le stesse parti
// rimescolate durano un minuto abbondante prima di ripetersi, e costano gli stessi byte.
//
// Le righe vanno a sedicesimi, sedici caselle per battuta:
//   `A4`   una nota                     `-`   tieni la nota di prima (allunga)
//   `.`    silenzio                     `A4!` nota accentata, suona più forte
// La riga `pad` invece va a battute: una sigla d'accordo per battuta, e ci pensa ACCORDI a
// distribuirne le tre note. Serve a tenere insieme l'armonia senza scriverla nota per nota.

const Music = {
  NOTES: { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 },

  // Tre note per accordo, scelte perché la voce più alta si muova di poco fra un accordo e l'altro:
  // è quello che fa sembrare gli accordi una cosa sola invece che quattro pugni di note.
  ACCORDI: {
    Am: 'A3 C4 E4', F: 'A3 C4 F4', C: 'G3 C4 E4', G: 'G3 B3 D4',
    Dm: 'A3 D4 F4', Em: 'G3 B3 E4', E: 'G#3 B3 E4', E7: 'G#3 D4 E4',
    G6: 'G3 B3 E4', Fma: 'A3 C4 F4', Am7: 'G3 C4 E4',
  },

  on: true,       // si può spegnere la sola musica e tenere gli effetti
  name: '', trk: null, step: 0, at: 0, timer: null, out: null, pad: null,

  freq(n) {
    const m = /^([A-G]#?)(-?\d)$/.exec(n);
    if (!m) return 0;
    return 440 * Math.pow(2, (this.NOTES[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
  },

  /**
   * Da una riga scritta a mano all'elenco di quello che succede a ogni sedicesimo.
   * I `-` non diventano caselle: si sciolgono nella durata della nota che li precede, così chi
   * suona deve solo guardare la casella del momento.
   */
  righe(s, passi) {
    const tok = s.trim().split(/\s+/);
    const out = new Array(tok.length).fill(null);
    let ultimo = -1;
    tok.forEach((x, i) => {
      if (x === '-') { if (ultimo >= 0) out[ultimo].d++; return; }
      if (x === '.') { ultimo = -1; return; }
      const acc = x.endsWith('!');
      out[i] = { n: acc ? x.slice(0, -1) : x, d: 1, acc };
      ultimo = i;
    });
    return { celle: out, n: tok.length, passi: passi || 1 };
  },

  // ---------------------------------------------------------------- i brani
  build() {
    // MENU — La minore, 100 al minuto. Sta sotto: non deve disturbare chi legge il medagliere o
    // conta i soldi. Quattro parti che si alternano, compresa una di solo respiro.
    const menu = {
      bpm: 100, vol: 0.58, filtro: 1400,
      parti: {
        // l'entrata: basso che cammina, melodia rada che sale e ridiscende
        A: {
          pad: 'Am F C G',
          bass: `A2 .  A2 .  E3 .  A2 .   A3 .  E3 .  A2 .  E3 .
                 F2 .  F2 .  C3 .  F2 .   F3 .  C3 .  F2 .  C3 .
                 C2 .  C2 .  G2 .  C3 .   C3 .  G2 .  C3 .  G2 .
                 G2 .  G2 .  D3 .  G2 .   G3 .  D3 .  G2 .  B2 .`,
          lead: `.  .  .  .  A4 -  C5 -   E5 -  -  -  D5 -  -  -
                 .  .  .  .  C5 -  A4 -   F4 -  -  -  G4 -  -  -
                 .  .  .  .  E4 -  G4 -   C5 -  -  -  B4 -  -  -
                 .  .  .  .  D5 -  B4 -   G4 -  -  -  A4 -  -  -`,
          drum: `.  .  h  .  .  .  h  .   .  .  h  .  .  .  h  .
                 .  .  h  .  .  .  h  .   .  .  h  .  .  .  h  .
                 .  .  h  .  .  .  h  .   .  .  h  .  .  .  h  .
                 .  .  h  .  .  .  h  .   .  .  h  .  .  .  h  s`,
        },
        // la parte mossa: la melodia si infittisce e arriva il rullante leggero
        B: {
          pad: 'F C G Am',
          bass: `F2 .  C3 .  F2 .  A2 .   C3 .  F2 .  A2 .  C3 .
                 C2 .  G2 .  C3 .  E2 .   G2 .  C3 .  E3 .  G2 .
                 G2 .  D3 .  G2 .  B2 .   D3 .  G2 .  B2 .  D3 .
                 A2 .  E3 .  A2 .  C3 .   E3 .  A2 .  C3 .  E3 .`,
          lead: `F5 -  E5 -  C5 -  .  .   A4 -  C5 -  F5 -  -  -
                 E5 -  G5 -  E5 -  .  .   C5 -  E5 -  G5 -  -  -
                 D5 -  B4 -  G4 -  .  .   B4 -  D5 -  G5 -  -  -
                 A5! -  G5 -  E5 -  C5 -   B4 -  -  -  A4 -  -  -`,
          drum: `K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  K  S  .  s  s`,
        },
        // il respiro: si toglie quasi tutto, restano accordi lunghi e un basso profondo
        C: {
          pad: 'Dm Am E7 Am',
          bass: `D2 -  -  -  -  -  -  -   A2 -  -  -  -  -  -  -
                 A2 -  -  -  -  -  -  -   E2 -  -  -  -  -  -  -
                 E2 -  -  -  -  -  -  -   B2 -  -  -  -  -  -  -
                 A2 -  -  -  -  -  -  -   E2 -  -  -  -  -  -  -`,
          lead: `.  .  .  .  .  .  .  .   .  .  .  .  .  .  .  .
                 .  .  .  .  .  .  .  .   .  .  .  .  A4 -  -  -
                 .  .  .  .  .  .  .  .   .  .  .  .  G#4 - -  -
                 .  .  .  .  .  .  .  .   .  .  .  .  .  .  .  .`,
          drum: `.  .  .  .  .  .  .  .   .  .  .  .  .  .  .  .
                 .  .  .  .  .  .  .  .   .  .  .  .  .  .  .  .
                 .  .  .  .  .  .  .  .   .  .  .  .  .  .  .  .
                 .  .  .  .  .  .  .  .   .  .  .  .  .  .  h  h`,
        },
        // la ripresa: come la A ma la melodia sta un'ottava sopra, e sotto corre un arpeggio
        D: {
          pad: 'Am F C E7',
          bass: `A1 .  A2 .  E2 .  A2 .   A1 .  E2 .  A2 .  E2 .
                 F1 .  F2 .  C2 .  F2 .   F1 .  C2 .  F2 .  C2 .
                 C2 .  C3 .  G2 .  C3 .   C2 .  G2 .  C3 .  G2 .
                 E2 .  E3 .  B2 .  E3 .   E2 .  B2 .  E3 .  G#2 .`,
          lead: `A5 -  -  -  C6 -  -  -   E6 -  -  -  D6 -  -  -
                 C6 -  -  -  A5 -  -  -   F5 -  -  -  G5 -  -  -
                 E5 -  -  -  G5 -  -  -   C6 -  -  -  B5 -  -  -
                 E6! -  D6 -  C6 -  B5 -   A5 -  -  -  -  -  -  -`,
          arp: `A4 C5 E5 C5  A4 C5 E5 C5   A4 C5 E5 C5  A4 C5 E5 C5
                A4 C5 F5 C5  A4 C5 F5 C5   A4 C5 F5 C5  A4 C5 F5 C5
                G4 C5 E5 C5  G4 C5 E5 C5   G4 C5 E5 C5  G4 C5 E5 C5
                G#4 B4 E5 B4 G#4 B4 E5 B4  G#4 B4 E5 B4 G#4 B4 D5 B4`,
          drum: `K  .  h  .  .  .  h  .   K  .  h  .  .  .  h  .
                 K  .  h  .  .  .  h  .   K  .  h  .  .  .  h  .
                 K  .  h  .  .  .  h  .   K  .  h  .  .  .  h  .
                 K  .  h  .  S  .  h  .   K  .  S  .  s  s  s  s`,
        },
      },
      ordine: 'A A B A C D B A',
    };

    // GARA — stesso La minore ma 152 al minuto e passo di sedicesimo: si somigliano senza sembrare
    // la stessa cosa. Il basso corre, la batteria è secca, e la melodia lascia buchi apposta perché
    // ci passino sotto i rumori della gara.
    const race = {
      bpm: 152, vol: 0.85, filtro: 2600,
      parti: {
        // il motivo principale
        A: {
          pad: 'Am G F E',
          bass: `A1 .  A2 .  A1 .  E2 .   A1 .  A2 .  A1 .  G2 .
                 G1 .  G2 .  G1 .  D2 .   G1 .  G2 .  G1 .  F2 .
                 F1 .  F2 .  F1 .  C2 .   F1 .  F2 .  F1 .  E2 .
                 E1 .  E2 .  E1 .  B1 .   E1 .  B1 .  E2 .  G#1 .`,
          lead: `E5 -  .  E5  .  A5 -  G5   .  E5 -  .  D5 -  -  .
                 D5 -  .  D5  .  G5 -  F5   .  D5 -  .  B4 -  -  .
                 C5 -  .  C5  .  F5 -  E5   .  C5 -  .  A4 -  -  .
                 B4 -  .  E5  .  G#5 - B5   .  .  A5 -  G#5 -  -  .`,
          drum: `K  .  h  .  S  .  h  .   K  .  h  K  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  K  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  K  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  .  S  S  s  s`,
        },
        // la risposta: stessa armonia, melodia che sale e batteria con il charleston aperto
        B: {
          pad: 'Am G F E',
          bass: `A1 A2 A1 A2  E2 A2 A1 A2   A1 A2 A1 A2  E2 A2 G1 G2
                 G1 G2 G1 G2  D2 G2 G1 G2   G1 G2 G1 G2  D2 G2 F1 F2
                 F1 F2 F1 F2  C2 F2 F1 F2   F1 F2 F1 F2  C2 F2 E1 E2
                 E1 E2 E1 E2  B1 E2 E1 E2   E1 E2 G#1 G#2 B1 E2 E1 E2`,
          lead: `A5 -  -  .  C6 -  .  B5   .  A5 -  .  E5 -  -  -
                 G5 -  -  .  B5 -  .  A5   .  G5 -  .  D5 -  -  -
                 F5 -  -  .  A5 -  .  G5   .  F5 -  .  C5 -  -  -
                 E5 -  G#5 - B5 -  .  .   C6! -  B5 -  A5 -  -  -`,
          drum: `K  .  h  h  S  .  h  h   K  .  h  h  S  .  o  .
                 K  .  h  h  S  .  h  h   K  .  h  h  S  .  o  .
                 K  .  h  h  S  .  h  h   K  .  h  h  S  .  o  .
                 K  .  h  h  S  .  h  h   K  K  S  .  t  t  s  s`,
        },
        // il ponte: si va in Do maggiore, e per quattro battute la corsa sembra in discesa
        C: {
          pad: 'C G Am F',
          bass: `C2 .  C3 .  G2 .  C3 .   C2 .  G2 .  C3 .  E2 .
                 G1 .  G2 .  D2 .  G2 .   G1 .  D2 .  G2 .  B1 .
                 A1 .  A2 .  E2 .  A2 .   A1 .  E2 .  A2 .  C2 .
                 F1 .  F2 .  C2 .  F2 .   F1 .  C2 .  F2 .  G1 .`,
          lead: `G5 -  -  -  E5 -  -  .   C5 -  -  .  E5 -  G5 -
                 D5 -  -  -  B4 -  -  .   G4 -  -  .  B4 -  D5 -
                 E5 -  -  -  C5 -  -  .   A4 -  -  .  C5 -  E5 -
                 A5 -  -  -  F5 -  -  .   C5 -  -  .  D5 -  E5 -`,
          drum: `K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  .
                 K  .  h  .  S  .  h  .   K  .  h  .  S  .  h  h`,
        },
        // la volata: tutto addosso, e in fondo il rullo che riporta da capo
        D: {
          pad: 'Am Am E E',
          bass: `A1 A1 A2 A1  E2 E2 A2 A1   A1 A1 A2 A1  E2 E2 A2 A1
                 A1 A1 A2 A1  E2 E2 A2 A1   C2 C2 E2 C2  G2 G2 E2 C2
                 E1 E1 E2 E1  B1 B1 E2 E1   E1 E1 E2 E1  B1 B1 E2 E1
                 E1 E1 E2 E1  B1 B1 E2 E1   G#1 G#1 B1 G#1 E2 E2 B1 E2`,
          lead: `A5 -  E5 -  A5 -  C6 -   B5 -  A5 -  E5 -  -  -
                 C6 -  A5 -  E5 -  C6 -   D6 -  C6 -  A5 -  -  -
                 B5 -  G#5 - E5 -  B5 -   C6 -  B5 -  G#5 -  -  -
                 E6! -  -  -  D6 -  C6 -   B5 -  -  -  .  .  .  .`,
          drum: `K  .  h  h  S  .  h  h   K  .  h  h  S  .  h  h
                 K  .  h  h  S  .  h  h   K  .  h  h  S  .  o  .
                 K  .  h  h  S  .  h  h   K  .  h  h  S  .  h  h
                 K  .  h  h  S  .  h  h   t  t  t  t  S  S  s  c`,
        },
      },
      ordine: 'A A B A C D B A',
    };

    this.T = { menu: this.monta(menu), race: this.monta(race) };
  },

  /**
   * Da parti + ordine a un brano solo, già disteso. Si fa una volta alla prima nota e poi non si
   * tocca più: quello che suona durante la partita deve solo leggere una casella per volta.
   *
   * Qui si controlla anche che tutte le righe di una parte abbiano lo stesso numero di caselle. Non
   * è pignoleria: una riga più corta di una casella sfasa il basso dalla melodia per sempre, e a
   * orecchio non si capisce da dove venga.
   */
  monta(b) {
    const unit = 60 / b.bpm / 4, BATT = 16;
    const lead = [], bass = [], arp = [], pad = [], drum = [];
    for (const nome of b.ordine.trim().split(/\s+/)) {
      const p = b.parti[nome];
      if (!p) throw new Error('parte sconosciuta: ' + nome);
      const l = this.righe(p.lead || ''), s = this.righe(p.bass || ''), a = this.righe(p.arp || '');
      const d = (p.drum || '').trim().split(/\s+/).filter(x => x);
      const batt = (p.pad || '').trim().split(/\s+/).filter(x => x);
      const n = l.n;
      for (const [q, chi] of [[s.n, 'bass'], [d.length, 'drum']]) {
        if (q !== n) throw new Error(nome + ': ' + chi + ' ha ' + q + ' caselle invece di ' + n);
      }
      if (a.n > 1 && a.n !== n) throw new Error(nome + ': arp ha ' + a.n + ' caselle invece di ' + n);
      if (batt.length * BATT !== n) throw new Error(nome + ': pad ha ' + batt.length + ' battute per ' + n + ' caselle');
      lead.push(...l.celle);
      bass.push(...s.celle);
      arp.push(...(a.n > 1 ? a.celle : new Array(n).fill(null)));
      drum.push(...d.map(x => (x === '.' ? null : x)));
      batt.forEach(c => { pad.push(c === '.' ? null : c); for (let i = 1; i < BATT; i++) pad.push(null); });
    }
    return { unit, vol: b.vol, filtro: b.filtro, lead, bass, arp, pad, drum, n: lead.length, BATT };
  },

  // ---------------------------------------------------------------- le voci
  voice(f, t, d, type, v, detune, dove) {
    const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);     // attacco corto: è un pizzicato, non un organo
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dove || this.out);
    o.start(t); o.stop(t + d + 0.02);
  },
  /**
   * L'accordo: tre voci morbide che entrano e escono piano, dietro a tutto. È la voce che non si
   * sente ma che si nota quando manca — toglila e il brano diventa di nuovo due righe di note.
   * Parte solo al cambio d'accordo, quindi costa pochissimo anche su un televisore lento.
   */
  chord(nome, t, d) {
    const note = this.ACCORDI[nome];
    if (!note) return;
    for (const n of note.split(' ')) {
      const c = Snd.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(this.freq(n), t);
      o.detune.setValueAtTime(Math.random() * 8 - 4, t);   // tre voci mai identiche: sembra un accordo
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.02, t + 0.09); // entra piano
      g.gain.setValueAtTime(0.02, t + d * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);  // ed esce piano
      o.connect(g); g.connect(this.pad || this.out);
      o.start(t); o.stop(t + d + 0.03);
    }
  },
  hit(kind, t) {
    const c = Snd.ctx;
    if (kind === 'K') {                                     // cassa
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
      g.gain.setValueAtTime(0.38, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16);
      o.connect(g); g.connect(this.out);
      o.start(t); o.stop(t + 0.2);
      return;
    }
    if (kind === 't') {                                     // tom: serve ai rulli di fine parte
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.14);
      g.gain.setValueAtTime(0.26, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.2);
      o.connect(g); g.connect(this.out);
      o.start(t); o.stop(t + 0.24);
      return;
    }
    const s = c.createBufferSource(); s.buffer = Snd.noiseBuf;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    // h charleston chiuso, o aperto, c piatto, S rullante, s colpetto
    const alto = kind === 'h' || kind === 'o' || kind === 'c';
    f.type = kind === 'c' ? 'highpass' : 'bandpass';
    f.frequency.value = alto ? (kind === 'c' ? 5000 : 7000) : 2000;
    f.Q.value = alto ? 1.2 : 0.8;
    const d = kind === 'h' ? 0.035 : kind === 'o' ? 0.17 : kind === 'c' ? 0.5 : kind === 's' ? 0.06 : 0.12;
    const v = kind === 'h' ? 0.08 : kind === 'o' ? 0.07 : kind === 'c' ? 0.1 : kind === 's' ? 0.1 : 0.22;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 0.4); s.stop(t + d + 0.02);
  },

  // ---- il metronomo: programma in anticipo, non a tempo di fotogramma ----
  tick() {
    if (!this.trk || !Snd.ctx) return;
    if (!Snd.on || !this.on) { this.stop(); return; }
    const c = Snd.ctx, t = this.trk;
    if (c.state === 'suspended') return;                    // audio ancora bloccato: si riprova dopo
    if (this.at < c.currentTime) this.at = c.currentTime + 0.05;
    while (this.at < c.currentTime + 0.25) {
      const i = this.step % t.n, u = t.unit, at = this.at;
      const lead = t.lead[i], bass = t.bass[i], arp = t.arp[i], pad = t.pad[i], drum = t.drum[i];
      if (lead) {
        const v = lead.acc ? 0.085 : 0.055, d = u * lead.d * 0.95 + u * 0.5;
        this.voice(this.freq(lead.n), at, d, 'square', v);
        this.voice(this.freq(lead.n), at, d, 'square', v * 0.4, 9);    // appena stonata: dà corpo
      }
      if (bass) this.voice(this.freq(bass.n), at, u * bass.d * 0.9 + u * 0.4, 'triangle', 0.1);
      if (arp) this.voice(this.freq(arp.n), at, u * 1.1, 'square', 0.02, -6);
      if (pad) this.chord(pad, at, u * t.BATT * 0.98);
      if (drum) this.hit(drum, at);
      this.step++; this.at += u;
    }
  },

  /** 'menu', 'race', oppure niente per far tacere tutto. */
  play(name) {
    if (!this.on) { this.name = name || ''; this.stop(); return; }
    if (!Snd.on || !Snd.ctx) { this.name = name || ''; return; }   // si ripartirà appena si sblocca
    if (name === this.name && this.timer) return;
    this.stop();
    this.name = name || '';
    if (!this.name) return;
    if (!this.T) this.build();
    this.trk = this.T[this.name];
    if (!this.trk) { this.name = ''; return; }
    this.out = Snd.ctx.createGain();
    this.out.gain.value = this.trk.vol;
    this.out.connect(Snd.ctx.destination);
    // gli accordi passano da un filtro che toglie loro il pizzicore: così stanno dietro alla
    // melodia invece di litigarci
    this.pad = Snd.ctx.createBiquadFilter();
    this.pad.type = 'lowpass';
    this.pad.frequency.value = this.trk.filtro;
    this.pad.Q.value = 0.7;
    this.pad.connect(this.out);
    this.step = 0; this.at = Snd.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 40);
    this.tick();
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.out) {
      const g = this.out, p = this.pad, t = Snd.ctx ? Snd.ctx.currentTime : 0;
      try {                                                 // mezzo secondo di dissolvenza, non un taglio
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        setTimeout(() => {
          try { g.disconnect(); } catch (e) { /* già staccato */ }
          try { if (p) p.disconnect(); } catch (e) { /* già staccato */ }
        }, 900);
      } catch (e) { try { g.disconnect(); } catch (e2) { /* niente */ } }
      this.out = null; this.pad = null;
    }
    this.trk = null;
  },
  /** La scheda audio si sblocca solo dopo il primo tocco: da lì in poi la musica può partire. */
  resume() { if (this.name && !this.timer) { const n = this.name; this.name = ''; this.play(n); } },
  /** Rimette la musica della schermata che c'è adesso, o la toglie. */
  refresh() { this.name = ''; this.play(G.scene && G.scene.music || 'menu'); },
};
