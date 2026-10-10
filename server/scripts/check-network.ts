/**
 * Read-only check of the configured network. Run it from the repo root:
 *
 *   bun run --cwd server check-network
 *
 * It reads the root `.env` (NETWORK, SOLANA_RPC_URL, ...), asks the RPC a handful of questions and
 * prints PASS / WARN / FAIL lines. It sends no transaction, signs nothing and needs no key. It does
 * not print the RPC URL, because provider keys live in URLs.
 */
import { loadEnv } from "../src/env";
import { reportOk, runNetworkReport } from "../src/network-report";

const env = loadEnv();
const custom = env.solanaRpcUrl !== "https://api.devnet.solana.com";
console.log(
  `Relay network check: ${env.cluster}, RPC ${custom ? "custom (hidden)" : "public"}\n`,
);

const results = await runNetworkReport(env);
for (const r of results) {
  const tag = r.status.toUpperCase().padEnd(4);
  console.log(`${tag}  ${r.name.padEnd(26)} ${r.detail}`);
}

const failed = results.filter((r) => r.status === "fail").length;
const warned = results.filter((r) => r.status === "warn").length;
console.log(`\n${failed} failed, ${warned} warning(s).`);
process.exit(reportOk(results) ? 0 : 1);
