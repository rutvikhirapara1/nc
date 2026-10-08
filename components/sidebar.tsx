'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store, ReceiptIndianRupee, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const links = [
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/vendors', 'Vendors', Store],
    ['/bills', 'Bills & Payments', ReceiptIndianRupee],
  ] as const;

  useEffect(() => {
    let active = true;
    createClient()
      .then((client) => { if (active) setSupabase(client); })
      .catch((error) => console.error('Unable to initialize Supabase:', error));
    return () => { active = false; };
  }, []);

  async function handleSignOut() {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out failed:', error);
      setSigningOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="border-b border-slate-100 px-6 py-6">
        <div className="text-xl font-black tracking-tight text-slate-900">
          Vendor<span className="text-indigo-600">Pay</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">Payment control center</div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map(([href, label, Icon]) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ' +
                (active
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={!supabase || signingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
        >
          {signingOut ? <span className="spinner" /> : <LogOut size={18} />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}