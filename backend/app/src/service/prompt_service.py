from app.src.service.project_service import Project
import re
import os
import logging


class Prompt:
    """
    ⚠️ DEPRECATED

    Esta classe está depreciada e será removida em versões futuras.

    Motivo:
    - A lógica de prompts foi movida para PromptModel (model/prompt_model.py)
    - Os prompts agora são carregados dinamicamente por ID a partir de prompts.json

    Use:
    - PromptModel para carregar prompts
    - ProjectService.generate_readme (nova versão) como entrypoint
    """
    # def __init__(self, doc_type:str, strategy: str, operation:str ):
    def __init__(self , project: Project):
        logging.warning(
            "\n\033[33m[DEPRECATED]  PromptService + generated_readme_v1 is being used.\n"
            "Use generate_readme method with PromptModel .\033[0m"
        )
        self.content = ""
        self.project = project
    
    def __str__(self):
        return self.content

# readme
    def initial_readme(self, strategy="zero-shot"):
        prompt:str = f"""
        You are an expert technical writer who specializes in creating clear, complete, and professional README.md files for software projects.


        ## Objective
        Your task is to generate a complete README.md document following the structure and intent of the provided README template.
        The output must be a well-formatted Markdown document ready for publication, not a filled-in template or an instruction guide.


        ## Project context

        - Tree of project:
        {self.project.tree}

        - commits:
        title and description:
        Commit from the project provided, use the following information about the project to create the README.md file:
        # {self.project.get_commits_by_range(include_diff=False, include_metadata=True)}
        # end context

        ## Writing rules
        - Use the structure, headings, and flow defined in the template below.
        - Do not include any curly brackets, placeholders, or instructions in the final output.
        - Write concise, clear, and human-sounding Markdown that reads naturally.
        - Keep optional sections only if they make sense for the project; otherwise, omit them gracefully.
        - Use Markdown best practices: proper heading hierarchy, code fences for commands, and readable formatting.
        - If the user provides limited project information, infer reasonable defaults or use short generic but professional text.
        - Maintain consistency, accuracy, and readability throughout.


        ## Output format
        Return a single Markdown document suitable to save as `README.md`.


        ## Template structure to follow
        (Do NOT reproduce this text in the output; it is a structural guide.)


        1. Project name (and URL/owner if applicable)
        2. Project description (what it does, why it exists, what makes it different)
        3. Main file Structure(only the main files and folders and their names. don't describe them)
        4. Project dependencies (list of main dependencies/libraries/frameworks used)
        5. Instructions for using the project:
        - Installation
        - Configuration
        - Running
        6. Additional documentation / resources
        7. Automatized tests (if applicable)
        8. How to get help
        9. Terms of use / license (if applicable)

        
        ## Output requirement
        Return only the finalized README.md content — no explanations, metadata, or additional commentary.  
    """
        self.content = prompt
        return prompt
    

    def create_readme_template(self):
        base_template :str = """
        You are an expert technical writer who specializes in creating clear, complete, and professional README.md files for software projects.

        ## Objective
        Your task is to generate a complete README.md document following the structure and intent of the provided README template.
        The output must be a well-formatted Markdown document ready for publication, not a filled-in template or an instruction guide.

        ## Project context
        {{name}}
        {{folder_name}}
        {{description}}
        {{language}}
        {{framework}}
        {{dependence_file_content}}
        {{tree}}
        {{commits}}

        ## Writing rules
        - Use the structure, headings, and flow defined in the template below.
        - Do not include any curly brackets, placeholders, or instructions in the final output.
        - Write concise, clear, and human-sounding Markdown that reads naturally.
        - Keep optional sections only if they make sense for the project; otherwise, omit them gracefully.
        - Use Markdown best practices: proper heading hierarchy, code fences for commands, and readable formatting.
        - If the user provides limited project information, infer reasonable defaults or use short generic but professional text.
        - Maintain consistency, accuracy, and readability throughout.

        ## Output format
        Return a single Markdown document suitable to save as `README.md`.

        ## Template structure to follow
        (Do NOT reproduce this text in the output; it is a structural guide.)

        1. Project name (and URL/owner if applicable)
        2. Project description (what it does, why it exists, what makes it different)
        3. Main file Structure(only the main files and folders and their names. don't describe them)
        4. Project dependencies (list of main dependencies/libraries/frameworks used)
        5. Instructions for using the project:
        - Installation
        - Configuration
        - Running
        6. Additional documentation / resources
        7. Automatized tests (if applicable)
        8. How to get help
        9. Terms of use / license (if applicable)

        
        ## Output requirement
        Return only the finalized README.md content — no explanations, metadata, or additional commentary.  
        """
        prompt = self.fill_placeholders(base_template, self.project)

        self.save_prompt_debug(prompt)
        self.content = prompt


    def set_update_readme_template(self):
        """
        Gera um prompt para atualizar o README.md existente com base em novos commits e dependências,
        preenchendo automaticamente os placeholders {{readme_content}}, {{commits}} e {{dependence_file_content}}.
        """
        base_template = """
        You are an expert technical writer. Your task is to **update an existing README.md file** for a software project.
        
        ## Context
        Current README content:
        {{readme_content}}


        new context to update:
        - {{name}}

        - Recent {{commits}}

        - Project dependency file content:
        {{dependence_file_content}}

        {{description}}

        ## Instructions
        1. Update the README.md to reflect the latest changes from the commits and dependencies.
        2. Preserve all existing sections and content unless they are outdated.
        3. Improve clarity, formatting, and correctness where needed.
        4. Do not remove important project context or descriptions.
        5. Keep Markdown syntax correct, using headings, code fences, and lists properly.
        6. Avoid adding explanations, instructions, or metadata—return only the updated README.md content.

        ## Output
        Return only the finalized README.md content — no explanations, metadata, or additional commentary.
        if theres no change, then you return a string written 'no change'
        """

        # Preenche os placeholders usando fill_placeholders
        prompt = self.fill_placeholders(base_template, self.project)

        self.save_prompt_debug(prompt)  # opcional, salva em template_debug.txt se DEBUG=true
        self.content = prompt
        return prompt


