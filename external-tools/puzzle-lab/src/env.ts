import fs from "node:fs"
import path from "node:path"

export type SupabaseEnv = {
  url: string
  key: string
  table: string
}

export function loadSupabaseEnv(): SupabaseEnv {
  loadDotEnv(".env.local")

  const url = process.env.VITE_SUPABASE_URL?.trim()
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  const table = process.env.VITE_SUPABASE_PUZZLE_TABLE?.trim() || "puzzles"

  if (!url || !key) {
    throw new Error("Supabase settings are missing in .env.local.")
  }

  return { url, key, table }
}

function loadDotEnv(filePath: string) {
  const resolvedPath = path.resolve(filePath)

  if (!fs.existsSync(resolvedPath)) {
    return
  }

  for (const line of fs.readFileSync(resolvedPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")

    if (separatorIndex < 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}
