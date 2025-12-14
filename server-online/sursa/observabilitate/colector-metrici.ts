export const metrici = {
  cereriTotale: 0,
  eroriTotale: 0,

  chatCereri: 0,
  explicatiiTranzactii: 0,
  verificariRisc: 0,
  explicatiiObiecte: 0,

  cacheHit: 0,
  cacheMiss: 0
};

export function exportaMetriciPrometheus(): string {
  const linii: string[] = [];

  const addCounter = (nume: string, valoare: number) => {
    linii.push(`# TYPE ${nume} counter`);
    linii.push(`${nume} ${valoare}`);
  };

  addCounter("cereri_totale", metrici.cereriTotale);
  addCounter("erori_totale", metrici.eroriTotale);
  addCounter("chat_cereri", metrici.chatCereri);
  addCounter("explicatii_tranzactii", metrici.explicatiiTranzactii);
  addCounter("verificari_risc", metrici.verificariRisc);
  addCounter("explicatii_obiecte", metrici.explicatiiObiecte);
  addCounter("cache_hit", metrici.cacheHit);
  addCounter("cache_miss", metrici.cacheMiss);

  return linii.join("\n") + "\n";
}
