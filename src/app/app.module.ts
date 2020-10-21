import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import '@c2n/webcomponents/components/calendar-clock';
import { AppComponent } from './app.component';
import { ROOT_REDUCERS, initialState } from './store/reducers';
import { ArtBoardItemEffects, ItemDataEffects, UserEffects } from './store/effects';
// import { ChromeBackgroundBoardModule } from './containers/chrome-background-board/chrome-background-board.module';
import { STORAGE_API } from './services/storage.api';
import { ChromeStorageApi } from './services/chrome-storage.api';
import { AppRoutingModule } from './app-routing.module';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';
import { environment } from '../environments/environment';
import { DevStorageApi } from './services/dev-storage.api';

@NgModule({
  declarations: [AppComponent, WelcomePageComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    StoreModule.forRoot(ROOT_REDUCERS, {
      initialState,
    }),
    EffectsModule.forRoot([ArtBoardItemEffects, ItemDataEffects, UserEffects]),
    AppRoutingModule,
  ],
  providers: [
    {
      provide: STORAGE_API,
      useClass: environment.production ? ChromeStorageApi : DevStorageApi,
    },
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
