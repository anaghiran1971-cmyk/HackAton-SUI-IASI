const API = "http://127.0.0.1:8080";

export async function postJson<T>(path: string, body: any): Promise<T> {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || r.statusText);
  }

  return r.json();
}
