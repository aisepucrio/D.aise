"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MainContentArea from "@/components/layout/MainContentArea";
import { PromptLabProvider } from "@/context/PromptLabContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ConfirmProvider } from "@/context/ConfirmContext";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-app">
      <Loader2 className="size-6 animate-spin text-brand" strokeWidth={2} />
    </div>
  );
}

/** Chrome da aplicação (só quando autenticado). */
function AppShell({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      <PromptLabProvider>
        <SidebarProvider>
          <Header />
          <div className="fixed left-0 top-16 z-[100] flex h-[calc(100vh-4rem)]">
            <Sidebar />
          </div>
          <MainContentArea>{children}</MainContentArea>
        </SidebarProvider>
      </PromptLabProvider>
    </ConfirmProvider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (status === "unauthenticated" && !isLoginRoute) {
      router.replace("/login");
    }
    if (status === "authenticated" && isLoginRoute) {
      router.replace("/");
    }
  }, [status, isLoginRoute, router]);

  if (status === "loading") return <FullScreenSpinner />;

  // Rota de login: sempre sem o chrome da app.
  if (isLoginRoute) {
    return status === "authenticated" ? <FullScreenSpinner /> : <>{children}</>;
  }

  // Rotas protegidas: só renderiza o app quando autenticado.
  if (status !== "authenticated") return <FullScreenSpinner />;

  return <AppShell>{children}</AppShell>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
