import { Button } from "@/components/ui/button";

export function Newsletter() {
  return (
    <section className="container-page mt-20 rounded-[28px] bg-[#082b4c] px-6 py-10 text-white shadow-soft md:px-10">
      <div className="grid gap-6 md:grid-cols-[1fr_420px] md:items-center">
        <h2 className="font-serif text-3xl font-bold leading-tight md:text-4xl">Stay close to soft beauty offers</h2>
        <form className="grid gap-3">
          <input className="rounded-md border-0 px-5 py-3 text-sm text-[#082b4c] outline-none" placeholder="Enter your email address" type="email" />
          <Button variant="light" type="button">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
