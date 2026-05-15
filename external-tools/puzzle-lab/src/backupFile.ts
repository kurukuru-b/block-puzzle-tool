import fs from "node:fs"
import path from "node:path"
import { isPuzzleDifficulty } from "../../../src/core/puzzle/PuzzleDifficulty"
import type { SupabasePuzzleBackupRow } from "./supabaseRest"

export const BACKUP_DIR = "external-tools/puzzle-lab/backups"

export type BackupFile = {
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

export function createBackupFile(
  table: string,
  rows: SupabasePuzzleBackupRow[],
  exportedAt = new Date().toISOString(),
): BackupFile {
  return {
    version: 1,
    exportedAt,
    source: {
      table,
    },
    summary: {
      total: rows.length,
      byDifficulty: getDifficultyCounts(rows),
    },
    rows,
  }
}

export function writeBackupFile(backup: BackupFile): string {
  const backupDir = path.resolve(BACKUP_DIR)
  const backupPath = path.join(
    backupDir,
    `puzzles-${formatTimestampForFile(backup.exportedAt)}.json`,
  )

  fs.mkdirSync(backupDir, { recursive: true })
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`)

  return backupPath
}

export function readBackupFile(backupPath: string): BackupFile {
  const resolvedPath = resolveBackupPath(backupPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Backup file was not found: ${resolvedPath}`)
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as unknown

  if (!isBackupFile(parsed)) {
    throw new Error("Backup file format is invalid.")
  }

  return parsed
}

export function parseBackupRows(backup: BackupFile): SupabasePuzzleBackupRow[] {
  return backup.rows.map(parseBackupRow)
}

export function getDifficultyCounts(rows: Array<{ difficulty?: unknown }>): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const row of rows) {
    const difficulty = typeof row.difficulty === "string"
      ? row.difficulty
      : "unknown"

    counts[difficulty] = (counts[difficulty] ?? 0) + 1
  }

  return counts
}

function resolveBackupPath(backupPath: string): string {
  if (backupPath !== "latest") {
    return path.resolve(backupPath)
  }

  const backupDir = path.resolve(BACKUP_DIR)

  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory was not found: ${backupDir}`)
  }

  const latestBackup = fs.readdirSync(backupDir)
    .filter((fileName) => fileName.startsWith("puzzles-") && fileName.endsWith(".json"))
    .sort()
    .at(-1)

  if (!latestBackup) {
    throw new Error(`No backup files found in: ${backupDir}`)
  }

  return path.join(backupDir, latestBackup)
}

function parseBackupRow(value: unknown): SupabasePuzzleBackupRow {
  if (!isRecord(value)) {
    throw new Error("Backup row must be an object.")
  }

  if (
    typeof value.id !== "string" ||
    !isPuzzleDifficulty(value.difficulty) ||
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

function formatTimestampForFile(value: string): string {
  return value.replace(/[:.]/g, "-")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
