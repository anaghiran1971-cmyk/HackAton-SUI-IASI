import { formatSuiDinMist, mistLaSui, rotunjeste } from "../utilitare/monede-sui.js";

export type NivelRisc = "scazut" | "mediu" | "ridicat";

export type FactorRisc = {
  cod: string;
  severitate: "info" | "warn" | "crit";
  mesaj: string;
};

export type RezumatTranzactieDeterminist = {
  txDigest?: string;
  retea: string;

  // Schimbări de balanță doar pe SUI (0x2::sui::SUI)
  schimbariSui: Array<{
    adresa: string;
    mist: number;
    sui: number;
  }>;

  gas: {
    computationCostMist: number;
    storageCostMist: number;
    storageRebateMist: number;
    nonRefundableStorageFeeMist: number;

    computationCostSui: number;
    storageCostSui: number;
    storageRebateSui: number;
    nonRefundableStorageFeeSui: number;

    text: string; // formatat
  } | null;

  // sumar uman, deja convertit (LLM nu calculează nimic)
  sumarUman: {
    balans: string[];
    gas: string | null;
  };

  risc: {
    nivel: NivelRisc;
    scor: number; // 0..100
    factori: FactorRisc[];
  };
};

type TxLike = any;

function adresaOwner(owner: any): string | null {
  return owner?.AddressOwner ?? null;
}

function extrageSchimbariSui(tx: TxLike) {
  const bc = (tx?.balanceChanges ?? []) as Array<{
    owner?: any;
    coinType?: string;
    amount?: string;
  }>;

  return bc
    .filter(b => b?.coinType === "0x2::sui::SUI" && typeof b.amount === "string")
    .map(b => {
      const adresa = adresaOwner(b.owner) ?? "necunoscut";
      const mist = Number(b.amount);
      const sui = rotunjeste(mistLaSui(mist), 9);
      return { adresa, mist, sui };
    });
}

function extrageGas(tx: TxLike) {
  const g = tx?.effects?.gasUsed;
  if (!g) return null;

  const computationCostMist = Number(g.computationCost ?? 0);
  const storageCostMist = Number(g.storageCost ?? 0);
  const storageRebateMist = Number(g.storageRebate ?? 0);
  const nonRefundableStorageFeeMist = Number(g.nonRefundableStorageFee ?? 0);

  const computationCostSui = rotunjeste(mistLaSui(computationCostMist), 9);
  const storageCostSui = rotunjeste(mistLaSui(storageCostMist), 9);
  const storageRebateSui = rotunjeste(mistLaSui(storageRebateMist), 9);
  const nonRefundableStorageFeeSui = rotunjeste(mistLaSui(nonRefundableStorageFeeMist), 9);

  return {
    computationCostMist,
    storageCostMist,
    storageRebateMist,
    nonRefundableStorageFeeMist,
    computationCostSui,
    storageCostSui,
    storageRebateSui,
    nonRefundableStorageFeeSui,
    text:
      `Gas: comp ${computationCostSui} SUI (${computationCostMist} MIST), ` +
      `storage ${storageCostSui} SUI (${storageCostMist} MIST), ` +
      `rebate ${storageRebateSui} SUI (${storageRebateMist} MIST), ` +
      `non-ref ${nonRefundableStorageFeeSui} SUI (${nonRefundableStorageFeeMist} MIST)`,
  };
}

// Risc determinist: simplu, explicabil, fără “halucinații”
function evalueazaRisc(opts: {
  sumaSui?: number;
  limitaTransferSui: number;
  destinatar?: string;
  expeditor?: string;
  retea: string;
  gas?: ReturnType<typeof extrageGas>;
  schimbariSui: ReturnType<typeof extrageSchimbariSui>;
  obiecteModificateCount?: number;
  areCall?: boolean;
}) {
  const factori: FactorRisc[] = [];
  let scor = 0;

  const suma = typeof opts.sumaSui === "number" ? opts.sumaSui : null;
  if (suma !== null) {
    if (suma > opts.limitaTransferSui) {
      scor += 50;
      factori.push({
        cod: "DEPASESTE_LIMITA",
        severitate: "crit",
        mesaj: `Suma cerută (${suma} SUI) depășește limita de siguranță (${opts.limitaTransferSui} SUI).`,
      });
    } else if (suma >= opts.limitaTransferSui * 0.8) {
      scor += 15;
      factori.push({
        cod: "APROAPE_LIMITA",
        severitate: "warn",
        mesaj: `Suma este aproape de limita setată (${opts.limitaTransferSui} SUI).`,
      });
    }
  }

  if (opts.retea.toLowerCase() === "mainnet") {
    scor += 30;
    factori.push({
      cod: "MAINNET",
      severitate: "warn",
      mesaj: "Ești pe mainnet. Riscul financiar este real (nu test tokens).",
    });
  }

  if (opts.destinatar && /^0x0{10,}/i.test(opts.destinatar)) {
    scor += 40;
    factori.push({
      cod: "DESTINATAR_ZERO",
      severitate: "crit",
      mesaj: "Destinatarul pare a fi adresa zero (0x00...). Verifică contactul/aliasul.",
    });
  }

  // Heuristică: tranzacție cu call (smart contract) = risc mai mare decât transfer simplu
  if (opts.areCall) {
    scor += 10;
    factori.push({
      cod: "ARE_CALL",
      severitate: "warn",
      mesaj: "Tranzacția include apel de contract (call). Verifică dApp-ul și efectele.",
    });
  }

  // Gas relativ mare (heuristică), pe test transfer simplu comp cost ~0.01 SUI e “ok”.
  if (opts.gas && opts.gas.computationCostSui > 0.05) {
    scor += 10;
    factori.push({
      cod: "GAS_MARE",
      severitate: "warn",
      mesaj: `Cost de execuție relativ mare: ${opts.gas.computationCostSui} SUI.`,
    });
  }

  // multe schimbări de balanță = poate fi ceva complex
  if (opts.schimbariSui.length >= 3) {
    scor += 5;
    factori.push({
      cod: "BALANTE_MULTIPLE",
      severitate: "info",
      mesaj: "Există mai multe schimbări de balanță; tranzacția poate fi mai complexă.",
    });
  }

  const nivel: NivelRisc =
    scor >= 60 ? "ridicat" : scor >= 25 ? "mediu" : "scazut";

  return { nivel, scor: Math.min(100, scor), factori };
}

export function construiesteAnalizaDeterminista(opts: {
  tx: TxLike;
  retea: string;
  limitaTransferSui: number;
  // optional, din intenția userului (când previzualizezi înainte de semnare)
  sumaSui?: number;
  expeditor?: string;
  destinatar?: string;
}) : RezumatTranzactieDeterminist {
  const schimbariSui = extrageSchimbariSui(opts.tx);
  const gas = extrageGas(opts.tx);

  const input = opts.tx?.transaction?.data;
  const areCall = Array.isArray(input?.transactions)
    ? input.transactions.some((t: any) => t?.kind === "Call" || t?.Call)
    : false;

  const sumarUman = {
    balans: schimbariSui.map(s =>
      `${s.adresa}: ${formatSuiDinMist(s.mist)}`
    ),
    gas: gas ? gas.text : null,
  };

  const risc = evalueazaRisc({
    sumaSui: opts.sumaSui,
    limitaTransferSui: opts.limitaTransferSui,
    destinatar: opts.destinatar,
    expeditor: opts.expeditor,
    retea: opts.retea,
    gas,
    schimbariSui,
    areCall,
  });

  return {
    retea: opts.retea,
    schimbariSui,
    gas,
    sumarUman,
    risc,
  };
}
