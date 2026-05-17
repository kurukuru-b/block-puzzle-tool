import type { PuzzleExport } from "../../../src/core/puzzle/PuzzleExport"
import type { PuzzleDifficulty } from "../../../src/core/puzzle/PuzzleDifficulty"
import type { SupabaseEnv } from "./env"

export type SupabasePuzzleRow = {
  id: string
  difficulty: PuzzleDifficulty
  title: string
  order_index: number
  is_published: boolean
  grid: PuzzleExport["grid"]
  placed_shapes: PuzzleExport["placedShapes"]
}

export type SupabasePuzzleBackupRow = SupabasePuzzleRow & Record<string, unknown>

export type SupabasePuzzleUpdate = {
  id: string
  title?: string
  order_index?: number
  updated_at?: string
}

export function createSupabaseClient(env: SupabaseEnv) {
  const restUrl = `${env.url.replace(/\/$/, "")}/rest/v1/${env.table}`
  const headers = {
    apikey: env.key,
    Authorization: `Bearer ${env.key}`,
    "Content-Type": "application/json",
  }

  return {
    async fetchPuzzles(): Promise<SupabasePuzzleRow[]> {
      return request<SupabasePuzzleRow[]>(
        `${restUrl}?select=id,difficulty,title,order_index,is_published,grid,placed_shapes&order=order_index.asc.nullslast&order=created_at.asc`,
        { method: "GET" },
      )
    },

    async fetchPuzzleBackupRows(): Promise<SupabasePuzzleBackupRow[]> {
      return request<SupabasePuzzleBackupRow[]>(
        `${restUrl}?select=*&order=created_at.asc`,
        { method: "GET" },
      )
    },

    async insertPuzzles(rows: SupabasePuzzleRow[]): Promise<void> {
      if (rows.length === 0) {
        return
      }

      await request(`${restUrl}`, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(rows),
      })
    },

    async upsertPuzzleBackupRows(rows: SupabasePuzzleBackupRow[]): Promise<void> {
      if (rows.length === 0) {
        return
      }

      await request(`${restUrl}?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      })
    },

    async updatePuzzles(updates: SupabasePuzzleUpdate[]): Promise<void> {
      for (const update of updates) {
        const { id, ...body } = update

        await request(
          `${restUrl}?id=eq.${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify(body),
          },
        )
      }
    },

    async deleteByTitlePrefix(prefix: string): Promise<number> {
      const rows = await request<{ id: string }[]>(
        `${restUrl}?select=id&title=like.${encodeURIComponent(`${prefix}%`)}`,
        { method: "GET" },
      )

      if (rows.length === 0) {
        return 0
      }

      await request(
        `${restUrl}?title=like.${encodeURIComponent(`${prefix}%`)}`,
        {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        },
      )

      return rows.length
    },
  }

  async function request<T = unknown>(
    url: string,
    options: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })
    const body = await response.text()

    if (!response.ok) {
      throw new Error(body || `Supabase request failed: ${response.status}`)
    }

    return body ? JSON.parse(body) as T : undefined as T
  }
}
