import { Check } from "lucide-react";

import { PACKAGE_CATALOG } from "@/lib/packages/catalog";

export function PackageGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {PACKAGE_CATALOG.map((item, index) => (
        <article
          key={item.slug}
          className={`interactive-card relative overflow-hidden rounded-3xl border p-6 sm:p-7 ${index === 1 ? "border-primary/70 bg-primary text-black shadow-[0_20px_60px_rgba(132,160,25,.16)] lg:-translate-y-3" : "border-black/10 bg-white/85 text-black shadow-[0_14px_45px_rgba(41,50,20,.05)]"}`}
        >
          <div
            className={`absolute inset-x-0 top-0 h-px ${index === 1 ? "bg-black/20" : "via-primary/50 bg-gradient-to-r from-transparent to-transparent"}`}
          />
          {index === 1 && (
            <span className="absolute top-4 right-4 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
              Popular
            </span>
          )}
          <p className="eyebrow opacity-70">
            {item.posterCount} poster{item.posterCount > 1 ? "s" : ""}
          </p>
          <h3 className="mt-4 text-xl font-bold">{item.name}</h3>
          <p className="font-heading mt-6 text-4xl font-bold tracking-tight">
            RM{item.priceMyr}
          </p>
          <p className="mt-7 flex items-center gap-2 border-t border-current/10 pt-5 text-sm opacity-75">
            <Check
              className={`size-4 ${index === 1 ? "text-black" : "text-primary"}`}
            />{" "}
            {item.freeAmendments} free amendments
          </p>
        </article>
      ))}
    </div>
  );
}
