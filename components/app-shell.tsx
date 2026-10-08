import Sidebar from './sidebar';

export default function AppShell({children}:{children:React.ReactNode}){
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar/>
      <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}