'use client';

import {useEffect,useMemo,useState} from 'react';
import {Search,Plus,Building2,Phone,Mail,MapPin,MoreHorizontal,Pencil,Archive,UsersRound} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import AppShell from '@/components/app-shell';
import Modal from '@/components/modal';
import ConfirmDialog from '@/components/confirm-dialog';
import type {Vendor} from '@/types/database';

type VendorListItem=Omit<Vendor,'user_id'|'created_at'>;
const emptyForm={name:'',gst_number:'',contact_person:'',phone:'',email:'',default_credit_days:30};

export default function Vendors(){
  const [vendors,setVendors]=useState<VendorListItem[]>([]);
  const [q,setQ]=useState('');
  const [form,setForm]=useState(emptyForm);
  const [editing,setEditing]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [actionId,setActionId]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [confirmVendor,setConfirmVendor]=useState<VendorListItem|null>(null);

  async function load(){
    setLoading(true);
    const sb=await createClient();
    const {data,error:loadError}=await sb.from('vendors')
      .select('id,name,gst_number,contact_person,phone,email,default_credit_days,active')
      .order('name');
    if(loadError){console.error(loadError);setError(loadError.message)}
    setVendors((data||[]) as VendorListItem[]);
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  function resetForm(){
    setEditing(null);
    setForm(emptyForm);
    setShowForm(false);
    setError('');
  }

  function openAdd(){
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(v:VendorListItem){
    setEditing(v.id);
    setForm({
      name:v.name,
      gst_number:v.gst_number||'',
      contact_person:v.contact_person||'',
      phone:v.phone||'',
      email:v.email||'',
      default_credit_days:v.default_credit_days
    });
    setError('');
    setShowForm(true);
  }

  async function save(e:React.FormEvent){
    e.preventDefault();
    if(saving)return;
    setSaving(true);
    setError('');
    try{
      const sb=await createClient();
      if(editing){
        const {error}=await sb.from('vendors').update(form).eq('id',editing);
        if(error)throw error;
      }else{
        const {data:{user}}=await sb.auth.getUser();
        if(!user)throw new Error('Your session has expired. Please sign in again.');
        const {error}=await sb.from('vendors').insert({...form,user_id:user.id});
        if(error)throw error;
      }
      resetForm();
      setConfirmVendor(null);
      await load();
    }catch(err){
      const message=err instanceof Error?err.message:'Unable to save vendor.';
      setError(message);
    }finally{setSaving(false)}
  }

  function requestArchive(v:VendorListItem){
    if(actionId)return;
    setConfirmVendor(v);
  }

  async function archive(){
    if(!confirmVendor||actionId)return;
    const id=confirmVendor.id;
    setActionId(id);
    setError('');
    try{
      const sb=await createClient();
      const {error}=await sb.from('vendors').update({active:false}).eq('id',id);
      if(error)throw error;
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to archive vendor.');
    }finally{setActionId(null)}
  }

  const filtered=useMemo(()=>vendors.filter(v=>v.active&&
    (`${v.name} ${v.gst_number||''} ${v.phone||''} ${v.contact_person||''} ${v.email||''}`)
      .toLowerCase().includes(q.toLowerCase())
  ),[vendors,q]);

  return (
    <AppShell>
      <div className="mb-6 reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-indigo-600">Directory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">One clean place for your vendor contacts and payment terms.</p>
        </div>
        <button type="button" className="btn btn-primary inline-flex items-center justify-center gap-2" onClick={openAdd}>
          <Plus size={17}/> Add Vendor
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="interactive-card soft-card rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><UsersRound size={15}/> Active vendors</div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{filtered.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">With GST details</div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{filtered.filter(v=>!!v.gst_number).length}</p>
        </div>
        <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:block">
          <div className="text-xs font-medium text-slate-500">Average credit period</div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{filtered.length?Math.round(filtered.reduce((n,v)=>n+Number(v.default_credit_days||0),0)/filtered.length):0}<span className="ml-1 text-sm font-medium text-slate-400">days</span></p>
        </div>
      </div>

      <section className="soft-card interactive-card overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Vendor directory</h2>
            <p className="text-xs text-slate-500">Search by name, GST, contact or phone.</p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="input pl-10" placeholder="Search vendors…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>

        {error&&!showForm&&<div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {[1,2,3,4].map(i=><div key={i} className="h-32 rounded-2xl skeleton"/> )}
          </div>
        ) : filtered.length===0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Building2 size={22}/></div>
            <h3 className="mt-4 font-semibold text-slate-900">No vendors found</h3>
            <p className="mt-1 text-sm text-slate-500">Create your first vendor to start tracking bills.</p>
            <button type="button" onClick={openAdd} className="btn btn-primary mt-4">Add first vendor</button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Vendor</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">GST</th>
                    <th className="px-5 py-3 font-semibold">Credit</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(v=>(
                    <tr key={v.id} className="table-row">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{v.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{v.email||'No email'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700">{v.contact_person||'—'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{v.phone||'No phone'}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{v.gst_number||'—'}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{v.default_credit_days} days</span></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="btn btn-muted inline-flex items-center gap-1.5 text-xs" onClick={()=>openEdit(v)}><Pencil size={14}/> Edit</button>
                          <button type="button" className="btn inline-flex items-center gap-1.5 border border-red-100 bg-red-50 text-xs text-red-700 hover:bg-red-100" disabled={!!actionId} onClick={()=>requestArchive(v)}>
                            <Archive size={14}/>{actionId===v.id?'Archiving…':'Archive'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {filtered.map(v=>(
                <article key={v.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{v.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{v.contact_person||'No contact'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{v.default_credit_days}d</span>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-slate-600">
                    {v.phone&&<div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/>{v.phone}</div>}
                    {v.email&&<div className="flex items-center gap-2 truncate"><Mail size={14} className="text-slate-400"/>{v.email}</div>}
                    {v.gst_number&&<div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/>{v.gst_number}</div>}
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button type="button" className="btn btn-muted flex flex-1 items-center justify-center gap-1.5 text-xs" onClick={()=>openEdit(v)}><Pencil size={14}/> Edit</button>
                    <button type="button" className="btn flex flex-1 items-center justify-center gap-1.5 border border-red-100 bg-red-50 text-xs text-red-700" disabled={!!actionId} onClick={()=>archive(v.id)}><Archive size={14}/>{actionId===v.id?'…':'Archive'}</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal
        open={showForm}
        onClose={resetForm}
        title={editing?'Edit vendor':'Add a new vendor'}
        description="Keep the basic contact and payment terms together."
        wide
      >
        <form onSubmit={save} className="space-y-5">
          {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="field-label">Vendor name *</span><input className="input mt-1.5" placeholder="e.g. ABC Furniture Pvt. Ltd." required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
            <label><span className="field-label">GST number</span><input className="input mt-1.5" placeholder="GSTIN" value={form.gst_number} onChange={e=>setForm({...form,gst_number:e.target.value})}/></label>
            <label><span className="field-label">Contact person</span><input className="input mt-1.5" placeholder="Full name" value={form.contact_person} onChange={e=>setForm({...form,contact_person:e.target.value})}/></label>
            <label><span className="field-label">Phone</span><input className="input mt-1.5" inputMode="tel" placeholder="+91 ..." value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
            <label><span className="field-label">Email</span><input className="input mt-1.5" type="email" placeholder="billing@vendor.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
            <label><span className="field-label">Default credit period</span><div className="relative mt-1.5"><input className="input pr-16" type="number" min="0" value={form.default_credit_days} onChange={e=>setForm({...form,default_credit_days:Number(e.target.value)})}/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">days</span></div></label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-muted" onClick={resetForm} disabled={saving}>Cancel</button>
            <button className="btn btn-primary inline-flex items-center justify-center gap-2" disabled={saving}>
              {saving&&<span className="spinner"/>}
              {saving?(editing?'Updating…':'Saving…'):(editing?'Save changes':'Create vendor')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        action={confirmVendor?{type:'archiveVendor',vendorName:confirmVendor.name}:null}
        loading={!!actionId}
        onCancel={()=>{if(!actionId)setConfirmVendor(null)}}
        onConfirm={archive}
      />
    </AppShell>
  );
}