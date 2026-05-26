import os
import subprocess
import sys
from app.src.model.project_model import Project

class ProjectService:
    def __init__(
        self,
        name: str = "",
        path: str = "",
        tree: str = "",
        description: str = "",
        readme: str = "",
        changelog: str = "",
        language: str = "",
        framework: str = "",
        dependence_file_name: str = "",
        dependence_file_content: str = "",
        dependencies: str = "",
        main_file: str = "",
        diff: str = "",
        commit: str = ""
    ):
        self.name = name
        self.path = path
        self.tree = tree
        self.description = description
        self.readme = readme
        self.changelog = changelog
        self.language = language
        self.framework = framework
        self.dependence_file_name = dependence_file_name
        self.dependence_file_content = dependence_file_content
        self.dependencies = dependencies
        self.main_file = main_file
        self.diff = diff
        self.commit = commit


    def extract_info(self):
        # pega nome
        self.name = self.getName()

        # pega tree
        self.tree = self.getTree()

        # pega readme
        self.readme = self.getReadmeContent()

        # pega changelog
        self.changelog = self.getChangelogContent()

        # pega linguagem
        # self.language = self.getMainLanguage()

        # pega dependence_file_content
        
        self.dependence_file_content = self.get_dependence_content()
        # print(self.dependence_file_content)
        pass


    def getName(self):
        return os.path.basename(os.path.normpath(self.path))

    def getTree(self):
        tree_str = ""
        directory = self.path
        print()
        print('directory:', directory)

        def generate_tree(dir_path, prefix=""):
            nonlocal tree_str
            entries = sorted(os.listdir(dir_path))
            # Filtra para ignorar .git
            entries = [e for e in entries if e not in (".git", ".next")]
            entries_count = len(entries)
            for index, entry in enumerate(entries):
                path = os.path.join(dir_path, entry)
                connector = "└── " if index == entries_count - 1 else "├── "
                tree_str += prefix + connector + entry + "\n"
                if os.path.isdir(path):
                    extension = "    " if index == entries_count - 1 else "│   "
                    generate_tree(path, prefix + extension)

        generate_tree(directory)

        self.copiar_para_clipboard(tree_str)
        return tree_str

    # def get_commit(self, commit_hash: str,includde_metadata:bool = True, include_diff: bool = True) -> dict:
    #     """Obtém informações detalhadas sobre um commit específico."""        
    #     pass

    def get_commits_by_range(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        include_metadata: bool = True,
        include_diff: bool = True
    ) -> str:
        """Obtém commits dentro de um intervalo de tempo e retorna uma string formatada."""
        if not self.path or not os.path.isdir(os.path.join(self.path, ".git")):
            return "⚠️ Repositório Git não encontrado no caminho especificado."

        # Monta o comando base
        cmd = ["git", "-C", self.path, "log"]

        # Adiciona range de datas se fornecido
        if start_date:
            cmd += ["--since", start_date]
        if end_date:
            cmd += ["--until", end_date]

        # Define o formato de saída
        if include_metadata:
            format_str = "--pretty=format:commit %H%nAuthor: %an%nDate: %ad%nMessage: %s%n"
            cmd.append(format_str)

        # Inclui diffs se solicitado
        if include_diff:
            cmd.append("--patch")

        # 🔹 Exclui o arquivo package-lock.json dos resultados
        cmd += ["--", ".", ":(exclude)package-lock.json"]

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, check=True, encoding="utf-8"
            )
            output = result.stdout.strip()
            return output if output else "Nenhum commit encontrado no intervalo."
        except subprocess.CalledProcessError as e:
            return f"Erro ao obter commits: {e.stderr.strip()}"



    def getReadmeContent(self) -> str:
        if not self.path:
            return ""

        # Procurar README.md ou readme.md na raiz
        readme_names = ["README.md", "readme.md"]

        for name in readme_names:
            readme_path = os.path.join(self.path, name)
            if os.path.isfile(readme_path):
                try:
                    with open(readme_path, "r", encoding="utf-8") as f:
                        return f.read()
                except Exception as e:
                    print(f"Erro ao ler {readme_path}: {e}")
                    return ""

        # Se nenhum README foi encontrado
        return ""

    def getChangelogContent(self):
        if not self.path:
            return ""
        # Procurar CHANGELOG.md ou changelog.md na raiz
        changelog_names = ["CHANGELOG.md", "changelog.md"]
        for name in changelog_names:
            changelog_path = os.path.join(self.path, name)
            if os.path.isfile(changelog_path):
                try:
                    with open(changelog_path, "r", encoding="utf-8") as f:
                        return f.read()
                except Exception as e:
                    print(f"Erro ao ler {changelog_path}: {e}")
                    return ""
                
        # Se nenhum CHANGELOG foi encontrado
        # return ""
        return " ...No changelog found ... "
        
    def getMainLanguage(self):
        # Implementar lógica para detectar a linguagem principal do projeto
        # Pode ser baseado na extensão dos arquivos ou em um arquivo de configuração
        return ""  # Exemplo fixo, substituir pela lógica real


    def get_dependence_content(self):
        """Lê o arquivo de dependências no diretório raiz do projeto e retorna seu conteúdo."""
        if not self.path or not self.dependence_file_name:
            return ""

        file_path = os.path.join(self.path, self.dependence_file_name)
        if not os.path.isfile(file_path):
            print(f"⚠️ Arquivo '{self.dependence_file_name}' não encontrado em '{self.path}'.")
            return ""

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return content
        except Exception as e:
            print(f"Erro ao ler '{file_path}': {e}")
            return ""


    
    def __str__(self):
        return (
            f"path: {self.path[:30]}\n"
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
            f"commit: {self.commit[:30]}"
        )
    

    def copiar_para_clipboard(self, texto: str):
        process = subprocess.Popen('clip', stdin=subprocess.PIPE, shell=True)
        process.communicate(input=texto.encode('utf-16le'))
        print("✅ Texto copiado para o clipboard!")

