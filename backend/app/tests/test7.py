from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os
import re


def test7():

    print("teste 7")
    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\stnl-dataminer-web"

    language = "typescript"
    framework = "nextjs"
    dependence_file_name = "package.json"
    main_file = "src/app/page.tsx"
    description = "STNL DataMiner Web is the frontend component of the STNL DataMiner project, designed to facilitate data mining from GitHub and Jira platforms. This web application serves as the user interface, enabling users to interact with and visualize data extracted from these sources."
    

    # project = Project(path=path, language="javascript", framework="nextjs", dependence_file="package.json", main_file="src/pages/index.tsx")
    project = Project(path=path, language=language, framework=framework, dependence_file_name=dependence_file_name, main_file=main_file, description=description)
    project.extract_info()

    prompt = Prompt(project=project)
    template = prompt.initial_readme()


    agent = Agent(project=project, prompt=prompt)

    template = prompt.initial_readme()

    print("Prompt gerado:")
    print("vai chamar a LLM")
    response = agent.run(prompt=template)

    print("vai criar o arquivo")

# Criar arquivo README de maneira incremental
    nameProject = project.name
    base_dir = os.path.join("app", "output", nameProject)
    os.makedirs(base_dir, exist_ok=True)  # cria pastas se não existirem

    # Listar arquivos README existentes
    existing_files = [f for f in os.listdir(base_dir) if re.match(r'README(\d*)\.md', f)]

    # Encontrar o maior número existente
    max_num = 0
    for f in existing_files:
        match = re.match(r'README(\d*)\.md', f)
        if match:
            num = match.group(1)
            if num:  # se tiver número
                num = int(num)
                if num > max_num:
                    max_num = num

    # Novo número será o maior + 1
    new_num = max_num + 1
    print(f"README{new_num}.md")
    file_path = os.path.join(base_dir, f"README{new_num}.md")

    # Criar o arquivo
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(response)

    print(f"Arquivo criado: {file_path}")


    # Exibir todos os campos formatados (graças ao __str__)
    print("\n\n================= Project Info ================= \n\n ")
