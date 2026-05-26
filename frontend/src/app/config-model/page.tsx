import LLMConfigForm from "@/components/features/LLMConfigForm";

export default function ConfigModelPage() {
  return (
    <div className="flex flex-col items-center px-6 py-8 md:px-10 md:py-10">
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-100 md:text-4xl">
        LLM Configuration
      </h1>
      <p className="mt-2 max-w-2xl text-center text-base text-zinc-400">
        Configure the language model used for documentation generation.
      </p>
      <div className="mt-8 w-full max-w-3xl">
        <LLMConfigForm />
      </div>
    </div>
  );
}
