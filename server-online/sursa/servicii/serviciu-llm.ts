import type { MesajChat } from "../utilitare/tipuri-api.js";

export async function genereazaRaspunsLLM(opts: {
  llmUrl: string;
  model: string;
  mesaje: MesajChat[];
}): Promise<string> {
  // Format simplu compatibil cu multe LLM-uri; pentru Ollama folosim /api/generate.
  const prompt = opts.mesaje
    .map(m => `[${m.rol.toUpperCase()}]\n${m.continut}`)
    .join("\n\n");

  const raspuns = await fetch(`${opts.llmUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      prompt,
      stream: false
    })
  });

  if (!raspuns.ok) {
    const text = await raspuns.text();
    throw new Error(`LLM error (${raspuns.status}): ${text}`);
  }

  const json = (await raspuns.json()) as { response?: string };
  const text = json.response?.trim() ?? "";
  return text;
}
