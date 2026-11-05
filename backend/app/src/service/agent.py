import os
from dotenv import load_dotenv
from google import genai
from app.src.service.project_service import Project
# from app.src.service.prompt_service import Prompt
from app.src.model.prompt_model import Prompt
import tiktoken
import time
import requests


load_dotenv()
# api_key = os.getenv("GEMINI_API_KEY")
# ollama_url = os.getenv("OLLAMA_BASE_URL")
# llm_provider = os.getenv("LLM_PROVIDER")
# model = os.getenv("MODEL")

class Agent:
    # def __init__(self, project: Project, prompt:Prompt):
    def __init__(self, project: Project, prompt:Prompt, llm_config: dict | None = None):
        self.prompt = prompt
        self.project = project
        self.llm_config = llm_config or {}
        # Metadados da última execução (para o histórico de gerações).
        self.last_provider = None
        self.last_model = None
        self.last_temperature = None
        self.last_max_tokens = None
        self.last_usage = None          # {"input": int, "output": int}
        self.last_duration_ms = None

    def _resolve_llm_settings(self):
        """
        Resolve as configurações de LLM priorizando payload do frontend.
        Suporta tanto estrutura plana {llm_provider, model, api_key, ollama_url}
        quanto estrutura aninhada {__lastSavedConfig, gemini, openai, ollama} enviada
        pelo novo frontend via getLlmConfig().
        """
        cfg = self.llm_config

        # Tenta estrutura plana primeiro (compatibilidade legada)
        provider = (cfg.get("llm_provider") or "").strip().lower()
        model_name = (cfg.get("model") or "").strip()
        api_key = (cfg.get("api_key") or "").strip()
        ollama_url = (cfg.get("ollama_url") or "").strip()

        # Fallback: estrutura aninhada enviada pelo novo frontend
        if not provider:
            last = cfg.get("__lastSavedConfig") or {}
            provider = (last.get("provider") or "").strip().lower()
            if not model_name:
                model_name = (last.get("model") or "").strip()

        if not api_key and provider in ("gemini", "openai"):
            provider_cfg = cfg.get(provider) or {}
            api_key = (
                provider_cfg.get("committedApiKey")
                or provider_cfg.get("apiKey")
                or ""
            ).strip()

        if not ollama_url and provider == "ollama":
            ollama_cfg = cfg.get("ollama") or {}
            ollama_url = (
                ollama_cfg.get("committedEndpoint")
                or ollama_cfg.get("endpoint")
                or ""
            ).strip()

        # A API mascara as credenciais, então o payload do frontend não traz mais
        # o segredo real: resolvemos no servidor (decifra cloud / lê local).
        from app.src.service.llm_config_service import resolve_secret

        if provider in ("gemini", "openai") and (not api_key or api_key.startswith("••••")):
            api_key = resolve_secret(provider) or api_key

        if provider == "ollama" and not ollama_url:
            ollama_url = resolve_secret("ollama") or ollama_url

        return provider, model_name, api_key, ollama_url

    def _resolve_generation_params(self):
        """
        Resolve os parâmetros de geração (temperature e máximo de tokens de saída)
        a partir do payload do frontend. Suporta a estrutura plana (legada) e a
        aninhada em `__lastSavedConfig`.

        Retorna (temperature: float | None, max_tokens: int | None). None indica
        "não definido" — nesse caso o parâmetro é omitido e o provedor usa o
        próprio default. `tokens <= 0` é tratado como "sem limite" (omitido).
        """
        cfg = self.llm_config or {}
        last = cfg.get("__lastSavedConfig") or {}

        temp_raw = cfg.get("temperature", last.get("temperature"))
        tokens_raw = cfg.get("tokens", last.get("tokens"))

        temperature = None
        if temp_raw is not None and str(temp_raw).strip() != "":
            try:
                temperature = float(temp_raw)
            except (TypeError, ValueError):
                temperature = None

        max_tokens = None
        if tokens_raw is not None and str(tokens_raw).strip() != "":
            try:
                parsed = int(float(tokens_raw))
                if parsed > 0:
                    max_tokens = parsed
            except (TypeError, ValueError):
                max_tokens = None

        return temperature, max_tokens


