import { useMemo, useState } from "react";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

import { CopilotChat } from "./components/CopilotChat";
import { postJson } from "./api";
import { AppShell } from "./components/AppShell";
import { Card, Badge } from "./components/Card";

import type { Intentie, IntentieTransfer } from "./types";

export default function App() {
  const cont = useCurrentAccount();
  const conectat = useMemo(() => !!cont?.address, [cont]);
  const { mutateAsync: semneazaSiExecuta, isPending } = useSignAndExecuteTransaction();

  const [log, setLog] = useState<string>("");
  const [intentie, setIntentie] = useState<IntentieTransfer | null>(null);
  const [destinatar, setDestinatar] = useState<{ alias: string; adresa: string } | null>(null);

  async function rezolvaDestinatar(i: IntentieTransfer) {
    setLog("Rezolv contact...");
    const data = await postJson<{ alias: string; adresa: string }>("/api/contacte/rezolva", { alias: i.destinatar_alias });
    setDestinatar(data);
    setLog("Contact rezolvat. Gata de confirmare în wallet.");
  }

  async function executaTransfer() {
    if (!conectat) return setLog("Conectează wallet-ul înainte.");
    if (!intentie || !destinatar) return setLog("Lipsește intenția sau destinatarul.");

    const tx = new Transaction();
    const mist = BigInt(Math.floor(Number(intentie.suma_sui) * 1_000_000_000));
    const [coin] = tx.splitCoins(tx.gas, [mist]);
    tx.transferObjects([coin], destinatar.adresa);

    setLog("Trimit către wallet pentru confirmare...");
    try {
      const rezultat = await semneazaSiExecuta({ transaction: tx });
      setLog(`Executat! digest = ${rezultat.digest}`);
    } catch (e: any) {
      setLog(`Eroare la semnare/executie: ${e?.message ?? String(e)}`);
    }
  }

  const walletInfo = (
    <div className="small" style={{ textAlign: "right" }}>
      {conectat ? <>Conectat: <span style={{ fontFamily: "var(--mono)" }}>{cont!.address.slice(0, 10)}…{cont!.address.slice(-6)}</span></> : "Neconectat"}
    </div>
  );

  const left = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        icon="🧭"
        title="Command Center"
        subtitle="Pași clari: intenție → destinatar → semnare în wallet"
        right={<Badge tone={conectat ? "ok" : undefined}>{conectat ? "READY" : "CONNECT"}</Badge>}
      >
        <div className="btnRow">
          <button className="btn" onClick={() => intentie && rezolvaDestinatar(intentie)} disabled={!intentie}>
            2) Rezolvă destinatar
          </button>

          <button className="btn btnPrimary" onClick={executaTransfer} disabled={!intentie || !destinatar || isPending}>
            3) Confirmă în wallet & execută
          </button>

          <button
            className="btn btnDanger"
            onClick={() => {
              setIntentie(null);
              setDestinatar(null);
              setLog("Reset.");
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: 12 }} className="small">
          Hint: scrie în chat “trimite lui marcel 0.01 sui” sau “cumpara nft din colectia …”.
        </div>
      </Card>

      <Card icon="🛡️" title="Safety & Trust" subtitle="Copilotul nu semnează. Wallet-ul semnează.">
        <div className="small" style={{ lineHeight: 1.6 }}>
          • Comenzile sunt convertite în intenții (nu în executare automată).<br />
          • Poți activa evaluare risc înainte de acțiuni (token/NFT/transfer).<br />
          • Dacă lipsesc date (objectId, package), copilotul cere clarificări.
        </div>
      </Card>

      <Card icon="📌" title="Stare" subtitle="Mesaje de sistem / debug pentru demo">
        <div className="pre">{log || "—"}</div>
      </Card>

      <div className="kv">
        <Card icon="🧾" title="Intenție" subtitle="Ce a înțeles copilotul">
          <div className="pre">{intentie ? JSON.stringify(intentie, null, 2) : "—"}</div>
        </Card>

        <Card icon="🎯" title="Destinatar" subtitle="Rezolvare alias → adresă">
          <div className="pre">{destinatar ? JSON.stringify(destinatar, null, 2) : "—"}</div>
        </Card>
      </div>

      <div className="small" style={{ opacity: 0.8 }}>
        Notă: Serverul parsează intenția și rezolvă alias-ul. Confirmarea finală este întotdeauna în wallet.
      </div>
    </div>
  );

  const right = (
    <CopilotChat
      conectat={conectat}
      adresa={cont?.address}
      onIntentie={(i: Intentie) => {
        if (i.tip === "transfer_sui") {
          setIntentie(i);
          setDestinatar(null);
          setLog("Intenție primită din chat. Apasă „Rezolvă destinatar”.");
        } else {
          setLog("Intenție non-transfer (token/nft) primită. Flow-ul de execuție e încă neimplementat.");
        }
      }}
    />
  );

  return (
    <AppShell
      left={left}
      right={right}
      walletInfo={walletInfo}
      topRight={<ConnectButton />}
    />
  );
}
