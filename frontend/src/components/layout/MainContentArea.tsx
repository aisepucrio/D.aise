"use client";

import { useSidebar } from "@/context/SidebarContext";

export default function MainContentArea({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={`min-h-[calc(100vh-4rem)] pt-16 transition-[padding] duration-300 ease-out ${
        collapsed ? "pl-16" : "pl-64"
      }`}
    >
      {children}
    </main>
  );
}
