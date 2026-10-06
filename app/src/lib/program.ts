import { AnchorProvider, Program } from '@anchor-lang/core'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import idl from '../idl/course_program.json'
import type { CourseProgram } from '../idl/course_program'

/** Build a typed client for the `course_program` program, signing via the wallet. */
export function getProgram(connection: Connection, wallet: AnchorWallet) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })
  return new Program<CourseProgram>(idl as CourseProgram, provider)
}

/** The smoke-test counter is a singleton PDA seeded with "counter". */
export function getCounterPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('counter')], programId)[0]
}
