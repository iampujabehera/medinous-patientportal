import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { GeographyService } from './core/services/geography.service';
import { OfflineStorageService } from './core/services/offline-storage.service';
import { I18nService } from './core/services/i18n.service';
import { LocationService } from './core/services/location.service';

function initializeApp(
  geo: GeographyService,
  offline: OfflineStorageService,
  i18n: I18nService,
  location: LocationService
) {
  return () => {
    geo.initialize();
    i18n.initialize();
    location.initialize();
    return offline.initialize();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [GeographyService, OfflineStorageService, I18nService, LocationService],
      multi: true
    }
  ]
};
