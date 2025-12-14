export type MesajChat = {
  rol: "sistem" | "utilizator" | "asistent";
  continut: string;
};

export type RaspunsChat = {
  raspuns: string;
};

export type VerdictRisc = {
  nivel: "scazut" | "mediu" | "ridicat";
  scor: number; // 0..100
  motive: string[];
  recomandari?: string[];
};

export type RaspunsExplicaTranzactie = {
  txDigest: string;
  explicatie: string;
  rezumat?: string;
};

export type RaspunsExplicaObiect = {
  objectId: string;
  explicatie: string;
};
