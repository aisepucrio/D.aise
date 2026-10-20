"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { headerNav, isActive } from "./nav-config";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-stroke bg-background-app/95 px-6 backdrop-blur-sm">
      <Link
        href="/"
        className="justify-self-start text-lg font-bold tracking-tight text-brand"
      >
        D.aise
      </Link>

      <nav
        className="flex items-center justify-center gap-8"
        aria-label="Navegação principal"
      >
        {headerNav.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                active
                  ? "text-brand"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        {user ? (
          <Link
            href="/profile"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              pathname === "/profile"
                ? "border-brand/50 bg-brand/10 text-brand"
                : "border-stroke text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
            }`}
            title="Configurações"
          >
            <Settings className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="hidden sm:inline">Configurações</span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
          title="Sair"
        >
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
