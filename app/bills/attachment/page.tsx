'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Download,ExternalLink,Loader2,FileText,AlertCircle,ZoomIn,ZoomOut,RotateCcw} from 'lucide-react';
import {useSearchParams} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

function extension(path:string){
  const name=path.split('/').pop()?.split('?')[0]??'';
  return name.split('.').pop()?.toLowerCase()??'';
}

export default function AttachmentViewer(){
  const searchParams=useSearchParams();
  const path=searchParams.get('path')||'';
  const [url,setUrl]=useState('');
  const [loading,setLoading]=useState(true);
  const [downloading,setDownloading]=useState(false);
  const [error,setError]=useState('');
  const [zoom,setZoom]=useState(1);

  const ext=useMemo(()=>extension(path),[path]);
  const isImage=['jpg','jpeg','png','webp','gif','bmp'].includes(ext);
  const isPdf=ext==='pdf';

  useEffect(()=>{
    let active=true;

    async function load(){
      if(!path){
        setError('Attachment path is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try{
        const sb=await createClient();
        const {data,error}=await sb.storage.from('bill-attachments').createSignedUrl(path,600,{download:false});
        if(error)throw error;
        if(active)setUrl(data.signedUrl);
      }catch(err){
        if(active)setError(err instanceof Error?err.message:'Unable to open attachment.');
      }finally{
        if(active)setLoading(false);
      }
    }

    load();
    return ()=>{active=false};
  },[path]);

  async function download(){
    if(!path||downloading)return;
    setDownloading(true);
    setError('');

    try{
      const sb=await createClient();
      const {data,error}=await sb.storage.from('bill-attachments').createSignedUrl(path,600,{download:true});
      if(error)throw error;

      const a=document.createElement('a');
      a.href=data.signedUrl;
      a.download='';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to download attachment.');
    }finally{
      setDownloading(false);
    }
  }

  const fileName=path.split('/').pop()?.replace(/^[^-]+-[^-]+-[^-]+-/,'')||'Bill attachment';

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-3 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link
            href="/bills"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft size={16}/>
            Back to Bills
          </Link>

          <div className="hidden min-w-0 flex-1 px-4 text-center sm:block">
            <p className="truncate text-sm font-semibold text-white">{fileName}</p>
            <p className="text-[11px] uppercase tracking-[.14em] text-slate-400">Bill attachment</p>
          </div>

          {isImage&&url&&(
            <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:flex">
              <button type="button" onClick={()=>setZoom(z=>Math.max(.5,Math.round((z-.1)*10)/10))} className="rounded-lg p-2 text-white transition hover:bg-white/10" title="Zoom out" aria-label="Zoom out"><ZoomOut size={15}/></button>
              <button type="button" onClick={()=>setZoom(1)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10" title="Reset zoom">{Math.round(zoom*100)}%</button>
              <button type="button" onClick={()=>setZoom(z=>Math.min(3,Math.round((z+.1)*10)/10))} className="rounded-lg p-2 text-white transition hover:bg-white/10" title="Zoom in" aria-label="Zoom in"><ZoomIn size={15}/></button>
              <button type="button" onClick={()=>setZoom(1)} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10" title="Reset zoom" aria-label="Reset zoom"><RotateCcw size={14}/></button>
            </div>
          )}
          <div className="flex shrink-0 gap-2">
            {url&&(
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <ExternalLink size={16}/>
                <span className="hidden sm:inline">Open</span>
              </a>
            )}
            <button
              type="button"
              onClick={download}
              disabled={!url||downloading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading?<Loader2 size={16} className="animate-spin"/>:<Download size={16}/>}
              <span>{downloading?'Downloading…':'Download'}</span>
            </button>
          </div>
        </div>
      </header>

      {error&&(
        <div className="mx-auto mt-4 flex max-w-3xl items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle size={16} className="shrink-0"/>
          {error}
        </div>
      )}

      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center p-3 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={30} className="animate-spin"/>
            <p className="text-sm">Loading attachment…</p>
          </div>
        ) : url&&isImage ? (
          <div
            className="relative h-[calc(100vh-125px)] w-full overflow-auto rounded-2xl border border-white/10 bg-black/20 p-2 shadow-2xl sm:p-4"
            onWheel={event=>{
              if(!event.ctrlKey)return;
              event.preventDefault();
              const direction=event.deltaY>0?-0.1:0.1;
              setZoom(current=>Math.min(3,Math.max(.5,Math.round((current+direction)*10)/10)));
            }}
          >
            <div className="absolute left-1/2 top-1/2 h-[96%] w-[96%] -translate-x-1/2 -translate-y-1/2">
              <div
                className="h-full w-full transition-transform duration-150 ease-out"
                style={{transform:`scale(${zoom})`,transformOrigin:'center center'}}
              >
                <iframe
                  src={url}
                  title={fileName}
                  className="h-full w-full rounded-xl border-0 bg-white"
                />
              </div>
              <div
                className="absolute inset-0 z-10"
                onWheel={event=>{
                  if(event.ctrlKey){
                    event.preventDefault();
                    const direction=event.deltaY>0?-0.1:0.1;
                    setZoom(current=>Math.min(3,Math.max(.5,Math.round((current+direction)*10)/10)));
                  }
                }}
                aria-hidden="true"
              />
            </div>

            <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-xs font-medium text-slate-300 shadow-xl backdrop-blur-md">
              Ctrl + mouse wheel to zoom · {Math.round(zoom*100)}%
            </div>
          </div>
        ) : url&&isPdf ? (
          <iframe
            src={url}
            title={fileName}
            className="h-[calc(100vh-105px)] w-full rounded-2xl border border-white/10 bg-white shadow-2xl"
          />
        ) : url ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <FileText size={44} className="text-indigo-300"/>
            <div>
              <p className="font-semibold text-white">Attachment ready</p>
              <p className="mt-1 text-sm text-slate-400">Use Download to save this file.</p>
            </div>
            <button type="button" onClick={download} className="btn btn-primary inline-flex items-center gap-2">
              <Download size={16}/>
              Download file
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
