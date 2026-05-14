import fs from "node:fs"
import path from "node:path"
import { loadSupabaseEnv } from "./env"
import { createSupabaseClient } from "./supabaseRest"

type BackupFile = {
  version: 1
  exportedAt: string
  source: {
    table: string
  }
  summary: {
    total: number
    byDifficulty: Record<string, number>
  }
  rows: unknown[]
}

async function main() {
  const env = loadSupabaseEnv()
  const client = createSupabaseClient(env)
  const rows = await client.fetchPuzzleBackupRows()
  const exportedAt = new Date().toISOString()
  const backup: BackupFile = {
    version: 1,
    exportedAt,
    source: {
      table: env.table,
    },
    summary: {
      total: rows.length,
      byDifficulty: getDifficultyCounts(rows),
    },
    rows,
  }
  const backupDir = path.resolve("external-tools/puzzle-lab/backups")
  const backupPath = path.join(
    backupDir,
    `puzzles-${formatTimestampForFile(exportedAt)}.json`,
  )

  fs.mkdirSync(backupDir, { recursive: true })
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`)

  console.log(`Backed up ${rows.length} puzzle(s).`)
  console.log(backupPath)
}

function getDifficultyCounts(rows: Array<{ difficulty?: unknown }>): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const row of rows) {
    const difficulty = typeof row.difficulty === "string"
      ? row.difficulty
      : "unknown"

    counts[difficulty] = (counts[difficulty] ?? 0) + 1
  }

  return counts
}

function formatTimestampForFile(value: string): string {
  return value.replace(/[:.]/g, "-")
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
