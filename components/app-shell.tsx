import Sidebar from './sidebar';

export default function AppShell({children}:{children:React.ReactNode}) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 md:p-8">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}