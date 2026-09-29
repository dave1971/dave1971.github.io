'use strict';
// ===== Bootstrap =====
try {
  const a = localStorage.getItem('olimpiadi_snd');
  if (a === '0') Snd.on = false;
  else if (a === 'fx') Music.on = false;
} catch (e) { /* storage unavailable */ }
G.init();
Updater.check();
importaRecordCarriera();   // i migliori di carriera fatti prima della 1.3.8 (una volta sola)
World.pull();       // record veri e classifica dei giocatori: se non arriva, si gioca lo stesso
G.setScene(LANG_SET ? new TitleScene() : new LangScene());
