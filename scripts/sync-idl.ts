// Copies the IDL and TypeScript types that `anchor build` generates into the
// frontend, so the app talks to the same interface the program exposes.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const from = join(root, 'program', 'target')
const to = join(root, 'app', 'src', 'idl')

const files = [
  ['idl/course_program.json', 'course_program.json'],
  ['types/course_program.ts', 'course_program.ts'],
] as const

mkdirSync(to, { recursive: true })

for (const [src, dest] of files) {
  const srcPath = join(from, src)
  if (!existsSync(srcPath)) {
    console.error(`missing ${srcPath}. Run \`bun run program:build\` first.`)
    process.exit(1)
  }
  copyFileSync(srcPath, join(to, dest))
  console.log(`copied ${src} -> app/src/idl/${dest}`)
}
