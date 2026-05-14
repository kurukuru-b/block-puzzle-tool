import fs from "node:fs"
import path from "node:path"
import { loadSupabaseEnv } from "./env"
import {
  createSupabaseClient,
  type SupabasePuzzleBackupRow,
} from "./supabaseRest"

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

type RestoreOptions = {
  backupPath: string
  apply: boolean
}

async function main() {
  const options = getRestoreOptions()
  const backup = readBackupFile(options.backupPath)
  const rows = backup.rows.map(parseBackupRow)
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
      "Usage: npm run puzzle-lab:restore -- external-tools/puzzle-lab/backups/puzzles-...json [--apply]",
    )
  }

  return {
    backupPath,
    apply,
  }
}

function readBackupFile(backupPath: string): BackupFile {
  const resolvedPath = path.resolve(backupPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Backup file was not found: ${resolvedPath}`)
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as unknown

  if (!isBackupFile(parsed)) {
    throw new Error("Backup file format is invalid.")
  }

  return parsed
}

function parseBackupRow(value: unknown): SupabasePuzzleBackupRow {
  if (!isRecord(value)) {
    throw new Error("Backup row must be an object.")
  }

  if (
    typeof value.id !== "string" ||
    !isDifficulty(value.difficulty) ||
    typeof value.title !== "string" ||
    !isRecord(value.grid) ||
    !Array.isArray(value.placed_shapes)
  ) {
    throw new Error(`Backup row is missing required puzzle fields: ${String(value.id)}`)
  }

  return value as SupabasePuzzleBackupRow
}

function isBackupFile(value: unknown): value is BackupFile {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.exportedAt === "string" &&
    isRecord(value.source) &&
    typeof value.source.table === "string" &&
    isRecord(value.summary) &&
    typeof value.summary.total === "number" &&
    isRecord(value.summary.byDifficulty) &&
    Array.isArray(value.rows)
  )
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

function isDifficulty(value: unknown): boolean {
  return value === "easy" ||
    value === "normal" ||
    value === "hard" ||
    value === "challenge"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
