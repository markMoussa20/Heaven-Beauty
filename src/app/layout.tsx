import type { Metadata } from "next";
import { CountryProvider } from "@/components/country/CountryProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
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

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950">
        <CountryProvider
          countries={countries}
          initialCountryCode={selectedCountryCode}
        >
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CountryProvider>
      </body>
    </html>
  );
}
