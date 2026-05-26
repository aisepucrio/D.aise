# from app.src.service.project_service import ProjectService
import os, json
import subprocess
import sys
import uuid
from git import Repo
from datetime import datetime
from git import Repo, InvalidGitRepositoryError

REPOSITORIES_DIR = os.path.join("data", "repositories")


class Project:
    def __init__(
        self,
        id = None,
        name: str = "",
        folder_name: str = "",
        path: str = "",
        tree: str = "",
        description: str = "",
        readme: str = "",
        changelog: str = "",
        language: str = "",
        framework: str = "",
        dependence_file_name: str = "",
        # dependence_file_content: str = "",
        dependencies: str = "",
        main_file: str = "",
        diff: str = "",
        commits: str = "",
        source: str = "local",
        github_repo: str = ""
    ):
        self.id = id
        self.name = name
        self.folder_name = folder_name
        self.path = path
        self.tree = tree
        self.description = description
        self.readme = readme
        self.changelog = changelog
        self.language = language
        self.framework = framework
        self.dependence_file_name = dependence_file_name
        # self.dependence_file_content = dependence_file_content
        # self.dependencies = dependencies
        self.main_file = main_file
        self.diff = diff
        self.commits = commits
        self.source = source          # "local" | "github"
        self.github_repo = github_repo  # "owner/repo" para source="github"

    
    

    @property
    def dependence_file_content(self):
        """Retorna o conteúdo do arquivo de dependências automaticamente."""
        if not self.dependence_file_name:
            return ""

        file_path = os.path.join(self.path, self.dependence_file_name)

        if not os.path.exists(file_path):
            return ""

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return ""
        
    # @property
    # def tree(self):
    #     """Retorna a árvore de diretórios automaticamente."""
    #     return self.get_tree()

    @property
    def readme_content(self):
        """Retorna o conteúdo do README.md automaticamente, se existir no diretório do projeto."""
        possible_names = ["README.md", "Readme.md", "readme.md"]

        for name in possible_names:
            file_path = os.path.join(self.path, name)
            if os.path.exists(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        return f.read()
                except Exception:
                    return ""  # se houver erro ao ler, retorna vazio

        return ""  # nenhum README encontrado

    def set_tree(self):
            self.tree = self.get_tree()

    def save_json(self, data):
        """Salva o JSON recebido do front diretamente em data/<folder_name>.json"""
        os.makedirs(REPOSITORIES_DIR, exist_ok=True)
        if "id" not in data or not data["id"]:
            data["id"] = str(uuid.uuid4())

        print("-------------------------------------")
        print( data.get("folder_name"))
        print("-------------------------------------")
        folder_name = data.get("folder_name") or data.get("name") or "project"
        file_path = os.path.join(REPOSITORIES_DIR, f"{folder_name}.json")

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        return data

    def save(self):
        """Salva o projeto como JSON em /data/<folder_name>.json"""
        os.makedirs(REPOSITORIES_DIR, exist_ok=True)
        file_path = os.path.join(REPOSITORIES_DIR, f"{self.folder_name}.json")

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(self.__dict__, f, ensure_ascii=False, indent=4)

        return file_path

    def read():
        """ Read existing project """
        pass

    def get_all_projects(self):
        """Retorna todos os projetos salvos na pasta data/ como uma lista de dicts"""
        projects = []
        data_dir = REPOSITORIES_DIR
        if not os.path.exists(data_dir):
            return projects  # retorna lista vazia se não houver pasta

        for filename in os.listdir(data_dir):
            if filename.endswith(".json"):
                file_path = os.path.join(data_dir, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        project_data = json.load(f)
                        projects.append(project_data)
                except Exception as e:
                    print(f"Erro ao ler {file_path}: {e}")

        return projects
    
    def find_project_by_folder_name(self, folder_name: str):
        """
        Carrega os dados do projeto salvo em data/<folder_name>.json,
        popula os atributos do objeto e retorna a instância atual.
        """
        file_path = os.path.join(REPOSITORIES_DIR, f"{folder_name}.json")

        if not os.path.exists(file_path):
            # raise FileNotFoundError(f"Projeto '{folder_name}' não encontrado em {file_path}")
            return None  # não lança erro — apenas indica "não existe"

        with open(file_path, "r", encoding="utf-8") as f:
            project_data = json.load(f)

        # Atualiza os atributos existentes e cria os novos se necessário
        for key, value in project_data.items():
            setattr(self, key, value)

        # Garante que o folder_name esteja definido corretamente
        self.folder_name = folder_name

        return self

    def find_path_by_folder_name(self, folder_name: str):
        """
        Carrega os dados do projeto salvo em data/<folder_name>.json,
        popula os atributos do objeto e retorna a instância atual.
        """
        file_path = os.path.join(REPOSITORIES_DIR, f"{folder_name}.json")

        return file_path


    def update():
        """ update existing project"""
        pass

    def delete_project(self, folder_name):
        """Remove o arquivo JSON correspondente ao projeto"""
        file_path = os.path.join(REPOSITORIES_DIR, f"{folder_name}.json")
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False


    # ========== métodos de suporte 

    def extract_info(self):
        self.name = self.get_name()

        # self.tree = self.get_tree()

        self.folder_name = self.name

    def get_name(self):
        return os.path.basename(os.path.normpath(self.path))

    def get_tree(self):
        import os

        tree_str = ""
        directory = self.path

        # pastas e arquivos a ignorar (comuns em projetos JS, Python, etc.)
        ignore_names = {
            ".git", ".next", "node_modules", "venv", "__pycache__",
            ".env", ".DS_Store", ".idea", ".vscode", ".pytest_cache",
            "dist", "build", "coverage", ".mypy_cache", ".ruff_cache",
            ".venv"
        }

        def generate_tree(dir_path, prefix=""):
            nonlocal tree_str
            try:
                entries = sorted(os.listdir(dir_path))
            except PermissionError:
                return  # pula pastas sem permissão

            # filtra os que devem ser ignorados
            entries = [e for e in entries if e not in ignore_names]

            for index, entry in enumerate(entries):
                path = os.path.join(dir_path, entry)
                connector = "└── " if index == len(entries) - 1 else "├── "
                tree_str += prefix + connector + entry + "\n"
                if os.path.isdir(path):
                    extension = "    " if index == len(entries) - 1 else "│   "
                    generate_tree(path, prefix + extension)

        generate_tree(directory)
        # self.copiar_para_clipboard(tree_str)
        return tree_str


    # comentado pois agora existe a property dependence_file_content
    # def get_dependence_content(self):
    #     """Lê o arquivo de dependências (ex: package.json) e salva o conteúdo no objeto."""
    #     if not self.dependence_file_name:
    #         raise ValueError("dependence_file_name não definido no projeto.")

    #     file_path = os.path.join(self.path, self.dependence_file_name)

    #     if not os.path.exists(file_path):
    #         raise FileNotFoundError(f"Arquivo de dependências não encontrado: {file_path}")

    #     with open(file_path, "r", encoding="utf-8") as f:
    #         content = f.read()

    #     self.dependence_file_content = content
    #     return content



    
    def copiar_para_clipboard(self, texto: str):
        process = subprocess.Popen('clip', stdin=subprocess.PIPE, shell=True)
        process.communicate(input=texto.encode('utf-16le'))
        print("✅ Texto copiado para o clipboard!")

    
    def __str__(self):
        return (
            f"path: {self.path}\n"
            f"name: {self.name[:30]}\n"
            f"tree: \n\n {self.tree[:30]}...\n\n"
            f"description: {self.description[:30]}\n"
            f"readme: \n\n {self.readme[:100]}....\n\n"
            f"changelog: {self.changelog[:30]}\n"
            f"language: {self.language[:30]}\n"
            f"framework: {self.framework[:30]}\n"
            f"dependence_file_name: {self.dependence_file_name[:30]}\n"
            f"dependence_file_contet: \n\n {self.dependence_file_content[:100]}....\n\n"
            f"main_file: {self.main_file[:30]}\n"
            f"diff: {self.diff[:30]}\n"
            f"commit: {self.commits[:30]}"
        )
    



    #  SET COMMITS 
            
    def set_commits_combined(
        self,
        range_type: str,
        start_date: str | None = None,
        end_date: str  | None= None,
        start_hash: str  | None = None,
        end_hash: str  | None = None
    ):
        """
        Combina: título, descrição, arquivos modificados E diffs.
        Respeita range por data, since_last_readme ou hash_range.
        """
        print("🔥 Executando set_commits_combined...")

        repo = Repo(self.path)
        commits_to_process = []

        # ================================
        # ARQUIVOS A IGNORAR NO DIFF
        # ================================
        ignored_files = {
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "poetry.lock",
            "composer.lock",
            "Gemfile.lock"
        }

        # ================================
        # RANGE POR DATA / since_last_readme
        # ================================
        if range_type in ["since_last_readme", "date_range"]:
            all_commits = list(repo.iter_commits())

            if not all_commits:
                self.commits = ""
                return ""

            # Se não tiver start_date → primeiro commit do repo
            if not start_date:
                first_commit = all_commits[-1]
                start_date = datetime.fromtimestamp(first_commit.committed_date).isoformat()

            # Se não tiver end_date → hoje
            if not end_date:
                end_date = datetime.now().isoformat()

            since_dt = datetime.fromisoformat(start_date)
            until_dt = datetime.fromisoformat(end_date)

            for c in all_commits:
                commit_dt = datetime.fromtimestamp(c.committed_date)
                if since_dt <= commit_dt <= until_dt:
                    commits_to_process.append(c)

        # ================================
        # RANGE POR HASH
        # ================================
        elif range_type == "hash_range":
            if not start_hash or not end_hash:
                self.commits = ""
                return ""
            commits_to_process = list(repo.iter_commits(f"{start_hash}..{end_hash}"))

        else:
            self.commits = ""
            return ""

        if not commits_to_process:
            self.commits = ""
            return ""

        # ================================
        # PROCESSAR COMMITS
        # ================================
        output_lines = []

        for c in commits_to_process:
            commit_hash = c.hexsha
            title = c.message.split("\n")[0].strip()
            description = ("\n".join(c.message.split("\n")[1:])).strip()

            # ================================
            # ARQUIVOS MODIFICADOS
            # ================================
            parent = c.parents[0] if c.parents else None
            diffs = c.diff(parent) if parent else c.diff()

            files_info = []
            diff_blocks = []
            commit_has_valid_diff = False

            for d in diffs:
                file_path = d.b_path or d.a_path
                if not file_path:
                    continue

                file_name = file_path.split("/")[-1]

                # Ignorar lockfiles
                if file_name in ignored_files:
                    continue

                # type label
                change_type = d.change_type
                if change_type == 'A':
                    label = "Added"
                elif change_type == 'M':
                    label = "Modified"
                elif change_type == 'D':
                    label = "Deleted"
                elif change_type == 'R':
                    label = "Renamed"
                else:
                    label = "Changed"

                files_info.append(f"- {file_path} ({label})")

                # ================================
                # DIFF REAL
                # ================================
                try:
                    block = d.diff.decode("utf-8", errors="ignore")
                    if block.strip():
                        diff_blocks.append(block)
                        commit_has_valid_diff = True
                except:
                    pass

            # Mesmo sem diff válido, ainda incluímos título/descrição/arquivos
            output_lines.append("\n==============================")
            output_lines.append(f"COMMIT {commit_hash[:10]}")
            output_lines.append("==============================\n")

            output_lines.append(f"Title: {title}")
            if description:
                output_lines.append(f"Description:\n{description}")

            if files_info:
                output_lines.append("Files:")
                output_lines.extend(files_info)

            # diffs
            if commit_has_valid_diff:
                output_lines.append("\nDiffs:\n")
                output_lines.extend(diff_blocks)

            output_lines.append("")  # linha extra

        final_string = "\n".join(output_lines).strip()
        self.commits = final_string
        return final_string

        
    def set_commits_by_title_description(
        self,
        range_type: str,
        start_date: str  | None = None,
        end_date: str  | None= None,
        start_hash: str | None = None,
        end_hash: str  | None = None
    ):
        """
        Obtém commits contendo título, descrição e arquivos modificados,
        respeitando o tipo de intervalo escolhido.
        """

        if not self.path or not os.path.exists(os.path.join(self.path, ".git")):
            raise ValueError("O caminho do projeto não possui um repositório Git válido.")

        try:
            repo = Repo(self.path)
        except InvalidGitRepositoryError:
            raise ValueError(f"Repositório Git inválido em {self.path}")

        # ================================
        #      DEFINIR INTERVALO
        # ================================
        git_range = None

        # if range_type == "since_last_readme":
        #     # TODO: implementar depois
        #     print("⚠️  Intervalo 'since_last_readme' ainda não implementado.")
        #     # git_range = None

        # elif range_type == "date_range" or range_type == "since_last_readme" :
        if range_type == "date_range" or range_type == "since_last_readme" :
            git_range = {}
            if start_date:
                git_range['since'] = start_date
            if end_date:
                git_range['until'] = end_date

        elif range_type == "hash_range":
            if start_hash and end_hash:
                git_range = f"{start_hash}..{end_hash}"
            else:
                raise ValueError("Para hash_range é necessário start_hash e end_hash.")

        # ================================
        #      EXECUTAR git log
        # ================================
        log_format = "%H||%s||%b"  # hash || title || description
        cmd = ["git", "log", f"--pretty=format:{log_format}"]

        if git_range:
            if isinstance(git_range, dict):
                if 'since' in git_range:
                    cmd.append(f'--since="{git_range["since"]}"')
                if 'until' in git_range:
                    cmd.append(f'--until="{git_range["until"]}"')
            else:
                cmd.append(git_range)

        result = repo.git.execute(cmd)

        if not result.strip():
            print("⚠️ Nenhum commit encontrado nesse intervalo.")
            self.commits = ""
            return ""

        # ================================
        #      PARSEAR RESULTADO
        # ================================
        lines = result.strip().split("\n")
        commits_list = []

        for line in lines:
            if "||" not in line:
                continue

            h, title, desc = line.split("||", 2)
            commit_obj = repo.commit(h.strip())

            # pegar arquivos modificados com tipo de mudança
            files_info = []
            parent = commit_obj.parents[0] if commit_obj.parents else None
            diffs = commit_obj.diff(parent)
            for diff_item in diffs:
                file_path = diff_item.b_path or diff_item.a_path
                change_type = diff_item.change_type
                if change_type == 'A':
                    label = "Added"
                elif change_type == 'M':
                    label = "Modified"
                elif change_type == 'D':
                    label = "Deleted"
                elif change_type == 'R':
                    label = "Renamed"
                else:
                    label = "Changed"
                files_info.append(f"- {file_path} ({label})")

            commits_list.append({
                "hash": h.strip(),
                "title": title.strip(),
                "description": desc.strip(),
                "files": files_info
            })

        # ================================
        #   GERAR STRING FINAL FORMATADA
        # ================================
        formatted = []
        for c in commits_list:
            formatted.append(f"{c['title']}")
            if c['description']:
                formatted.append(f"{c['description']}")
            formatted.append(f"Commit: {c['hash']}")
            if c['files']:
                formatted.append("Files:")
                formatted.extend(c['files'])
            formatted.append("")  # linha em branco entre commits

        final_string = "\n".join(formatted).strip()

        # salva no atributo
        self.commits = final_string

        # debug
        # print("📌 COMMITS (title + description + files):\n")
        # print(self.commits)

        return final_string

    def set_commits_by_diff(
        self,
        range_type: str,
        start_date: str  | None = None,
        end_date: str | None = None,
        start_hash: str | None = None,
        end_hash: str  | None = None
    ):
        print("🔥 Executando set_commits_by_diff...")

        repo = Repo(self.path)
        commits_to_process = []

        # ================================
        # LISTA DE ARQUIVOS A IGNORAR
        # ================================
        ignored_files = {
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "poetry.lock",
            "composer.lock",
            "Gemfile.lock"
        }

        # ================================
        # RANGE POR DATA
        # ================================
        if range_type in ["since_last_readme", "date_range"]:
            all_commits = list(repo.iter_commits())

            if not all_commits:
                self.commits = ""
                return

            if not start_date:
                first_commit = all_commits[-1]
                start_date = datetime.fromtimestamp(first_commit.committed_date).isoformat()

            if not end_date:
                end_date = datetime.now().isoformat()

            since_dt = datetime.fromisoformat(start_date)
            until_dt = datetime.fromisoformat(end_date)

            for c in all_commits:
                commit_dt = datetime.fromtimestamp(c.committed_date)
                if since_dt <= commit_dt <= until_dt:
                    commits_to_process.append(c)

        # ================================
        # RANGE POR HASH
        # ================================
        elif range_type == "hash_range":
            if not start_hash or not end_hash:
                self.commits = ""
                return

            commits_to_process = list(repo.iter_commits(f"{start_hash}..{end_hash}"))

        else:
            self.commits = ""
            return

        if not commits_to_process:
            self.commits = ""
            return

        # ================================
        # COLETAR DIFFS
        # ================================
        all_diffs = []

        for c in commits_to_process:
            parent = c.parents[0] if c.parents else None
            diff = parent.diff(c, create_patch=True) if parent else c.diff(create_patch=True)

            diff_text = ""
            commit_has_valid_changes = False

            for d in diff:

                file_name = (d.b_path or d.a_path or "").split("/")[-1]

                # ================================
                # IGNORAR ARQUIVOS DEFINIDOS
                # ================================
                if file_name in ignored_files:
                    continue

                try:
                    decoded = d.diff.decode("utf-8", errors="ignore")
                    diff_text += decoded
                    commit_has_valid_changes = True
                except:
                    pass

            # só adiciona o commit se houver diff REAL (após ignorar os arquivos)
            if commit_has_valid_changes and diff_text.strip():
                all_diffs.append(
                    f"\n\n==================== COMMIT {c.hexsha[:10]} ====================\n"
                    + diff_text
                )

        final_string = "\n".join(all_diffs)
        self.commits = final_string
        self.copiar_para_clipboard(final_string)


    def get_readme_last_modified(self):
        """
        Retorna a data/hora da última modificação do README.md do projeto.
        Caso não exista README, retorna None.
        """
        if not self.path:
            return None

        possible_names = ["README.md", "Readme.md", "readme.md"]

        for name in possible_names:
            file_path = os.path.join(self.path, name)
            if os.path.exists(file_path):
                timestamp = os.path.getmtime(file_path)
                return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")

        return None