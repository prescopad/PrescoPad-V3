import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import secureStore from '../utils/secureStore';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iawufcwouhcitlwukolx.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZkbgpNdRxa4JMFGgw73Lyg_iCD9TlXg';

// supabase-js expects a browser-Storage-shaped adapter (getItem/setItem/
// removeItem); secureStore.ts exposes the Expo SecureStore-style names
// (getItemAsync/setItemAsync/deleteItemAsync) since other code depends on
// that shape — adapt rather than rename the shared utility.
const supabaseStorageAdapter = {
  getItem: (key: string) => secureStore.getItemAsync(key),
  setItem: (key: string, value: string) => secureStore.setItemAsync(key, value),
  removeItem: (key: string) => secureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

