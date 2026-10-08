import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import AppShell from '@/components/app-shell';
import StatCard from '@/components/stat-card';
import Link from 'next/link';
import {ArrowRight,AlertTriangle,CalendarClock,CheckCircle2,IndianRupee} from 'lucide-react';

function days(d:string){
  return Math.floor((new Date(d+'T00:00:00').getTime()-new Date(new Date().toISOString().slice(0,10)+'T00:00:00').getTime())/86400000);
}
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);

function urgencyMeta(status:string){
  if(status==='Overdue') return {label:'Overdue',dot:'bg-red-500',badge:'bg-red-50 text-red-700 border-red-100',icon:AlertTriangle};
  if(status==='Due Critical') return {label:'Due in 3 days',dot:'bg-amber-500',badge:'bg-amber-50 text-amber-700 border-amber-100',icon:CalendarClock};
  if(status==='Due Soon') return {label:'Due this week',dot:'bg-yellow-500',badge:'bg-yellow-50 text-yellow-700 border-yellow-100',icon:CalendarClock};
  if(status==='Paid') return {label:'Paid',dot:'bg-emerald-500',badge:'bg-emerald-50 text-emerald-700 border-emerald-100',icon:CheckCircle2};
  return {label:'On track',dot:'bg-slate-400',badge:'bg-slate-50 text-slate-600 border-slate-100',icon:CheckCircle2};
}

export default async function Dashboard(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/login');

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
  const urgent=[...rows].sort((a:any,b:any)=>days(a.due_date)-days(b.due_date)).slice(0,7);

  return (
    <AppShell>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-indigo-600">Overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Payment dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">A quick view of what needs attention today.</p>
        </div>
        <Link href="/bills" className="btn btn-primary inline-flex items-center justify-center gap-2">Add bill <ArrowRight size={16}/></Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending payables" value={money(sum(pending))} sub={pending.length+' unpaid bills'}/>
        <StatCard label="Overdue amount" value={money(sum(overdue))} sub={overdue.length+' need attention'} tone="red"/>
        <StatCard label="Due in 7 days" value={money(sum(due7))} sub={due7.length+' bills'} tone="amber"/>
        <StatCard label="Cleared this month" value={money(sum(cleared))} sub={cleared.length+' payments'} tone="green"/>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.65fr_.85fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500"/>
                  <h2 className="font-bold text-slate-900">Payment urgency</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">Prioritized by nearest due date so important items stay visible.</p>
              </div>
              <Link href="/bills" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all bills</Link>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {urgent.map((b:any)=>{
              const d=days(b.due_date);
              const status=b.status==='paid'?'Paid':d<0?'Overdue':d<=3?'Due Critical':d<=7?'Due Soon':'On Track';
              const meta=urgencyMeta(status);
              const Icon=meta.icon;
              let dueText='Due in '+d+' days';
              if(b.status==='paid') dueText=b.paid_date?'Paid '+b.paid_date:'Paid';
              else if(d<0) dueText=Math.abs(d)+' day'+(Math.abs(d)===1?'':'s')+' overdue';
              else if(d===0) dueText='Due today';
              else if(d===1) dueText='Due tomorrow';

              return (
                <div key={b.id} className="flex items-center gap-3 p-4 transition hover:bg-slate-50 sm:gap-4 sm:p-5">
                  <div className="relative shrink-0">
                    <div className={'grid h-10 w-10 place-items-center rounded-2xl '+(status==='Overdue'?'bg-red-50 text-red-600':status==='Paid'?'bg-emerald-50 text-emerald-600':'bg-indigo-50 text-indigo-600')}>
                      <Icon size={18}/>
                    </div>
                    <span className={'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white '+meta.dot}/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <p className="truncate font-semibold text-slate-900">{b.bill_number}</p>
                      <span className={'w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold '+meta.badge}>{meta.label}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{b.vendors?.name||'Vendor'} · {dueText}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-slate-900">{money(Number(b.amount))}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{b.due_date}</p>
                  </div>
                </div>
              );
            })}
            {urgent.length===0&&<div className="p-10 text-center text-sm text-slate-500">No bills yet. Add your first bill to start tracking payment urgency.</div>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Aging snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">How much is sitting past due.</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><IndianRupee size={18}/></div>
          </div>

          <div className="mt-7 space-y-6">
{[
  ['0–30 days',pending.filter((b:any)=>{const d=-days(b.due_date);return d>=0&&d<=30})],
  ['31–60 days',pending.filter((b:any)=>{const d=-days(b.due_date);return d>30&&d<=60})],
  ['60+ days',pending.filter((b:any)=>-days(b.due_date)>60)]
].map(([label,list]:any)=>{
  const amount=sum(list);
  const percent=Math.min(100,amount/Math.max(sum(pending),1)*100);
  return <div key={label}>
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{money(amount)}</span>
    </div>
    <div className="mt-2 h-2.5 rounded-full bg-slate-100">
      <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{width:percent+'%'}}/>
    </div>
  </div>;
})}
          </div>

          <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Pending value</p>
            <p className="mt-1 text-2xl font-bold text-indigo-950">{money(sum(pending))}</p>
            <p className="mt-1 text-xs text-indigo-700/70">Across all unpaid bills</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}