export default function Loading(){
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="h-8 w-48 rounded-lg skeleton"/>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-32 rounded-2xl skeleton"/>
          <div className="h-32 rounded-2xl skeleton"/>
          <div className="h-32 rounded-2xl skeleton"/>
          <div className="h-32 rounded-2xl skeleton"/>
        </div>
        <div className="h-72 rounded-2xl skeleton"/>
      </div>
    </main>
  );
}