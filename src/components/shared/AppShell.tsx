"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useIsManager } from "@/lib/auth";

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
  { href: "/requests", label: "My Requests", icon: "↗" },
  { href: "/hours", label: "My Hours", icon: "∑" },
  { href: "/profile", label: "Profile", icon: "○" },
];

const managerNav = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/shifts", label: "Shifts", icon: "◷" },
  { href: "/requests", label: "Requests", icon: "↗" },
  { href: "/employees", label: "Employees", icon: "✦" },
  { href: "/hours", label: "Hours", icon: "∑" },
  { href: "/audit", label: "Audit Log", icon: "≡" },
  { href: "/profile", label: "Profile", icon: "○" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const isManager = useIsManager();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const nav = isManager ? managerNav : employeeNav;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-surface-raised border-r border-surface-border min-h-screen">
        <div className="px-5 py-5 border-b border-surface-border">
          <h2 className="text-xl text-ink">Icebike</h2>
          <p className="text-xs text-ink-faint mt-0.5">
            {profile?.full_name ?? "…"}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-100 ${
                  active
                    ? "bg-brand-600/20 text-brand-300"
                    : "text-ink-muted hover:text-ink hover:bg-surface-overlay"
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-surface-border">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn-ghost w-full justify-start text-ink-faint"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-surface-border sticky top-0 z-30">
        <h2 className="text-lg text-ink">Icebike</h2>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="btn-ghost p-2"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-surface-raised h-full flex flex-col">
            <div className="px-5 py-5 border-b border-surface-border">
              <p className="text-sm font-medium text-ink">{profile?.full_name}</p>
              <p className="text-xs text-ink-faint capitalize">{profile?.role}</p>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-brand-600/20 text-brand-300"
                        : "text-ink-muted hover:text-ink hover:bg-surface-overlay"
                    }`}
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-surface-border">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="btn-ghost w-full justify-start text-ink-faint"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0">
        <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
