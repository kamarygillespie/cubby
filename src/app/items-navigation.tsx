"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

type NavigateOptions = {
  scroll?: boolean;
  // Runs inside the transition, for instant ("optimistic") visual updates.
  onStart?: () => void;
};

type ItemsNavigation = {
  pending: boolean;
  navigate: (href: string, options?: NavigateOptions) => void;
};

const ItemsNavigationContext = createContext<ItemsNavigation | null>(null);

// Tab and filter changes on the main page (KAM-63). The current items stay on
// screen while the next ones load, and the tapped control responds right away.
export function ItemsNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(href: string, options: NavigateOptions = {}) {
    startTransition(() => {
      options.onStart?.();
      router.push(href, { scroll: options.scroll ?? true });
    });
  }

  return (
    <ItemsNavigationContext.Provider value={{ pending, navigate }}>
      {children}
    </ItemsNavigationContext.Provider>
  );
}

export function useItemsNavigation() {
  const navigation = useContext(ItemsNavigationContext);
  if (!navigation) {
    throw new Error("useItemsNavigation needs an ItemsNavigationProvider");
  }
  return navigation;
}

// Softly dims the items while the next set loads. The short delay keeps fast
// changes from flickering.
export function ItemsPendingContent({ children }: { children: ReactNode }) {
  const { pending } = useItemsNavigation();
  return (
    <div
      aria-busy={pending || undefined}
      className={cn(
        "flex flex-col gap-3 transition-opacity duration-150 motion-reduce:transition-none",
        pending && "opacity-50 delay-100",
      )}
    >
      {children}
    </div>
  );
}
