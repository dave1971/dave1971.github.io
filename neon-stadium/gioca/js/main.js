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
Share.soloCarriera();   // la coda degli invii fatta prima della 1.6.2 si butta, una volta sola
Conta.manda('avvio');
// record veri e classifica dei giocatori: se non arriva, si gioca lo stesso. Con lo stesso file arriva
// l'indirizzo del Worker: la prima volta in assoluto il segnale d'avvio aspetta quello.
World.pull(() => Conta.svuota());
G.setScene(LANG_SET ? new TitleScene() : new LangScene());
