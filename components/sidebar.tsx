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
      .then((client) => {
        if (active) setSupabase(client);
      })
      .catch((error) => {
        console.error('Unable to initialize Supabase:', error);
      });

    return () => {
      active = false;
    };
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
    <aside className="w-64 shrink-0 border-r border-zinc-800 min-h-screen p-5 hidden md:block">
      <div className="mb-10">
        <div className="font-black text-xl">
          Vendor<span className="text-indigo-400">Pay</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">Payment control center</div>
      </div>

      <nav className="space-y-2">
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
              path === href
                ? 'bg-indigo-500/15 text-indigo-300'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={!supabase || signingOut}
        className="flex items-center gap-3 text-zinc-500 hover:text-white mt-10 px-3 py-2 disabled:opacity-50"
      >
        <LogOut size={18} />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </aside>
  );
}
