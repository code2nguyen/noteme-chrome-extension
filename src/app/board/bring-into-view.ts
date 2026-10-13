/**
 * Scroll a board tile to the middle of the window, smoothly, and check it got there: a scroll started while the board
 * is still laying out (a note just revealed, the notes still loading) can stop short or be dropped, so it is tried
 * again, up to twice, until the tile is in view.
 */
export function bringIntoView(tile: Element | null | undefined, retries = 2): void {
  if (!tile) {
    return;
  }
  tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (retries > 0) {
    setTimeout(() => {
      if (!inView(tile)) {
        bringIntoView(tile, retries - 1);
      }
    }, 700);
  }
}

/** Whether most of the tile is on screen: 80% of it, or of the window when it is taller than that. */
function inView(tile: Element): boolean {
  const rect = tile.getBoundingClientRect();
  const shown = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return shown >= 0.8 * Math.min(rect.height, window.innerHeight);
}
