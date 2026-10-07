import { createBrowserClient } from '@supabase/ssr';

let clientPromise: ReturnType<typeof createBrowserClient> | null = null;

async function getConfig() {
  const response = await fetch('/api/supabase-config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load Supabase configuration.');
  return response.json() as Promise<{ url: string; anonKey: string }>;
}

export async function createClient() {
  if (clientPromise) return clientPromise;

  const { url, anonKey } = await getConfig();
  clientPromise = createBrowserClient(url, anonKey);
  return clientPromise;
}
