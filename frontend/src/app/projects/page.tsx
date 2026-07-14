import Link from "next/link";
import { FolderOpen } from "lucide-react";

export default function ProjectsIndexPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background-app p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-stroke bg-surface-card text-zinc-500">
        <FolderOpen className="size-6" strokeWidth={1.5} aria-hidden />
      </div>
      <h1 className="mt-5 text-lg font-semibold text-zinc-100">
        Nenhum projeto selecionado
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Selecione um projeto na barra lateral para ver os detalhes, ou crie um
        novo a partir de um repositório.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-brand/90"
      >
        + New Project
      </Link>
    </div>
  );
}
