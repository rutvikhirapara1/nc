'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowDownToLine,CalendarDays,CheckCircle2,Clock3,FileText,Plus,Search,Trash2,Pencil,AlertTriangle} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import AppShell from '@/components/app-shell';
import Modal from '@/components/modal';
import ConfirmDialog from '@/components/confirm-dialog';
import type {Bill,Vendor} from '@/types/database';
import * as XLSX from 'xlsx';

type BillVendor={name:string};
type BillListItem=Omit<Bill,'user_id'|'created_at'|'vendors'> & {vendors:BillVendor|BillVendor[]|null};
type VendorListItem=Omit<Vendor,'user_id'|'created_at'>;

function due(billDate:string,days:number){
  const d=new Date(billDate+'T00:00:00');
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function dayDiff(date:string){
  return Math.floor((new Date(date+'T00:00:00').getTime()-new Date(new Date().toISOString().slice(0,10)+'T00:00:00').getTime())/86400000);
}
function money(n:number){
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);
}
function vendorName(b:BillListItem){
  const vendor=b.vendors;
  return Array.isArray(vendor) ? (vendor[0]?.name||'') : (vendor?.name||'');
}

const emptyForm={vendor_id:'',po_number:'',bill_number:'',bill_date:new Date().toISOString().slice(0,10),credit_period:30,amount:0,remarks:''};

