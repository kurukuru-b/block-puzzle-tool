export type GridPos = {
    readonly x: number
    readonly y: number
    readonly z: number
}

export function gridPosKey(pos: GridPos): string {
    return `${pos.x},${pos.y},${pos.z}`
}

export function isSameGridPos(a: GridPos, b: GridPos): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z
}