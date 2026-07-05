export const PRODUCTION_BACKEND_URL = 'https://prescopad-v2.onrender.com/api';

function resolveBackendUrl(): string {
  const configured = import.meta.env.VITE_BACKEND_URL as string | undefined;
  if (configured) return configured;

  if (import.meta.env.DEV) {
    return '/api';
  }

  return '/api';
}

export const APP_CONFIG = {
  name: 'PrescoPad',
  tagline: 'Digital Clinic for Modern Doctors',
  version: '2.0.0',

  api: {
    baseUrl: resolveBackendUrl(),
    timeout: 10000,
  },

  wallet: {
    costPerPrescription: 1,
    defaultRechargeAmount: 100,
    lowBalanceThreshold: 10,
    currency: 'INR',
    currencySymbol: '₹',
  },

  polling: {
    queueIntervalMs: 10000,
    presenceIntervalMs: 60000,
    doctorStatusIntervalMs: 30000,
    connectionIntervalMs: 15000,
  },

  prescription: {
    maxMedicines: 20,
    maxLabTests: 15,
  },

  otp: {
    length: 6,
    expiryMinutes: 5,
  },
} as const;
