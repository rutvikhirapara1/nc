'use client';

import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(loading) return;
    setLoading(true);
    setError('');
    try{
      const supabase=await createClient();
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error) setError(error.message);
      else router.replace('/dashboard');
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to sign in. Please try again.');
    }finally{
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden grid place-items-center bg-slate-50 p-6">
      <div className="hero-orb one"/><div className="hero-orb two"/><div className="relative z-10 w-full max-w-md float-in">
        <div className="mb-5 text-center">
          <div className="text-2xl font-black tracking-tight text-slate-900">Vendor<span className="text-indigo-600">Pay</span></div>
          <p className="mt-1 text-sm text-slate-500">Payment control center</p>
        </div>
        <div className="glass shimmer-border interactive-card rounded-[2rem] p-8">
          <div className="mb-8">
            <p className="font-semibold text-indigo-600">WELCOME BACK</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in to your account</h1>
            <p className="mt-2 text-sm text-slate-500">Track bills, due dates and vendor payables.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <input className="input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
            {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button className="btn btn-primary flex w-full items-center justify-center gap-2" disabled={loading}>
              {loading&&<span className="spinner"/>}
              {loading?'Signing in…':'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-500">New here? <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/signup">Create an account</Link></p>
        </div>
      </div>
    </main>
  );
}