"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUp } from "./actions";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Only flag a mismatch once they've started typing the confirmation.
  const mismatch = confirmPassword !== "" && confirmPassword !== password;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>Create your Cubby account.</CardDescription>
        </CardHeader>
        <CardContent>
          {state && "success" in state ? (
            <p role="status" className="text-sm">
              Check your email for a confirmation link to finish signing up.
            </p>
          ) : (
            <>
              <form action={formAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby="password-hint"
                  />
                  <p
                    id="password-hint"
                    className="text-muted-foreground text-xs"
                  >
                    At least {PASSWORD_MIN_LENGTH} characters.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={mismatch || undefined}
                    aria-describedby={mismatch ? "confirm-error" : undefined}
                  />
                  {mismatch && (
                    <p id="confirm-error" className="text-destructive text-xs">
                      Passwords don&apos;t match.
                    </p>
                  )}
                </div>
                {state?.error && (
                  <p role="alert" className="text-destructive text-sm">
                    {state.error}
                  </p>
                )}
                <Button type="submit" disabled={pending || mismatch}>
                  {pending ? "Signing up..." : "Sign up"}
                </Button>
              </form>
              <p className="text-muted-foreground mt-4 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
