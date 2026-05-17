import {
  PUZZLE_DIFFICULTIES,
  type PuzzleDifficulty,
} from "../../../src/core/puzzle/PuzzleDifficulty"
import type { PuzzleExport } from "../../../src/core/puzzle/PuzzleExport"
import { loadSupabaseEnv } from "./env"
import {
  createSupabaseClient,
  type SupabasePuzzleRow,
} from "./supabaseRest"
import { getPuzzleCellKeys, validatePuzzleExport } from "./puzzleValidation"

type Issue = {
  severity: "error" | "warning"
  message: string
}

async function main() {
  const client = createSupabaseClient(loadSupabaseEnv())
  const rows = await client.fetchPuzzles()
  const issues: Issue[] = []

  console.log(`Rows: ${rows.length}`)
  console.log("")

  inspectDifficultyCounts(rows)
  inspectTitles(rows, issues)
  inspectSignatures(rows, issues)

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    inspectDifficulty(difficulty, rows, issues)
  }

  console.log("")
  printIssues(issues)

  if (issues.some((issue) => issue.severity === "error")) {
    process.exit(1)
  }
}

function inspectDifficultyCounts(rows: SupabasePuzzleRow[]) {
  console.log("By difficulty:")

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    const difficultyRows = rows.filter((row) => row.difficulty === difficulty)
    const published = difficultyRows.filter((row) => row.is_published).length

    console.log(
      `  ${difficulty}: ${difficultyRows.length} total, ${published} published, ` +
      `${difficultyRows.length - published} hidden`,
    )
  }
}

function inspectDifficulty(
  difficulty: PuzzleDifficulty,
  rows: SupabasePuzzleRow[],
  issues: Issue[],
) {
  const difficultyRows = rows
    .filter((row) => row.difficulty === difficulty)
    .sort((a, b) => a.order_index - b.order_index)
  const seenOrderIndexes = new Map<number, SupabasePuzzleRow[]>()

  for (const row of difficultyRows) {
    const current = seenOrderIndexes.get(row.order_index) ?? []

    current.push(row)
    seenOrderIndexes.set(row.order_index, current)

    inspectPuzzleShape(row, issues)
  }

  for (const [orderIndex, matchingRows] of seenOrderIndexes) {
    if (matchingRows.length > 1) {
      issues.push({
        severity: "error",
        message: `${difficulty} has duplicate order_index ${orderIndex}: ` +
          matchingRows.map((row) => row.title).join(", "),
      })
    }
  }

  for (let index = 0; index < difficultyRows.length; index += 1) {
    const row = difficultyRows[index]

    if (!row) {
      continue
    }

    if (row.order_index !== index) {
      issues.push({
        severity: "warning",
        message: `${difficulty} order gap: expected ${index}, found ` +
          `${row.order_index} at "${row.title}"`,
      })
    }
  }
}

function inspectPuzzleShape(row: SupabasePuzzleRow, issues: Issue[]) {
  const puzzle: PuzzleExport = {
    version: 1,
    grid: row.grid,
    placedShapes: row.placed_shapes,
  }

  try {
    validatePuzzleExport(puzzle)
  } catch (error) {
    issues.push({
      severity: "error",
      message: `"${row.title}" is invalid: ${
        error instanceof Error ? error.message : String(error)
      }`,
    })
  }
}

function inspectTitles(rows: SupabasePuzzleRow[], issues: Issue[]) {
  const rowsByTitle = new Map<string, SupabasePuzzleRow[]>()

  for (const row of rows) {
    const key = row.title.trim().toLowerCase()
    const current = rowsByTitle.get(key) ?? []

    current.push(row)
    rowsByTitle.set(key, current)
  }

  for (const matchingRows of rowsByTitle.values()) {
    if (matchingRows.length > 1) {
      issues.push({
        severity: "warning",
        message: `Duplicate title: "${matchingRows[0]!.title}" ` +
          `(${matchingRows.map((row) => row.difficulty).join(", ")})`,
      })
    }
  }
}

function inspectSignatures(rows: SupabasePuzzleRow[], issues: Issue[]) {
  const rowsBySignature = new Map<string, SupabasePuzzleRow[]>()

  for (const row of rows) {
    let signature = ""

    try {
      signature = [...getPuzzleCellKeys(row.placed_shapes)].sort().join("|")
    } catch {
      continue
    }

    const current = rowsBySignature.get(signature) ?? []

    current.push(row)
    rowsBySignature.set(signature, current)
  }

  for (const matchingRows of rowsBySignature.values()) {
    if (matchingRows.length > 1) {
      issues.push({
        severity: "warning",
        message: `Duplicate cell layout: ${
          matchingRows.map((row) => `"${row.title}"`).join(", ")
        }`,
      })
    }
  }
}

function printIssues(issues: Issue[]) {
  if (issues.length === 0) {
    console.log("No issues found.")
    return
  }

  const errors = issues.filter((issue) => issue.severity === "error")
  const warnings = issues.filter((issue) => issue.severity === "warning")

  console.log(`Issues: ${errors.length} error(s), ${warnings.length} warning(s)`)

  for (const issue of issues) {
    console.log(`[${issue.severity}] ${issue.message}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
