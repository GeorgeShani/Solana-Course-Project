import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import type { ReactNode } from 'react'
import { RPC_URL } from './lib/config'
import '@solana/wallet-adapter-react-ui/styles.css'

// An empty list still lists every Wallet Standard wallet (Phantom, Solflare,
// Backpack...) that is installed in the browser.
const wallets: never[] = []

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
