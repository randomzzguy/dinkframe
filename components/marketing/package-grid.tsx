import { Check } from "lucide-react";

import { PACKAGE_CATALOG } from "@/lib/packages/catalog";

export function PackageGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {PACKAGE_CATALOG.map((item, index) => (
        <article
          key={item.slug}
          className={`relative rounded-2xl border p-6 ${index === 1 ? "border-black bg-neutral-950 text-white" : "border-black/10 bg-white"}`}
        >
          {index === 1 && (
            <span className="bg-primary absolute top-4 right-4 rounded-full px-2 py-1 text-[10px] font-bold tracking-wider text-black uppercase">
              Popular
            </span>
          )}
          <p className="eyebrow opacity-70">
            {item.posterCount} poster{item.posterCount > 1 ? "s" : ""}
          </p>
          <h3 className="mt-4 text-xl font-bold">{item.name}</h3>
          <p className="mt-6 text-4xl font-black tracking-tight">
            RM{item.priceMyr}
          </p>
          <p className="mt-5 flex items-center gap-2 text-sm opacity-75">
            <Check className="text-primary size-4" /> {item.freeAmendments} free
            amendments
          </p>
        </article>
      ))}
    </div>
  );
}
