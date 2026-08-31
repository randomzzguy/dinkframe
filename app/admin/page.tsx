import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/guards";

const cards = [
  {
    label: "New requests",
    field: "status",
    value: "request_received",
    href: "/admin/orders?status=request_received",
    style: "border-sky-200 bg-sky-50/80 text-sky-950",
    accent: "bg-sky-500",
  },
  {
    label: "Awaiting payment",
    field: "payment_status",
    value: "proof_uploaded",
    href: "/admin/orders?paymentStatus=proof_uploaded",
    style: "border-blue-200 bg-blue-50/80 text-blue-950",
    accent: "bg-blue-500",
  },
  {
    label: "In progress",
    field: "status",
    value: "design_in_progress",
    href: "/admin/orders?status=design_in_progress",
    style: "border-violet-200 bg-violet-50/80 text-violet-950",
    accent: "bg-violet-500",
  },
  {
    label: "Amendments",
    field: "status",
    value: "amendment_period",
    href: "/admin/orders?status=amendment_period",
    style: "border-orange-200 bg-orange-50/80 text-orange-950",
    accent: "bg-orange-500",
  },
  {
    label: "Completed",
    field: "status",
    value: "completed",
    href: "/admin/orders?status=completed",
    style: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    accent: "bg-emerald-500",
  },
] as const;

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const counts = await Promise.all(
    cards.map(async ({ field, value }) => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq(field, value);
      return count ?? 0;
    }),
  );
  return (
    <>
      <p className="eyebrow">Studio overview</p>
      <h1 className="font-heading mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Production at a glance.
      </h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, index) => (
          <Link
            key={card.label}
            href={card.href}
            aria-label={`View ${card.label.toLowerCase()} orders`}
            className={`interactive-card group relative overflow-hidden rounded-3xl border p-6 shadow-sm ${card.style}`}
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm opacity-65">{card.label}</p>
              <span className="grid size-8 place-items-center rounded-full bg-white/65 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
            <p className="font-heading mt-4 text-5xl font-bold">
              {counts[index]}
            </p>
            <p className="mt-4 text-xs font-bold tracking-wider uppercase opacity-55">
              View orders
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
