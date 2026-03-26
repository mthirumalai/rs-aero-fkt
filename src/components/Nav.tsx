"use client";

import Link from "next/link";
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
      {/* Dark grey top bar with navigation — #616161, matches rsaerosailing.org */}
      <div style={{ backgroundColor: "#616161" }} className="text-white text-sm py-2 px-8">
        <div className="flex items-center justify-end gap-6">
          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/fkts"
              className="opacity-80 hover:opacity-100 transition-opacity text-sm font-medium"
            >
              FKTs
            </Link>
            <Link
              href="/routes"
              className="opacity-80 hover:opacity-100 transition-opacity text-sm font-medium"
            >
              Routes
            </Link>
            <Link
              href="/guidelines"
              className="opacity-80 hover:opacity-100 transition-opacity text-sm font-medium"
            >
              Guidelines
            </Link>
            <Link
              href="/contact"
              className="opacity-80 hover:opacity-100 transition-opacity text-sm font-medium"
            >
              Contact
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-80 hover:opacity-100 transition-opacity text-sm font-medium focus:outline-none">
                  Admin ▼
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => router.push("/stats")}>
                  Stats
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/pending-routes")}>
                  Pending Routes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/fkt-failures")}>
                  FKT Failures
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* User menu */}
          <div className="flex items-center">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 cursor-pointer focus:outline-none opacity-90 hover:opacity-100 transition-opacity">
                    <span className="text-sm">
                      {session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "User"}
                    </span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User"} />
                      <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                        {(session.user?.name?.charAt(0) ?? session.user?.email?.charAt(0))?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-semibold">
                    {session.user?.name ?? session.user?.email?.split("@")[0] ?? "User"}
                  </div>
                  <div className="px-2 py-1 text-xs text-muted-foreground truncate">{session.user?.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/athletes/${session.user?.id}`)}>
                    My Profile
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
      </div>

    </header>
  );
}