# dependencies
    def dependencies(self,tree):
                
        prompt = f"""
        {self.project.tree}
        \n
        analyzed this file structure above and based on this tree, answer the name of the file containing the dependencies of this project.
        only answer the file name, without any other text or explanation.
        example: package.json or requirements.txt, etc.
        """
        return prompt
# changelog
  
    def initial_changelog(self, strategy=""):
        # readme_content = self.project.getReadmeContent()
        # print(f"Readme Content:\n{readme_content}")
        prompt = f"""
        You are an expert technical assistant specialized in versioning and release documentation.  

        ## Objective
        Your task is to generate a complete CHANGELOG.md 

        It will be provided a list of git commits as context.  
        Based on these commits, generate a **clean, well-structured CHANGELOG** entry.

        ## Project context
        - name of project: {self.project.name}
        - main file: {self.project.main_file}
        - description: {self.project.description}
        - language: {self.project.language}
        - framework: {self.project.framework}
        - dependence file content: {self.project.dependence_file_content}


        - COMMITS:

            - commit diffs:
            {self.project.get_commits_by_range(include_diff=False, include_metadata=True)}

        # end context

        **Instructions:**
        - Start with the title `# Changelog`.
        - List versions in **descending order** (most recent first).
        - Use the standard section headings:
        - Added
        - Changed
        - Deprecated
        - Removed
        - Fixed
        - Security
        - If a section has no changes, **omit it**.
        - Group related commits under the same entry (e.g., multiple “UI fixes” → “UI improvements and bug fixes”).
        - Exclude commit hashes, branch names, or git metadata.
        - Use **concise, technical sentences** — no redundancy or fluff.
        - Keep it readable and consistent in tone.

        Return only the changelog content — no explanations, metadata, or additional commentary.
        generate the changelog in markdown format!
    """
        self.content = prompt
        return prompt
    

    
    def analyze_repository_template(self):
        prompt = f"""
        Tree of the project {self.project.name}:

        {self.project.get_tree()}

        Analyze the directory tree of this repository and return a JSON object with the following information:

        - "language": the primary programming language used in the repository.
        - "framework": the main framework used, if any.
        - "main_file": the main entry file of the project.
        - "has_readme": true if the repository contains a README file, false otherwise.
        - "dependency_files": a list of file names that contain the project's dependencies (e.g., package.json, requirements.txt, pom.xml, etc.).

        answer things that probably are correct but do not try to invent.

        Do not include any other information. 
        only return the json !
        The JSON should have this exact structure:

    
        "language": "",
        "framework": "",
        "main_file": "", (main file to run project)
        "has_readme": true/false,
        "dependency_files": [] (put answer as a list)
        """

        self.content = prompt
        


    def fill_placeholders(self, template: str, project) -> str:
        """
        Substitui placeholders {{campo}} por conteúdo formatado do projeto.
        Se vazio, retorna string vazia.
        Campos longos (como tree ou diff) são formatados em bloco separado.
        """
        def replacer(match):
            field = match.group(1)

            # --- REGRA NOVA ---
            # Se o campo solicitado for 'dependence_file_name',
            # substitui automaticamente por 'dependence_file_content'
            if field == "dependence_file_name":
                field = "dependence_file_content"

            value = getattr(project, field, "")

            if not value:
                return ""

            formatted_value = str(value).strip()

            long_fields = {"tree", "diff", "commit", "dependence_file_content"}

            if field in long_fields:
                return f"- {field.replace('_', ' ').title()}:\n```\n{formatted_value}\n```"

            return f"- {field.replace('_', ' ').title()}:\n  {formatted_value}"

        return re.sub(r"\{\{(\w+)\}\}", replacer, template)



    def save_prompt_debug(self,content: str):
        """Salva o prompt em prompts/template_debug.txt se DEBUG=true no .env"""
        from dotenv import load_dotenv
        load_dotenv()  # carrega variáveis do .env

        debug = os.getenv("DEBUG", "false").lower() == "true"
        if not debug:
            return  # se não estiver em modo debug, não faz nada

        os.makedirs("prompts", exist_ok=True)
        file_path = os.path.join("prompts", "template_debug.txt")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"📝 Prompt debug salvo em: {file_path}")

   
        
