import {
  address,
  createSolanaRpc,
  getBase64Encoder,
  getI64Codec,
  type Address,
} from "@solana/kit";
import {
  ACCOUNT_SIZES,
  CLOCK_SYSVAR_ADDRESS,
  RELAY_PROGRAM_ADDRESS,
  decodePlan,
  decodePlanVersion,
  getVersionAddress,
} from "@relay/domain/solana";
import type { Cluster } from "../env";
import type { ChainReader } from "./types";

const base64 = getBase64Encoder();

export function createChain(rpcUrl: string, cluster: Cluster): ChainReader {
  const rpc = createSolanaRpc(rpcUrl);

  /** Fetches an account; null if absent. Throws if it is not owned by the Relay program. */
  async function fetchOwned(addr: Address): Promise<Uint8Array | null> {
    const { value } = await rpc
      .getAccountInfo(addr, { encoding: "base64", commitment: "confirmed" })
      .send();
    if (!value) return null;
    if (value.owner !== RELAY_PROGRAM_ADDRESS) {
      throw new Error("Account is not owned by the Relay program");
    }
    return Uint8Array.from(base64.encode(value.data[0]));
  }

  async function listBySize(size: number) {
    return rpc
      .getProgramAccounts(RELAY_PROGRAM_ADDRESS, {
        encoding: "base64",
        commitment: "confirmed",
        filters: [{ dataSize: BigInt(size) }],
      })
      .send();
  }

  // Chain clock. On a Surfpool fork the clock can be moved by time travel, so the server must
  // follow it instead of the wall clock. Elsewhere the wall clock is correct.
  let clockSample: { chainMs: number; at: number } | undefined;
  async function nowMs(): Promise<number> {
    if (cluster !== "localnet") return Date.now();
    const t = Date.now();
    if (!clockSample || t - clockSample.at > 2000) {
      const { value } = await rpc
        .getAccountInfo(CLOCK_SYSVAR_ADDRESS, { encoding: "base64" })
        .send();
      if (!value) throw new Error("Clock sysvar unavailable");
      const bytes = Uint8Array.from(base64.encode(value.data[0]));
      // Clock layout: slot u64, epoch_start_timestamp i64, epoch u64, leader_schedule_epoch u64, unix_timestamp i64
      clockSample = {
        chainMs: Number(getI64Codec().decode(bytes, 32)) * 1000,
        at: t,
      };
    }
    return clockSample.chainMs + (t - clockSample.at);
  }

  return {
    programId: RELAY_PROGRAM_ADDRESS,
    nowMs,
    async getPlan(planPda) {
      const data = await fetchOwned(address(planPda));
      return data ? decodePlan(data) : null;
    },
    async getVersion(planPda, version) {
      const pda = await getVersionAddress(address(planPda), version);
      const data = await fetchOwned(pda);
      return data ? { pda, data: decodePlanVersion(data) } : null;
    },
    async listPlans() {
      const accounts = await listBySize(ACCOUNT_SIZES.plan);
      return accounts.map((a) => ({
        pda: a.pubkey,
        data: decodePlan(Uint8Array.from(base64.encode(a.account.data[0]))),
      }));
    },
    async listVersions() {
      const accounts = await listBySize(ACCOUNT_SIZES.planVersion);
      return accounts.map((a) => ({
        pda: a.pubkey,
        data: decodePlanVersion(
          Uint8Array.from(base64.encode(a.account.data[0])),
        ),
      }));
    },
  };
}
