import { Connection } from '@solana/web3.js'
import { RPC_URL } from './config'

let connection: Connection | undefined

/** Shared RPC connection. Safe to call on the server and in the browser. */
export function getConnection(): Connection {
  connection ??= new Connection(RPC_URL, 'confirmed')
  return connection
}
