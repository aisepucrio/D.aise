import { redirect } from "next/navigation";

// A configuração de LLM foi movida para /profile (aba "LLM Configs").
export default function ConfigModelPage() {
  redirect("/profile");
}
