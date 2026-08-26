import { ExternalLink, HardDrive, PackageCheck } from "lucide-react";

import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const [settingsResult, activeResult, archivedResult, assetsResult] =
    await Promise.all([
      supabase
        .from("payment_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .neq("status", "archived"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "archived"),
      supabase
        .from("order_assets")
        .select("id", { count: "exact", head: true }),
    ]);

  const settings = settingsResult.data;
  const qrUrl = settings?.qr_image_path
    ? ((
        await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(settings.qr_image_path, 300)
      ).data?.signedUrl ?? null)
    : null;

  return (
    <div>
      <p className="eyebrow">Studio controls</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Settings</h1>
      <p className="mt-3 max-w-2xl text-neutral-600">
        Keep the payment instructions shown during checkout current and watch
        the size of the active workspace.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={PackageCheck}
          label="Active orders"
          value={activeResult.count ?? 0}
        />
        <Metric
          icon={PackageCheck}
          label="Archived orders"
          value={archivedResult.count ?? 0}
        />
        <Metric
          icon={HardDrive}
          label="Tracked assets"
          value={assetsResult.count ?? 0}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Payment instructions</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Clients see these details in the order wizard.
            </p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Supabase dashboard <ExternalLink className="size-4" />
          </a>
        </div>
        <PaymentSettingsForm settings={settings} qrUrl={qrUrl} />
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HardDrive;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <Icon className="size-5 text-neutral-400" />
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-neutral-500">{label}</p>
    </div>
  );
}
