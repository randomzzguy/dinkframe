"use client";

import { useActionState } from "react";

import { sendMagicLink, type LoginState } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { message: "", status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className="h-11"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full font-bold"
        disabled={pending}
      >
        {pending ? "Sending secure link…" : "Email me a magic link"}
      </Button>
      {state.message && (
        <p
          role="status"
          className={`rounded-lg p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-lime-50 text-lime-900"}`}
        >
          {state.message}
        </p>
      )}
      <p className="text-xs leading-5 text-neutral-500">
        We use this email to secure your order dashboard and send future order
        updates. No password needed.
      </p>
    </form>
  );
}
