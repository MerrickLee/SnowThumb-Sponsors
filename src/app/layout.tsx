import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sponsors.snowthumb.com"),
  title: { default: "SnowThumb Sponsors", template: "%s · SnowThumb Sponsors" },
  description: "Put your brand on the boards, rails and banners of SnowThumb's indoor snow park.",
  openGraph: { title: "Sponsor SnowThumb", description: "Placements players actually ride. Approved art goes live without an app update.", siteName: "SnowThumb" },
};

export const viewport: Viewport = { themeColor: "#f7fbfe", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
