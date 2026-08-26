import { requireAdmin } from "@/lib/auth/guards";

const cards = [
  ["New requests", "status", "request_received"],
  ["Awaiting payment", "payment_status", "proof_uploaded"],
  ["In progress", "status", "design_in_progress"],
  ["Amendments", "status", "amendment_period"],
  ["Completed", "status", "completed"],
] as const;

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const counts = await Promise.all(
    cards.map(async ([, field, value]) => {
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
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        Production at a glance.
      </h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label], index) => (
          <article
            key={label}
            className="rounded-2xl border border-black/10 bg-white p-6"
          >
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-4 text-5xl font-black">{counts[index]}</p>
          </article>
        ))}
      </div>
    </>
  );
}
