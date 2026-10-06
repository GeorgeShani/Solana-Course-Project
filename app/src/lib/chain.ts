import { createServerFn } from '@tanstack/react-start'
import { RPC_URL } from './config'
import { getProgram } from './program'
import { getConnection } from './solana'

export type ChainStatus =
  | { ok: true; rpcUrl: string; slot: number; programId: string; deployed: boolean }
  | { ok: false; rpcUrl: string; error: string }

/**
 * Reads the cluster state on the server, so the first HTML already contains
 * it. Never throws: an unreachable RPC is reported as `ok: false`.
 */
export const getChainStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ChainStatus> => {
    try {
      const connection = getConnection()
      const { programId } = getProgram()
      const [slot, info] = await Promise.all([
        connection.getSlot(),
        connection.getAccountInfo(programId),
      ])
      return {
        ok: true,
        rpcUrl: RPC_URL,
        slot,
        programId: programId.toBase58(),
        deployed: info?.executable ?? false,
      }
    } catch (e) {
      return {
        ok: false,
        rpcUrl: RPC_URL,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  },
)
