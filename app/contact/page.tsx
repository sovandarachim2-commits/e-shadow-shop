import { Mail, MapPin, Phone } from "lucide-react";

const contactItems = [
  { label: "Phone", value: "+855 12 345 678", icon: Phone },
  { label: "Email", value: "support@eshadowshop.com", icon: Mail },
  { label: "Location", value: "Phnom Penh, Cambodia", icon: MapPin }
];

export default function ContactPage() {
  return (
    <section className="container-page py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-[#e9897e]">Contact</p>
        <h1 className="mt-4 font-serif text-5xl font-bold text-[#082b4c]">Get In Touch</h1>
        <p className="mt-4 text-[#697b91]">Questions about products, orders, or beauty routines? Send us a message and our team will help.</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {contactItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-[#f3c7b8]/70 bg-white p-6 text-center shadow-sm">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f8ded8] text-[#082b4c]">
                <Icon size={21} />
              </span>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#e9897e]">{item.label}</p>
              <p className="mt-2 font-bold text-[#082b4c]">{item.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
