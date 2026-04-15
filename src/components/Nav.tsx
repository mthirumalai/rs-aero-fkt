"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

export function Nav() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin check - CRITICAL SECURITY (Note: This should be moved to server-side session)
  // For immediate security fix, we'll check against the admin email
  // TODO: Add proper admin role to session callbacks
  const isAdmin = !!session?.user?.email && session.user.email === "mthirumalai@gmail.com";

  return (
    <header className="sticky top-0 z-50">
      {/* Dark grey top bar with navigation — #616161, matches rsaerosailing.org */}
      <div className="bg-[#616161] text-white text-sm py-2 px-8">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="bg-white px-2 py-1 rounded-sm">
              <Image
                src="/logo.png"
                alt="RS Aero FKT"
                width={162}
                height={28}
                className="h-6 w-auto"
                priority
              />
            </div>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white hover:text-gray-200 p-2"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Right side container */}
          <div className="flex items-center gap-6">
          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/fkts"
              className="text-gray-100 hover:text-white transition-colors text-sm font-medium"
            >
              FKTs
            </Link>
            <Link
              href="/courses"
              className="text-gray-100 hover:text-white transition-colors text-sm font-medium"
            >
              Courses
            </Link>
            <Link
              href="/guidelines"
              className="text-gray-100 hover:text-white transition-colors text-sm font-medium"
            >
              Guidelines
            </Link>
            <Link
              href="/contact"
              className="text-gray-100 hover:text-white transition-colors text-sm font-medium"
            >
              Contact
            </Link>
            {/* Admin menu - SECURITY: Only show to admin users */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-gray-100 hover:text-white transition-colors text-sm font-medium focus:outline-none">
                    Admin ▼
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => router.push("/stats")}>
                    Stats
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/admin/manage-courses")}>
                    Manage Courses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/admin/fkt-failures")}>
                    FKT Failures
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* User menu */}
          <div className="flex items-center">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 cursor-pointer focus:outline-none text-gray-100 hover:text-white transition-colors">
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
                onClick={() => router.push('/auth/signin')}
                className="text-gray-100 hover:text-white transition-colors text-sm"
              >
                Sign In
              </button>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#616161] border-t border-gray-500">
          <div className="px-4 py-2 space-y-1">
            <Link
              href="/fkts"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
            >
              FKTs
            </Link>
            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
            >
              Courses
            </Link>
            <Link
              href="/guidelines"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
            >
              Guidelines
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
            >
              Contact
            </Link>

            {/* Mobile Admin menu */}
            {isAdmin && (
              <>
                <div className="border-t border-gray-500 pt-2 mt-2">
                  <div className="text-xs text-gray-300 uppercase tracking-wide font-semibold mb-1">Admin</div>
                  <Link
                    href="/stats"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
                  >
                    Stats
                  </Link>
                  <Link
                    href="/admin/manage-courses"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
                  >
                    Manage Courses
                  </Link>
                  <Link
                    href="/admin/fkt-failures"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
                  >
                    FKT Failures
                  </Link>
                </div>
              </>
            )}

            {/* Mobile User menu */}
            <div className="border-t border-gray-500 pt-2 mt-2">
              {session ? (
                <div className="space-y-1">
                  <div className="text-xs text-gray-300 uppercase tracking-wide font-semibold mb-1">Account</div>
                  <Link
                    href={`/athletes/${session.user?.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full text-left text-red-300 hover:text-red-200 transition-colors py-2 text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/auth/signin');
                  }}
                  className="block text-gray-100 hover:text-white transition-colors py-2 text-sm font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}