import type { FastifyPluginAsync } from "fastify";

export const rutaAcasa: FastifyPluginAsync = async (app) => {
  app.get("/", async (_req, reply) => {
    const baza = `http://localhost:${app.mediu.PORT}`;

    const html = `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Copilot Sui - Server</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; margin: 32px; line-height: 1.5; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; max-width: 900px; }
    code, pre { background: #f6f6f6; padding: 2px 6px; border-radius: 6px; }
    pre { padding: 12px; overflow:auto; }
    a { color: #0b57d0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .grid { display: grid; gap: 10px; }
    .muted { color: #666; }
  </style>
</head>
<body>
  <h1>Copilot Sui — Server Online</h1>
  <p class="muted">
    API backend pentru AI Copilot (Sui wallet assistant). Rețea: <b>${app.mediu.SUI_RETEA}</b>
  </p>

  <div class="card grid">
    <h2>Endpoint-uri rapide</h2>
    <div>✅ Stare: <a href="${baza}/api/stare" target="_blank">${baza}/api/stare</a></div>
    <div>✅ Sănătate: <a href="${baza}/api/sanatate" target="_blank">${baza}/api/sanatate</a></div>
    <div>📊 Metrici: <a href="${baza}/api/metrici" target="_blank">${baza}/api/metrici</a></div>

    <h2>Teste (PowerShell)</h2>
    <p class="muted">Dacă ai activat <code>CHEIE_API_SERVER</code>, adaugă header-ul <code>x-api-key</code>.</p>

    <h3>Chat</h3>
    <pre>$body = @{
  mesaje = @(
    @{ rol = "utilizator"; continut = "Salut! Explică pe scurt ce este Sui." }
  )
} | ConvertTo-Json -Depth 10

irm -Method Post -Uri "${baza}/api/chat" -ContentType "application/json" -Body $body</pre>

    <h3>Explică tranzacție</h3>
    <pre>$body = @{ digest = "TX_DIGEST_AICI" } | ConvertTo-Json
irm -Method Post -Uri "${baza}/api/tranzactii/explica" -ContentType "application/json" -Body $body</pre>

    <h3>Verifică risc</h3>
    <pre>$body = @{ digest = "TX_DIGEST_AICI" } | ConvertTo-Json
irm -Method Post -Uri "${baza}/api/risc/verifica" -ContentType "application/json" -Body $body</pre>

    <h3>Explică obiect</h3>
    <pre>$body = @{ obiectId = "OBJECT_ID_AICI" } | ConvertTo-Json
irm -Method Post -Uri "${baza}/api/obiecte/explica" -ContentType "application/json" -Body $body</pre>

    <p class="muted">
      Notă: acesta este un landing page minimal pentru demo. UI-ul real (Wallet Dashboard / AI Copilot Panel)
      se integrează separat.
    </p>
  </div>
</body>
</html>`;

    reply.header("content-type", "text/html; charset=utf-8").send(html);
  });
};
