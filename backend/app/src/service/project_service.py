from app.src.model.project_model import Project
from app.src.model.prompt_model import Prompt as PromptModel
from flask import jsonify
import os
import subprocess
import sys
from app.src.service.agent import Agent
from app.src.service.prompt_service import Prompt
import json
import re
from datetime import datetime
import platform

class ProjectService:
    def __init__(self):
        self.projects = {}  # cache opcional

    def select_path(self):
        # Import tardio: tkinter só é necessário ao abrir o seletor nativo de
        # pastas (uso local). Mantê-lo fora do topo permite que o backend suba
        # em ambientes sem GUI/Tk (ex.: container Docker headless).
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()  # oculta a janela principal
        root.attributes("-topmost", True)
        folder_path = filedialog.askdirectory(title="Selecione uma pasta")
        root.destroy()
        return folder_path
    
    
        
    def open_folder(self, folder_path: str):
        system = platform.system()

        if system == "Windows":
            return self.open_folder_windows(folder_path)

        elif system == "Darwin":  # macOS
            return self.open_folder_macos(folder_path)

        elif system == "Linux":
            return self.open_folder_linux(folder_path)

        else:
            raise OSError(f"Sistema operacional não suportado: {system}")

    def open_folder_windows(self, folder_path: str):
        """Abre a pasta no explorador de arquivos, sempre em foco e sem maximizar."""
        if not folder_path or not os.path.exists(folder_path):
            raise ValueError("Caminho inválido ou inexistente.")

        try:
            if os.name == "nt":  # Windows
                subprocess.Popen([
                    "explorer",
                    os.path.normpath(folder_path)
                ], shell=True)

            elif os.name == "posix":  # macOS / Linux
                subprocess.Popen(["xdg-open", folder_path])
            else:
                raise OSError("Sistema operacional não suportado.")
        except Exception as e:
            print(f"Erro ao abrir pasta: {e}")
            raise
    

    def open_folder_macos(self, folder_path: str):
        pass


    def open_folder_linux(self, folder_path: str):
        pass


    def extract_info(self):
        # pega nome
        self.name = self.get_folder_name()

        # pega tree
        # self.tree = self.getTree()

    def get_folder_name(self):
        return os.path.basename(os.path.normpath(self.path))

    def save_project(self, data: dict):
        """Cria e salva um novo projeto"""
        project = Project(**data)
        project.save()
        self.projects[project.name] = project
        return project.to_dict()
    
    def read(self):
        pass

    def update(self):
        pass

    def analyzeProject(self, project: Project):
        pass


    def generate_readme_v1(self, data):
        """
        [DEPRECATED]
        Versão antiga do gerador de README.
        Mantida por compatibilidade.

        foi renomeda de generate_readme para generate_readme_v1
        """

        """
        Gera o README de um projeto com base nos campos enviados pelo frontend.
        O campo 'tree' é apenas um sinalizador — se True, o backend monta a árvore.
        """
        try:
            folder_name = data.get("folder_name")
            project = Project(folder_name=folder_name)

            if not project:
                return {"error": f"Projeto '{folder_name}' não encontrado."}, 404

            project.name = data.get("name", project.name)
            project.folder_name = data.get("folder_name", project.folder_name)
            project.description = data.get("description", project.description)
            project.language = data.get("language", project.language)
            project.framework = data.get("framework", project.framework)
            project.path = data.get("path", project.path)
            project.dependence_file_name = data.get("dependence_file_name", project.dependence_file_name)
            _ = project.dependence_file_content

            if data.get("tree"):
                project.tree = project.get_tree()

            llm_config = data.get("llm_config") or {}

            prompt = Prompt(project)
            prompt.create_readme_template()
            agent = Agent(project, prompt, llm_config=llm_config)

            raw_response = agent.run()
            cleaned_response = self._extract_json(raw_response)

            try:
                parsed = json.loads(cleaned_response)
            except json.JSONDecodeError:
                parsed = {"content": raw_response}

            content = parsed.get("content", raw_response)

            #  Salva o conteúdo do README no diretório sequencial
            self._save_generated_readme(project, content)

            return {"content": parsed.get("content", raw_response)}, 200

        except Exception as e:
            print("Erro em generate_readme:", e)
            return {"error": str(e)}, 500
        
    def generate_readme(self, data):
        try:
            print("aqui esta indo 🎃 1")

            llm_config = data.get("llm_config") or {}

            folder_name = data.get("folder_name")

            # Carrega do disco para preservar source/github_repo
            saved = Project().find_project_by_folder_name(folder_name)
            if saved:
                project = saved
            else:
                project = Project(folder_name=folder_name)

            project.name = data.get("name", project.name)
            project.folder_name = data.get("folder_name", project.folder_name)
            project.description = data.get("description", project.description)
            project.language = data.get("language", project.language)
            project.framework = data.get("framework", project.framework)
            project.path = data.get("path", project.path)
            project.dependence_file_name = data.get("dependence_file_name", project.dependence_file_name)
            _ = project.dependence_file_content
            print("aqui esta indo 🎃 2")

            if data.get("tree"):
                if project.source == "github":
                    # Para projetos GitHub: busca árvore atualizada da API
                    from app.src.service.github_service import GithubService
                    github_token = llm_config.get("github_token", "")
                    if not github_token:
                        _config_path = os.path.join("data", "config", "llm_config.json")
                        if os.path.exists(_config_path):
                            with open(_config_path, "r", encoding="utf-8") as _f:
                                _cfg = json.load(_f)
                            github_token = _cfg.get("github", {}).get("committedToken", "")
                    svc = GithubService(token=github_token)
                    owner, repo_name = project.github_repo.split("/", 1)
                    info = svc.get_repo_info(owner, repo_name)
                    project.tree = svc.get_tree(owner, repo_name, info["default_branch"])
                else:
                    project.tree = project.get_tree()
            else:
                project.tree = ""

            # Busca commits se solicitado
            commit_options = data.get("commit_options") or []
            if commit_options:
                has_title_desc = "title_description" in commit_options
                has_diffs = "diffs" in commit_options
                try:
                    if project.source == "github":
                        from app.src.service.github_service import GithubService
                        github_token = llm_config.get("github_token", "")
                        if not github_token:
                            _config_path = os.path.join("data", "config", "llm_config.json")
                            if os.path.exists(_config_path):
                                with open(_config_path, "r", encoding="utf-8") as _f:
                                    _cfg = json.load(_f)
                                github_token = _cfg.get("github", {}).get("committedToken", "")
                        owner, repo_name = project.github_repo.split("/", 1)
                        svc = GithubService(token=github_token)
                        if has_title_desc and not has_diffs:
                            project.commits = svc.get_commits_title_description(
                                owner, repo_name, "date_range", None, None, None, None
                            )
                        elif has_diffs:
                            project.commits = svc.get_commits_with_compare(
                                owner, repo_name, "date_range", None, None, None, None
                            )
                    else:
                        if has_title_desc and has_diffs:
                            project.set_commits_combined(range_type="date_range")
                        elif has_title_desc:
                            project.set_commits_by_title_description(range_type="date_range")
                        elif has_diffs:
                            project.set_commits_by_diff(range_type="date_range")
                except Exception as e:
                    print(f"⚠️ Commits não pôde ser obtido para geração do README: {e}")

            # 1. Caminho do arquivo de defaults
            defaults_path = os.path.join("data", "config", "default_prompts.json")

            if not os.path.exists(defaults_path):
                print("\n\n got an error here \n\n")
                return {"error": "Arquivo default_prompts.json não encontrado."}, 500

            print("aqui esta indo 🎃 3")

            # 2. Carrega defaults
            with open(defaults_path, "r", encoding="utf-8") as f:
                defaults = json.load(f)

            prompt_id = defaults.get("create_readme")

            print("aqui esta indo 🎃 4")

            if not prompt_id:
                return {"error": "Prompt default para create_readme não configurado."}, 400

            # 3. Instancia model Prompt (gerenciador)
            prompt_model = PromptModel()
            prompt_model.project = project


            # 4. Busca prompt pelo ID
            prompt : PromptModel | None = prompt_model.get_prompt_by_id(prompt_id)
            print("aqui esta indo 🎃 5")

            if not prompt:
                print("aqui esta indo 🎃 5.5")
                return {
                    "error": f"Prompt com id '{prompt_id}' não encontrado."
                }, 404
            print("aqui esta indo 🎃 6")
            agent = Agent(project, prompt, llm_config=llm_config)

            raw_response = agent.run()
            cleaned_response = self._extract_json(raw_response)

            print("aqui esta indo 🎃 7")

            try:
                parsed = json.loads(cleaned_response)
            except json.JSONDecodeError:
                parsed = {"content": raw_response}

            content = parsed.get("content", raw_response)

            #  Salva o conteúdo do README no diretório sequencial
            self._save_generated_readme(project, content)

            return {"content": parsed.get("content", raw_response)}, 200

        except Exception as e:
            print("Erro em generate_readme:", e)
            return {"error": str(e)}, 500
        

    def _extract_json(self, text: str) -> str:
        """
        Extrai o JSON de dentro de um possível markdown do tipo ```json ... ```
        ou ``` ... ```
        """
        # Remove blocos de código Markdown
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return match.group(1)
        else:
            # tenta retornar apenas o que parece JSON
            json_match = re.search(r"(\{.*\})", text, re.DOTALL)
            return json_match.group(1) if json_match else "{}"


    def _save_generated_readme(self, project: 'Project', content: str):
        """
        Salva o README gerado em app/output/<folder_name>/readme/
        com nome sequencial (readme1.md, readme2.md, ...).
        """
        try:
            base_dir = os.path.join("app", "output", project.folder_name, "readme")
            os.makedirs(base_dir, exist_ok=True)

            # Listar arquivos README existentes
            existing_files = [f for f in os.listdir(base_dir) if re.match(r'readme(\d*)\.md', f, re.IGNORECASE)]

            # Encontrar o maior número existente
            max_num = 0
            for f in existing_files:
                match = re.match(r'readme(\d*)\.md', f, re.IGNORECASE)
                if match:
                    num = match.group(1)
                    if num.isdigit():
                        num = int(num)
                        if num > max_num:
                            max_num = num

            # Novo número será o maior + 1
            new_num = max_num + 1
            filename = f"README{new_num}.md"
            filepath = os.path.join(base_dir, filename)

            # Criar o arquivo
            with open(filepath, "w", encoding="utf-8") as file:
                file.write(content)

            print(f"✅ README salvo em: {filepath}")
            return filepath

        except Exception as e:
            print(f"❌ Erro ao salvar README: {e}")
            return None

    def update_readme_v1(self, data):
        """
        [DEPRECATED]
        Versão antiga do gerador de README.
        Mantida por compatibilidade.

        foi renomeda de generate_readme para generate_readme_v1
        """
        # -----------
        """
        Gera o README de um projeto com base nos campos enviados pelo frontend.
        O campo 'tree' é apenas um sinalizador — se True, o backend monta a árvore.
        """
        llm_config = data.get("llm_config") or {}

        folder_name = data.get("folder_name")
        commit_options = data.get("commit_options", [])
        range_type = data.get("range_type")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        start_hash = data.get("start_hash")
        end_hash = data.get("end_hash")
        description = data.get("description")
        name = data.get("name")
        path = data.get("path") or Project().find_path_by_folder_name(folder_name)
        

        # 1. Instancia a model
        # project = Project().find_project_by_folder_name(folder_name)
        project = Project(path=path, name=name, description=description, folder_name=folder_name )
        print(f" 🎃🎃🎃 Projeto instanciado: {project.folder_name} em {project.path} 🎃🎃🎃 \n")
        print(f"data recebida: {data}")

        if range_type == "since_last_readme":
            readme_last_modification = project.get_readme_last_modified()
            #  começa a contar a partir da última modificação do README
            start_date = readme_last_modification

            #  termina hoje
            end_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if project is None:
            return {"error": "Projeto não encontrado."}, 404

        # ============================
        # 2. Escolha baseada em commit_options
        # ============================
        has_title_desc = "title_description" in commit_options
        has_diffs = "diffs" in commit_options

        if not commit_options:
            return {"error": "Nenhuma opção de commit selecionada."}, 400

        # Só título + descrição
        if has_title_desc and not has_diffs:
            print("\n\n\n\n\nhas diff\n\n\n\n\n")
            project.set_commits_by_title_description(
                range_type=range_type,
                start_date=start_date,
                end_date=end_date,
                start_hash=start_hash,
                end_hash=end_hash
            )

        # Só diffs
        elif has_diffs and not has_title_desc:
            print("🎃🎃🎃🎃")
            project.set_commits_by_diff(
                range_type=range_type,
                start_date=start_date,
                end_date=end_date,
                start_hash=start_hash,
                end_hash=end_hash
            )

        # Os dois
        elif has_title_desc and has_diffs:
            project.set_commits_combined(
                range_type=range_type,
                start_date=start_date,
                end_date=end_date,
                start_hash=start_hash,
                end_hash=end_hash
            )

        else:
            return {"error": "Opções de commit inválidas."}, 400


        # ============================
        # 3. Instancia Prompt
        # ============================
        prompt = Prompt(project)
        prompt.set_update_readme_template()
        # emoji adicinado propositalmente pra ajudar a achar o print no console.
        print("🚨🚨🚨 PROMPT 🚨🚨🚨")
        print(prompt)

        agent = Agent(project, prompt, llm_config=llm_config)
        # retorno de teste apenas para evitar a execucao da LLM
        # return {"debug": "execucao parada aqui"}, 400
        raw_response = agent.run()
        cleaned_response = self._extract_json(raw_response)

        

        # continuar daqui
        try:
            parsed = json.loads(cleaned_response)
        except json.JSONDecodeError:
            parsed = {"content": raw_response}

        content = parsed.get("content", raw_response)

        # ============================
        # 4. Salva o README no output
        # ============================
        readme_path = self._save_generated_readme(project, content)

        # ============================
        # 5. Retorna o conteúdo gerado
        # ============================
        return {"content": {"old_readme": project.readme_content, "updated_readme": content}, "path": readme_path}, 200

    def update_readme(self, data):
        llm_config = data.get("llm_config") or {}

        folder_name = data.get("folder_name")
        path = data.get("path") or Project().find_path_by_folder_name(folder_name)
        commit_options = data.get("commit_options", [])
        description = data.get("description")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        framework = data.get("framework")
        language = data.get("language")
        name = data.get("name")
        range_type = data.get("range_type")
        start_hash = data.get("start_hash")
        end_hash = data.get("end_hash")
        dependence_file_name = data.get("dependence_file_name")

        # 1. Instancia de Project — carrega dados salvos para obter source/github_repo
        saved = Project().find_project_by_folder_name(folder_name)
        if saved:
            project = saved
            # sobrescreve campos que vieram do frontend (podem ter sido editados)
            if path:
                project.path = path
            if name:
                project.name = name
            if description:
                project.description = description
            if framework:
                project.framework = framework
            if language:
                project.language = language
            if dependence_file_name:
                project.dependence_file_name = dependence_file_name
        else:
            project = Project(
                path=path,
                folder_name=folder_name,
                name=name,
                description=description,
                framework=framework,
                language=language,
                dependence_file_name=dependence_file_name
            )

        if range_type == "since_last_readme":
            if project.source == "github":
                # Para repos GitHub não há arquivo local; usa data de hoje menos 30 dias como fallback
                from datetime import timedelta
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
            else:
                readme_last_modification = project.get_readme_last_modified()
                start_date = readme_last_modification
            end_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if project is None:
            return {"error": "Projeto não encontrado."}, 404

        # ============================
        # 2. Escolha baseada em commit_options
        # ============================
        has_title_desc = "title_description" in commit_options
        has_diffs = "diffs" in commit_options

        if not commit_options:
            return {"error": "Nenhuma opção de commit selecionada."}, 400

        if project.source == "github":
            # ============================
            # Fluxo GitHub API
            # ============================
            from app.src.service.github_service import GithubService
            github_token = llm_config.get("github_token", "")
            owner, repo_name = project.github_repo.split("/", 1)
            svc = GithubService(token=github_token)

            try:
                if has_title_desc and not has_diffs:
                    # Caminho 1: 1 chamada ao endpoint de lista, sem N+1
                    project.commits = svc.get_commits_title_description(
                        owner, repo_name, range_type,
                        start_date, end_date, start_hash, end_hash
                    )
                elif has_diffs:
                    # Caminho 2: compare endpoint — máximo 2 chamadas, diffs combinados + commits individuais
                    project.commits = svc.get_commits_with_compare(
                        owner, repo_name, range_type,
                        start_date, end_date, start_hash, end_hash
                    )
                else:
                    return {"error": "Opções de commit inválidas."}, 400
            except RuntimeError as e:
                return {"error": str(e)}, 500

        else:
            # ============================
            # Fluxo local GitPython (sem alteração)
            # ============================
            if has_title_desc and not has_diffs:
                project.set_commits_by_title_description(
                    range_type=range_type,
                    start_date=start_date,
                    end_date=end_date,
                    start_hash=start_hash,
                    end_hash=end_hash
                )
            elif has_diffs and not has_title_desc:
                project.set_commits_by_diff(
                    range_type=range_type,
                    start_date=start_date,
                    end_date=end_date,
                    start_hash=start_hash,
                    end_hash=end_hash
                )
            elif has_title_desc and has_diffs:
                project.set_commits_combined(
                    range_type=range_type,
                    start_date=start_date,
                    end_date=end_date,
                    start_hash=start_hash,
                    end_hash=end_hash
                )
            else:
                return {"error": "Opções de commit inválidas."}, 400

        # Cap total de commits para evitar prompts gigantes
        MAX_COMMITS_CHARS = 8000
        if project.commits and len(project.commits) > MAX_COMMITS_CHARS:
            project.commits = project.commits[:MAX_COMMITS_CHARS] + "\n... [commits truncated]"

        prompt_model = PromptModel()
        prompt_model.project = project

        # Caminho do arquivo de defaults
        defaults_path = os.path.join("data", "config", "default_prompts.json")
        
        with open(defaults_path, "r", encoding="utf-8") as f:
            defaults = json.load(f)

        prompt_id = defaults.get("update_readme")

        prompt = prompt_model.get_prompt_by_id(prompt_id)

        agent = Agent(project, prompt, llm_config=llm_config)
        # retorno de teste apenas para evitar a execucao da LLM
        # return {"debug": "execucao parada aqui"}, 400
        raw_response = agent.run()
        cleaned_response = self._extract_json(raw_response)

        

        # continuar daqui
        try:
            parsed = json.loads(cleaned_response)
        except json.JSONDecodeError:
            parsed = {"content": raw_response}

        content = parsed.get("content", raw_response)

        # ============================
        # 4. Salva o README no output
        # ============================
        readme_path = self._save_generated_readme(project, content)

        # ============================
        # 5. Retorna o conteúdo gerado
        # ============================
        if project.source == "github":
            owner, repo_name = project.github_repo.split("/", 1)
            github_token = llm_config.get("github_token", "")
            svc = GithubService(token=github_token)
            old_readme = svc.get_readme_content(owner, repo_name)
        else:
            old_readme = project.readme_content

        return {"content": {"old_readme": old_readme, "updated_readme": content}, "path": readme_path}, 200



    def copiar_para_clipboard(self, texto: str):
        process = subprocess.Popen('clip', stdin=subprocess.PIPE, shell=True)
        process.communicate(input=texto.encode('utf-16le'))
        print("✅ Texto copiado para o clipboard!")

    def apply_readme(self, data):
        """
        Sobrescreve o README.md dentro do repositório real.
        """
        try:
            path = data.get("path")              # caminho do projeto
            content = data.get("readme_text") or data.get("readme_content")

            if not path or not content:
                return {"error": "Path ou conteúdo do README ausente."}, 400

            # Garante que o projeto existe
            if not os.path.isdir(path):
                return {"error": f"O diretório '{path}' não existe."}, 404

            # Caminho final do README.md
            readme_path = os.path.join(path, "README.md")

            # Verifica USO DE LLM
            USE_LLM = os.getenv("USE_LLM") in ["1", "true", "True", "TRUE"]
            if not USE_LLM:
                return {
                    "message": "README aplicado com sucesso. (MOCKUP MODE)",
                    "readme_path": readme_path
                }, 200


            # Cria ou sobrescreve o README
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "message": "README aplicado com sucesso.",
                "readme_path": readme_path
            }, 200

        except Exception as e:
            print(f"Erro ao aplicar README: {e}")
            return {"error": str(e)}, 500

    def apply_readme_github(self, data):
        """
        Cria ou atualiza o README.md diretamente no repositório GitHub via GitHub Contents API.
        """
        try:
            folder_name = data.get("folder_name")
            readme_content = data.get("readme_content")
            commit_message = data.get("commit_message", "docs: update README")
            commit_title = data.get("commit_title", "").strip()
            llm_config = data.get("llm_config", {})

            if not folder_name or not readme_content:
                return {"error": "folder_name ou readme_content ausente."}, 400

            project = Project().find_project_by_folder_name(folder_name)
            if not project:
                return {"error": "Projeto não encontrado."}, 404
            if getattr(project, "source", None) != "github":
                return {"error": "Projeto não é do GitHub."}, 400

            github_repo = getattr(project, "github_repo", "") or ""
            if "/" not in github_repo:
                return {"error": "github_repo inválido no projeto."}, 400
            owner, repo_name = github_repo.split("/", 1)
            github_token = llm_config.get("github_token", "")
            if not github_token:
                _config_path = os.path.join("data", "config", "llm_config.json")
                if os.path.exists(_config_path):
                    try:
                        with open(_config_path, "r", encoding="utf-8") as _f:
                            _cfg = json.load(_f)
                        github_token = (_cfg.get("github") or {}).get("committedToken", "") or ""
                    except Exception:
                        pass

            from app.src.service.github_service import GithubService
            svc = GithubService(token=github_token)

            full_message = f"{commit_title}\n\n{commit_message}".strip() if commit_title else commit_message
            result = svc.create_or_update_readme(owner, repo_name, readme_content, full_message)
            html_url = result.get("content", {}).get("html_url", "")
            return {"message": "README aplicado ao repositório GitHub com sucesso.", "url": html_url}, 200

        except RuntimeError as e:
            return {"error": str(e)}, 500
        except Exception as e:
            print(f"Erro ao aplicar README no GitHub: {e}")
            return {"error": str(e)}, 500


    def git_commit(self, data):
        USE_LLM = os.getenv("USE_LLM") in ["1", "true", "True", "TRUE"]
        if not USE_LLM:
            return  {
                "message": "Commit realizado com sucesso! MOCKUP MODE",
                "commit_hash": "mocked-hash-1234567890",
                "stdout": "Mocked commit output since USE_LLM is disabled."
            }, 200
        """
        Realiza commit no repositório usando apenas o path, commit_title e commit_message.
        Retorna a hash do commit.
        """

        try:
            repo_path = data.get("path")
            commit_title = data.get("commit_title", "").strip()
            commit_message = data.get("commit_message", "").strip()

            if not repo_path:
                return {"error": "Path do repositório não informado."}, 400
            if not os.path.isdir(repo_path):
                return {"error": f"O diretório '{repo_path}' não existe."}, 404
            if not commit_title:
                return {"error": "Título do commit ausente."}, 400
            if not commit_message:
                return {"error": "Mensagem do commit ausente."}, 400

            # Verifica se é um repositório git
            if not os.path.isdir(os.path.join(repo_path, ".git")):
                return {"error": "Este diretório não é um repositório Git."}, 400

            # ============================================================
            # GIT ADD
            # ============================================================
            add_result = subprocess.run(
                ["git", "add", "README.md"],
                cwd=repo_path,
                capture_output=True,
                text=True
            )

            if add_result.returncode != 0:
                return {
                    "error": "Falha ao adicionar README.md",
                    "details": add_result.stderr
                }, 500

            # ============================================================
            # GIT COMMIT
            # ============================================================
            commit_result = subprocess.run(
                ["git", "commit", "-m", commit_title, "-m", commit_message],
                cwd=repo_path,
                capture_output=True,
                text=True
            )

            # Sem mudanças
            if "nothing to commit" in commit_result.stdout.lower() or \
            "nothing to commit" in commit_result.stderr.lower():
                return {"message": "Nenhuma alteração para commitar."}, 200

            if commit_result.returncode != 0:
                return {
                    "error": "Erro ao realizar commit.",
                    "details": commit_result.stderr
                }, 500

            # ============================================================
            # PEGAR A HASH DO COMMIT
            # ============================================================
            hash_result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_path,
                capture_output=True,
                text=True
            )

            if hash_result.returncode != 0:
                return {
                    "error": "Commit feito, mas não foi possível obter a hash.",
                    "details": hash_result.stderr
                }, 500

            commit_hash = hash_result.stdout.strip()

            return {
                "message": "Commit realizado com sucesso!",
                "commit_hash": commit_hash,
                "stdout": commit_result.stdout
            }, 200

        except Exception as e:
            return {"error": str(e)}, 500


    def undo_commit(self, data):
        folder_name = data.get("folder_name")
        path = data.get("path")
        commit_hash = data.get("commit_hash")

        USE_LLM = os.getenv("USE_LLM") in ["1", "true", "True", "TRUE"]
        if not USE_LLM:
            return jsonify({
                "status": "success",
                "message": "MOCKUP MODE:",
                "reverted_commit": "mocked-hash-1234567890"
            }), 200

        # precisa da hash obrigatoriamente
        if not commit_hash:
            return jsonify({"error": "Hash do commit é obrigatória para desfazer."}), 400

        # validações antigas
        if not folder_name and not path:
            return jsonify({"error": "folder_name ou path é obrigatório"}), 400

        repo_path = path if path else os.path.join(BASE_PROJECTS_FOLDER, folder_name)

        if not os.path.isdir(repo_path):
            return jsonify({"error": "Repositório não encontrado no caminho informado."}), 404

        try:
            # verificar se é git
            if not os.path.isdir(os.path.join(repo_path, ".git")):
                return jsonify({"error": "Este projeto não é um repositório Git válido."}), 400

            # ============================================================
            # VALIDA SE A HASH EXISTE NO REPOSITÓRIO
            # ============================================================
            check_hash = subprocess.run(
                ["git", "cat-file", "-t", commit_hash],
                cwd=repo_path,
                capture_output=True,
                text=True
            )

            if check_hash.returncode != 0:
                return jsonify({
                    "error": "A hash informada não existe no repositório.",
                    "details": check_hash.stderr.strip()
                }), 400

            # ============================================================
            # REALIZA O RESET PARA DESFAZER SOMENTE AQUELE COMMIT
            # git reset --soft HASH^
            # ============================================================
            result = subprocess.run(
                ["git", "reset", "--soft", f"{commit_hash}^"],
                cwd=repo_path,
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                return jsonify({
                    "error": "Falha ao desfazer commit.",
                    "details": result.stderr.strip()
                }), 500

            return jsonify({
                "status": "success",
                "message": "Commit revertido com sucesso!",
                "reverted_commit": commit_hash
            }), 200

        except Exception as e:
            return jsonify({
                "error": "Erro inesperado ao desfazer commit.",
                "details": str(e)
            }), 500

    def clone_repository(self, url: str):
        """
        Clona um repositório Git para a pasta /repositories
        na raiz da aplicação.
        """

        if not url or not url.strip():
            raise ValueError("URL não informada.")

        url = url.strip()

        # pega nome repo da url
        repo_name = (
            url.rstrip("/")
            .split("/")[-1]
            .replace(".git", "")
        )

        # pasta repositories na raiz
        repositories_dir = os.path.join("repositories")
        os.makedirs(repositories_dir, exist_ok=True)

        clone_path = os.path.join(repositories_dir, repo_name)

        # evita sobrescrever
        if os.path.exists(clone_path):
            raise FileExistsError(
                f"O repositório '{repo_name}' já existe."
            )

        print(f"Clonando repositório em: {clone_path}")

        result = subprocess.run(
            ["git", "clone", url, clone_path],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise RuntimeError(
                result.stderr.strip()
            )

        print("✅ Repositório clonado com sucesso.")

        return clone_path