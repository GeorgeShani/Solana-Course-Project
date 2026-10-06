import { createFileRoute } from '@tanstack/react-router'
import { getChainStatus } from '../lib/chain'

export const Route = createFileRoute('/')({
  loader: () => getChainStatus(),
  component: Home,
})

function Home() {
  const status = Route.useLoaderData()

  return (
    <main>
      <h1>Solana Course Project</h1>
      <p>RPC: {status.rpcUrl}</p>
      {status.ok ? (
        <>
          <p>Current slot: {status.slot}</p>
          <p>
            Program {status.programId}:{' '}
            {status.deployed ? 'deployed' : 'not deployed on this cluster'}
          </p>
        </>
      ) : (
        <p>Cannot reach the cluster: {status.error}</p>
      )}
    </main>
  )
}
