"use client";

import { useActionState } from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/(client)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ProfileActionState = { status: "idle", message: "" };

export function ProfileForm({
  email,
  fullName,
  whatsapp,
  instagramHandle,
}: {
  email: string;
  fullName: string | null;
  whatsapp: string | null;
  instagramHandle: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
        <p className="text-xs text-neutral-500">
          Your sign-in email is managed by Supabase Auth and cannot be changed
          here.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={fullName ?? ""}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          required
          minLength={8}
          maxLength={30}
          defaultValue={whatsapp ?? ""}
          autoComplete="tel"
          placeholder="+60 12-345 6789"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instagramHandle">Instagram handle</Label>
        <Input
          id="instagramHandle"
          name="instagramHandle"
          maxLength={80}
          defaultValue={instagramHandle ?? ""}
          placeholder="playername"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {state.message && (
          <p
            role="status"
            className={`text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
