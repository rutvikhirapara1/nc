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
    normal:'border-slate-200/70 bg-white/80',
    red:'border-red-200/70 bg-gradient-to-br from-white to-red-50/70',
    amber:'border-amber-200/70 bg-gradient-to-br from-white to-amber-50/70',
    green:'border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/70',
  }[tone];

  const valueColor = {
    normal:'text-slate-900',
    red:'text-red-700',
    amber:'text-amber-700',
    green:'text-emerald-700',
  }[tone];

  return (
    <div className={'interactive-card shimmer-border soft-card relative overflow-hidden rounded-3xl border p-5 '+styles}>
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-indigo-100/40 blur-2xl"/>
      <p className="relative text-sm font-semibold text-slate-500">{label}</p>
      <p className={'relative mt-2 text-2xl font-black tracking-tight '+valueColor}>{value}</p>
      {sub && <p className="relative mt-2 text-xs font-medium text-slate-500">{sub}</p>}
    </div>
  );
}