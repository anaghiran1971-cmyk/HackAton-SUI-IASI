export async function trimiteNotificareWebhook(url: string, payload: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Webhook failed (${r.status}): ${t}`);
  }
}
