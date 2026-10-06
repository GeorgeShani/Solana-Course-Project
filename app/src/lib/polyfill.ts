import { Buffer } from 'buffer'

// @solana/web3.js and Anchor expect Node's Buffer to exist in the browser.
// On the server, Node already provides it. Import this module first.
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
}
