import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import AppShell from '@/components/app-shell';
import StatCard from '@/components/stat-card';
import Link from 'next/link';

function days(d:string){
  return Math.floor((new Date(d+'T00:00:00').getTime()-new Date(new Date().toISOString().slice(0,10)+'T00:00:00').getTime())/86400000);
}
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);

export default async function Dashboard(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login');

  const {data:bills}=await supabase
    .from('bills')
    .select('id,bill_number,amount,due_date,status,paid_date,vendors(name)')
    .order('due_date',{ascending:true});

  const rows=bills??[];
  const pending=rows.filter((b:any)=>b.status==='pending');
  const overdue=pending.filter((b:any)=>days(b.due_date)<0);
  const due7=pending.filter((b:any)=>days(b.due_date)>=0&&days(b.due_date)<=7);
  const month=new Date().toISOString().slice(0,7);
  const cleared=rows.filter((b:any)=>b.status==='paid'&&b.paid_date?.slice(0,7)===month);
  const sum=(a:any[])=>a.reduce((s,b)=>s+Number(b.amount||0),0);

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-indigo-600">PAYMENT OVERVIEW</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">Your vendor liabilities at a glance.</p>
        </div>
        <Link href="/bills" className="btn btn-primary">+ Add Bill</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Payables Pending" value={money(sum(pending))} sub={`${pending.length} unpaid bills`}/>
        <StatCard label="Overdue Amount" value={money(sum(overdue))} sub={`${overdue.length} overdue`} tone="red"/>
        <StatCard label="Due in 7 Days" value={money(sum(due7))} sub={`${due7.length} bills`} tone="amber"/>
        <StatCard label="Cleared This Month" value={money(sum(cleared))} sub={`${cleared.length} paid`} tone="green"/>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="glass overflow-hidden rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">Payment urgency</h2>
            <Link href="/bills" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.slice(0,8).map((b:any)=>{
              const d=days(b.due_date);
              const status=b.status==='paid'?'Paid':d<0?'Overdue':d<=3?'Due Critical':d<=7?'Due Upcoming':'Safe';
              const cls=status==='Overdue'?'text-red-600':status==='Due Critical'?'text-amber-600':status==='Due Upcoming'?'text-yellow-600':status==='Paid'?'text-emerald-600':'text-slate-600';
              return (
                <div className="table-row flex items-center justify-between gap-4 p-4" key={b.id}>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{b.bill_number}</p>
                    <p className="truncate text-xs text-slate-500">{b.vendors?.name||'Vendor'} · Due {b.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-slate-900">{money(Number(b.amount))}</p>
                    <p className={`text-xs font-semibold ${cls}`}>{status}</p>
                  </div>
                </div>
              );
            })}
            {rows.length===0&&<div className="p-8 text-center text-slate-500">No bills yet. Add your first bill.</div>}
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-semibold text-slate-900">Aging snapshot</h2>
          <div className="mt-6 space-y-5">
            {[
              ['0–30 Days',pending.filter((b:any)=>{const d=-days(b.due_date);return d>=0&&d<=30})],
              ['31–60 Days',pending.filter((b:any)=>{const d=-days(b.due_date);return d>30&&d<=60})],
              ['60+ Days',pending.filter((b:any)=>-days(b.due_date)>60)]
            ].map(([label,list]:any)=>{
              const amount=sum(list);
              const width=Math.min(100,amount/Math.max(sum(pending),1)*100);
              return <div key={label}>
                <div className="flex justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-mono text-slate-900">{money(amount)}</span></div>
                <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{width:`${width}%`}}/></div>
              </div>;
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}