import './app/c2-elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { readMirroredSettings, resolveTheme } from './app/settings/settings.service';
import { loadLanguage } from './app/i18n/i18n.service';
import { resolveLanguage } from './app/i18n/language';

// Before the first paint, from the settings mirrored on this device: best effort, since a missing or stale mirror
// (a first run, a change synced from another device) paints with that theme until the synced settings arrive.
const settings = readMirroredSettings();
document.documentElement.dataset['theme'] = resolveTheme(settings.theme);

// Noteme and the c2 components ship English; another language is read first (a file of the extension, at once), so
// the app starts in it. If that fails it starts in English.
loadLanguage(resolveLanguage(settings.language))
  .catch((error: unknown) => console.error(error))
  .then(() => bootstrapApplication(App, appConfig))
  .catch((error: unknown) => console.error(error));
