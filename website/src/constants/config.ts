export const APP_CONFIG = {
  name: 'PrescoPad',
  tagline: 'Digital Clinic for Modern Doctors',
  version: '2.0.0',

  billing: {
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
