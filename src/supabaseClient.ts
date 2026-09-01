import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safely retrieve Supabase URL and Publishable / Anon Key from environment
const rawSupabaseUrl = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
  '';

const rawSupabaseKey = 
  (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && (process.env?.SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  '';

// Helper function to sanitize and normalize the Supabase Project URL
function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = String(url).trim().replace(/^["']|["']$/g, ''); // remove accidental quotes
  
  // Remove any subpaths if user pasted the API endpoint rather than the root project URL
  // e.g., https://xyz.supabase.co/auth/v1 or https://xyz.supabase.co/rest/v1 -> https://xyz.supabase.co
  cleaned = cleaned.replace(/\/auth\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/graphql\/v1\/?$/i, '');
  
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  
  return cleaned;
}

const sanitizedSupabaseUrl: string = sanitizeSupabaseUrl(rawSupabaseUrl);
const sanitizedSupabaseKey: string = String(rawSupabaseKey || '').trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(
  sanitizedSupabaseUrl && 
  sanitizedSupabaseKey && 
  !sanitizedSupabaseUrl.includes('placeholder') &&
  !sanitizedSupabaseKey.includes('placeholder')
);

// Diagnostic logging on module load
if (typeof window !== 'undefined') {
  const maskedKey = sanitizedSupabaseKey 
    ? `${sanitizedSupabaseKey.slice(0, 4)}...${sanitizedSupabaseKey.slice(-4)}`
    : 'EMPTY/UNDEFINED';

  console.groupCollapsed('[Supabase Client Initialization Diagnostics]');
  console.log('Target URL:', sanitizedSupabaseUrl);
  console.log('Key Type:', typeof sanitizedSupabaseKey);
  console.log('Key Length:', sanitizedSupabaseKey.length);
  console.log('Key Preview (first4...last4):', maskedKey);
  console.log('Is Configured:', isSupabaseConfigured);
  console.groupEnd();
}

// Lazy singleton initialization
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      const maskedKey = `${sanitizedSupabaseKey.slice(0, 4)}...${sanitizedSupabaseKey.slice(-4)}`;
      console.log(
        `[Supabase] Calling createClient(url, key, options) -> URL: "${sanitizedSupabaseUrl}", Key Type: ${typeof sanitizedSupabaseKey}, Key Length: ${sanitizedSupabaseKey.length}, Key: ${maskedKey}`
      );

      // Verify key is a valid non-empty string in position 2
      supabaseInstance = createClient(sanitizedSupabaseUrl, sanitizedSupabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
        },
        global: {
          headers: {
            'apikey': sanitizedSupabaseKey,
          },
        },
      });

      console.log('[Supabase] Client instance successfully constructed with explicit apikey header.');
    } catch (err) {
      console.error('[Supabase] Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export const supabase = isSupabaseConfigured ? getSupabase() : null;
