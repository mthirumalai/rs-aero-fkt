import type { Metadata } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SessionProvider } from "@/components/SessionProvider";
import { ProfileCompletionCheck } from "@/components/ProfileCompletionCheck";
import { auth } from "@/lib/auth";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "600", "700"],
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
});

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
    <html lang="en" className={`${sourceSans.variable} ${bebasNeue.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <SessionProvider session={session}>
          <ProfileCompletionCheck />
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
