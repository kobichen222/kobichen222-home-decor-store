"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signIn } from "@/features/admin/auth-actions";

export function LoginForm() {
  const [state, action, pending] = React.useActionState(signIn, null);
  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="דוא״ל" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" dir="ltr" required />
      </Field>
      <Field label="סיסמה" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required />
      </Field>
      {state?.error && (
        <p className="text-sm font-semibold text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "מתחבר…" : "כניסה"}
      </Button>
    </form>
  );
}
