declare const process: {
  argv: string[]
  env: Record<string, string | undefined>
  exit(code?: number): never
}

declare const console: {
  log(...values: unknown[]): void
  error(...values: unknown[]): void
}

declare module "node:fs" {
  const fs: {
    existsSync(path: string): boolean
    mkdirSync(path: string, options?: { recursive?: boolean }): void
    readFileSync(path: string, encoding: string): string
    writeFileSync(path: string, data: string): void
  }

  export default fs
}

declare module "node:path" {
  const path: {
    join(...paths: string[]): string
    resolve(...paths: string[]): string
  }

  export default path
}
