import { loadSupabaseEnv } from "./env"
import { createSupabaseClient } from "./supabaseRest"
import {
  getDifficultyCounts,
  parseBackupRows,
  readBackupFile,
} from "./backupFile"

type RestoreOptions = {
  backupPath: string
  apply: boolean
}

async function main() {
  const options = getRestoreOptions()
  const backup = readBackupFile(options.backupPath)
  const rows = parseBackupRows(backup)
  const env = loadSupabaseEnv()
  const client = createSupabaseClient(env)

  console.log(`Backup exported at: ${backup.exportedAt}`)
  console.log(`Backup source table: ${backup.source.table}`)
  console.log(`Rows in backup: ${rows.length}`)
  console.log(`Rows by difficulty: ${JSON.stringify(getDifficultyCounts(rows))}`)

  if (!options.apply) {
    console.log("Dry run only. Add --apply to upsert these rows into the DB.")
    return
  }

  await client.upsertPuzzleBackupRows(rows)
  console.log(`Restored ${rows.length} puzzle(s) with upsert.`)
}

function getRestoreOptions(): RestoreOptions {
  const args = process.argv.slice(2)
  const apply = args.includes("--apply")
  const backupPath = args.find((arg) => arg !== "--apply")

  if (!backupPath) {
    throw new Error(
      "Usage: npm run puzzle-lab:restore -- <backup-file|latest> [--apply]",
    )
  }

  return {
    backupPath,
    apply,
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
