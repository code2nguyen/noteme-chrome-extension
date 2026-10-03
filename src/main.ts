import './app/c2-elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { readMirroredSettings, resolveTheme } from './app/settings/settings.service';

// Before the first paint, so a dark new tab never flashes light.
document.documentElement.dataset['theme'] = resolveTheme(readMirroredSettings().theme);

bootstrapApplication(App, appConfig).catch((error: unknown) => console.error(error));
