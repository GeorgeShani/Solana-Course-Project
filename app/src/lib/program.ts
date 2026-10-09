import { Program } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { relayIdl } from "./idl";
import { getConnection } from "./solana";

/**
 * Read-only Anchor client for the Relay program: it can fetch accounts and decode them,
 * using the generated IDL.
 */
export function getProgram() {
  return new Program(relayIdl, {
    connection: getConnection(),
  });
}

const enc = new TextEncoder();

function u64le(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, n, true);
  return out;
}

function u16le(n: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, n, true);
  return out;
}

/** Plan PDA: ["plan", creator, plan_id u64 LE]. */
export function getPlanPda(
  programId: PublicKey,
  creator: PublicKey,
  planId: bigint,
) {
  return PublicKey.findProgramAddressSync(
    [enc.encode("plan"), creator.toBytes(), u64le(planId)],
    programId,
  )[0];
}

/** PlanVersion PDA: ["version", plan, version u16 LE]. */
export function getVersionPda(
  programId: PublicKey,
  plan: PublicKey,
  version: number,
) {
  return PublicKey.findProgramAddressSync(
    [enc.encode("version"), plan.toBytes(), u16le(version)],
    programId,
  )[0];
}
