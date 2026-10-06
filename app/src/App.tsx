import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Providers } from './Providers'
import { SmokeTest } from './SmokeTest'
import './App.css'

function App() {
  return (
    <Providers>
      <main>
        <h1>Solana Course Project</h1>
        <WalletMultiButton />
        <SmokeTest />
      </main>
    </Providers>
  )
}

export default App
