import postgres from "postgres";

export type ClientBazaDate = ReturnType<typeof postgres>;

export function creeazaClientBazaDate(databaseUrl: string) {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20
  });
}
