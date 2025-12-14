export type IntentieTransfer = {
  tip: "transfer_sui";
  destinatar_alias: string;
  suma_sui: number;
  nota?: string;
};

export type IntentieCumparaToken = {
  tip: "cumpara_token";
  simbol?: string;
  pachet?: string;
  suma_sui?: number;
  nota?: string;
};

export type IntentieCumparaNft = {
  tip: "cumpara_nft";
  colectie?: string;
  objectId?: string;
  pret_sui?: number;
  nota?: string;
};

export type Intentie = IntentieTransfer | IntentieCumparaToken | IntentieCumparaNft;

export type ParseazaIntentieResp = {
  intentie: Intentie | null;
  disclaimer?: string;
  meta?: any;
};

export type ChatResp = {
  raspuns: string;
  disclaimer?: string;
  meta?: any;
};

export type RiscResp = {
  risc: { nivel: string; scor: number; factori: string[] };
  disclaimer?: string;
};
