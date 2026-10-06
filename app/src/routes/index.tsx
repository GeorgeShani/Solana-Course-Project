import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Providers } from '../Providers'
import { SmokeTest } from '../SmokeTest'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main>
      <h1>Solana Course Project</h1>
      {/* Wallets only exist in the browser, so the wallet UI renders client-side. */}
      <ClientOnly fallback={<p>Loading wallet…</p>}>
        <Providers>
          <WalletMultiButton />
          <SmokeTest />
        </Providers>
      </ClientOnly>
    </main>
  )
}
