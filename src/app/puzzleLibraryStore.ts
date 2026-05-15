import type { PuzzleExport } from "../core/puzzle/PuzzleExport"
import {
  isPuzzleDifficulty,
  PUZZLE_DIFFICULTIES,
  type PuzzleDifficulty,
} from "../core/puzzle/PuzzleDifficulty"

const PUZZLE_LIBRARY_STORAGE_KEY = "block-puzzle-tool:puzzle-library"
const SUPABASE_TABLE = import.meta.env.VITE_SUPABASE_PUZZLE_TABLE ?? "puzzles"

export type StoredPuzzle = PuzzleExport & {
  id: string
  difficulty: PuzzleDifficulty
  title: string
}

export type PuzzleLibrary = Record<PuzzleDifficulty, StoredPuzzle[]>
type StoredPuzzleLibrary = Partial<Record<PuzzleDifficulty, StoredPuzzle[]>>

type StoreResult = {
  ok: boolean
  message: string
}

type SupabasePuzzleRow = {
  id: string
  difficulty: string
  title: string
  grid: PuzzleExport["grid"]
  placed_shapes: PuzzleExport["placedShapes"]
}

type SupabasePuzzleBody = {
  id: string
  difficulty: PuzzleDifficulty
  title: string
  grid: PuzzleExport["grid"]
  placed_shapes: PuzzleExport["placedShapes"]
  updated_at?: string
}

export function createPuzzleLibraryStore() {
  const supabaseUrl = getEnvString("VITE_SUPABASE_URL")
  const supabaseKey = getEnvString("VITE_SUPABASE_ANON_KEY")

  return {
    isRemoteConfigured,
    loadCached,
    saveCached,
    syncFromRemote,
    upsertPuzzle,
    renamePuzzle,
    movePuzzle,
    deletePuzzle,
  }

  function isRemoteConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseKey)
  }

  function loadCached(): PuzzleLibrary {
    const emptyLibrary = createEmptyPuzzleLibrary()
    const raw = window.localStorage.getItem(PUZZLE_LIBRARY_STORAGE_KEY)

    if (!raw) {
      return emptyLibrary
    }

    try {
      const parsed = JSON.parse(raw) as StoredPuzzleLibrary

      return {
        ...emptyLibrary,
        ...Object.fromEntries(
          PUZZLE_DIFFICULTIES.map((difficulty) => [
            difficulty,
            normalizeStoredPuzzles(parsed[difficulty]),
          ]),
        ),
      }
    } catch {
      return emptyLibrary
    }
  }

  function saveCached(library: PuzzleLibrary) {
    window.localStorage.setItem(PUZZLE_LIBRARY_STORAGE_KEY, JSON.stringify(library))
  }

  async function syncFromRemote(): Promise<StoreResult> {
    if (!isRemoteConfigured()) {
      return {
        ok: true,
        message: "Using local puzzle storage.",
      }
    }

    const result = await request<SupabasePuzzleRow[]>(
      `${getRestUrl()}?select=id,difficulty,title,grid,placed_shapes&order=created_at.asc`,
      { method: "GET" },
    )

    if (!result.ok) {
      return result
    }

    const library = createEmptyPuzzleLibrary()

    for (const row of result.data) {
      if (!isPuzzleDifficulty(row.difficulty)) {
        continue
      }

      library[row.difficulty].push({
        id: row.id,
        difficulty: row.difficulty,
        title: row.title,
        version: 1,
        grid: row.grid,
        placedShapes: row.placed_shapes,
      })
    }

    saveCached(library)

    return {
      ok: true,
      message: "Synced puzzles from DB.",
    }
  }

  async function upsertPuzzle(puzzle: StoredPuzzle): Promise<StoreResult> {
    if (!isRemoteConfigured()) {
      return {
        ok: true,
        message: "Saved locally.",
      }
    }

    return request<void>(`${getRestUrl()}?on_conflict=id`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(toSupabaseBody(puzzle)),
    })
  }

  async function renamePuzzle(id: string, title: string): Promise<StoreResult> {
    if (!isRemoteConfigured()) {
      return {
        ok: true,
        message: "Renamed locally.",
      }
    }

    return request<void>(`${getRestUrl()}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        title,
        updated_at: new Date().toISOString(),
      }),
    })
  }

  async function movePuzzle(
    id: string,
    difficulty: PuzzleDifficulty,
    title: string,
  ): Promise<StoreResult> {
    if (!isRemoteConfigured()) {
      return {
        ok: true,
        message: "Moved locally.",
      }
    }

    return request<void>(`${getRestUrl()}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        difficulty,
        title,
        updated_at: new Date().toISOString(),
      }),
    })
  }

  async function deletePuzzle(id: string): Promise<StoreResult> {
    if (!isRemoteConfigured()) {
      return {
        ok: true,
        message: "Deleted locally.",
      }
    }

    return request<void>(`${getRestUrl()}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    })
  }

  async function request<T>(
    url: string,
    options: RequestInit,
  ): Promise<StoreResult & { data: T }> {
    if (!supabaseKey) {
      return {
        ok: false,
        message: "Supabase key is not configured.",
        data: undefined as T,
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      if (!response.ok) {
        return {
          ok: false,
          message: await getResponseErrorMessage(response),
          data: undefined as T,
        }
      }

      const body = await response.text()

      if (!body) {
        return {
          ok: true,
          message: "DB sync complete.",
          data: undefined as T,
        }
      }

      return {
        ok: true,
        message: "DB sync complete.",
        data: JSON.parse(body) as T,
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "DB sync failed.",
        data: undefined as T,
      }
    }
  }

  function getRestUrl(): string {
    return `${supabaseUrl!.replace(/\/$/, "")}/rest/v1/${SUPABASE_TABLE}`
  }
}

export function createEmptyPuzzleLibrary(): PuzzleLibrary {
  const library = {} as PuzzleLibrary

  for (const difficulty of PUZZLE_DIFFICULTIES) {
    library[difficulty] = []
  }

  return library
}

function normalizeStoredPuzzles(value: StoredPuzzle[] | undefined): StoredPuzzle[] {
  return Array.isArray(value) ? value : []
}

function toSupabaseBody(puzzle: StoredPuzzle): SupabasePuzzleBody {
  return {
    id: puzzle.id,
    difficulty: puzzle.difficulty,
    title: puzzle.title,
    grid: puzzle.grid,
    placed_shapes: puzzle.placedShapes,
    updated_at: new Date().toISOString(),
  }
}

function getEnvString(key: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string | null {
  const value = import.meta.env[key]

  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function getResponseErrorMessage(response: Response): Promise<string> {
  const body = await response.text()

  if (!body) {
    return `DB request failed: ${response.status}`
  }

  try {
    const parsed = JSON.parse(body) as { message?: string }

    return parsed.message ?? `DB request failed: ${response.status}`
  } catch {
    return body
  }
}
