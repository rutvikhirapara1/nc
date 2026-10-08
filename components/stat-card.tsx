export default function StatCard({
  label,
  value,
  sub,
  tone='normal',
}:{
  label:string;
  value:string;
  sub?:string;
  tone?:'normal'|'red'|'amber'|'green'
}) {
  const styles = {
    normal:'border-slate-200 bg-white',
    red:'border-red-200 bg-red-50/50',
    amber:'border-amber-200 bg-amber-50/50',
    green:'border-emerald-200 bg-emerald-50/50',
  }[tone];

  const valueColor = {
    normal:'text-slate-900',
    red:'text-red-700',
    amber:'text-amber-700',
    green:'text-emerald-700',
  }[tone];

  return (
    <div className={'rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md '+styles}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={'mt-2 text-2xl font-bold tracking-tight '+valueColor}>{value}</p>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}