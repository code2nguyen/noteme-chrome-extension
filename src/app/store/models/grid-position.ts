/** Column span of a tile per screen size. The key names are persisted, so they never change. */
export interface ScreenColumns {
  Large: number;
  Medium: number;
  Small: number;
  XSmall: number;
}

export interface GridPosition {
  screenColumns: ScreenColumns;
  rows: number;
  order: number;
}
