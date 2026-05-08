export default function AdminLoading() {
  return (
    <section className="grid min-h-[calc(100vh-120px)] place-items-center px-4 py-12">
      <div className="admin-card w-full max-w-sm rounded-[28px] p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#15130f]">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/20 border-t-[#ffdc1f]" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#e0a900]">Loading</p>
        <h1 className="mt-2 text-2xl font-black text-[#15130f]">Opening admin workspace</h1>
        <div className="mt-6 grid gap-3">
          <div className="h-12 rounded-2xl bg-[#fbfaf7]" />
          <div className="h-12 rounded-2xl bg-[#f3f0e9]" />
          <div className="h-12 rounded-2xl bg-[#fbfaf7]" />
        </div>
      </div>
    </section>
  );
}
