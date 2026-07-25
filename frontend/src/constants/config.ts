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
  },

  prescription: {
    maxMedicines: 20,
    maxLabTests: 15,
    pdfWidth: 595,
    pdfHeight: 842,
  },

  otp: {
    length: 6,
    expiryMinutes: 5,
  },
} as const;
