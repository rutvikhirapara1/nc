'use client';

import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import Link from 'next/link';

export default function Signup(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);
  const [loading,setLoading]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(loading) return;
    setLoading(true);
    setError('');
    try{
      const supabase=await createClient();
      const {error}=await supabase.auth.signUp({email,password});
      if(error) setError(error.message);
      else setDone(true);
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to create account.');
    }finally{
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="text-2xl font-black tracking-tight text-slate-900">Vendor<span className="text-indigo-600">Pay</span></div>
          <p className="mt-1 text-sm text-slate-500">Payment control center</p>
        </div>

        <div className="glass rounded-3xl p-8">
          <p className="font-semibold text-indigo-600">GET STARTED</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500">Start managing vendors, bills and payment deadlines.</p>

          {done ? (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Account created. Check your email if confirmation is enabled, then sign in.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <input className="input" type="email" autoComplete="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
              <input className="input" type="password" minLength={6} autoComplete="new-password" placeholder="Password (6+ characters)" value={password} onChange={e=>setPassword(e.target.value)} required/>
              {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <button className="btn btn-primary flex w-full items-center justify-center gap-2" disabled={loading}>
                {loading&&<span className="spinner"/>}
                {loading?'Creating account…':'Create account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-slate-500">Already registered? <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/login">Sign in</Link></p>
        </div>
      </div>
    </main>
  );
}