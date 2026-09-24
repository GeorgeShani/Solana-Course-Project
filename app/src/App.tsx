import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Providers } from './Providers'
import { SmokeTest } from './SmokeTest'
import './App.css'

function App() {
  return (
    <Providers>
      <main>
        <h1>Solana Legacy Vault</h1>
        <p>What happens to my digital assets if I cannot access them anymore?</p>
        <WalletMultiButton />
        <SmokeTest />
      </main>
    </Providers>
  )
}

export default App
