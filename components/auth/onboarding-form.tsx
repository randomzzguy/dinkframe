"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";

import {
  completeOnboarding,
  type OnboardingActionState,
} from "@/app/(auth)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardingActionState = { status: "idle", message: "" };

export function OnboardingForm({
  email,
  whatsapp,
  instagramHandle,
}: {
  email: string;
  whatsapp: string | null;
  instagramHandle: string | null;
}) {
  const [state, action, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="onboarding-email">Email</Label>
        <Input id="onboarding-email" value={email} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-full-name">Full name *</Label>
        <Input
          id="onboarding-full-name"
          name="fullName"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          autoFocus
          placeholder="Your full name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-whatsapp">WhatsApp (optional)</Label>
        <Input
          id="onboarding-whatsapp"
          name="whatsapp"
          minLength={8}
          maxLength={30}
          defaultValue={whatsapp ?? ""}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+60 12-345 6789"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-instagram">
          Instagram handle (optional)
        </Label>
        <Input
          id="onboarding-instagram"
          name="instagramHandle"
          maxLength={80}
          defaultValue={instagramHandle ?? ""}
          placeholder="@playername"
        />
      </div>

      {state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full rounded-full font-bold"
      >
        {pending ? "Saving your profile…" : "Continue to dashboard"}
        {!pending ? <ArrowRight /> : null}
      </Button>

      <p className="text-center text-xs leading-5 text-neutral-500">
        Only your name is required now. You can complete the other details from
        your profile later.
      </p>
    </form>
  );
}
