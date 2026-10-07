import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;

async function getConfig(): Promise<{ url: string; anonKey: string }> {
  const response = await fetch('/api/supabase-config', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      'Supabase configuration is unavailable. Add SUPABASE_URL and SUPABASE_ANON_KEY to the Vercel environment.'
    );
  }

  const config = (await response.json()) as Partial<{
    url: string;
    anonKey: string;
  }>;

  if (!config.url || !config.anonKey) {
    throw new Error('Invalid Supabase configuration.');
  }

  return { url: config.url, anonKey: config.anonKey };
}

export function createClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = getConfig().then(({ url, anonKey }) =>
      createBrowserClient(url, anonKey)
    );
  }

  return clientPromise;
}
