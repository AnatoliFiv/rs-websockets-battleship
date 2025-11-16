export const BOARD_SIZE = 10;
export const MIN_SHIP_LENGTH = 1;
export const MAX_SHIP_LENGTH = 4;
export const CELL_DIRECTIONS: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;
