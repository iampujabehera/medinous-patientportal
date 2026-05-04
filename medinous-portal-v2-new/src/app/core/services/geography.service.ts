import { Injectable, signal, computed } from '@angular/core';
import { GeographyConfig, GEOGRAPHY_CONFIGS } from '../models/geography.model';

@Injectable({ providedIn: 'root' })
export class GeographyService {
  private readonly currentGeo = signal<string>('BH');

  readonly config = computed<GeographyConfig>(() => {
    return GEOGRAPHY_CONFIGS[this.currentGeo()] ?? GEOGRAPHY_CONFIGS['US'];
  });

  readonly availableRegions = Object.values(GEOGRAPHY_CONFIGS);

  setGeography(code: string): void {
    if (GEOGRAPHY_CONFIGS[code]) {
      this.currentGeo.set(code);
      localStorage.setItem('medinous_geo', code);
    }
  }

  initialize(): void {
    const saved = localStorage.getItem('medinous_geo');
    if (saved && GEOGRAPHY_CONFIGS[saved]) {
      this.currentGeo.set(saved);
    }
  }

  isFeatureEnabled(feature: keyof GeographyConfig['features']): boolean {
    return this.config().features[feature];
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(this.config().locale);
  }

  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(this.config().locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: this.config().timeFormat === '12h'
    });
  }
}
