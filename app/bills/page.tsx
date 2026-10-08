'use client';

import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import AppShell from '@/components/app-shell';
import type {Bill,Vendor} from '@/types/database';
import * as XLSX from 'xlsx';

function due(billDate:string,days:number){
  const d=new Date(billDate+'T00:00:00');
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function dayDiff(date:string){
  return Math.floor((new Date(date+'T00:00:00').getTime()-new Date(new Date().toISOString().slice(0,10)+'T00:00:00').getTime())/86400000);
}

const emptyForm={vendor_id:'',po_number:'',bill_number:'',bill_date:new Date().toISOString().slice(0,10),credit_period:30,amount:0,remarks:''};

export default function Bills(){
  const [bills,setBills]=useState<Bill[]>([]);
  const [vendors,setVendors]=useState<Vendor[]>([]);
  const [q,setQ]=useState('');
  const [filter,setFilter]=useState('all');
  const [form,setForm]=useState(emptyForm);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [actionId,setActionId]=useState<string|null>(null);
  const [exporting,setExporting]=useState(false);

  async function load(){
    const sb=await createClient();
    const [{data:b,error:billError},{data:v,error:vendorError}]=await Promise.all([
      sb.from('bills').select('id,vendor_id,po_number,bill_number,bill_date,credit_period,amount,remarks,due_date,status,paid_date,vendors(name)').order('due_date',{ascending:true}),
      sb.from('vendors').select('id,name,gst_number,contact_person,phone,email,default_credit_days,active').eq('active',true).order('name')
    ]);
    if(billError) console.error(billError);
    if(vendorError) console.error(vendorError);
    setBills((b||[]) as Bill[]);
    setVendors((v||[]) as Vendor[]);
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  const visible=useMemo(()=>bills.filter(b=>{
    const d=dayDiff(b.due_date);
    const text=(`${b.bill_number} ${b.po_number||''} ${(b as any).vendors?.name||''}`).toLowerCase();
    const matches=text.includes(q.toLowerCase());
    const f=filter==='all'||filter==='paid'&&b.status==='paid'||filter==='overdue'&&b.status==='pending'&&d<0||filter==='upcoming'&&b.status==='pending'&&d>=0&&d<=7;
    return matches&&f;
  }),[bills,q,filter]);

  async function add(e:React.FormEvent){
    e.preventDefault();
    if(saving) return;
    setSaving(true);
    try{
      const sb=await createClient();
      const {data:{user}}=await sb.auth.getUser();
      if(!user) return;
      const {error}=await sb.from('bills').insert({
        ...form,
        user_id:user.id,
        due_date:due(form.bill_date,Number(form.credit_period)),
        status:'pending'
      });
      if(error) throw error;
      setForm({...emptyForm,bill_date:new Date().toISOString().slice(0,10)});
      await load();
    }catch(error){console.error('Bill save failed:',error)}
    finally{setSaving(false)}
  }

  async function toggle(b:Bill){
    if(actionId) return;
    setActionId(b.id);
    try{
      const sb=await createClient();
      const {error}=await sb.from('bills').update({
        status:b.status==='paid'?'pending':'paid',
        paid_date:b.status==='pending'?new Date().toISOString().slice(0,10):null
      }).eq('id',b.id);
      if(error) throw error;
      await load();
    }catch(error){console.error('Payment update failed:',error)}
    finally{setActionId(null)}
  }

  async function exportXlsx(){
    if(exporting) return;
    setExporting(true);
    try{
      const data=visible.map(b=>({
        Vendor:(b as any).vendors?.name||'',
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

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bills & Payments</h1>
          <p className="mt-1 text-slate-500">Track invoices and payment deadlines.</p>
        </div>
        <button className="btn btn-muted flex items-center gap-2" onClick={exportXlsx} disabled={exporting}>
          {exporting&&<span className="spinner"/>}
          {exporting?'Preparing…':'Export Excel'}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        <form onSubmit={add} className="glass h-fit space-y-3 rounded-2xl p-5">
          <div>
            <h2 className="font-semibold text-slate-900">Add Bill</h2>
            <p className="mt-1 text-xs text-slate-500">Due date is calculated automatically.</p>
          </div>

          <select className="input" value={form.vendor_id} onChange={e=>setForm({...form,vendor_id:e.target.value})} required disabled={loading||saving}>
            <option value="">Select vendor</option>
            {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input className="input" placeholder="PO number" value={form.po_number} onChange={e=>setForm({...form,po_number:e.target.value})} disabled={saving}/>
          <input className="input" placeholder="Bill / invoice number" value={form.bill_number} onChange={e=>setForm({...form,bill_number:e.target.value})} required disabled={saving}/>
          <input className="input" type="date" value={form.bill_date} onChange={e=>setForm({...form,bill_date:e.target.value})} required disabled={saving}/>

          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" min="0" placeholder="Credit days" value={form.credit_period} onChange={e=>setForm({...form,credit_period:Number(e.target.value)})} disabled={saving}/>
            <input className="input" type="number" min="0" step="0.01" placeholder="Amount ₹" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})} required disabled={saving}/>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
            Due date: <strong>{due(form.bill_date,Number(form.credit_period))}</strong>
          </div>

          <textarea className="input min-h-20" placeholder="Remarks" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} disabled={saving}/>

          <button className="btn btn-primary flex w-full items-center justify-center gap-2" disabled={saving||loading}>
            {saving&&<span className="spinner"/>}
            {saving?'Saving bill…':'Add Bill'}
          </button>
        </form>

        <section className="glass overflow-hidden rounded-2xl xl:col-span-3">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
            <input className="input" placeholder="Search bill / vendor / PO…" value={q} onChange={e=>setQ(e.target.value)}/>
            <div className="flex flex-wrap gap-2">
              {[['all','All'],['overdue','Overdue'],['upcoming','Due in 7 Days'],['paid','Paid']].map(([v,l])=>(
                <button type="button" key={v} onClick={()=>setFilter(v)} className={'btn text-sm '+(filter===v?'bg-indigo-50 text-indigo-700 border border-indigo-100':'btn-muted')}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1,2,3,4,5].map(i=><div key={i} className="h-14 rounded-xl skeleton"/> )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 text-left">Bill</th>
                    <th className="p-4 text-left">Vendor</th>
                    <th className="p-4 text-left">Due</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map(b=>{
                    const d=dayDiff(b.due_date);
                    const status=b.status==='paid'?'Paid':d<0?'Overdue':d<=3?'Due Critical':d<=7?'Due Upcoming':'Safe';
                    const cls=status==='Overdue'?'text-red-600':status==='Due Critical'?'text-amber-600':status==='Due Upcoming'?'text-yellow-600':status==='Paid'?'text-emerald-600':'text-slate-600';
                    return <tr className="table-row" key={b.id}>
                      <td className="p-4"><div className="font-medium text-slate-900">{b.bill_number}</div><div className="text-xs text-slate-500">{b.po_number||'No PO'}</div></td>
                      <td className="p-4 text-slate-700">{(b as any).vendors?.name}</td>
                      <td className="p-4"><div className="text-slate-700">{b.due_date}</div><div className={'text-xs font-semibold '+cls}>{status}</div></td>
                      <td className="p-4 text-right font-mono text-slate-900">₹{Number(b.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                      <td className={'p-4 font-semibold '+cls}>{b.status}</td>
                      <td className="p-4 text-right">
                        <button className="btn btn-muted flex items-center gap-2 text-xs ml-auto" disabled={!!actionId} onClick={()=>toggle(b)}>
                          {actionId===b.id&&<span className="spinner"/>}
                          {b.status==='paid'?'Mark Pending':'Mark Paid'}
                        </button>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {visible.length===0&&<div className="p-10 text-center text-slate-500">No bills match your filters.</div>}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}