'use client';

import {useEffect} from 'react';
import {X} from 'lucide-react';

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide=false,
}:{
  open:boolean;
  title:string;
  description?:string;
  onClose:()=>void;
  children:React.ReactNode;
  wide?:boolean;
}) {
  useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape') onClose()};
    document.addEventListener('keydown',onKey);
    document.body.style.overflow='hidden';
    return ()=>{
      document.removeEventListener('keydown',onKey);
      document.body.style.overflow='';
    };
  },[open,onClose]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 p-0 backdrop-blur-md animate-[reveal_.2s_ease-out] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className={'max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/70 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,.18)] backdrop-blur-xl animate-[float-in_.28s_cubic-bezier(.16,1,.3,1)] sm:rounded-3xl '+(wide?'max-w-2xl':'max-w-xl')}
        onMouseDown={e=>e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="pr-4">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description&&<p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" aria-label="Close" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>
            <X size={18}/>
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}