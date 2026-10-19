import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { ThemeSync } from "@/components/theme-sync";
import { THEME_COLORS, themeInitScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages set just their own name ("Wishlists"); the template adds the app.
  title: { default: "Cubby", template: "%s · Cubby" },
  description:
    "A wishlist and spending tracker for fashion, beauty, and lifestyle items.",
  appleWebApp: {
    title: "Cubby",
    statusBarStyle: "default",
  },
};

// Matches the OS setting by default; ThemeSync overwrites these with the
// user's chosen theme (light/dim/dark) once the page hydrates.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The inline theme script adds classes/color-scheme to <html> before
      // React hydrates; let the DOM win.
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={themeInitScript} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
