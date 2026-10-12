import {
  AccountRole,
  address,
  type Address,
  type Instruction,
} from "@solana/kit";
import { findPair, validateTerms, u64le, concat } from "@relay/domain";
import {
  ATA_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@relay/domain/solana";
import { contentFromInput } from "./publish-input";

export const REHEARSAL_CREATOR = "HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e";
export const REHEARSAL_PRICE = 100_000_000n;
export const REHEARSAL_BASE_TARGET = 20_000_000n; // 0.02 devnet SOL; two 1-USDC follows at the test price.

export function rehearsalArgs(argv: readonly string[]) {
  const args = {
    creator: REHEARSAL_CREATOR,
    keypair: "",
    publish: false,
    manifest: "../.relay/devnet-rehearsal.json",
    api: "http://localhost:3001",
    help: false,
  };
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (seen.has(name)) throw new Error(`Duplicate option ${name}`);
    seen.add(name);
    if (name === "--publish") args.publish = true;
    else if (name === "--help") args.help = true;
    else if (["--creator", "--keypair", "--manifest", "--api"].includes(name)) {
      const value = argv[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`${name} needs a value`);
      if (name === "--creator") args.creator = value;
      if (name === "--keypair") args.keypair = value;
      if (name === "--manifest") args.manifest = value;
      if (name === "--api") args.api = value;
    } else throw new Error(`Unknown option ${name}`);
  }
  return args;
}

export function makeRehearsalDrafts(nowSec: number) {
  return [
    { label: "In range test", low: "90", high: "120" },
    { label: "Below range test", low: "130", high: "150" },
    { label: "Entry passed test", low: "70", high: "80" },
  ].map((scenario) => ({
    label: scenario.label,
    terms: validateTerms({
      pairId: "sol-usdc",
      entryLow: scenario.low,
      entryHigh: scenario.high,
      nowSec,
      expiresAtSec: nowSec + 7 * 86_400,
    }),
    ...contentFromInput(
      {
        rationale: `Devnet test: ${scenario.label}. Entry ${scenario.low}–${scenario.high} USDC per SOL demonstrates range checks at a configured venue price of 100. Reference feed prices can differ. Test tokens have no value; this is not trading advice.`,
        exitThesis:
          "Rehearsal only. This plan does not execute an exit or promise a return. Every follow needs the follower's own approval.",
      },
      6,
    ),
  }));
}

export function fundingTopUp(available: bigint, target: bigint): bigint {
  if (available < 0n || target < 0n)
    throw new RangeError("Funding amounts cannot be negative");
  return available < target ? target - available : 0n;
}

/** Classic Token Program ATAs, System transfer and SyncNative, per Solana's instruction layouts. */
export function venueFundingInstructions(
  payer: Address,
  pool: Address,
  baseVault: Address,
  quoteVault: Address,
  topUp: bigint,
): Instruction[] {
  if (topUp < 0n) throw new RangeError("Funding amount cannot be negative");
  const pair = findPair("sol-usdc", "devnet");
  if (!pair) throw new Error("The devnet pair is missing");
  const ata = (vault: Address, mint: Address): Instruction => ({
    programAddress: ATA_PROGRAM_ADDRESS,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: vault, role: AccountRole.WRITABLE },
      { address: pool, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: Uint8Array.of(1),
  });
  return [
    ata(baseVault, address(pair.base.mint)),
    ata(quoteVault, address(pair.quote.mint)),
    ...(topUp > 0n
      ? [
          {
            programAddress: SYSTEM_PROGRAM_ADDRESS,
            accounts: [
              { address: payer, role: AccountRole.WRITABLE_SIGNER },
              { address: baseVault, role: AccountRole.WRITABLE },
            ],
            data: concat([Uint8Array.of(2, 0, 0, 0), u64le(topUp)]),
          },
        ]
      : []),
    {
      programAddress: TOKEN_PROGRAM_ADDRESS,
      accounts: [{ address: baseVault, role: AccountRole.WRITABLE }],
      data: Uint8Array.of(17),
    },
  ];
}
