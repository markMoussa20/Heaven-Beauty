import type { Metadata } from "next";
import { headers } from "next/headers";
import { Kanit } from "next/font/google";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CartProvider } from "@/components/cart/CartProvider";
import { CountryProvider } from "@/components/country/CountryProvider";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { Header } from "@/components/layout/Header";
import { PublicOnly } from "@/components/layout/PublicOnly";
import { SoftCursor } from "@/components/layout/SoftCursor";
import { getActiveCountries, getSelectedCountryCode } from "@/lib/country";
import { getActivePromoBanner } from "@/lib/promo-banners/active";
import "./globals.css";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Heaven Beauty",
    template: "%s - Heaven Beauty",
  },
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
  const promoBanner = isAdminRoute
    ? null
    : await getActivePromoBanner(
        countries.find((country) => country.code === selectedCountryCode) ?? null,
      );

  return (
    <html lang="en" className={`${kanit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950">
        <MetaPixel />
        <CountryProvider
          countries={countries}
          initialCountryCode={selectedCountryCode}
        >
          <CartProvider>
            <SoftCursor />
            {!isAdminRoute ? (
              <PublicOnly>
                {promoBanner ? (
                  <AnnouncementBar banner={promoBanner} key={promoBanner.dismissKey} />
                ) : null}
                <Header />
                <CartDrawer />
                <FloatingWhatsApp />
              </PublicOnly>
            ) : null}
            <main className="flex-1 overflow-x-clip">{children}</main>
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
