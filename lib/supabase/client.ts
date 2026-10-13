import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;
let configCache: {url:string; anonKey:string} | null = null;

function sleep(ms:number){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function getConfig(): Promise<{url:string;anonKey:string}> {
  if(configCache) return configCache;

  let lastError:unknown;

  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),8000);

    try{
      const response=await fetch('/api/supabase-config',{
        cache:'no-store',
        credentials:'same-origin',
        signal:controller.signal,
        headers:{'Accept':'application/json'},
      });

      if(!response.ok){
        const body=await response.text().catch(()=>'');
        throw new Error(
          body
            ? `Supabase configuration request failed (${response.status}).`
            : `Supabase configuration request failed (${response.status}).`
        );
      }

      const config=(await response.json()) as Partial<{url:string;anonKey:string}>;

      if(!config.url||!config.anonKey){
        throw new Error('Invalid Supabase configuration returned by the server.');
      }

      configCache={url:config.url,anonKey:config.anonKey};
      return configCache;
    }catch(error){
      lastError=error;
      if(attempt<2) await sleep(350*(attempt+1));
    }finally{
      window.clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to connect to Supabase configuration.');
}

export function createClient(): Promise<SupabaseClient> {
  if(!clientPromise){
    clientPromise=getConfig()
      .then(({url,anonKey})=>createBrowserClient(url,anonKey))
      .catch(error=>{
        // Allow the next user action/page load to retry instead of keeping a rejected promise forever.
        clientPromise=null;
        throw error;
      });
  }

  return clientPromise;
}