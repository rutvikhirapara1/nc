'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {LayoutDashboard,Store,ReceiptIndianRupee,LogOut,Menu,X} from 'lucide-react';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import type {SupabaseClient} from '@supabase/supabase-js';

const links=[
  ['/dashboard','Dashboard',LayoutDashboard],
  ['/vendors','Vendors',Store],
  ['/bills','Bills & Payments',ReceiptIndianRupee],
] as const;

export default function Sidebar(){
  const path=usePathname();
  const router=useRouter();
  const [supabase,setSupabase]=useState<SupabaseClient|null>(null);
  const [signingOut,setSigningOut]=useState(false);
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    createClient()
      .then(client=>{if(active)setSupabase(client)})
      .catch(error=>console.error('Unable to initialize Supabase:',error));
    return ()=>{active=false};
  },[]);

  useEffect(()=>{setOpen(false)},[path]);

  async function handleSignOut(){
    if(!supabase||signingOut)return;
    setSigningOut(true);
    const {error}=await supabase.auth.signOut();
    if(error){
      console.error('Sign out failed:',error);
      setSigningOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  const Nav=({mobile=false}:{mobile?:boolean})=>(
    <nav className={mobile?'space-y-1 p-4':'flex-1 space-y-1 p-4'}>
      {links.map(([href,label,Icon])=>{
        const active=path===href||path.startsWith(href+'/');
        return (
          <Link
            key={href}
            href={href}
            className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition '+
              (active
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}
          >
            <Icon size={18}/>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="text-xl font-black tracking-tight text-slate-900">Vendor<span className="text-indigo-600">Pay</span></div>
          <div className="mt-1 text-xs text-slate-500">Payment control center</div>
        </div>
        <Nav/>
        <div className="p-4">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={!supabase||signingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            {signingOut?<span className="spinner"/>:<LogOut size={18}/>}
            {signingOut?'Signing out…':'Sign out'}
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard" className="text-lg font-black tracking-tight text-slate-900">
          Vendor<span className="text-indigo-600">Pay</span>
        </Link>
        <button type="button" aria-label="Open menu" onClick={()=>setOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <Menu size={20}/>
        </button>
      </div>

      {open&&(
        <div className="fixed inset-0 z-50 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-slate-900/25" onClick={()=>setOpen(false)}/>
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-lg font-black text-slate-900">Vendor<span className="text-indigo-600">Pay</span></div>
                <div className="text-xs text-slate-500">Navigation</div>
              </div>
              <button type="button" onClick={()=>setOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button>
            </div>
            <Nav mobile/>
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={!supabase||signingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {signingOut?<span className="spinner"/>:<LogOut size={18}/>}
                {signingOut?'Signing out…':'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}