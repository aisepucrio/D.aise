from flask import jsonify
from app.src.service.project_service import ProjectService
from app.src.service.agent import Agent
from app.src.service.prompt_service import Prompt
from app.src.model.prompt_model import Prompt as PromptModel
from app.src.model.project_model import Project
import re, json
import os
from datetime import datetime

from app.src.model.project_model import Project

from flask import jsonify
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================



from app.src.service.project_service import ProjectService


class ProjectControl:
    def __init__(self):
        self.service = ProjectService()

    def choose_local_repository(self):
        try:
            status = 400 
            service = ProjectService()
            path = service.select_path()
            msg =  "Nenhum diretório foi selecionado."

            if not path:
                return {
                    "status": status,
                    "message": msg
                }

            folder_name = os.path.basename(path)
            project = Project(path=path)
            # verifica se existe já
            existing = project.find_project_by_folder_name(folder_name)

            if existing:
                # return {
                #     "status": 409,
                #     "message": "Este repositório já está salvo no sistema.",
                # }
                status = 409
                msg = "Este repositório já está salvo no sistema."
                project = existing
            else:
                project.extract_info()
                project.set_tree()
                project.has_readme = bool(project.readme_content)
                project.save()
                status = 200
                msg = "Repositório carregado com sucesso."

            project_json = {
                "path": project.path,
                "name": project.name,
                "folder_name": project.folder_name,
                "tree": project.tree,
                "description": project.description,
                "readme": project.readme,
                "changelog": project.changelog,
                "language": project.language,
                "framework": project.framework,
                "dependence_file_name": project.dependence_file_name,
                "dependence_file_content": project.dependence_file_content,
                # "dependencies": project.dependencies,
                "main_file": project.main_file,
                "diff": project.diff,
                "commit": project.commits,
                "has_readme": getattr(project, "has_readme", False),
            }

            # if status == 409:
            #     # return {
            #     #     "status": status,
            #     #     "message": "Este repositório já está salvo no sistema.",
            #     #     "project": project_json
            #     # }
            #     msg = "Este repositório já está salvo no sistema."
            
            # status = 200
            # return {
            #     "status": status,
            #     "message": "Repositório carregado com sucesso.",
            #     "project": project_json
            # }
            return {
                "status": status,
                "message": msg,
                "project": project_json
            }

        except Exception as e:
            return {
                "status": 500,
                "message": f"Erro ao carregar repositório: {str(e)}"
            }


    # def choose_project_local(self):
    #     project = self.service.get_project_data()
    #     return project

    def save_project(self, data):
        project = Project()

        folder_name = data.get("folder_name") or data.get("name") or "project"
        file_path = os.path.join("data", "repositories", f"{folder_name}.json")

        # Verifica se vai criar ou atualizar
        is_update = os.path.exists(file_path)

        # Preserva campos críticos que o formulário não envia (source, github_repo, tree, etc.)
        if is_update:
            import json as _json
            with open(file_path, "r", encoding="utf-8") as _f:
                existing = _json.load(_f)
            for field in ("source", "github_repo", "tree", "commits", "diff", "readme", "changelog"):
                if field not in data and field in existing:
                    data[field] = existing[field]

        saved_data = project.save_json(data)

        if is_update:
            message = "Projeto atualizado com sucesso!"
            status = 200
        else:
            message = "Projeto criado com sucesso!"
            status = 201  # Created

        return {
            "message": message,
            "saved_path": file_path,
            "project": saved_data
        }, status



        # return self.service.save_project(data)

    # deletar
    def delete_project_control(self, folder_name):
        """Chama a model para deletar o projeto"""
        project_model = Project(folder_name=folder_name)
        return project_model.delete_project(folder_name)

    def list_projects(self):
        project = Project()
        projects_list = project.get_all_projects()
        return projects_list

    def get_tree_by_folder_name(self, folder_name: str):
        # Cria o objeto Project e carrega todos os dados do JSON
        project_model = Project().find_project_by_folder_name(folder_name)
        # print("project model is")
        # print(project_model)

        if project_model is None:
            return {
                "error": "Error. Project not  found"
        }, 404

        # Projetos GitHub: retorna a árvore salva (atualizada via botão manual)
        if project_model.source == "github":
            return {"tree": project_model.tree}, 200

        # Projetos locais: gera a árvore a partir do filesystem
        tree = project_model.get_tree()
        return {"tree": tree}, 200

    def refresh_tree_by_folder_name(self, folder_name: str):
        """Atualiza a árvore do projeto dependendo da source."""

        project_model = Project().find_project_by_folder_name(folder_name)

        if project_model is None:
            return {"error": "Projeto não encontrado."}, 404

        # =========================
        # LOCAL
        # =========================
        if project_model.source == "local":
            result, status = self.get_tree_by_folder_name(folder_name)

            if status != 200:
                return result, status

            new_tree = result.get("tree", "")
            new_has_readme = bool(project_model.readme_content)

            tree_changed = new_tree != project_model.tree
            readme_changed = new_has_readme != getattr(project_model, "has_readme", None)

            if not tree_changed and not readme_changed:
                return {"changed": False, "tree": project_model.tree, "has_readme": getattr(project_model, "has_readme", False)}, 200

            if tree_changed:
                project_model.tree = new_tree
            if readme_changed:
                project_model.has_readme = new_has_readme
            project_model.save()

            return {"changed": True, "tree": project_model.tree, "has_readme": project_model.has_readme}, 200

        # =========================
        # GITHUB
        # =========================
        if project_model.source == "github":
            try:
                import json as _json
                from app.src.service.github_service import GithubService

                _config_path = os.path.join(
                    "data",
                    "config",
                    "llm_config.json"
                )

                _cfg = {}

                if os.path.exists(_config_path):
                    with open(_config_path, "r", encoding="utf-8") as _f:
                        _cfg = _json.load(_f)

                github_token = _cfg.get("github", {}).get(
                    "committedToken",
                    ""
                )

                svc = GithubService(token=github_token)

                owner, repo_name = project_model.github_repo.split("/", 1)

                info = svc.get_repo_info(owner, repo_name)

                new_tree = svc.get_tree(
                    owner,
                    repo_name,
                    info["default_branch"]
                )

                try:
                    new_has_readme = svc.check_readme_exists(owner, repo_name)
                except Exception:
                    new_has_readme = getattr(project_model, "has_readme", False)

            except Exception as e:
                return {"error": str(e)}, 500

            tree_changed = new_tree != project_model.tree
            readme_changed = new_has_readme != getattr(project_model, "has_readme", None)

            if not tree_changed and not readme_changed:
                return {"changed": False, "tree": project_model.tree, "has_readme": getattr(project_model, "has_readme", False)}, 200

            if tree_changed:
                project_model.tree = new_tree
            if readme_changed:
                project_model.has_readme = new_has_readme
            project_model.save()

            return {"changed": True, "tree": project_model.tree, "has_readme": project_model.has_readme}, 200

        return {"error": "Tipo de projeto inválido."}, 400



    def analyze_with_llm_v1(self, folder_name: str, llm_config: dict | None = None):
         # 1️ Carrega o projeto
        try:
            project = Project().find_project_by_folder_name(folder_name)

            if project is None:
                return None

            project.set_tree()  
            print(project.tree)
            # 2️ Instancia classes auxiliares
            prompt = Prompt(project)
            prompt.analyze_repository_template()

            agent = Agent(project, prompt, llm_config=llm_config or {})

            raw_response= agent.run()

            cleaned_response  = self._extract_json(raw_response)

            # 5️⃣ Tenta transformar em dict
            parsed = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            print("Erro ao parsear JSON:", e)
            parsed = {"error": "Invalid JSON returned by LLM", "raw": raw_response}

        return parsed

    def analyze_with_llm(self, folder_name: str, llm_config: dict | None = None):

        try:
            project  = Project().find_project_by_folder_name(folder_name)

            if project is None:
                return {"error": "Project not found."}, 404

            # Para projetos GitHub: busca árvore atualizada da API a cada chamada
            if project.source == "github":
                from app.src.service.github_service import GithubService
                github_token = (llm_config or {}).get("github_token", "")
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
                project.set_tree()
            
            # 3️ Carrega default prompt
            defaults_path = os.path.join("data", "config", "default_prompts.json")
            if not os.path.exists(defaults_path):
                print("\n\n got an error here \n\n")
                return {"error": "Arquivo default_prompts.json não encontrado."}, 500

            with open(defaults_path, "r", encoding="utf-8") as f:
                defaults = json.load(f)

            prompt_id = defaults.get("analyze_project")

            if not prompt_id:
                return {"error": "Prompt default para create_readme não configurado."}, 400
            

            prompt_model = PromptModel()
            prompt_model.project = project

            #  Busca prompt pelo ID
            prompt : PromptModel | None = prompt_model.get_prompt_by_id(prompt_id)

            if not prompt:
                    print("aqui esta indo 🎃 5.5")
                    return {
                        "error": f"Prompt com id '{prompt_id}' não encontrado."
                    }, 404
            print("aqui esta indo 🎃 6")
            agent = Agent(project, prompt, llm_config=llm_config or {})

            raw_response = agent.run()
            cleaned_response = self._extract_json(raw_response)

            parsed = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            print("Erro ao parsear JSON:", e)
            # parsed = {"error": "Invalid JSON returned by LLM", "raw": raw_response}
            return {"error": "Invalid JSON returned by LLM", "raw": raw_response}, 500


        return parsed, 200

    def check_github_readme(self, folder_name: str, github_token: str = ""):
        from app.src.service.github_service import GithubService
        project = Project().find_project_by_folder_name(folder_name)
        if not project or project.source != "github":
            return {"error": "Projeto não encontrado ou não é um projeto GitHub."}, 404
        owner, repo_name = project.github_repo.split("/", 1)
        svc = GithubService(token=github_token)
        has_readme = svc.check_readme_exists(owner, repo_name)
        return {"has_readme": has_readme}, 200

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



    def open_folder(self, path):
        service = ProjectService()

        if not path:
            return {"status": "error", "message": "Caminho não fornecido."}, 400

        try:
            service.open_folder(path)
            return {"status": "ok", "message": f"Pasta aberta: {path}"}, 200
        except FileNotFoundError:
            return {"status": "error", "message": "Caminho inexistente."}, 404
        except Exception as e:
            return {"status": "error", "message": str(e)}, 500


    def generate_readme(self, data):
        service = ProjectService()
        result, status = service.generate_readme(data)
        return jsonify(result), status

    def update_readme(self, data):
        service = ProjectService()
        result, status = service.update_readme(data)
        return result, status  # apenas retorna o dict e o status

    def apply_readme(self, data):
        """
        Control responsável por chamar o service que sobrescreve o README.md no projeto.
        data deve conter: folder_project, path, readme_text
        """
        service = ProjectService()
        result, status = service.apply_readme(data)
        return result, status

    def apply_readme_github(self, data):
        """
        Cria ou atualiza o README.md diretamente no repositório GitHub via GitHub Contents API.
        """
        service = ProjectService()
        result, status = service.apply_readme_github(data)
        return result, status

    def git_commit(self, data):
        """
        Control responsável por chamar o service que sobrescreve o README.md no projeto.
        data deve conter: folder_project, path, readme_text
        """
        service = ProjectService()
        result, status = service.git_commit(data)
        return result, status

    def undo_commit(self, data):
        """
        Control responsável por chamar o service que sobrescreve o README.md no projeto.
        data deve conter: folder_project, path, readme_text
        """
        service = ProjectService()
        return  service.undo_commit(data)

    def import_github_repository(self, url: str, token: str = ""):
        from app.src.service.github_service import GithubService

        if not url or not url.strip():
            return {"status": 400, "message": "URL não informada."}, 400

        token = (token or "").strip()
        if not token:
            _config_path = os.path.join("data", "config", "llm_config.json")
            if os.path.exists(_config_path):
                try:
                    with open(_config_path, "r", encoding="utf-8") as _f:
                        _cfg = json.load(_f)
                    token = (_cfg.get("github") or {}).get("committedToken", "") or ""
                except Exception:
                    pass

        svc = GithubService(token=token)

        try:
            owner, repo_name = svc.parse_url(url.strip())
        except ValueError as e:
            return {"status": 400, "message": str(e)}, 400

        try:
            info = svc.get_repo_info(owner, repo_name)
        except RuntimeError as e:
            msg = str(e)
            if "autenticação" in msg:
                status = 401
            elif "Rate limit" in msg:
                status = 403
            elif "não encontrado" in msg:
                status = 404
            else:
                status = 500
            return {"status": status, "message": msg}, status

        folder_name = repo_name
        github_repo = f"{owner}/{repo_name}"

        existing = Project().find_project_by_folder_name(folder_name)
        if existing:
            project = existing
            msg = "Repositório já estava salvo no sistema."
            final_status = 409
        else:
            try:
                tree = svc.get_tree(owner, repo_name, info["default_branch"])
            except Exception:
                tree = ""

            try:
                has_readme = svc.check_readme_exists(owner, repo_name)
            except Exception:
                has_readme = False

            project = Project(
                name=info["name"],
                folder_name=folder_name,
                path="",
                description=info["description"],
                language=info["language"],
                tree=tree,
                source="github",
                github_repo=github_repo,
            )
            project.has_readme = has_readme
            msg = "Repositório importado com sucesso."
            final_status = 200

        # Persiste o projeto no disco (garante source/github_repo salvos)
        project.save()

        project_json = {
            "path": project.path,
            "name": project.name,
            "folder_name": project.folder_name,
            "tree": project.tree,
            "description": project.description,
            "readme": project.readme,
            "changelog": project.changelog,
            "language": project.language,
            "framework": project.framework,
            "dependence_file_name": project.dependence_file_name,
            "dependence_file_content": project.dependence_file_content,
            "main_file": project.main_file,
            "diff": project.diff,
            "commit": project.commits,
            "source": project.source,
            "github_repo": project.github_repo,
            "has_readme": getattr(project, "has_readme", False),
        }

        return {"status": final_status, "message": msg, "project": project_json}, final_status


    def clone_repository(self, url: str, token: str = ""):
        service = ProjectService()

        try:
            if not url or not url.strip():
                return {
                    "message": "URL não informada."
                }, 400

            # Extrai o nome do repositório a partir da URL
            repo_name = (
                url.rstrip("/")
                .split("/")[-1]
                .replace(".git", "")
            )

            # Caminho físico do repositório clonado
            clone_path = os.path.join("repositories", repo_name)

            # Verifica se já existe JSON salvo no sistema
            existing_project = Project().find_project_by_folder_name(repo_name)

            # Verifica se a pasta física do repositório existe
            repo_exists = os.path.exists(clone_path)

            # ==========================================================
            # CENÁRIO 1
            # Repositório existe fisicamente
            # JSON também existe
            #
            # Estado:
            #   repositories/repo
            #   data/repositories/repo.json
            #
            # Não precisa clonar nem salvar novamente.
            # ==========================================================
            if repo_exists and existing_project:

                project = existing_project

                message = "Este repositório já está salvo no sistema."
                status = 409

            # ==========================================================
            # CENÁRIO 2
            # Repositório existe fisicamente
            # JSON NÃO existe
            #
            # Estado:
            #   repositories/repo
            #   data/repositories/repo.json NÃO existe
            #
            # Nesse caso recriamos apenas o JSON.
            # ==========================================================
            elif repo_exists and not existing_project:

                project = Project(path=clone_path)

                project.extract_info()
                project.set_tree()

                project.has_readme = bool(project.readme_content)

                project.save()

                message = "Repositório já existia localmente. JSON recriado com sucesso."
                status = 201

            # ==========================================================
            # CENÁRIO 3
            # JSON existe
            # Repositório físico NÃO existe
            #
            # Estado:
            #   repositories/repo NÃO existe
            #   data/repositories/repo.json existe
            #
            # Nesse caso fazemos o clone novamente e atualizamos os dados.
            # ==========================================================
            elif not repo_exists and existing_project:

                service.clone_repository(url)

                project = Project(path=clone_path)

                project.extract_info()
                project.set_tree()

                project.has_readme = bool(project.readme_content)

                project.save()

                message = "Repositório reclonado com sucesso."
                status = 201

            # ==========================================================
            # CENÁRIO 4
            # Nem repositório nem JSON existem
            #
            # Estado completamente novo.
            # ==========================================================
            else:

                service.clone_repository(url)

                project = Project(path=clone_path)

                project.extract_info()
                project.set_tree()

                project.has_readme = bool(project.readme_content)

                project.save()

                message = "Repositório clonado com sucesso."
                status = 201

            project_json = {
                "path": project.path,
                "name": project.name,
                "folder_name": project.folder_name,
                "tree": project.tree,
                "description": project.description,
                "readme": project.readme,
                "changelog": project.changelog,
                "language": project.language,
                "framework": project.framework,
                "dependence_file_name": project.dependence_file_name,
                "dependence_file_content": project.dependence_file_content,
                "main_file": project.main_file,
                "diff": project.diff,
                "commit": project.commits,
                "has_readme": getattr(project, "has_readme", False),
            }

            return {
                "message": message,
                "saved_path": clone_path,
                "project": project_json
            }, status

        except ValueError as e:
            return {
                "message": str(e)
            }, 400

        except Exception as e:
            return {
                "message": str(e)
            }, 500

# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# ==================================================================================
# 
# 




def project_control():
    # Import tardio do tkinter (ver nota em ProjectService.select_path).
    import tkinter as tk
    from tkinter import filedialog

    # Cria uma janela invisível do tkinter
    root = tk.Tk()
    root.withdraw()  # Esconde a janela principal

    # Abre o seletor de pasta
    folder_selected = filedialog.askdirectory(title="Select a folder")
    
    if folder_selected:
        print("Selected folder:", folder_selected)
        return f"Selected folder: {folder_selected}"
    else:
        print("No folder selected")
        return "No folder selected"

def select_path():
    # Import tardio do tkinter (ver nota em ProjectService.select_path).
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()  # oculta a janela principal
    root.attributes("-topmost", True)
    folder_path = filedialog.askdirectory(title="Selecione uma pasta")
    root.destroy()
    return folder_path

# Instancia o service (reutilizável)
project_service = ProjectService()

def save_project_control(data):
    """
    Recebe um dict (JSON da view) e chama o service
    Retorna dict pronto para jsonify
    """
    project = project_service.save_project(**data)
    return {
        "message": "Project created successfully",
        "project": project.__dict__
    }

def read_project():
    pass

def update_project():
    pass

def delete_project():
    pass

def choose_project_local():
    path = select_path()
    project = Project(path=path)
    project.extract_info()
    json_project = jsonify({
        "path": project.path,
        "name": project.name,
        "tree": project.tree,
        "description": project.description,

        "language": project.language,
        "framework": project.framework,
        "dependence_file_name": project.dependence_file_name,
        "main_file": project.main_file,

    })
    return json_project
