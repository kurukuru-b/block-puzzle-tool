import fs from "node:fs"
import path from "node:path"
import {
  PUZZLE_DIFFICULTIES,
  type PuzzleDifficulty,
} from "../../../src/core/puzzle/PuzzleDifficulty"
import type { PuzzleExport } from "../../../src/core/puzzle/PuzzleExport"
import { getDifficultyCounts } from "./backupFile"
import { loadSupabaseEnv } from "./env"
import {
  createSupabaseClient,
  type SupabasePuzzleRow,
} from "./supabaseRest"

const DEFAULT_EXPORT_PATH = "external-tools/puzzle-lab/exports/puzzles-static.json"

type StaticPuzzleRow = {
  id: string
  difficulty: PuzzleDifficulty
  title: string
  orderIndex: number
  isPublished: boolean
  grid: PuzzleExport["grid"]
  placedShapes: PuzzleExport["placedShapes"]
}

type StaticPuzzleExport = {
  version: 1
  exportedAt: string
  source: {
    table: string
  }
  summary: {
    total: number
    byDifficulty: Record<string, number>
  }
  difficulties: Record<PuzzleDifficulty, StaticPuzzleRow[]>
}

async function main() {
  const outputPath = parseArgs(process.argv.slice(2))
  const env = loadSupabaseEnv()
  const client = createSupabaseClient(env)
  const rows = await client.fetchPuzzles()
  const staticExport = createStaticPuzzleExport(env.table, rows)
  const resolvedOutputPath = path.resolve(outputPath)

  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true })
  fs.writeFileSync(resolvedOutputPath, `${JSON.stringify(staticExport, null, 2)}\n`)

  console.log(`Exported ${rows.length} puzzle(s).`)
  console.log(resolvedOutputPath)
}

function createStaticPuzzleExport(
  table: string,
  rows: SupabasePuzzleRow[],
): StaticPuzzleExport {
  const difficulties = Object.fromEntries(
    PUZZLE_DIFFICULTIES.map((difficulty) => [
      difficulty,
      rows
        .filter((row) => row.difficulty === difficulty)
        .sort((a, b) => a.order_index - b.order_index)
        .map(toStaticPuzzleRow),
    ]),
  ) as Record<PuzzleDifficulty, StaticPuzzleRow[]>

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      table,
    },
    summary: {
      total: rows.length,
      byDifficulty: getDifficultyCounts(rows),
    },
    difficulties,
  }
}

function toStaticPuzzleRow(row: SupabasePuzzleRow): StaticPuzzleRow {
  return {
    id: row.id,
    difficulty: row.difficulty,
    title: row.title,
    orderIndex: row.order_index,
    isPublished: row.is_published,
    grid: row.grid,
    placedShapes: row.placed_shapes,
  }
}

function parseArgs(args: string[]): string {
  let outputPath = DEFAULT_EXPORT_PATH

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === "--out") {
      const value = args[index + 1]

      if (!value) {
        throw new Error("--out requires a file path.")
      }

      outputPath = value
      index += 1
      continue
    }

    if (arg.startsWith("--out=")) {
      outputPath = arg.slice("--out=".length)
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return outputPath
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
