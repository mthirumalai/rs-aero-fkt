import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SessionProvider } from "@/components/SessionProvider";
import { auth } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RS Aero FKT — Fastest Known Times for Sailing",
  description:
    "Track and submit Fastest Known Times for RS Aero sailing routes across all four rig sizes.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <SessionProvider session={session}>
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} RS Aero FKT. For the RS Aero sailing community.
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
