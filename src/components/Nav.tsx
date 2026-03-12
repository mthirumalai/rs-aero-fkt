"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export function Nav() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50">
      {/* Dark grey top bar — #616161, matches rsaerosailing.org */}
      <div style={{ backgroundColor: "#616161" }} className="text-white text-sm py-2 px-8">
        <div className="flex items-center justify-end gap-3">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 cursor-pointer focus:outline-none opacity-90 hover:opacity-100 transition-opacity">
                  <span className="text-sm">{session.user?.name?.split(" ")[0]}</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User"} />
                    <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                      {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-semibold">{session.user?.name}</div>
                <div className="px-2 py-1 text-xs text-muted-foreground truncate">{session.user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/athletes/${session.user?.id}`)}>
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/routes/submit")}>
                  Submit a Route
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => signIn()}
              className="opacity-80 hover:opacity-100 transition-opacity text-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main nav — matches .topnav from rsaerosailing.org */}
      <div style={{ backgroundColor: "#ffffff", height: "83px" }} className="border-b flex items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center h-full py-3">
            <Image
              src="/logo.png"
              alt="RS Aero FKT"
              width={324}
              height={55}
              className="h-full w-auto"
              priority
            />
          </Link>

          {/* Nav links — right aligned */}
          <nav className="hidden md:flex items-center">
            <Link
              href="/routes"
              style={{ fontSize: "19px", color: "#888888", padding: "14px 16px" }}
              className="hover:text-[#444444] transition-colors"
            >
              Routes
            </Link>
            <Link
              href="/guidelines"
              style={{ fontSize: "19px", color: "#888888", padding: "14px 16px" }}
              className="hover:text-[#444444] transition-colors"
            >
              Guidelines
            </Link>
          </nav>
      </div>
    </header>
  );
}
