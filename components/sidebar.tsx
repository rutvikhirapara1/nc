'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {LayoutDashboard,Store,ReceiptIndianRupee,LogOut,Menu,X,Sparkles} from 'lucide-react';
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
    createClient().then(client=>{if(active)setSupabase(client)}).catch(error=>console.error('Unable to initialize Supabase:',error));
    return ()=>{active=false};
  },[]);

  useEffect(()=>{setOpen(false)},[path]);

  async function handleSignOut(){
    if(!supabase||signingOut)return;
    setSigningOut(true);
    const {error}=await supabase.auth.signOut();
    if(error){console.error('Sign out failed:',error);setSigningOut(false);return;}
    router.replace('/login');
    router.refresh();
  }

  const Nav=({mobile=false}:{mobile?:boolean})=>(
    <nav className={mobile?'space-y-1 p-4':'flex-1 space-y-1 p-4'}>
      {links.map(([href,label,Icon],index)=>{
        const active=path===href||path.startsWith(href+'/');
        return (
          <Link
            key={href}
            href={href}
            className={'nav-item group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 '+
              (active
                ? 'active bg-gradient-to-r from-indigo-50 to-cyan-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-sm')}
            style={{animationDelay:`${index*70}ms`}}
          >
            <span className={'grid h-9 w-9 place-items-center rounded-xl transition '+(active?'bg-white text-indigo-600 shadow-sm':'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600')}>
              <Icon size={18}/>
            </span>
            <span>{label}</span>
            {active&&<span className="ml-auto h-2 w-2 rounded-full bg-indigo-500 status-pulse"/>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200/70 bg-white/72 backdrop-blur-xl md:flex md:flex-col">
        <div className="relative overflow-hidden border-b border-slate-100/80 px-6 py-6">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-indigo-100/50 blur-2xl"/>
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-500 to-cyan-400 text-white shadow-lg shadow-indigo-200">
                <Sparkles size={18}/>
              </span>
              <div>
                <div className="text-xl font-black tracking-tight text-slate-900">Vendor<span className="gradient-text">Pay</span></div>
                <div className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-400">Payment control center</div>
              </div>
            </div>
          </div>
        </div>
        <Nav/>
        <div className="p-4">
          <button type="button" onClick={handleSignOut} disabled={!supabase||signingOut}
            className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-3.5 py-3 text-sm font-semibold text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 disabled:opacity-50">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-500 group-hover:bg-red-50 group-hover:text-red-600">
              {signingOut?<span className="spinner"/>:<LogOut size={18}/>}
            </span>
            {signingOut?'Signing out…':'Sign out'}
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/70 bg-white/78 px-4 py-3 shadow-sm backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-400 text-white"><Sparkles size={15}/></span>
          Vendor<span className="gradient-text">Pay</span>
        </Link>
        <button type="button" aria-label="Open menu" onClick={()=>setOpen(true)} className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <Menu size={20}/>
        </button>
      </div>

      {open&&(
        <div className="fixed inset-0 z-50 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={()=>setOpen(false)}/>
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm animate-[reveal_.35s_ease-out] bg-white/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-400 text-white"><Sparkles size={16}/></span>
                <div>
                  <div className="text-lg font-black text-slate-900">Vendor<span className="gradient-text">Pay</span></div>
                  <div className="text-[11px] uppercase tracking-[.12em] text-slate-400">Navigation</div>
                </div>
              </div>
              <button type="button" onClick={()=>setOpen(false)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><X size={19}/></button>
            </div>
            <Nav mobile/>
            <div className="border-t border-slate-100 p-4">
              <button type="button" onClick={handleSignOut} disabled={!supabase||signingOut}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-600 shadow-sm disabled:opacity-50">
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