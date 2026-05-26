"use client";

import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MainContentArea from "@/components/layout/MainContentArea";
import PromptLibraryPanel from "@/components/features/PromptLibraryPanel";
import { PromptLabProvider } from "@/context/PromptLabContext";
import { SidebarProvider } from "@/context/SidebarContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PromptLabProvider>
      <SidebarProvider>
        <Header />
        <div className="fixed left-0 top-16 z-[100] flex h-[calc(100vh-4rem)]">
          <Sidebar />
          {/* <PromptLibraryPanel /> */}
        </div>
        <MainContentArea>{children}</MainContentArea>
      </SidebarProvider>
    </PromptLabProvider>
  );
}
