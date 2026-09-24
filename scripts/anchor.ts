// Runs an `anchor` command inside `program/`. On Windows it goes through WSL,
// because Anchor and the Solana toolchain only run there; on Linux/macOS it
// runs anchor directly.
//
// Usage: bun run scripts/anchor.ts <anchor args...>   e.g. build | test | deploy

import { join } from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: bun run scripts/anchor.ts <anchor args...>')
  process.exit(1)
}

const programDir = join(import.meta.dir, '..', 'program')

const cmd =
  process.platform === 'win32'
    ? [
        'wsl',
        '--cd',
        programDir,
        '-e',
        'bash',
        '-ic',
        // Solana's bin dir is not on PATH in non-login WSL shells.
        `export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"; anchor ${args.join(' ')}`,
      ]
    : ['anchor', ...args]

const proc = Bun.spawn(cmd, {
  cwd: programDir,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})

process.exit(await proc.exited)
