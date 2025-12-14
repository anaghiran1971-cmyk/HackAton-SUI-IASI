export function pornesteProgramator(opts: {
  intervalMs: number;
  executa: () => Promise<void>;
}) {
  let ruleaza = false;

  const tick = async () => {
    if (ruleaza) return;
    ruleaza = true;
    try {
      await opts.executa();
    } catch (e) {
      console.error("Eroare job:", e);
    } finally {
      ruleaza = false;
    }
  };

  setInterval(tick, opts.intervalMs);
  void tick();
}
