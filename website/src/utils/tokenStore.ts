// Browser equivalent of the mobile app's SecureStore wrapper. Mobile uses the
// OS keychain; a browser has no equivalent, so tokens live in localStorage —
// same interface shape so api/client.ts mirrors frontend/src/services/api.ts.
const TokenStore = {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
};

export default TokenStore;
