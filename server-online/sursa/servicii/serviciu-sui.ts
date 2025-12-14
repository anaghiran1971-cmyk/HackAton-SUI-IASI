import { SuiClient } from "@mysten/sui/client";

export function creeazaClientSui(rpcUrl: string) {
  return new SuiClient({ url: rpcUrl });
}
