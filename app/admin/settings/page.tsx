import { Bot, ExternalLink, HardDrive, PackageCheck } from "lucide-react";

import { AutomationSettingsForm } from "@/components/admin/automation-settings-form";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const [
    paymentSettingsResult,
    automationSettingsResult,
    activeResult,
    archivedResult,
    assetsResult,
  ] = await Promise.all([
    supabase.from("payment_settings").select("*").eq("id", true).maybeSingle(),
    supabase
      .from("automation_settings")
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
    supabase.from("order_assets").select("id", { count: "exact", head: true }),
  ]);

  const paymentSettings = paymentSettingsResult.data;
  const qrUrl = paymentSettings?.qr_image_path
    ? ((
        await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(paymentSettings.qr_image_path, 300)
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
        <div className="mb-7 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-900">
            <Bot className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Studio automation</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Choose whether the local ChatGPT companion pauses before sending a
              prepared message.
            </p>
          </div>
        </div>
        <AutomationSettingsForm settings={automationSettingsResult.data} />
      </section>

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
        <PaymentSettingsForm settings={paymentSettings} qrUrl={qrUrl} />
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
