import {
  formatDifficulty,
  PUZZLE_DIFFICULTIES,
  type PuzzleDifficulty,
} from "../../../src/core/puzzle/PuzzleDifficulty"
import { loadSupabaseEnv } from "./env"
import {
  createSupabaseClient,
  type SupabasePuzzleRow,
  type SupabasePuzzleUpdate,
} from "./supabaseRest"

type RenameMode = "auto" | "all" | "none"

type NormalizeOptions = {
  apply: boolean
  rename: RenameMode
}

type PlannedUpdate = SupabasePuzzleUpdate & {
  before: {
    title: string
    order_index: number
  }
  after: {
    title: string
    order_index: number
  }
  difficulty: PuzzleDifficulty
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const env = loadSupabaseEnv()
  const client = createSupabaseClient(env)
  const rows = await client.fetchPuzzles()
  const plannedUpdates = planNormalize(rows, options.rename)

  printSummary(rows, plannedUpdates, options)

  if (!options.apply) {
    console.log("Dry run only. Add --apply to update Supabase.")
    return
  }

  if (plannedUpdates.length === 0) {
    console.log("Nothing to update.")
    return
  }

  const updatedAt = new Date().toISOString()

  await client.updatePuzzles(
    plannedUpdates.map((update) => ({
      id: update.id,
      title: update.title,
      order_index: update.order_index,
      updated_at: updatedAt,
    })),
  )

  console.log(`Updated ${plannedUpdates.length} puzzle(s).`)
}

function planNormalize(
  rows: SupabasePuzzleRow[],
  renameMode: RenameMode,
): PlannedUpdate[] {
  const plannedUpdates: PlannedUpdate[] = []

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    const rowsForDifficulty = rows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .filter(({ row }) => row.difficulty === difficulty)
      .sort((a, b) => compareRowsForNormalize(a, b))

    rowsForDifficulty.forEach(({ row }, index) => {
      const nextTitle = getNormalizedTitle(row, index, renameMode)
      const nextOrderIndex = index
      const update: PlannedUpdate = {
        id: row.id,
        before: {
          title: row.title,
          order_index: row.order_index,
        },
        after: {
          title: nextTitle,
          order_index: nextOrderIndex,
        },
        difficulty,
      }

      if (row.title !== nextTitle) {
        update.title = nextTitle
      }

      if (row.order_index !== nextOrderIndex) {
        update.order_index = nextOrderIndex
      }

      if (update.title !== undefined || update.order_index !== undefined) {
        plannedUpdates.push(update)
      }
    })
  }

  return plannedUpdates
}

function compareRowsForNormalize(
  a: { row: SupabasePuzzleRow; sourceIndex: number },
  b: { row: SupabasePuzzleRow; sourceIndex: number },
): number {
  const aOrder = Number.isFinite(a.row.order_index)
    ? a.row.order_index
    : Number.POSITIVE_INFINITY
  const bOrder = Number.isFinite(b.row.order_index)
    ? b.row.order_index
    : Number.POSITIVE_INFINITY

  if (aOrder !== bOrder) {
    return aOrder - bOrder
  }

  return a.sourceIndex - b.sourceIndex
}

function getNormalizedTitle(
  row: SupabasePuzzleRow,
  index: number,
  renameMode: RenameMode,
): string {
  const normalizedTitle = `${formatDifficulty(row.difficulty)} ${index + 1}`

  if (renameMode === "all") {
    return normalizedTitle
  }

  if (renameMode === "auto" && shouldAutoRename(row.title)) {
    return normalizedTitle
  }

  return row.title
}

function shouldAutoRename(title: string): boolean {
  const trimmedTitle = title.trim()

  return trimmedTitle === "" ||
    /^(Beginner|Easy|Normal|Hard|Expert|Challenge)\s+\d+$/i.test(trimmedTitle)
}

function parseArgs(args: string[]): NormalizeOptions {
  const options: NormalizeOptions = {
    apply: false,
    rename: "auto",
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === "--apply") {
      options.apply = true
      continue
    }

    if (arg === "--no-rename") {
      options.rename = "none"
      continue
    }

    if (arg === "--rename") {
      const mode = args[index + 1]

      if (!isRenameMode(mode)) {
        throw new Error("--rename must be one of: auto, all, none.")
      }

      options.rename = mode
      index += 1
      continue
    }

    if (arg.startsWith("--rename=")) {
      const mode = arg.slice("--rename=".length)

      if (!isRenameMode(mode)) {
        throw new Error("--rename must be one of: auto, all, none.")
      }

      options.rename = mode
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

function isRenameMode(value: unknown): value is RenameMode {
  return value === "auto" || value === "all" || value === "none"
}

function printSummary(
  rows: SupabasePuzzleRow[],
  plannedUpdates: PlannedUpdate[],
  options: NormalizeOptions,
) {
  console.log(`Fetched ${rows.length} puzzle(s).`)
  console.log(`Mode: ${options.apply ? "apply" : "dry-run"}, rename: ${options.rename}`)

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    const count = rows.filter((row) => row.difficulty === difficulty).length
    const updates = plannedUpdates.filter((update) => update.difficulty === difficulty)

    console.log(`${formatDifficulty(difficulty)}: ${count} puzzle(s), ${updates.length} update(s)`)

    for (const update of updates.slice(0, 20)) {
      const orderChange = update.before.order_index === update.after.order_index
        ? `#${update.after.order_index + 1}`
        : `#${update.before.order_index + 1} -> #${update.after.order_index + 1}`
      const titleChange = update.before.title === update.after.title
        ? `"${update.after.title}"`
        : `"${update.before.title}" -> "${update.after.title}"`

      console.log(`  ${orderChange}: ${titleChange}`)
    }

    if (updates.length > 20) {
      console.log(`  ...and ${updates.length - 20} more update(s).`)
    }
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