export default function Bills(){
  const [bills,setBills]=useState<BillListItem[]>([]);
  const [vendors,setVendors]=useState<VendorListItem[]>([]);
  const [q,setQ]=useState('');
  const [vendorFilter,setVendorFilter]=useState('all');
  const [filter,setFilter]=useState('all');
  const [form,setForm]=useState(emptyForm);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [actionId,setActionId]=useState<string|null>(null);
  const [exporting,setExporting]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [confirmAction,setConfirmAction]=useState<
    | {type:'payment';bill:BillListItem;nextStatus:'paid'|'pending'}
    | {type:'delete';bill:BillListItem}
    | null
  >(null);

  async function load(){
    setLoading(true);
    const sb=await createClient();
    const [{data:b,error:billError},{data:v,error:vendorError}]=await Promise.all([
      sb.from('bills').select('id,vendor_id,po_number,bill_number,bill_date,credit_period,amount,remarks,due_date,status,paid_date,vendors(name)').order('due_date',{ascending:true}),
      sb.from('vendors').select('id,name,gst_number,contact_person,phone,email,default_credit_days,active').eq('active',true).order('name')
    ]);
    if(billError){console.error(billError);setError(billError.message)}
    if(vendorError){console.error(vendorError);setError(vendorError.message)}
    setBills((b||[]) as BillListItem[]);
    setVendors((v||[]) as VendorListItem[]);
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  function resetForm(){
    setEditing(null);
    setForm({...emptyForm,bill_date:new Date().toISOString().slice(0,10)});
    setShowForm(false);
    setError('');
  }

  function openAdd(){
    setEditing(null);
    setForm({...emptyForm,bill_date:new Date().toISOString().slice(0,10)});
    setError('');
    setShowForm(true);
  }

  function openEdit(b:BillListItem){
    setEditing(b.id);
    setForm({
      vendor_id:b.vendor_id,
      po_number:b.po_number||'',
      bill_number:b.bill_number,
      bill_date:b.bill_date,
      credit_period:Number(b.credit_period),
      amount:Number(b.amount),
      remarks:b.remarks||''
    });
    setError('');
    setShowForm(true);
  }

  const visible=useMemo(()=>bills.filter(b=>{
    const d=dayDiff(b.due_date);
    const text=(`${b.bill_number} ${b.po_number||''} ${vendorName(b)}`).toLowerCase();
    const matches=text.includes(q.toLowerCase());
    const matchesVendor=vendorFilter==='all'||b.vendor_id===vendorFilter;
    const f=filter==='all'||filter==='paid'&&b.status==='paid'||filter==='overdue'&&b.status==='pending'&&d<0||filter==='upcoming'&&b.status==='pending'&&d>=0&&d<=7;
    return matches&&matchesVendor&&f;
  }),[bills,q,vendorFilter,filter]);

  const stats=useMemo(()=>{
    const pending=bills.filter(b=>b.status==='pending');
    const overdue=pending.filter(b=>dayDiff(b.due_date)<0);
    const dueSoon=pending.filter(b=>dayDiff(b.due_date)>=0&&dayDiff(b.due_date)<=7);
    return {all:bills.length,pending:pending.length,overdue:overdue.length,dueSoon:dueSoon.length,total:pending.reduce((s,b)=>s+Number(b.amount||0),0)};
  },[bills]);

  async function save(e:React.FormEvent){
    e.preventDefault();
    if(saving)return;
    setSaving(true);
    setError('');
    try{
      const sb=await createClient();
      if(editing){
        const {error}=await sb.from('bills').update({
          ...form,
          due_date:due(form.bill_date,Number(form.credit_period))
        }).eq('id',editing);
        if(error)throw error;
      }else{
        const {data:{user}}=await sb.auth.getUser();
        if(!user)throw new Error('Your session has expired. Please sign in again.');
        const {error}=await sb.from('bills').insert({
          ...form,
          user_id:user.id,
          due_date:due(form.bill_date,Number(form.credit_period)),
          status:'pending'
        });
        if(error)throw error;
      }
      resetForm();
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to save bill.');
    }finally{setSaving(false)}
  }

  function requestToggle(b:BillListItem){
    if(actionId)return;
    setConfirmAction({
      type:'payment',
      bill:b,
      nextStatus:b.status==='paid'?'pending':'paid'
    });
  }

  function requestDelete(b:BillListItem){
    if(actionId)return;
    setConfirmAction({type:'delete',bill:b});
  }

  async function confirmActionRun(){
    if(!confirmAction||actionId)return;
    const bill=confirmAction.bill;
    setActionId(bill.id);
    setError('');

    try{
      const sb=await createClient();

      if(confirmAction.type==='delete'){
        const {error}=await sb.from('bills').delete().eq('id',bill.id);
        if(error)throw error;
      }else{
        const nextStatus=confirmAction.nextStatus;
        const {error}=await sb.from('bills').update({
          status:nextStatus,
          paid_date:nextStatus==='paid'?new Date().toISOString().slice(0,10):null
        }).eq('id',bill.id);
        if(error)throw error;
      }

      setConfirmAction(null);
      await load();
    }catch(err){
      setError(
        err instanceof Error
          ? err.message
          : confirmAction.type==='delete'
            ? 'Unable to delete bill.'
            : 'Unable to update payment status.'
      );
    }finally{
      setActionId(null);
    }
  }

  async function exportXlsx(){
    if(exporting)return;
    setExporting(true);
    try{
      const data=visible.map(b=>({
        Vendor:vendorName(b),
        Bill_Number:b.bill_number,
        PO_Number:b.po_number||'',
        Bill_Date:b.bill_date,
        Credit_Days:b.credit_period,
        Due_Date:b.due_date,
        Amount:Number(b.amount),
        Status:b.status,
        Paid_Date:b.paid_date||'',
        Remarks:b.remarks||''
      }));
      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'Bills');
      XLSX.writeFile(wb,'vendor-bills.xlsx');
    }finally{setExporting(false)}
  }

  const statusFor=(b:BillListItem)=>{
    const d=dayDiff(b.due_date);
    return b.status==='paid'?'Paid':d<0?'Overdue':d<=3?'Due Critical':d<=7?'Due Soon':'On Track';
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-indigo-600">Accounts payable</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Bills & Payments</h1>
          <p className="mt-1 text-sm text-slate-500">Capture invoices, monitor deadlines and close payments.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-muted inline-flex items-center justify-center gap-2" onClick={exportXlsx} disabled={exporting}>
            {exporting?<span className="spinner"/>:<ArrowDownToLine size={16}/>}
            {exporting?'Preparing…':'Export Excel'}
          </button>
          <button type="button" className="btn btn-primary inline-flex items-center justify-center gap-2" onClick={openAdd}><Plus size={17}/> Add Bill</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><FileText size={15}/> Total bills</div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.all}</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-700"><Clock3 size={15}/> Pending</div>
          <p className="mt-2 text-2xl font-bold text-indigo-900">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-red-700"><AlertTriangle size={15}/> Overdue</div>
          <p className="mt-2 text-2xl font-bold text-red-900">{stats.overdue}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700"><CheckCircle2 size={15}/> Pending value</div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{money(stats.total)}</p>
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input className="input pl-10" placeholder="Search bill, PO or vendor…" value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
            <select
              className="input w-full lg:w-64"
              value={vendorFilter}
              onChange={e=>setVendorFilter(e.target.value)}
              aria-label="Filter bills by vendor"
            >
              <option value="all">All Vendors</option>
              {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[['all','All'],['overdue','Overdue'],['upcoming','Due in 7 days'],['paid','Paid']].map(([v,l])=>(
              <button type="button" key={v} onClick={()=>setFilter(v)} className={'btn shrink-0 text-xs '+(filter===v?'bg-indigo-50 text-indigo-700 border border-indigo-100':'btn-muted')}>{l}</button>
            ))}
          </div>
        </div>

        {error&&!showForm&&<div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="grid gap-3 p-4">
            {[1,2,3,4,5].map(i=><div key={i} className="h-20 rounded-2xl skeleton"/> )}
          </div>
        ) : visible.length===0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><FileText size={22}/></div>
            <h3 className="mt-4 font-semibold text-slate-900">No bills match</h3>
            <p className="mt-1 text-sm text-slate-500">Try another search or add a new bill.</p>
            <button type="button" className="btn btn-primary mt-4" onClick={openAdd}>Add Bill</button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Bill</th>
                    <th className="px-5 py-3 font-semibold">Vendor</th>
                    <th className="px-5 py-3 font-semibold">Due date</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map(b=>{
                    const status=statusFor(b);
                    const danger=status==='Overdue';
                    const cls=status==='Paid'?'bg-emerald-50 text-emerald-700':danger?'bg-red-50 text-red-700':status==='Due Critical'?'bg-amber-50 text-amber-700':status==='Due Soon'?'bg-yellow-50 text-yellow-700':'bg-slate-100 text-slate-600';
                    return <tr key={b.id} className="table-row">
                      <td className="px-5 py-4"><p className="font-semibold text-slate-900">{b.bill_number}</p><p className="mt-0.5 text-xs text-slate-500">{b.po_number||'No PO'} · {b.bill_date}</p></td>
                      <td className="px-5 py-4 text-slate-700">{vendorName(b)||'—'}</td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2 text-slate-700"><CalendarDays size={15} className="text-slate-400"/>{b.due_date}</div><span className={'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold '+cls}>{status}</span></td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">{money(Number(b.amount))}</td>
                      <td className="px-5 py-4"><span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold '+(b.status==='paid'?'bg-emerald-50 text-emerald-700':'bg-indigo-50 text-indigo-700')}>{b.status==='paid'?'Paid':'Pending'}</span></td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-muted inline-flex items-center gap-1.5 text-xs" onClick={()=>openEdit(b)}><Pencil size={14}/> Edit</button>
                        <button type="button" className="btn btn-muted text-xs" disabled={!!actionId} onClick={()=>requestToggle(b)}>{actionId===b.id?'Updating…':b.status==='paid'?'Mark Pending':'Mark Paid'}</button>
                        <button type="button" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50" disabled={!!actionId} onClick={()=>requestDelete(b)} aria-label="Delete bill"><Trash2 size={14}/></button>
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {visible.map(b=>{
                const status=statusFor(b);
                const cls=status==='Paid'?'bg-emerald-50 text-emerald-700':status==='Overdue'?'bg-red-50 text-red-700':status==='Due Critical'?'bg-amber-50 text-amber-700':status==='Due Soon'?'bg-yellow-50 text-yellow-700':'bg-slate-100 text-slate-600';
                return <article key={b.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{b.bill_number}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{vendorName(b)||'Vendor'} · {b.po_number||'No PO'}</p>
                    </div>
                    <span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold '+cls}>{status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                    <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Amount</p><p className="mt-1 font-semibold text-slate-900">{money(Number(b.amount))}</p></div>
                    <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Due</p><p className="mt-1 font-medium text-slate-700">{b.due_date}</p></div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button type="button" className="btn btn-muted inline-flex items-center justify-center gap-1 text-xs" onClick={()=>openEdit(b)}><Pencil size={14}/> Edit</button>
                    <button type="button" className="btn btn-primary text-xs" disabled={!!actionId} onClick={()=>requestToggle(b)}>{actionId===b.id?'…':b.status==='paid'?'Pending':'Mark paid'}</button>
                    <button type="button" className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50" disabled={!!actionId} onClick={()=>requestDelete(b)} aria-label="Delete bill"><Trash2 size={15} className="mx-auto"/></button>
                  </div>
                </article>;
              })}
            </div>
          </>
        )}
      </section>

      <Modal open={showForm} onClose={resetForm} title={editing?'Edit bill':'Add a new bill'} description="Record invoice details and let VendorPay calculate the due date." wide>
        <form onSubmit={save} className="space-y-5">
          {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="field-label">Vendor *</span><select className="input mt-1.5" value={form.vendor_id} onChange={e=>setForm({...form,vendor_id:e.target.value})} required disabled={saving}><option value="">Select vendor</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
            <label><span className="field-label">Bill / invoice number *</span><input className="input mt-1.5" placeholder="INV-1001" value={form.bill_number} onChange={e=>setForm({...form,bill_number:e.target.value})} required disabled={saving}/></label>
            <label><span className="field-label">PO number</span><input className="input mt-1.5" placeholder="PO-2026-001" value={form.po_number} onChange={e=>setForm({...form,po_number:e.target.value})} disabled={saving}/></label>
            <label><span className="field-label">Bill date *</span><input className="input mt-1.5" type="date" value={form.bill_date} onChange={e=>setForm({...form,bill_date:e.target.value})} required disabled={saving}/></label>
            <label><span className="field-label">Credit period</span><div className="relative mt-1.5"><input className="input pr-16" type="number" min="0" value={form.credit_period} onChange={e=>setForm({...form,credit_period:Number(e.target.value)})} disabled={saving}/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">days</span></div></label>
            <label><span className="field-label">Amount *</span><input className="input mt-1.5" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})} required disabled={saving}/></label>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600"><CalendarDays size={15}/> Calculated due date</div>
              <div className="mt-1 text-xl font-bold text-indigo-950">{due(form.bill_date,Number(form.credit_period))}</div>
            </div>
            <label className="sm:col-span-2"><span className="field-label">Remarks</span><textarea className="input mt-1.5 min-h-24" placeholder="Optional notes…" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} disabled={saving}/></label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-muted" onClick={resetForm} disabled={saving}>Cancel</button>
            <button className="btn btn-primary inline-flex items-center justify-center gap-2" disabled={saving}>
              {saving&&<span className="spinner"/>}
              {saving?(editing?'Updating…':'Saving…'):(editing?'Save changes':'Create bill')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        action={confirmAction ? (
          confirmAction.type==='delete'
            ? {type:'delete',billNumber:confirmAction.bill.bill_number}
            : {type:'payment',billNumber:confirmAction.bill.bill_number,nextStatus:confirmAction.nextStatus}
        ) : null}
        loading={!!actionId}
        onCancel={()=>{if(!actionId)setConfirmAction(null)}}
        onConfirm={confirmActionRun}
      />
    </AppShell>
  );
}