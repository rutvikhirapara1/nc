'use client';

import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import AppShell from '@/components/app-shell';
import type {Vendor} from '@/types/database';

const emptyForm={name:'',gst_number:'',contact_person:'',phone:'',email:'',default_credit_days:30};

export default function Vendors(){
  const [vendors,setVendors]=useState<Vendor[]>([]);
  const [q,setQ]=useState('');
  const [form,setForm]=useState(emptyForm);
  const [editing,setEditing]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [actionId,setActionId]=useState<string|null>(null);

  async function load(){
    const sb=await createClient();
    const {data,error}=await sb.from('vendors').select('id,name,gst_number,contact_person,phone,email,default_credit_days,active').order('name');
    if(error) console.error(error);
    setVendors((data||[]) as Vendor[]);
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  function resetForm(){setEditing(null);setForm(emptyForm)}

  async function save(e:React.FormEvent){
    e.preventDefault();
    if(saving) return;
    setSaving(true);
    try{
      const sb=await createClient();
      if(editing){
        const {error}=await sb.from('vendors').update(form).eq('id',editing);
        if(error) throw error;
      }else{
        const {data:{user}}=await sb.auth.getUser();
        if(!user) return;
        const {error}=await sb.from('vendors').insert({...form,user_id:user.id});
        if(error) throw error;
      }
      resetForm();
      await load();
    }catch(error){console.error('Vendor save failed:',error)}
    finally{setSaving(false)}
  }

  async function archive(id:string){
    if(actionId) return;
    setActionId(id);
    try{
      const sb=await createClient();
      const {error}=await sb.from('vendors').update({active:false}).eq('id',id);
      if(error) throw error;
      await load();
    }catch(error){console.error('Vendor archive failed:',error)}
    finally{setActionId(null)}
  }

  const filtered=vendors.filter(v=>v.active&&
    (`${v.name} ${v.gst_number||''} ${v.phone||''} ${v.contact_person||''}`).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Vendors</h1>
        <p className="mt-1 text-slate-500">Manage your vendor directory.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={save} className="glass h-fit rounded-2xl p-5 space-y-3">
          <div>
            <h2 className="font-semibold text-slate-900">{editing?'Edit Vendor':'Add Vendor'}</h2>
            <p className="mt-1 text-xs text-slate-500">Keep payment contact details up to date.</p>
          </div>

          {[
            ['name','Vendor name',true],
            ['gst_number','GST number',false],
            ['contact_person','Contact person',false],
            ['phone','Phone',false],
            ['email','Email',false]
          ].map(([key,ph,req])=>(
            <input
              key={key as string}
              className="input"
              placeholder={ph as string}
              required={!!req}
              value={(form as any)[key as string]}
              onChange={e=>setForm({...form,[key as string]:e.target.value})}
            />
          ))}

          <input className="input" type="number" min="0" placeholder="Default credit days" value={form.default_credit_days} onChange={e=>setForm({...form,default_credit_days:Number(e.target.value)})}/>

          <div className="flex gap-2">
            <button className="btn btn-primary flex flex-1 items-center justify-center gap-2" disabled={saving}>
              {saving&&<span className="spinner"/>}
              {saving?(editing?'Updating…':'Saving…'):(editing?'Update Vendor':'Add Vendor')}
            </button>
            {editing&&<button type="button" className="btn btn-muted" onClick={resetForm} disabled={saving}>Cancel</button>}
          </div>
        </form>

        <section className="glass overflow-hidden rounded-2xl xl:col-span-2">
          <div className="border-b border-slate-100 p-4">
            <input className="input" placeholder="Search vendor…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1,2,3,4].map(i=><div key={i} className="h-16 rounded-xl skeleton"/> )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(v=>(
                <div key={v.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{v.name}</p>
                    <p className="truncate text-xs text-slate-500">{v.contact_person||'No contact'} · {v.phone||'No phone'} · {v.default_credit_days} days</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="btn btn-muted text-sm" onClick={()=>{setEditing(v.id);setForm({name:v.name,gst_number:v.gst_number||'',contact_person:v.contact_person||'',phone:v.phone||'',email:v.email||'',default_credit_days:v.default_credit_days})}}>Edit</button>
                    <button className="btn text-sm bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 disabled:opacity-50" disabled={!!actionId} onClick={()=>archive(v.id)}>
                      {actionId===v.id?'Archiving…':'Archive'}
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length===0&&<div className="p-8 text-center text-slate-500">No vendors found.</div>}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}