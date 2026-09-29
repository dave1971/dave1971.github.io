'use strict';
// ===== 200 metri piani =====
// Stessi comandi dei 100, ma il doppio di strada: dopo la curva il serbatoio si svuota e la velocità
// massima cala. Chi ha resistenza la perde più tardi e meno.

class Sprint200 extends Sprint100 {
  constructor(n, meta) {
    super(n, meta);
    this.len = 200;
    this.fade = 0.19;   // how much of the top speed is gone by the finish
    this.from = 80;     // metres run before the legs start to go
  }
  stepRunner(p, dt) {
    const r = this.r[p];
    r.vmax = this.capP(p) * (1 - this.fade * clamp((r.x - this.from) / (this.len - this.from), 0, 1));
    r.update(dt);
  }
}

registerEvent({
  id: '200m', name: '200 METRI', cls: Sprint200, lowerBetter: true,
  labels: ['CORRI', 'CORRI'],
  help: ['Premi velocemente i pulsanti per correre:', 'sono il doppio dei 100, negli ultimi metri cali.', 'Non partire prima dello sparo!'],
  fmt: Fmt.time, pts: Pts.track(5.8425, 38, 1.81),
});
