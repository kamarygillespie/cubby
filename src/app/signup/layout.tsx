import type { Metadata } from "next";

// The page itself is a Client Component, which can't export metadata.
export const metadata: Metadata = { title: "Sign up" };

export default function Layout({ children }: LayoutProps<"/signup">) {
  return children;
}
