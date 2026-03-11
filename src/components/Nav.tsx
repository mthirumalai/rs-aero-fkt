"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
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
    <header className="border-b sticky top-0 z-50" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)" }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="RS Aero FKT" width={120} height={40} className="h-10 w-auto" priority />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold uppercase tracking-wide">
          <Link href="/routes" className="text-foreground/70 hover:text-primary transition-colors">
            Routes
          </Link>
          <Link href="/guidelines" className="text-foreground/70 hover:text-primary transition-colors">
            Guidelines
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User"} />
                    <AvatarFallback className="bg-primary text-white text-sm font-semibold">
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
            <Button onClick={() => signIn()} size="sm">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
