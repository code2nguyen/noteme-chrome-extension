import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// import { StoreModule } from '@ngrx/store';
// import { EffectsModule } from '@ngrx/effects';
import '@cff/webcomponents/components/calendar-clock';
import { AppComponent } from './app.component';
// import { ROOT_REDUCERS, initialState } from './store/reducers';
// import { ArtBoardItemEffects, ItemDataEffects, UserEffects } from './store/effects';
// import { ChromeBackgroundBoardModule } from './containers/chrome-background-board/chrome-background-board.module';
// import { STORAGE_API } from './services/storage.api';
// import { MainBoardModule } from './containers/main-board/main-board.module';
// import { ChromeStorageApi } from './services/chrome-storage.api';
import { AppRoutingModule } from './app-routing.module';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';

@NgModule({
  declarations: [AppComponent, WelcomePageComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    // StoreModule.forRoot(ROOT_REDUCERS, {
    //   initialState,
    //   runtimeChecks: {
    //     strictStateImmutability: true,
    //     strictActionImmutability: true,
    //   },
    // }),
    // EffectsModule.forRoot([ArtBoardItemEffects, ItemDataEffects, UserEffects]),
    AppRoutingModule,
    // ChromeBackgroundBoardModule,
  ],
  // providers: [
  //   {
  //     provide: STORAGE_API,
  //     useClass: ChromeStorageApi,
  //   },
  // ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
