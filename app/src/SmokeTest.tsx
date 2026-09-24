import {
  useAnchorWallet,
  useConnection,
} from '@solana/wallet-adapter-react'
import { useCallback, useEffect, useState } from 'react'
import { getCounterPda, getProgram } from './lib/program'

/**
 * Proves the whole path works: wallet signs -> RPC -> Anchor program -> state
 * read back. It talks to the template `initialize` / `increment` instructions
 * and is meant to be deleted once real vault instructions exist.
 */
export function SmokeTest() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const [count, setCount] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!wallet) return
    const program = getProgram(connection, wallet)
    const counter = await program.account.counter.fetchNullable(
      getCounterPda(program.programId),
    )
    setCount(counter ? counter.count.toString() : null)
  }, [connection, wallet])

  useEffect(() => {
    refresh().catch((e) => setStatus(String(e)))
  }, [refresh])

  const run = async (name: 'initialize' | 'increment') => {
    if (!wallet) return
    setBusy(true)
    setStatus('')
    try {
      const program = getProgram(connection, wallet)
      const sig =
        name === 'initialize'
          ? await program.methods.initialize().rpc()
          : await program.methods.increment().rpc()
      setStatus(`${name} confirmed: ${sig}`)
      await refresh()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!wallet) return <p>Connect a wallet to call the program.</p>

  return (
    <div>
      <p>Counter: {count ?? 'not initialized'}</p>
      <button disabled={busy || count !== null} onClick={() => run('initialize')}>
        Call initialize
      </button>{' '}
      <button disabled={busy || count === null} onClick={() => run('increment')}>
        Call increment
      </button>
      {status && <p style={{ wordBreak: 'break-all' }}>{status}</p>}
    </div>
  )
}
