import {
  address,
  createSolanaRpc,
  getBase58Encoder,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getI64Codec,
  type Address,
} from "@solana/kit";
import {
  ACCOUNT_SIZES,
  CLOCK_SYSVAR_ADDRESS,
  RELAY_PROGRAM_ADDRESS,
  decodeFollowReceipt,
  decodePlan,
  decodePlanVersion,
  getVersionAddress,
} from "@relay/domain/solana";
import type { Cluster } from "../env";
import type {
  ChainInstruction,
  ChainReader,
  ChainTransaction,
  SimulationResult,
} from "./types";

const base64 = getBase64Encoder();
const base58 = getBase58Encoder();

/** No RPC call may hang a request: a stuck provider turns into an error the routes already map. */
const DEFAULT_RPC_TIMEOUT_MS = 10_000;

export function createChain(
  rpcUrl: string,
  cluster: Cluster,
  options: { timeoutMs?: number } = {},
): ChainReader {
  const rpc = createSolanaRpc(rpcUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;
  const timeout = () => ({ abortSignal: AbortSignal.timeout(timeoutMs) });

  /** Fetches an account; null if absent. Throws if it is not owned by the Relay program. */
  async function fetchOwned(addr: Address): Promise<Uint8Array | null> {
    const { value } = await rpc
      .getAccountInfo(addr, { encoding: "base64", commitment: "confirmed" })
      .send(timeout());
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
      .send(timeout());
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
        .send(timeout());
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

  // Readiness probes arrive every few seconds; one real RPC call per window is enough.
  let healthSample: { slot: bigint; at: number } | undefined;

  return {
    programId: RELAY_PROGRAM_ADDRESS,
    async health() {
      const t = Date.now();
      if (healthSample && t - healthSample.at < 5_000)
        return { slot: healthSample.slot };
      const slot = await rpc
        .getSlot({ commitment: "confirmed" })
        .send(timeout());
      healthSample = { slot, at: t };
      return { slot };
    },
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
    async getLatestBlockhash() {
      const { value } = await rpc
        .getLatestBlockhash({ commitment: "confirmed" })
        .send(timeout());
      return value;
    },
    async simulate(transaction): Promise<SimulationResult> {
      const { value } = await rpc
        .simulateTransaction(getBase64EncodedWireTransaction(transaction), {
          encoding: "base64",
          sigVerify: false,
          replaceRecentBlockhash: true,
          commitment: "confirmed",
        })
        .send(timeout());
      return {
        ok: value.err === null,
        unitsConsumed:
          value.unitsConsumed === undefined
            ? null
            : Number(value.unitsConsumed),
        logs: value.logs ?? [],
        error: value.err,
      };
    },
    async getTransaction(signature): Promise<ChainTransaction | null> {
      const tx = await rpc
        .getTransaction(signature, {
          encoding: "json",
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        })
        .send(timeout());
      if (!tx?.meta) return null;
      // Instruction account indexes cover the static keys, then loaded lookup-table addresses.
      const keys: Address[] = [
        ...tx.transaction.message.accountKeys,
        ...(tx.meta.loadedAddresses?.writable ?? []),
        ...(tx.meta.loadedAddresses?.readonly ?? []),
      ];
      const key = (index: number): Address => {
        const found = keys[index];
        if (!found)
          throw new Error(
            `Instruction references account ${index} that is not in the transaction`,
          );
        return found;
      };
      const instructions: ChainInstruction[] =
        tx.transaction.message.instructions.map((ix) => ({
          programId: key(ix.programIdIndex),
          accounts: ix.accounts.map(key),
          data: Uint8Array.from(base58.encode(ix.data)),
        }));
      return {
        signature,
        slot: tx.slot,
        blockTime: tx.blockTime === null ? null : Number(tx.blockTime),
        feeLamports: tx.meta.fee,
        error: tx.meta.err,
        logs: [...(tx.meta.logMessages ?? [])],
        instructions,
      };
    },
    async getFollowReceipt(receiptPda) {
      const data = await fetchOwned(address(receiptPda));
      return data ? decodeFollowReceipt(data) : null;
    },
  };
}
