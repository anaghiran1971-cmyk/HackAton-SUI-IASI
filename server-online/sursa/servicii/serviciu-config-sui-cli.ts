import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

type ConfigSuiCli = {
  active_env?: string;
  envs?: Array<{ alias?: string; rpc?: string }>;
};

export function citesteAliasActivDinSuiCli(): string | null {
  try {
    const home = process.env.USERPROFILE || process.env.HOME;
    if (!home) return null;

    const cale = path.join(home, ".sui", "sui_config", "client.yaml");
    if (!fs.existsSync(cale)) return null;

    const continut = fs.readFileSync(cale, "utf-8");
    const cfg = YAML.parse(continut) as ConfigSuiCli;

    return cfg.active_env ?? null;
  } catch {
    return null;
  }
}
