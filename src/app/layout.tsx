import type { Metadata } from "next";
import { headers } from "next/headers";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CountryProvider } from "@/components/country/CountryProvider";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { Header } from "@/components/layout/Header";
import { PublicOnly } from "@/components/layout/PublicOnly";
import { SoftCursor } from "@/components/layout/SoftCursor";
import { getActiveCountries, getSelectedCountryCode } from "@/lib/country";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heaven Beauty",
  description: "Country-aware beauty shopping for Heaven Beauty customers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [countries, selectedCountryCode] = await Promise.all([
    getActiveCountries(),
    getSelectedCountryCode(),
  ]);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950">
        <CountryProvider
          countries={countries}
          initialCountryCode={selectedCountryCode}
        >
          <CartProvider>
            <SoftCursor />
            {!isAdminRoute ? (
              <PublicOnly>
                <Header />
                <CartDrawer />
                <FloatingWhatsApp />
              </PublicOnly>
            ) : null}
            <main className="flex-1">{children}</main>
            {!isAdminRoute ? (
              <PublicOnly>
                <Footer />
              </PublicOnly>
            ) : null}
          </CartProvider>
        </CountryProvider>
      </body>
    </html>
  );
}
