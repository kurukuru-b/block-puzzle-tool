export type LocalCellPos = {
    x: number
    y: number
    z: number
  }
  
  export type ShapeDefinition = {
    id: string
    color: number
    cells: LocalCellPos[]
  }