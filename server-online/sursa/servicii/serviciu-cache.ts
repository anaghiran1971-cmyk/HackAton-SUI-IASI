import { createClient } from "redis";

export type CacheRedis = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<void>;
  setNxEx(key: string, ttl: number, value: string): Promise<boolean>;
  ping(): Promise<void>;
  inchide(): Promise<void>;
};

type ClientRedisReal = ReturnType<typeof createClient>;

function adapteazaClientRedis(client: ClientRedisReal): CacheRedis {
  return {
    async get(key: string) {
      return await client.get(key);
    },
    async setex(key: string, ttl: number, value: string) {
      await client.set(key, value, { EX: ttl });
    },
    async setNxEx(key: string, ttl: number, value: string) {
      const rezultat = await client.set(key, value, { NX: true, EX: ttl });
      return rezultat === "OK";
    },
    async ping() {
      await client.ping();
    },
    async inchide() {
      await client.quit();
    },
  };
}

export async function creeazaCacheRedis(url: string): Promise<CacheRedis> {
  const client = createClient({ url });

  client.on("error", (err) => {
    console.error("Eroare Redis:", err);
  });

  await client.connect();
  return adapteazaClientRedis(client);
}

export async function citesteDinCache<T>(cache: CacheRedis | null, cheie: string): Promise<T | null> {
  if (!cache) return null;
  const v = await cache.get(cheie);
  return v ? (JSON.parse(v) as T) : null;
}

export async function scrieInCache(
  cache: CacheRedis | null,
  cheie: string,
  valoare: unknown,
  ttlSecunde: number
): Promise<void> {
  if (!cache) return;
  await cache.setex(cheie, ttlSecunde, JSON.stringify(valoare));
}
