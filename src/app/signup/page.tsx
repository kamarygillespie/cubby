"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>Create your Cubby account.</CardDescription>
        </CardHeader>
        <CardContent>
          {state && "success" in state ? (
            <p className="text-sm">
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
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                {state?.error && (
                  <p className="text-destructive text-sm">{state.error}</p>
                )}
                <Button type="submit" disabled={pending}>
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
