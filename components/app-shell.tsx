import Sidebar from './sidebar';

export default function AppShell({children}:{children:React.ReactNode}){
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar/>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
          Developed By <span className="font-semibold text-slate-700">Rutvik Hirapara</span>
        </footer>
      </div>
    </div>
  );
}