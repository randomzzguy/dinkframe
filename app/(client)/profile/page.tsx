import { ProfileForm } from "@/components/client/profile-form";
import { requireUser } from "@/lib/auth/guards";

export default async function ProfilePage() {
  const { claims, supabase } = await requireUser();
  const userId = typeof claims.sub === "string" ? claims.sub : "";
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, whatsapp, instagram_handle")
    .eq("id", userId)
    .maybeSingle();
  const email =
    profile?.email ?? (typeof claims.email === "string" ? claims.email : "");

  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">Account details</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Your profile</h1>
      <p className="mt-3 text-neutral-600">
        These details prefill new orders so repeat bookings take less time.
      </p>
      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
        <ProfileForm
          email={email}
          fullName={profile?.full_name ?? null}
          whatsapp={profile?.whatsapp ?? null}
          instagramHandle={profile?.instagram_handle ?? null}
        />
      </section>
    </div>
  );
}
