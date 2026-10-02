import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { routes } from './app.routes';
import { initialState, ROOT_REDUCERS } from './store/reducers';
import { ArtBoardItemEffects, ItemDataEffects, UserEffects } from './store/effects';
import { STORAGE_API } from './services/storage.api';
import { ChromeStorageApi } from './services/chrome-storage.api';
import { DevStorageApi } from './services/dev-storage.api';

/** `ng serve` runs as a plain web page, where `chrome.storage` does not exist. */
const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // The new tab page is index.html; a hash keeps routing working without a server.
    provideRouter(routes, withHashLocation()),
    provideStore(ROOT_REDUCERS, { initialState }),
    provideEffects(ArtBoardItemEffects, ItemDataEffects, UserEffects),
    { provide: STORAGE_API, useClass: hasChromeStorage ? ChromeStorageApi : DevStorageApi },
  ],
};
