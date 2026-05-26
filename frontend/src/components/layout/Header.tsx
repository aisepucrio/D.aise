"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { headerNav, isActive } from "./nav-config";
import GitHubTokenModal from "@/components/features/GitHubTokenModal";

export default function Header() {
  const pathname = usePathname();
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

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
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsGithubModalOpen((v) => !v)}
            className={`text-sm font-medium transition-colors ${
              isGithubModalOpen
                ? "text-brand"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            GitHub Token
          </button>
          {isGithubModalOpen ? (
            <GitHubTokenModal onClose={() => setIsGithubModalOpen(false)} />
          ) : null}
        </div>
      </nav>
    </header>
  );
}