# README
    def sugest_initial_Readme(self, prompt):
        """Create a readme.md with AI, create it on temporary"""
        # tree = self.project.tree

        # prompt = self.prompt.initial_readme_template(tree,dependencies,"zs")
        # prompt = self.prompt.content
        # run()
        # resposne = run.response

        # content_Readme = self.run(prompt)
        content_Readme= self.run(prompt)
        # create temporary readme
        nameProject = self.project.name
        base_dir = os.path.join("app", "temporary",  nameProject)
        os.makedirs(base_dir, exist_ok=True)  # cria pastas se não existirem
        
        file_path = os.path.join(base_dir, "README.md")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content_Readme)



        #return sugestion
        # pass

    def create_Readme(self):
        """Create readme on the project path"""
        pass

    def update_Readme(self):
        pass


# CHANGELOG
    def sugest_initial_Changelogmd_by_commits_description_and_titles(self): # melhorar esse nome
        """Create a Changelog.md with AI, create it on temporary
        uses only title and description commits
        """
        pass

    def create_Changelogmd(self):
        pass

    def update_Changelogmd(self):
        pass

    def delete_all_temporary_Changelogmd(self):
        pass

# class suport
    def delete_all_temporary(self):
        pass

    def getConfigDependencies(self, prompt:str):
        return self.run(prompt)

    def analyzeProjectLLM(self):
        # analisar projeto
        """
        Retorna:
        
        name 
        description  
        dependencies_files
        dependencies_content
        main_language
        framework
        installation_file
        has_docker
        run_port
        """

        # prompt

        # get name

        # get description

        # analyze dependencie files,

        # dependencies content

        #  get main language

        # get framework

        # get instalation file

        # get has docker

        #get port

        #
        pass


    def try_extract_info(self):
        # try extract description from readme

        # try extract framework

        # try extract main file

        # try extract dependence file       
        pass

    def count_tokens(text: str):
        # tokenizer semelhante ao usado por Gemini/OpenAI
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))


    def load_mockup(self):
        mockup_path = os.path.join("prompts", "mockup.md")

        if not os.path.exists(mockup_path):
            raise FileNotFoundError("Arquivo mockup.md não encontrado em /prompts")

        with open(mockup_path, "r", encoding="utf-8") as file:
            return file.read()


