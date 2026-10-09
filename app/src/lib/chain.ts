import { createServerFn } from "@tanstack/react-start";
import { RELAY_PROGRAM_ADDRESS } from "@relay/domain/solana";
import { RPC_URL } from "./config";
import { getRpc } from "./solana";

export type ChainStatus =
  | {
      ok: true;
      rpcUrl: string;
      slot: number;
      programId: string;
      deployed: boolean;
    }
  | { ok: false; rpcUrl: string; error: string };

/**
 * Reads the cluster state on the server, so the first HTML already contains
 * it. Never throws: an unreachable RPC is reported as `ok: false`.
 */
export const getChainStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChainStatus> => {
    try {
      const rpc = getRpc();
      const [slot, program] = await Promise.all([
        rpc.getSlot().send(),
        rpc
          .getAccountInfo(RELAY_PROGRAM_ADDRESS, { encoding: "base64" })
          .send(),
      ]);
      return {
        ok: true,
        rpcUrl: RPC_URL,
        slot: Number(slot),
        programId: RELAY_PROGRAM_ADDRESS,
        deployed: program.value?.executable ?? false,
      };
    } catch (e) {
      return {
        ok: false,
        rpcUrl: RPC_URL,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
);
