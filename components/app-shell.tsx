import Sidebar from './sidebar';

export default function AppShell({children}:{children:React.ReactNode}){
  return (
    <div className="min-h-screen md:flex">
      <Sidebar/>
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hero-orb one hidden lg:block" />
        <div className="hero-orb two hidden lg:block" />
        <main className="page-enter relative z-10 min-w-0 flex-1 p-4 sm:p-5 md:p-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
        <footer className="relative z-10 border-t border-slate-200/70 bg-white/70 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur-xl sm:px-6">
          Developed By <span className="font-semibold gradient-text">Rutvik Hirapara</span>
        </footer>
      </div>
    </div>
  );
}