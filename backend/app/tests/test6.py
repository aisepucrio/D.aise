from app.src.service.project_service import Project
from app.src.service.prompt_service import Prompt
from app.src.service.agent import Agent
import os


def test6():
    path = r"C:\Users\arthu\Documents\GitHub\repository_documentation\repositories\stnl-dataminer-web"

    language = "javascript"
    framework = "nextjs"
    dependence_file_name = "package.json"
    main_file = "src/app/page.tsx"

    # project = Project(path=path, language="javascript", framework="nextjs", dependence_file="package.json", main_file="src/pages/index.tsx")
    project = Project(path=path, language=language, framework=framework, dependence_file_name=dependence_file_name, main_file=main_file)
    project.extract_info()

    prompt = Prompt(project=project)
    template = prompt.initial_readme()


    agent = Agent(project=project, prompt=prompt)

    template = prompt.initial_readme()

    print("Prompt gerado:")
    print("vai chamar a LLM")
    response = agent.run(prompt=template)

    print("vai criar o arquivo")

    #criar arquivo readme no output com a response
    # o nome deve ser output/nome_do_projeto/README.md
    nameProject = project.name
    base_dir = os.path.join("app", "output",  nameProject)
    os.makedirs(base_dir, exist_ok=True)  # cria pastas se não existirem
    file_path = os.path.join(base_dir, "README2.md")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(response)


    # Exibir todos os campos formatados (graças ao __str__)
    print("\n\n================= Project Info ================= \n\n ")
