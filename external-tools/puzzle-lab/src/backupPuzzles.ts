import { loadSupabaseEnv } from "./env"
import { createSupabaseClient } from "./supabaseRest"
import { createBackupFile, writeBackupFile } from "./backupFile"

async function main() {
  const env = loadSupabaseEnv()
  const client = createSupabaseClient(env)
  const rows = await client.fetchPuzzleBackupRows()
  const backupPath = writeBackupFile(createBackupFile(env.table, rows))

  console.log(`Backed up ${rows.length} puzzle(s).`)
  console.log(backupPath)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
