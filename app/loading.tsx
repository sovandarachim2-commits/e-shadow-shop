export default function Loading() {
  return (
    <section className="container-page grid min-h-[62vh] place-items-center py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#d8e2ff] bg-white shadow-[0_18px_48px_rgba(33,70,171,0.10)]">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#d8e2ff] border-t-[#2e57d0]" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-[#4c76ef]">Loading</p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-[#173e82]">Preparing your beauty shelf</h1>
        <div className="mx-auto mt-6 grid max-w-xs gap-3">
          <div className="h-3 rounded-full bg-[#d8e2ff]" />
          <div className="mx-auto h-3 w-4/5 rounded-full bg-[#e9efff]" />
          <div className="mx-auto h-3 w-2/3 rounded-full bg-[#f0f4ff]" />
        </div>
      </div>
    </section>
  );
}