# Agent
    def run(self):
        USE_LLM = os.getenv("USE_LLM") in ["1", "true", "True", "TRUE"]
        print(f"USE_LLM: {USE_LLM}")

        if not USE_LLM:
            print("USE_LLM desativado. Usando mockup.")
            self.last_provider = "mockup"
            self.last_duration_ms = 0
            return self.load_mockup()

        llm_provider, model_name, api_key, ollama_url = self._resolve_llm_settings()
        temperature, max_tokens = self._resolve_generation_params()
        print(f"Generation params -> temperature: {temperature}, max_tokens: {max_tokens}")

        # Registra o que efetivamente vai rodar (para o histórico de gerações).
        self.last_provider = llm_provider
        self.last_model = model_name
        self.last_temperature = temperature
        self.last_max_tokens = max_tokens

        start = time.perf_counter()
        try:
            if llm_provider == "ollama":
                result = self._run_ollama(
                    model_name=model_name,
                    ollama_url=ollama_url,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            elif llm_provider == "openai":
                result = self._run_openai(
                    model_name=model_name,
                    api_key=api_key,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            else:
                result = self._run_gemini(
                    model_name=model_name,
                    api_key=api_key,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
        finally:
            self.last_duration_ms = int((time.perf_counter() - start) * 1000)
        return result

    def _run_gemini(self, model_name: str, api_key: str, temperature=None, max_tokens=None):
        if not api_key:
            raise RuntimeError("Chave da API do Gemini não informada.")
        if not model_name:
            raise RuntimeError("Modelo não informado para Gemini.")
        print(f"Running Gemini with model: {model_name}")
        try:
            from google.genai import types

            config_kwargs = {}
            if temperature is not None:
                config_kwargs["temperature"] = temperature
            if max_tokens is not None:
                config_kwargs["max_output_tokens"] = max_tokens

            generate_kwargs = {"model": model_name, "contents": self.prompt.content}
            if config_kwargs:
                generate_kwargs["config"] = types.GenerateContentConfig(**config_kwargs)

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(**generate_kwargs)
            try:
                um = getattr(response, "usage_metadata", None)
                if um is not None:
                    self.last_usage = {
                        "input": getattr(um, "prompt_token_count", None),
                        "output": getattr(um, "candidates_token_count", None),
                    }
            except Exception:
                pass
            return response.text
        except Exception as e:
            print(f"Erro ao gerar conteúdo: {e}")
            raise RuntimeError("Erro ao gerar conteúdo via LLM") from e

    def _run_openai(self, model_name: str, api_key: str, temperature=None, max_tokens=None):
        if not api_key:
            raise RuntimeError("Chave da API da OpenAI não informada.")
        if not model_name:
            raise RuntimeError("Modelo não informado para OpenAI.")
        print(f"Running OpenAI with model: {model_name}")
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)
            kwargs = {
                "model": model_name,
                "messages": [{"role": "user", "content": self.prompt.content}],
            }
            if temperature is not None:
                kwargs["temperature"] = temperature
            if max_tokens is not None:
                # param atual (substitui max_tokens; funciona em gpt-4o e o-series)
                kwargs["max_completion_tokens"] = max_tokens

            try:
                response = client.chat.completions.create(**kwargs)
            except Exception as e:
                # Modelos de raciocínio (o-series/gpt-5) rejeitam temperature!=1;
                # tenta novamente sem o parâmetro.
                if "temperature" in str(e).lower() and "temperature" in kwargs:
                    kwargs.pop("temperature", None)
                    response = client.chat.completions.create(**kwargs)
                else:
                    raise

            try:
                usage = getattr(response, "usage", None)
                if usage is not None:
                    self.last_usage = {
                        "input": getattr(usage, "prompt_tokens", None),
                        "output": getattr(usage, "completion_tokens", None),
                    }
            except Exception:
                pass

            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"Erro ao gerar conteúdo (OpenAI): {e}")
            raise RuntimeError(f"Erro ao gerar conteúdo via OpenAI: {e}") from e

    def _run_ollama(self, model_name: str, ollama_url: str, temperature=None, max_tokens=None):
        if not ollama_url:
            raise RuntimeError("URL do endpoint Ollama não informada.")
        if not model_name:
            raise RuntimeError("Modelo não informado para Ollama.")
        print(f"Running Ollama with model: {model_name}")

        # Ollama recebe os parâmetros de geração em `options` (num_predict = máx.
        # de tokens de saída). Só enviamos o que estiver definido.
        options = {}
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens

        body = {"model": model_name, "prompt": self.prompt.content, "stream": False}
        if options:
            body["options"] = options

        response = requests.post(
            f"{ollama_url}/api/generate",
            json=body,
            timeout=300
        )
        data = response.json()
        if "response" not in data:
            error_msg = data.get("error", str(data))
            raise RuntimeError(f"Ollama retornou resposta inesperada: {error_msg}")
        self.last_usage = {
            "input": data.get("prompt_eval_count"),
            "output": data.get("eval_count"),
        }
        return data["response"]

    def summarize_text(self, text: str, max_chunk_tokens: int = 30000) -> str:
        """
        Resumir texto grande dividindo em chunks menores para evitar limite de tokens.
        
        Args:
            text: Texto a ser resumido
            max_chunk_tokens: Número máximo de tokens por chunk (padrão: 30000)
        
        Returns:
            str: Texto resumido
        """
        import tiktoken
        
        # Inicializa tokenizer
        enc = tiktoken.get_encoding("cl100k_base")
        
        # Tokeniza o texto completo
        tokens = enc.encode(text)
        total_tokens = len(tokens)
        
        print(f"Total de tokens no texto original: {total_tokens}")
        
        # Se o texto é pequeno o suficiente, resume diretamente
        if total_tokens <= max_chunk_tokens:
            print("Texto pequeno, resumindo diretamente...")
            prompt = f"""Por favor, resuma o seguinte texto de forma concisa, mantendo as informações mais importantes:

    {text}

    Resumo:"""
            return self._run_with_retry(prompt)
        
        # Divide o texto em chunks
        print(f"Texto grande, dividindo em chunks de ~{max_chunk_tokens} tokens...")
        chunks = []
        current_pos = 0
        
        while current_pos < total_tokens:
            # Pega um chunk de tokens
            end_pos = min(current_pos + max_chunk_tokens, total_tokens)
            chunk_tokens = tokens[current_pos:end_pos]
            chunk_text = enc.decode(chunk_tokens)
            chunks.append(chunk_text)
            current_pos = end_pos
        
        print(f"Texto dividido em {len(chunks)} chunks")
        
        # Resume cada chunk individualmente
        summaries = []
        for i, chunk in enumerate(chunks):
            print(f"Resumindo chunk {i+1}/{len(chunks)}...")
            
            prompt = f"""Por favor, resuma o seguinte trecho de texto de forma concisa, mantendo as informações mais importantes:

    {chunk}

    Resumo:"""
            
            summary = self._run_with_retry(prompt)
            summaries.append(summary)
            
            # Delay progressivo para evitar sobrecarga
            if i < len(chunks) - 1:
                delay = min(2 + (i * 0.5), 10)  # Aumenta gradualmente até 10s
                print(f"Aguardando {delay:.1f}s antes do próximo chunk...")
                time.sleep(delay)
        
        # Se gerou apenas um resumo, retorna direto
        if len(summaries) == 1:
            return summaries[0]
        
        # Combina todos os resumos
        combined_summaries = "\n\n".join(summaries)
        
        # Verifica se os resumos combinados ainda são muito grandes
        combined_tokens = len(enc.encode(combined_summaries))
        print(f"Resumos combinados têm {combined_tokens} tokens")
        
        if combined_tokens > max_chunk_tokens:
            # Se os resumos combinados ainda são grandes, resume recursivamente
            print("Resumos ainda grandes, aplicando resumo final...")
            time.sleep(3)  # Delay antes da recursão
            return self.summarize_text(combined_summaries, max_chunk_tokens)
        
        # Resume os resumos em um resumo final
        print("Criando resumo final...")
        time.sleep(2)
        final_prompt = f"""Por favor, combine e resuma os seguintes resumos em um texto coeso e conciso:

    {combined_summaries}

    Resumo final:"""
        
        return self._run_with_retry(final_prompt)


    def _run_with_retry(self, prompt: str, max_retries: int = 5) -> str:
        """
        Executa o modelo com retry automático em caso de erro 503.
        
        Args:
            prompt: Prompt a ser enviado
            max_retries: Número máximo de tentativas (padrão: 5)
        
        Returns:
            str: Resposta do modelo
        """
        from google.genai.errors import ServerError
        
        for attempt in range(max_retries):
            try:
                return self.run(prompt)
            except ServerError as e:
                if '503' in str(e) or 'overloaded' in str(e).lower():
                    if attempt < max_retries - 1:
                        # Backoff exponencial: 5s, 10s, 20s, 40s, 80s
                        wait_time = 5 * (2 ** attempt)
                        print(f"⚠️  Modelo sobrecarregado. Tentativa {attempt + 1}/{max_retries}. Aguardando {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        print(f"❌ Falhou após {max_retries} tentativas.")
                        raise
                else:
                    # Se não for erro 503, lança exceção imediatamente
                    raise
            except Exception as e:
                print(f"❌ Erro inesperado: {e}")
                raise
        
        raise Exception("Número máximo de tentativas excedido")