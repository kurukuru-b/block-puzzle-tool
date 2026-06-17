const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type PuzzleDifficulty = "beginner" | "easy" | "normal" | "hard" | "expert" | "challenge"

type PuzzleBody = {
  id: string
  difficulty: PuzzleDifficulty
  title: string
  order_index: number
  is_published: boolean
  grid: unknown
  placed_shapes: unknown
  updated_at?: string
}

type OrderUpdate = {
  id: string
  orderIndex: number
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  if (request.method !== "POST") {
    return json({ message: "Method not allowed." }, 405)
  }

  const adminPassword = request.headers.get("x-admin-password")

  if (!adminPassword || !await verifyAdminPassword(adminPassword)) {
    return json({ message: "Admin password is incorrect." }, 401)
  }

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return json({ message: "Invalid JSON body." }, 400)
  }

  const action = getString(body.action)
  const table = getTableName(getString(body.table) ?? "puzzles")

  try {
    switch (action) {
      case "upsert":
        return await upsertPuzzle(table, body.puzzle)
      case "rename":
        return await patchPuzzle(table, requireId(body.id), {
          title: requireString(body.title, "title"),
          updated_at: new Date().toISOString(),
        }, "Renamed in DB.")
      case "move":
        return await patchPuzzle(table, requireId(body.id), {
          difficulty: requireDifficulty(body.difficulty),
          title: requireString(body.title, "title"),
          order_index: requireInteger(body.orderIndex, "orderIndex"),
          is_published: true,
          updated_at: new Date().toISOString(),
        }, "Moved in DB.")
      case "update-order":
        return await updatePuzzleOrder(table, body.updates)
      case "delete":
        return await deletePuzzle(table, requireId(body.id))
      default:
        return json({ message: "Unknown action." }, 400)
    }
  } catch (error) {
    return json({
      message: error instanceof Error ? error.message : "Puzzle management failed.",
    }, 400)
  }
})

async function upsertPuzzle(table: string, value: unknown): Promise<Response> {
  const puzzle = requirePuzzleBody(value)

  puzzle.updated_at = new Date().toISOString()

  const response = await adminRest(`${table}?on_conflict=id`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(puzzle),
  })

  if (!response.ok) {
    return await restError(response)
  }

  return json({ message: "Registered in DB." })
}

async function patchPuzzle(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  message: string,
): Promise<Response> {
  const response = await adminRest(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    return await restError(response)
  }

  return json({ message })
}

async function updatePuzzleOrder(table: string, value: unknown): Promise<Response> {
  if (!Array.isArray(value)) {
    throw new Error("updates must be an array.")
  }

  const updates = value.map((item) => {
    if (!isRecord(item)) {
      throw new Error("Each order update must be an object.")
    }

    return {
      id: requireId(item.id),
      orderIndex: requireInteger(item.orderIndex, "orderIndex"),
    } satisfies OrderUpdate
  })

  await Promise.all(updates.map(async (update) => {
    const response = await adminRest(`${table}?id=eq.${encodeURIComponent(update.id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        order_index: update.orderIndex,
        updated_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }
  }))

  return json({ message: "Reordered in DB." })
}

async function deletePuzzle(table: string, id: string): Promise<Response> {
  const response = await adminRest(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  })

  if (!response.ok) {
    return await restError(response)
  }

  return json({ message: "Deleted from DB." })
}

async function adminRest(path: string, init: RequestInit): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = getServiceRoleKey()

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase admin environment is not configured.")
  }

  return await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  const configuredHash = Deno.env.get("ADMIN_PASSWORD_HASH")?.trim()
  const configuredPassword = Deno.env.get("ADMIN_PASSWORD")?.trim()

  if (configuredHash) {
    return await verifyPasswordHash(password, configuredHash)
  }

  return Boolean(configuredPassword && password === configuredPassword)
}

async function verifyPasswordHash(password: string, expectedHash: string): Promise<boolean> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  )
  const actualHash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  const normalizedExpectedHash = expectedHash.replace(/^sha256-/i, "").toLowerCase()

  return actualHash === normalizedExpectedHash
}

function getServiceRoleKey(): string | null {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()

  if (legacyKey) {
    return legacyKey
  }

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS")

  if (!secretKeys) {
    return null
  }

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string>
    return parsed.default?.trim() || null
  } catch {
    return null
  }
}

async function restError(response: Response): Promise<Response> {
  const body = await response.text()

  try {
    const parsed = JSON.parse(body) as { message?: string }

    return json({
      message: parsed.message ?? `DB request failed: ${response.status}`,
    }, response.status)
  } catch {
    return json({
      message: body || `DB request failed: ${response.status}`,
    }, response.status)
  }
}

function requirePuzzleBody(value: unknown): PuzzleBody {
  if (!isRecord(value)) {
    throw new Error("puzzle must be an object.")
  }

  return {
    id: requireId(value.id),
    difficulty: requireDifficulty(value.difficulty),
    title: requireString(value.title, "title"),
    order_index: requireInteger(value.order_index, "order_index"),
    is_published: requireBoolean(value.is_published, "is_published"),
    grid: requirePresent(value.grid, "grid"),
    placed_shapes: requirePresent(value.placed_shapes, "placed_shapes"),
  }
}

function requireDifficulty(value: unknown): PuzzleDifficulty {
  const difficulty = requireString(value, "difficulty")

  if (!["beginner", "easy", "normal", "hard", "expert", "challenge"].includes(difficulty)) {
    throw new Error("Invalid difficulty.")
  }

  return difficulty as PuzzleDifficulty
}

function requireId(value: unknown): string {
  const id = requireString(value, "id")

  if (!id) {
    throw new Error("id is required.")
  }

  return id
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string.`)
  }

  return value
}

function requireInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer.`)
  }

  return value
}

function requireBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean.`)
  }

  return value
}

function requirePresent(value: unknown, name: string): unknown {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required.`)
  }

  return value
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function getTableName(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error("Invalid table name.")
  }

  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}
