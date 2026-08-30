import { OrderWizard } from "@/components/client/order-wizard";
import { requireUser } from "@/lib/auth/guards";

export default async function NewOrderPage() {
  const { claims, supabase } = await requireUser();
  const [
    packageResult,
    themeResult,
    paymentResult,
    profileResult,
    entitlementResult,
  ] = await Promise.all([
    supabase
      .from("packages")
      .select("slug, name, poster_count, price_myr, free_amendments")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("themes")
      .select("slug, name, description")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("payment_settings")
      .select(
        "bank_name, account_name, account_number, duitnow_id, instructions, qr_image_path",
      )
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, whatsapp, instagram_handle")
      .eq("id", typeof claims.sub === "string" ? claims.sub : "")
      .maybeSingle(),
    supabase
      .from("frame_entitlements")
      .select(
        "id, package_name_snapshot, frames_total, frames_used, amendments_total, amendments_used",
      )
      .eq("client_id", typeof claims.sub === "string" ? claims.sub : "")
      .not("activated_at", "is", null)
      .order("created_at"),
  ]);

  const packages = (packageResult.data ?? []).map((item) => ({
    slug: item.slug,
    name: item.name,
    posterCount: item.poster_count,
    priceMyr: item.price_myr,
    freeAmendments: item.free_amendments,
  }));
  const themes = (themeResult.data ?? []).map((item) => ({
    slug: item.slug,
    name: item.name,
    description: item.description,
  }));
  const qrUrl = paymentResult.data?.qr_image_path
    ? ((
        await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(paymentResult.data.qr_image_path, 1800)
      ).data?.signedUrl ?? null)
    : "/qr.png";
  const paymentInstructions = {
    bankName: paymentResult.data?.bank_name ?? "GX BANK BERHAD",
    accountName: paymentResult.data?.account_name ?? "ZENCODE SOFTWARE LABS",
    accountNumber: paymentResult.data?.account_number ?? "8188-061518-2",
    duitnowId: paymentResult.data?.duitnow_id ?? null,
    instructions:
      paymentResult.data?.instructions ??
      "Pay by bank transfer or scan the Touch 'n Go QR code, then upload your receipt below.",
    qrUrl,
  };
  const frameCredits = (entitlementResult.data ?? [])
    .filter((item) => item.frames_used < item.frames_total)
    .map((item) => ({
      id: item.id,
      packageName: item.package_name_snapshot,
      framesRemaining: item.frames_total - item.frames_used,
      framesTotal: item.frames_total,
      amendmentsRemaining: Math.max(
        0,
        item.amendments_total - item.amendments_used,
      ),
    }));

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">Create poster order</p>
        <h1 className="font-heading mt-3 text-4xl font-bold tracking-tight">
          Tell us about your next tournament.
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Your draft is saved locally as you go. Files will move to private
          storage when Supabase is connected.
        </p>
      </div>
      {packages.length > 0 && themes.length > 0 ? (
        <OrderWizard
          packages={packages}
          themes={themes}
          paymentInstructions={paymentInstructions}
          initialProfile={{
            fullName: profileResult.data?.full_name ?? null,
            whatsapp: profileResult.data?.whatsapp ?? null,
            instagramHandle: profileResult.data?.instagram_handle ?? null,
          }}
          frameCredits={frameCredits}
        />
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Order configuration is not available yet. Ask DINKFRAME to finish the
          package and theme setup.
        </div>
      )}
    </>
  );
}
