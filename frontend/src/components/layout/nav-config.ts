import type { LucideIcon } from "lucide-react";
import { FlaskConical, Folder } from "lucide-react";

/** Links da barra superior (Header). */
export const headerNav: readonly {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/", label: "Home", icon: Folder },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/prompt-lab", label: "Prompt Lab", icon: FlaskConical },
] as const;

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
