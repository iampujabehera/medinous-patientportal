export interface GeographyConfig {
  code: string;
  name: string;
  locale: string;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
  units: {
    temperature: 'celsius' | 'fahrenheit';
    weight: 'kg' | 'lbs';
    height: 'cm' | 'ft_in';
  };
  features: {
    telehealth: boolean;
    insuranceBilling: boolean;
    prescriptionRefill: boolean;
    labOrdering: boolean;
    guestBooking: boolean;
    documentUpload: boolean;
    payments: boolean;
  };
  languages: string[];
  apiBaseUrl: string;
}

export const GEOGRAPHY_CONFIGS: Record<string, GeographyConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    locale: 'en-US',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    timezone: 'America/New_York',
    units: { temperature: 'fahrenheit', weight: 'lbs', height: 'ft_in' },
    features: { telehealth: true, insuranceBilling: true, prescriptionRefill: true, labOrdering: true, guestBooking: true, documentUpload: true, payments: true },
    languages: ['en'],
    apiBaseUrl: '/api/v1'
  },
  IN: {
    code: 'IN',
    name: 'India',
    locale: 'en-IN',
    currency: 'INR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    timezone: 'Asia/Kolkata',
    units: { temperature: 'celsius', weight: 'kg', height: 'cm' },
    features: { telehealth: true, insuranceBilling: false, prescriptionRefill: true, labOrdering: false, guestBooking: true, documentUpload: true, payments: true },
    languages: ['en'],
    apiBaseUrl: '/api/v1'
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    locale: 'en-AE',
    currency: 'AED',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    timezone: 'Asia/Dubai',
    units: { temperature: 'celsius', weight: 'kg', height: 'cm' },
    features: { telehealth: true, insuranceBilling: true, prescriptionRefill: true, labOrdering: true, guestBooking: true, documentUpload: true, payments: true },
    languages: ['en', 'ar'],
    apiBaseUrl: '/api/v1'
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    locale: 'en-GB',
    currency: 'GBP',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    timezone: 'Europe/London',
    units: { temperature: 'celsius', weight: 'kg', height: 'cm' },
    features: { telehealth: true, insuranceBilling: false, prescriptionRefill: true, labOrdering: true, guestBooking: false, documentUpload: true, payments: true },
    languages: ['en'],
    apiBaseUrl: '/api/v1'
  },
  BH: {
    code: 'BH',
    name: 'Bahrain',
    locale: 'en-US',
    currency: 'USD',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    timezone: 'Asia/Bahrain',
    units: { temperature: 'celsius', weight: 'kg', height: 'cm' },
    features: { telehealth: true, insuranceBilling: true, prescriptionRefill: true, labOrdering: true, guestBooking: true, documentUpload: true, payments: true },
    languages: ['en', 'ar'],
    apiBaseUrl: '/api/v1'
  }
};
