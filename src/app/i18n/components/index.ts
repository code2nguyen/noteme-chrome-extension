let loading: Promise<void> | undefined;

/**
 * The c2 components' text in Noteme's other languages: they ship English, and show these for `<html lang>`, message by
 * message. A module of its own (all.ts), read once and only when Noteme speaks French or Vietnamese; components
 * already on the page redraw when it arrives.
 */
export function loadComponentTranslations(): Promise<void> {
  loading ??= import('./all').then(
    (module) => module.registerComponentTranslations(),
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}
