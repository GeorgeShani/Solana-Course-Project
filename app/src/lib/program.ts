import { Program } from '@anchor-lang/core'
import { PublicKey } from '@solana/web3.js'
import idl from '../idl/course_program.json'
import type { CourseProgram } from '../idl/course_program'
import { getConnection } from './solana'

/**
 * Typed read-only client for the `course_program` program: it can fetch
 * accounts and decode them, using the generated IDL.
 */
export function getProgram() {
  return new Program<CourseProgram>(idl as CourseProgram, {
    connection: getConnection(),
  })
}

/** The template counter is a singleton PDA seeded with "counter". Example only. */
export function getCounterPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('counter')], programId)[0]
}
