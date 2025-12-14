import { useEffect, useMemo, useRef, useState } from "react";
import { postJson } from "../api";
import type { ChatResp, Intentie, ParseazaIntentieResp, RiscResp } from "../types";

type Mesaj = { rol: "user" | "assistant"; continut: string };

function esteNumar(x: string) {
  const n = Number(x.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function CopilotChat(props: {
  conectat: boolean;
  adresa?: string;
  onIntentie: (i: Intentie) => void;
}) {
  const [deschis, setDeschis] = useState(false);
  const [input, setInput] = useState("");
  const [mesaje, setMesaje] = useState<Mesaj[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ păstrăm o intenție “în curs” până completăm sloturile
  const [draft, setDraft] = useState<Intentie | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (props.conectat) {
      setDeschis(true);
      setMesaje((m) => {
        if (m.some((x) => x.continut.includes("Salut 👋"))) return m;
        return [
          ...m,
          {
            rol: "assistant",
            continut:
              `Salut 👋 Sunt AI Copilot Sui.\n` +
              `Poți scrie: „trimite lui marcel 0.01 sui”, „cumpără token SUI”, „cumpără nft din colecția X”.`,
          },
        ];
      });
    }
  }, [props.conectat]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mesaje, deschis]);

  const placeholder = useMemo(() => {
    if (!props.conectat) return "Conectează wallet-ul ca să pornești copilotul…";
    return "Scrie o comandă sau o întrebare…";
  }, [props.conectat]);

  // ✅ aici completăm sloturi dacă avem draft
  async function incearcaCompleteazaDraft(text: string): Promise<boolean> {
    if (!draft) return false;

    // BUY TOKEN: așteptăm suma_sui
    if (draft.tip === "cumpara_token" && (draft.suma_sui == null || !Number.isFinite(draft.suma_sui))) {
      const n = esteNumar(text);
      if (n == null || n <= 0) {
        setMesaje((m) => [...m, { rol: "assistant", continut: "Spune-mi te rog o sumă numerică (ex: 1 sau 0.5 SUI)." }]);
        return true;
      }

      const complet: Intentie = { ...draft, suma_sui: n };
      setDraft(complet);

      // risc pentru token
      const risc = await postJson<RiscResp>("/api/risc/evalueaza", {
        tip: "token",
        asset: { tip: "token", simbol: draft.simbol, pachet: draft.pachet, pret_sui: n, sursa: "chat" },
        context: { prima_interactiune: true, suma_mare: n >= 10 },
      });

      setMesaje((m) => [
        ...m,
        { rol: "assistant", continut: `✅ Am buget: ${n} SUI.\nRisc: **${risc.risc.nivel}** (scor ${risc.risc.scor})\nFactori: ${risc.risc.factori.join(", ") || "-"}\n\nDacă vrei să continui, spune-mi marketplace/DEX-ul (ex: Cetus/Turbos) sau dă-mi package/module/function.` },
      ]);

      props.onIntentie(complet);
      return true;
    }

    // BUY NFT: cerem colectie / objectId / pret_sui (în ordinea asta)
    if (draft.tip === "cumpara_nft") {
      if (!draft.colectie) {
        const colectie = text.trim();
        if (colectie.length < 2) {
          setMesaje((m) => [...m, { rol: "assistant", continut: "Scrie numele colecției (ex: Capy, Suiet etc.)." }]);
          return true;
        }
        const next: Intentie = { ...draft, colectie };
        setDraft(next);
        setMesaje((m) => [...m, { rol: "assistant", continut: "Ok. Ai și ObjectId-ul NFT-ului (0x...)? Dacă nu, scrie „nu”." }]);
        return true;
      }

      if (!draft.objectId) {
        const t = text.trim();
        const next: Intentie = t.toLowerCase() === "nu" ? draft : { ...draft, objectId: t };
        setDraft(next);

        setMesaje((m) => [...m, { rol: "assistant", continut: "Care e prețul estimat în SUI? (ex: 2.5)" }]);
        return true;
      }

      if (draft.pret_sui == null || !Number.isFinite(draft.pret_sui)) {
        const n = esteNumar(text);
        if (n == null || n <= 0) {
          setMesaje((m) => [...m, { rol: "assistant", continut: "Spune-mi un preț numeric (ex: 2.5 SUI)." }]);
          return true;
        }

        const complet: Intentie = { ...draft, pret_sui: n };
        setDraft(complet);

        const risc = await postJson<RiscResp>("/api/risc/evalueaza", {
          tip: "nft",
          asset: {
            tip: "nft",
            nume: draft.colectie,
            objectId: draft.objectId,
            pret_sui: n,
            sursa: "chat",
          },
          context: { prima_interactiune: true, proiect_necunoscut: true },
        });

        setMesaje((m) => [
          ...m,
          { rol: "assistant", continut: `✅ NFT: ${draft.colectie}\nPreț: ${n} SUI\nRisc: **${risc.risc.nivel}** (scor ${risc.risc.scor})\nFactori: ${risc.risc.factori.join(", ") || "-"}\n\nCa să pot genera tranzacția, spune-mi marketplace-ul (TradePort/BlueMove etc.) sau dă-mi package/module/function.` },
        ]);

        props.onIntentie(complet);
        return true;
      }
    }

    return false;
  }

  async function trimite() {
    const text = input.trim();
    if (!text) return;

    setInput("");
    setMesaje((m) => [...m, { rol: "user", continut: text }]);
    setLoading(true);

    try {
      // 0) dacă avem draft, încercăm întâi să completăm sloturi
      const consumed = await incearcaCompleteazaDraft(text);
      if (consumed) return;

      // 1) parsează intenția
      const intentieResp = await postJson<ParseazaIntentieResp>("/api/intentii/parseaza", { prompt: text });
      const intentie = intentieResp.intentie;

      if (intentie) {
        // transfer
        if (intentie.tip === "transfer_sui") {
          props.onIntentie(intentie);
          setMesaje((m) => [...m, { rol: "assistant", continut: `Am înțeles transfer ${intentie.suma_sui} SUI către „${intentie.destinatar_alias}”.` }]);
          return;
        }

        // buy token -> cerem suma dacă lipsește
        if (intentie.tip === "cumpara_token") {
          setDraft(intentie);
          const sym = intentie.simbol ?? "(simbol necunoscut)";
          setMesaje((m) => [...m, { rol: "assistant", continut: `Ok. Câte SUI vrei să folosești ca buget pentru cumpărare (${sym})?` }]);
          return;
        }

        // buy nft -> cerem colectie dacă lipsește
        if (intentie.tip === "cumpara_nft") {
          setDraft(intentie);
          setMesaje((m) => [...m, { rol: "assistant", continut: `Ok. Din ce colecție vrei să cumperi NFT-ul?` }]);
          return;
        }
      }

      // 2) nu e intenție -> chat normal
      const chat = await postJson<ChatResp>("/api/chat", { mesaje: [{ rol: "utilizator", continut: text }] });
      setMesaje((m) => [...m, { rol: "assistant", continut: chat.raspuns || "(fără răspuns)" }]);
    } catch (e: any) {
      setMesaje((m) => [...m, { rol: "assistant", continut: `Eroare: ${e?.message ?? String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }
  return (
  <div className="card">
    <div className="cardHeader">
      <div>
        <div className="cardTitle">
          <span>💬</span>
          <span>Copilot Chat</span>
        </div>
        <div className="cardSub">
          {props.conectat ? "Conectat — poți da comenzi sau întrebări" : "Neconectat — conectează wallet-ul"}
        </div>
      </div>

      <span className={props.conectat ? "badge badgeOk" : "badge"}>{props.conectat ? "LIVE" : "OFF"}</span>
    </div>

    <div className="chatWrap">
      <div ref={containerRef} className="chatList">
        {mesaje.length === 0 ? (
          <div className="small">
            {props.conectat ? "Spune-mi ce vrei să faci 🙂" : "Conectează wallet-ul ca să începem."}
          </div>
        ) : (
          mesaje.map((m, i) => (
            <div key={i} className={`bubbleRow ${m.rol === "user" ? "user" : ""}`}>
              <div className={`bubble ${m.rol === "user" ? "user" : ""}`}>{m.continut}</div>
            </div>
          ))
        )}
      </div>

      <div className="chatInput">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={!props.conectat || loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") trimite();
          }}
        />
        <button className="btn btnPrimary" onClick={trimite} disabled={!props.conectat || loading}>
          {loading ? "..." : "Trimite"}
        </button>
      </div>

      {props.conectat && props.adresa ? (
        <div style={{ padding: "10px 12px" }} className="small">
          Wallet: {props.adresa.slice(0, 6)}…{props.adresa.slice(-4)}
        </div>
      ) : null}
    </div>
  </div>
);

}
