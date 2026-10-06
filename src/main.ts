import './app/c2-elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { readMirroredSettings, resolveTheme } from './app/settings/settings.service';

// Before the first paint, from the settings mirrored on this device: best effort, since a missing or stale mirror
// (a first run, a change synced from another device) paints with that theme until the synced settings arrive.
document.documentElement.dataset['theme'] = resolveTheme(readMirroredSettings().theme);

bootstrapApplication(App, appConfig).catch((error: unknown) => console.error(error));
