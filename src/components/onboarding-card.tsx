import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnboardingStep } from "@/lib/onboarding";
import { dismissOnboardingAction } from "@/app/onboarding/actions";

// "Get started" checklist for new accounts (KAM-46). Hidden for good once
// dismissed (saved on the profile) or once every step is done.
export function OnboardingCard({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section
      aria-labelledby="onboarding-title"
      className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="onboarding-title" className="font-semibold">
            Welcome to Cubby
          </h2>
          <p className="text-muted-foreground text-sm">
            Keep everything you want in one place, share lists for gifts, and
            catch the sales. {done} of {steps.length} done.
          </p>
        </div>
        <form action={dismissOnboardingAction}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Hide getting started"
          >
            <X />
          </Button>
        </form>
      </div>
      <ol className="flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="hover:bg-muted flex items-center gap-3 rounded-lg p-2"
            >
              {step.done ? (
                <CheckCircle2
                  className="text-primary size-5 shrink-0"
                  aria-hidden
                />
              ) : (
                <Circle
                  className="text-muted-foreground size-5 shrink-0"
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {step.label}
                  {step.done && <span className="sr-only"> (done)</span>}
                </span>
                {!step.done && (
                  <span className="text-muted-foreground block text-xs">
                    {step.hint}
                  </span>
                )}
              </span>
              <ChevronRight
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
